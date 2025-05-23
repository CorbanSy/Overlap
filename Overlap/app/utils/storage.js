// storage.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, addDoc, query, where, updateDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig'; // your "db" or "firestore" export

/* ------------------------------------------------------------------
   1) AsyncStorage for "preferencesCompleted" flag
   ------------------------------------------------------------------ */
export async function markPreferencesComplete() {
  try {
    await AsyncStorage.setItem('preferencesComplete', 'true');
  } catch (error) {
    console.error('Error saving preferences completion flag:', error);
  }
}

export async function checkPreferencesComplete() {
  try {
    const value = await AsyncStorage.getItem('preferencesComplete');
    return value === 'true';
  } catch (error) {
    console.error('Error checking preferences completion flag:', error);
    return false;
  }
}

/* ------------------------------------------------------------------
   2) Firestore: Save & Read Preferences Subcollection
      /users/{uid}/profile/main
   ------------------------------------------------------------------ */
export async function saveProfileData({ topCategories, name, bio, avatarUrl, email, username }) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
  await setDoc(
    profileRef,
    {
      topCategories: topCategories || [],
      name,
      bio,
      avatarUrl,
      email,     // <-- New field
      username,  // <-- New field
      lastUpdated: new Date(),
    },
    { merge: true }
  );
}

export async function getProfileData() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
  const snap = await getDoc(profileRef);
  if (snap.exists()) {
    return snap.data();
  } else {
    return null; // doc doesn't exist yet
  }
}

/* ------------------------------------------------------------------
   3) Firestore: Likes Subcollection
      /users/{uid}/likes/{placeId}
   ------------------------------------------------------------------ */
export async function likePlace(place) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");
  
  const likeDocRef = doc(db, 'users', user.uid, 'likes', place.id);
  
  // Save full place details in Firestore
  await setDoc(likeDocRef, {
    name: place.name,
    rating: place.rating || 0,
    userRatingsTotal: place.userRatingsTotal || 0,
    photoReference: place.photoReference || null,
    photos: place.photos ?? [],
    types: place.types || [],
    formatted_address: place.formatted_address || '',
    phoneNumber: place.phoneNumber || '',
    website: place.website || '',
    openingHours: place.openingHours || [],
    description: place.description || '',
    createdAt: new Date(),
  });
}

export async function unlikePlace(placeId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const likeDocRef = doc(db, "users", user.uid, "likes", placeId);
  await deleteDoc(likeDocRef);
}

export async function getAllLikes() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const likesColRef = collection(db, "users", user.uid, "likes");
  const snap = await getDocs(likesColRef);
  
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));
}

/* ------------------------------------------------------------------
   4) Firestore: Store Reviews 
      /places/{placeId}/reviews/{autoId}
   ------------------------------------------------------------------ */
export async function storeReviewsForPlace(placeId, reviews) {
  for (let i = 0; i < reviews.length; i++) {
    const r = reviews[i];
    // Each doc is an individual review
    await addDoc(collection(db, "places", placeId, "reviews"), {
      text: r.text || "",
      rating: r.rating || 0,
      authorName: r.author_name || "",
      relativeTime: r.relative_time_description || "",
      createdAt: new Date()
    });
  }
}

/* ------------------------------------------------------------------
   5) Firestore: Create a Meetup Document
      /meetups/{autoId}
   ------------------------------------------------------------------ */
   export async function createMeetup(meetupData) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No user is signed in');
    // Auto-generate a 6-digit code if none was provided
    if (!meetupData.code) {
      meetupData.code = Math.floor(100000 + Math.random() * 900000).toString();
    }
    // Ensure each field is defined (use defaults if necessary)
    const cleanedData = {
      eventName: meetupData.eventName || "",
      mood: meetupData.mood || "",
      category: meetupData.category || "",
      groupSize: meetupData.groupSize || 1,
      date: meetupData.date, // already an ISO string from new Date()
      time: meetupData.time, // same as above
      priceRange: meetupData.priceRange || 0,
      description: meetupData.description || "",
      restrictions: meetupData.restrictions || "",
      // In case selectedFriends is missing or a friend object is missing uid, fallback to an empty array
      friends: (meetupData.friends || []).map(friend => ({
        uid: friend.uid || "",
        email: friend.email || "",
        name: friend.name || "",
        avatarUrl: friend.avatarUrl || ""
      })),
      location: meetupData.location || "",
      // Ensure collections is at least an empty array
      collections: meetupData.collections || [],
      code: meetupData.code,
    };
  
    // Build additional fields
    const invitedFriends = cleanedData.friends;
    const data = {
      ...cleanedData,
      creatorId: user.uid,
      participants: [user.uid, ...invitedFriends.map(friend => friend.uid)],
      createdAt: new Date(),
    };
  
    // Log the final data for debugging
    console.log("Final meetup data sent to Firestore:", data);
  
    // Create the meetup document
    const meetupRef = await addDoc(collection(db, "meetups"), data);
    
    // Add a meetupId field to the document (using the document ID)
    await updateDoc(meetupRef, { meetupId: meetupRef.id });
    
    return meetupRef.id;
  }
  

