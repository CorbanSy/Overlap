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
      /users/{uid}/preferences/main
   ------------------------------------------------------------------ */

/**
 * Save or update the user's profile with topCategories (and anything else).
 * This merges so you don't overwrite existing fields like keywords.
 */
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



/**
 * Get the user's profile data from /users/{uid}/profile/main.
 * Returns an object with fields like { topCategories, keywords, ... }
 */
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
// Instead of just placeId, we pass the full 'place' object, so we store details
export async function likePlace(place) {
  const auth = getAuth();
  const user = auth.currentUser;
  console.log('Current user:', user);
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
  console.log('Current user:', auth.currentUser);
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const likeDocRef = doc(db, "users", user.uid, "likes", placeId);
  await deleteDoc(likeDocRef);
}

// Return an array of place docs the user has liked
export async function getAllLikes() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const likesColRef = collection(db, "users", user.uid, "likes");
  const snap = await getDocs(likesColRef);
  
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data() // name, rating, photo, etc.
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
  
    const invitedFriends = meetupData.friends || [];
    const data = {
      ...meetupData,
      creatorId: user.uid,
      participants: [user.uid, ...invitedFriends.map(friend => friend.uid)],
      friends: invitedFriends,
      createdAt: new Date(),
    };
  
    // Create the meetup document
    const meetupRef = await addDoc(collection(db, "meetups"), data);
    
    // Add a meetupId field to the document (using the document ID)
    await updateDoc(meetupRef, { meetupId: meetupRef.id });
    
    return meetupRef.id;
  }
/* ------------------------------------------------------------------
   6) Firestore: Get User's Meetups
      Retrieves meetups the user created or joined.
   ------------------------------------------------------------------ */
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

   export async function sendFriendRequest(targetUserId) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("No user is signed in");
  
    // Fetch target user's email from their profile
    const targetProfileRef = doc(db, 'users', targetUserId, 'profile', 'main');
    const targetSnap = await getDoc(targetProfileRef);
    let targetEmail = '';
    if (targetSnap.exists()) {
      const targetData = targetSnap.data();
      targetEmail = targetData.email || '';
    }
  
    // Use the current user's email for fromEmail
    const fromEmail = user.email;
  
    // Create the friend request doc with both emails
    await addDoc(collection(db, 'friendRequests'), {
      from: user.uid,
      fromEmail,           // <-- Sender's email
      to: targetUserId,
      toEmail: targetEmail,  // <-- Recipient's email
      status: 'pending',
      timestamp: new Date(),
    });
  }
  

/**
 * Accept a friend request.
 * Updates the friend request document's status and creates a new friendship document.
 * @param {string} requestId - The ID of the friend request document.
 * @param {string} fromUserId - The UID of the user who sent the request.
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

  // Fetch friend's details from Firestore "users" collection
  const friendDocRef = doc(db, "users", fromUserId);
  const friendSnap = await getDoc(friendDocRef);
  let friendDetails = { uid: fromUserId };
  if (friendSnap.exists()) {
    friendDetails = friendSnap.data();
  }

  // Create a new friendship document with both users' details
  await addDoc(collection(db, "friendships"), {
    users: [user.uid, fromUserId],
    userDetails: {
      [user.uid]: currentUserDetails,
      [fromUserId]: friendDetails,
    },
    establishedAt: new Date(),
  });
}

/**
 * Reject a friend request.
 * Updates the friend request document's status to "rejected".
 * @param {string} requestId - The ID of the friend request document.
 */
export async function rejectFriendRequest(requestId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const requestRef = doc(db, "friendRequests", requestId);
  await updateDoc(requestRef, { status: "rejected" });
}

/**
 * Retrieve pending friend requests for the current user.
 * Queries the "friendRequests" collection where "to" equals the current user's UID and status is "pending".
 */
// Fetch pending meetup invites for the current user.
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
 * Looks for documents in "friendships" where the current user's UID is in the "users" array.
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

/**
 * Update an existing meetup document.
 * Expects meetupData to include the meetup's ID and the updated fields.
 * For example: { id, eventName, mood, description, restrictions, ... }
 */
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
  // Allow updating the friends list as well:
  if (meetupData.friends !== undefined) updateFields.friends = meetupData.friends;
  
  await updateDoc(meetupRef, updateFields);
}


// storage.js

export async function removeMeetup(meetupId) {
  if (!meetupId) {
    throw new Error('No meetup id provided');
  }
  const meetupRef = doc(db, 'meetups', meetupId);
  await deleteDoc(meetupRef);
}

// New function to send a meetup invite to a friend.
export async function sendMeetupInvite(meetupId, friend) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');
  
  await addDoc(collection(db, "meetupInvites"), {
    meetupId,
    invitedBy: user.uid,
    invitedFriendId: friend.uid,
    status: "pending", // Could later be updated to 'accepted' or 'rejected'
    createdAt: new Date(),
  });
}
// Accept an invite: update its status and add the user to the meetup's participants.
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

// Decline an invite: update its status.
export async function declineMeetupInvite(inviteId) {
  const inviteRef = doc(db, "meetupInvites", inviteId);
  await updateDoc(inviteRef, { status: "declined" });
}

// New function to fetch meetup details by ID.
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
  // Retrieve meetup details including the list of participants
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
  
  // Optional: Remove duplicates if needed
  // For example, using a Map keyed by activity id
  const uniqueLikes = Array.from(
    new Map(allLikes.map(like => [like.id, like])).values()
  );
  
  return uniqueLikes;
}
/**
 * Removes a friendship between the current user and friendUid.
 * This finds the doc in "friendships" where both user UIDs appear in the "users" array
 * and deletes it. 
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
  // Query the meetups collection to find a meetup with the matching code.
  // Assuming your meetup documents contain a field called "code"
  const meetupsColRef = collection(db, "meetups");
  const q = query(meetupsColRef, where("code", "==", inviteCode));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    throw new Error("No meetup found with the provided code.");
  }
  
  // For simplicity, take the first matching meetup.
  const meetupDoc = snap.docs[0];
  const meetupData = meetupDoc.data();
  
  // Get the current user.
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
  // You already have declineMeetupInvite defined, so simply call that.
  await declineMeetupInvite(inviteId);
}