export async function getUserMeetups() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const meetupsColRef = collection(db, "meetups");

  // Query for meetups where the user is the creator
  const createdQuery = query(meetupsColRef, where("creatorId", "==", user.uid));
  const createdSnap = await getDocs(createdQuery);
  const createdMeetups = createdSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Query for meetups where the user is in the participants array
  const joinedQuery = query(meetupsColRef, where("participants", "array-contains", user.uid));
  const joinedSnap = await getDocs(joinedQuery);
  const joinedMeetups = joinedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Combine and deduplicate meetups (in case creator is also a participant)
  const allMeetupsMap = new Map();
  createdMeetups.forEach(meetup => allMeetupsMap.set(meetup.id, meetup));
  joinedMeetups.forEach(meetup => allMeetupsMap.set(meetup.id, meetup));

  return Array.from(allMeetupsMap.values());
}

/* ------------------------------------------------------------------
   7) Firestore: Social - Friend Requests & Friendships
      Using two separate collections: "friendRequests" and "friendships"
   ------------------------------------------------------------------ */

/**
 * sendFriendRequest:
 * - We now store the **sender's** avatar in "profilePicUrl" so the receiving user
 *   sees who is requesting them.
 */
export async function sendFriendRequest(targetUserId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Fetch the sender's (current user's) profile to get avatar
  const fromProfileRef = doc(db, 'users', user.uid, 'profile', 'main');
  const fromSnap = await getDoc(fromProfileRef);

  let fromEmail = user.email || '';
  let fromAvatarUrl = '';
  if (fromSnap.exists()) {
    const fromData = fromSnap.data();
    fromAvatarUrl = fromData.avatarUrl || '';
  }

  // Fetch target user's email (optional, if you want to store it)
  const targetProfileRef = doc(db, 'users', targetUserId, 'profile', 'main');
  const targetSnap = await getDoc(targetProfileRef);
  let targetEmail = '';
  if (targetSnap.exists()) {
    const targetData = targetSnap.data();
    targetEmail = targetData.email || '';
  }

  // Add friend request doc with the **sender's** avatar
  await addDoc(collection(db, 'friendRequests'), {
    from: user.uid,
    fromEmail,
    to: targetUserId,
    toEmail: targetEmail,
    profilePicUrl: targetAvatarUrl, // store the SENDER's avatar here
    status: 'pending',
    timestamp: new Date(),
  });
}

/**
 * Accept a friend request.
 */
export async function acceptFriendRequest(requestId, fromUserId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Update the friend request status to 'accepted'
  const requestRef = doc(db, "friendRequests", requestId);
  await updateDoc(requestRef, { status: "accepted" });

  // Get current user's details
  const currentUserDetails = {
    uid: user.uid,
    email: user.email,
    username: user.displayName || '',
  };

  // Fetch friend's top-level user doc (if needed)
  const friendDocRef = doc(db, "users", fromUserId);
  const friendSnap = await getDoc(friendDocRef);
  let friendDetails = { uid: fromUserId };
  if (friendSnap.exists()) {
    friendDetails = friendSnap.data();
  }

  // Also fetch the friend's profile data (including avatarUrl)
  const friendProfileRef = doc(db, "users", fromUserId, "profile", "main");
  const friendProfileSnap = await getDoc(friendProfileRef);
  if (friendProfileSnap.exists()) {
    const profileData = friendProfileSnap.data();
    // Merge the profile data (like avatarUrl) into friendDetails
    friendDetails = { ...friendDetails, ...profileData };
  }

  // Create a new friendship document
  await addDoc(collection(db, "friendships"), {
    users: [user.uid, fromUserId],
    userDetails: {
      [user.uid]: currentUserDetails,
      [fromUserId]: friendDetails,
    },
    establishedAt: new Date(),
  });
}

export async function rejectFriendRequest(requestId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const requestRef = doc(db, "friendRequests", requestId);
  await updateDoc(requestRef, { status: "rejected" });
}

// Meetup invites example (unrelated to friendRequests, but included in your code)
export async function getPendingMeetupInvites() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const invitesQuery = query(
    collection(db, "meetupInvites"),
    where("invitedFriendId", "==", user.uid),
    where("status", "==", "pending")
  );
  const querySnapshot = await getDocs(invitesQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Retrieve the list of friendships for the current user.
 */
export async function getFriendships() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const friendshipsQuery = query(
    collection(db, "friendships"),
    where("users", "array-contains", user.uid)
  );
  const querySnapshot = await getDocs(friendshipsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/* ------------------------------------------------------------------
   8) Firestore: Update / Delete Meetup
   ------------------------------------------------------------------ */
export async function updateMeetup(meetupData) {
  if (!meetupData.id) {
    throw new Error('No meetup id provided');
  }
  const meetupRef = doc(db, 'meetups', meetupData.id);
  
  // Build an object with only the fields that are defined.
  const updateFields = {};
  if (meetupData.eventName !== undefined) updateFields.eventName = meetupData.eventName;
  if (meetupData.mood !== undefined) updateFields.mood = meetupData.mood;
  if (meetupData.description !== undefined) updateFields.description = meetupData.description;
  if (meetupData.restrictions !== undefined) updateFields.restrictions = meetupData.restrictions;
  if (meetupData.ongoing !== undefined) updateFields.ongoing = meetupData.ongoing;
  if (meetupData.friends !== undefined) updateFields.friends = meetupData.friends;
  
  await updateDoc(meetupRef, updateFields);
}

export async function removeMeetup(meetupId) {
  if (!meetupId) {
    throw new Error('No meetup id provided');
  }
  const meetupRef = doc(db, 'meetups', meetupId);
  await deleteDoc(meetupRef);
}

/* ------------------------------------------------------------------
   9) Firestore: Send & Manage Meetup Invites
   ------------------------------------------------------------------ */
export async function sendMeetupInvite(meetupId, friend) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');
  
  await addDoc(collection(db, "meetupInvites"), {
    meetupId,
    invitedBy: user.uid,
    invitedFriendId: friend.uid,
    status: "pending",
    createdAt: new Date(),
  });
}

export async function acceptMeetupInvite(inviteId, meetupId) {
  // Update the invite document's status.
  const inviteRef = doc(db, "meetupInvites", inviteId);
  await updateDoc(inviteRef, { status: "accepted" });

  // Optionally, update the corresponding meetup document to ensure the user is in the participants.
  const meetupRef = doc(db, "meetups", meetupId);
  const meetupSnap = await getDoc(meetupRef);
  if (meetupSnap.exists()) {
    const meetupData = meetupSnap.data();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!meetupData.participants.includes(user.uid)) {
      await updateDoc(meetupRef, {
        participants: [...meetupData.participants, user.uid]
      });
    }
  }
}

export async function declineMeetupInvite(inviteId) {
  const inviteRef = doc(db, "meetupInvites", inviteId);
  await updateDoc(inviteRef, { status: "declined" });
}

export async function getMeetupData(meetupId) {
  const meetupRef = doc(db, "meetups", meetupId);
  const meetupSnap = await getDoc(meetupRef);
  if (meetupSnap.exists()) {
    return { id: meetupSnap.id, ...meetupSnap.data() };
  } else {
    throw new Error("Meetup not found");
  }
}

export async function getMeetupLikes(meetupId) {
  const meetupData = await getMeetupData(meetupId);
  if (!meetupData || !meetupData.participants) {
    throw new Error('Meetup data or participants not found');
  }
  
  const participantIds = meetupData.participants;
  let allLikes = [];
  
  // For each participant, fetch their likes
  for (const uid of participantIds) {
    const likesColRef = collection(db, 'users', uid, 'likes');
    const snap = await getDocs(likesColRef);
    const likes = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    allLikes = allLikes.concat(likes);
  }
  
  // Optional: Remove duplicates
  const uniqueLikes = Array.from(
    new Map(allLikes.map(like => [like.id, like])).values()
  );
  
  return uniqueLikes;
}

/**
 * Removes a friendship between the current user and friendUid.
 */
export async function removeFriend(friendUid) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Find all friendship docs that contain the current user
  const friendshipsRef = collection(db, "friendships");
  const q = query(friendshipsRef, where("users", "array-contains", user.uid));
  const snapshot = await getDocs(q);

  // For each matching doc, check if the doc's "users" also includes friendUid
  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    if (data.users.includes(friendUid)) {
      // Delete the friendship doc
      await deleteDoc(doc(db, "friendships", docSnap.id));
    }
  });
}

// Function to join a meetup using an invite (direct invitation)
export async function joinMeetup(inviteId) {
  // Retrieve the invite document to get the associated meetupId.
  const inviteRef = doc(db, "meetupInvites", inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) {
    throw new Error("Invite not found");
  }
  const inviteData = inviteSnap.data();
  if (!inviteData.meetupId) {
    throw new Error("Meetup ID missing in invite");
  }
  await acceptMeetupInvite(inviteId, inviteData.meetupId);
  return inviteData.meetupId;
}

// Function to join a meetup by using an invite code.
export async function joinMeetupByCode(inviteCode) {
  const meetupsColRef = collection(db, "meetups");
  const q = query(meetupsColRef, where("code", "==", inviteCode));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    throw new Error("No meetup found with the provided code.");
  }
  
  // For simplicity, take the first matching meetup.
  const meetupDoc = snap.docs[0];
  const meetupData = meetupDoc.data();
  
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");
  
  // Check if the user is already a participant; if not, add them.
  if (!meetupData.participants.includes(user.uid)) {
    await updateDoc(doc(db, "meetups", meetupDoc.id), {
      participants: [...meetupData.participants, user.uid],
    });
  }
  
  return { success: true, meetupId: meetupDoc.id };
}

// Alias for declining a meetup invite.
export async function declineMeetup(inviteId) {
  await declineMeetupInvite(inviteId);
}
