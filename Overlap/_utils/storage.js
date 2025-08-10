// storage.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, addDoc, query, where, updateDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../FirebaseConfig'

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
    const cleanedData: any = { lastUpdated: new Date() };
    if (topCategories !== undefined) cleanedData.topCategories = topCategories || [];
    if (name !== undefined) cleanedData.name = name;
    if (bio !== undefined) cleanedData.bio = bio;
    if (avatarUrl !== undefined) cleanedData.avatarUrl = avatarUrl;
    if (email !== undefined) cleanedData.email = email;
    if (username !== undefined) cleanedData.username = username;

    await setDoc(profileRef, cleanedData, { merge: true });

    // 🔎 also maintain a public directory doc
    const dirRef = doc(db, 'userDirectory', user.uid);
    await setDoc(dirRef, {
      emailLower: (email || user.email || '').toLowerCase(),
      displayName: name || username || user.displayName || '',
      avatarUrl: avatarUrl || '',
      usernamePublic: username || '',
      bioPublic: (bio || '').slice(0, 500),         // optional trimming
      topCategoriesPublic: Array.isArray(topCategories) ? topCategories : [],
      updatedAt: new Date(),
    }, { merge: true });
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

export async function ensureDirectoryForCurrentUser() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const dirRef = doc(db, 'userDirectory', user.uid);
  const dirSnap = await getDoc(dirRef);
  if (dirSnap.exists()) return;

  // Build from whatever we can get without violating rules
  // Prefer profile.main if it exists (you can read your own /users/*)
  let displayName = user.displayName || '';
  let avatarUrl = '';
  try {
    const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
    const profSnap = await getDoc(profileRef);
    if (profSnap.exists()) {
      const d = profSnap.data();
      displayName = d.name || d.username || displayName || '';
      avatarUrl = d.avatarUrl || '';
    }
  } catch (e) {
    // ignore — rules allow you to read your own; just being defensive
  }

  await setDoc(dirRef, {
    emailLower: (user.email || '').trim().toLowerCase(),
    displayName,
    avatarUrl,
    updatedAt: new Date(),
  }, { merge: true });
}

/* ------------------------------------------------------------------
   3) Firestore: Likes Subcollection
      /users/{uid}/likes/{placeId}
   ------------------------------------------------------------------ */
async function toUrlArray(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const paths = typeof photos[0] === 'string'
    ? photos
    : photos.map(p => p?.photoUri).filter(Boolean);
  // Optional: resilient version
  const results = await Promise.allSettled(paths.map(p => getDownloadURL(ref(storage, p))));
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

export async function likePlace(place) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const likeDocRef = doc(db, 'users', user.uid, 'likes', place.id);

  let photoUrls = [];
  try { photoUrls = await toUrlArray(place.photos || []); }
  catch (e) { console.warn('Failed resolving photo URLs:', e); }

  await setDoc(likeDocRef, {
    name: place.name,
    rating: place.rating || 0,
    userRatingsTotal: place.userRatingsTotal || 0,
    photoPaths: Array.isArray(place.photos)
      ? (typeof place.photos[0] === 'string'
          ? place.photos
          : place.photos.map(p => p?.photoUri).filter(Boolean))
      : [],
    photoUrls,
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

// Make sure any incoming "place" becomes a clean activity snapshot
async function normalizeActivity(place) {
  // Prefer already-resolved URLs if present
  let photoUrls = Array.isArray(place.photoUrls) ? place.photoUrls : [];
  if (!photoUrls.length) {
    try {
      photoUrls = await toUrlArray(place.photos || []);
    } catch (e) {
      console.warn('normalizeActivity: failed resolving photo URLs', e);
      photoUrls = [];
    }
  }
  const photoPaths = Array.isArray(place.photos)
    ? (typeof place.photos[0] === 'string'
        ? place.photos
        : place.photos.map(p => p?.photoUri).filter(Boolean))
    : [];

  return {
    id: place.id,
    name: place.name || '',
    rating: place.rating || 0,
    types: place.types || [],
    photoUrls,     // ✅ what UI uses
    photoPaths,    // optional reference
  };
}
/* ------------------------------------------------------------------
   New: Firestore helper to add a place to a user's collection
      /users/{uid}/collections/{collectionId}
   ------------------------------------------------------------------ */
   export async function addToCollection(collectionId, place) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No user is signed in');

    const colDocRef = doc(db, 'users', user.uid, 'collections', collectionId);
    const snap = await getDoc(colDocRef);
    const norm = await normalizeActivity(place);

    if (!snap.exists()) {
      await setDoc(colDocRef, { activities: [norm] }, { merge: true });
      return;
    }

    const activities = snap.data().activities || [];
    if (!activities.some(a => a.id === norm.id)) {
      activities.push(norm);
      await updateDoc(colDocRef, { activities });
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

    // sender info
    const fromProfileRef = doc(db, 'users', user.uid, 'profile', 'main');
    const fromSnap = await getDoc(fromProfileRef);
    const fromEmail = user.email || '';
    const fromAvatarUrl = fromSnap.exists() ? (fromSnap.data().avatarUrl || '') : '';

    // ✅ get target's public directory info
    const dirSnap = await getDoc(doc(db, 'userDirectory', targetUserId));
    const toEmail = dirSnap.exists() ? (dirSnap.data().emailLower || '') : '';
    const toDisplayName = dirSnap.exists() ? (dirSnap.data().displayName || '') : '';

    await addDoc(collection(db, 'friendRequests'), {
      from: user.uid,
      fromEmail,
      to: targetUserId,
      toEmail,              // <— now set
      toDisplayName,        // optional
      profilePicUrl: fromAvatarUrl,
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

  // mark accepted
  await updateDoc(doc(db, "friendRequests", requestId), { status: "accepted" });

  // current user details (you can also include your own directory info if you want)
  const currentUserDetails = {
    uid: user.uid,
    email: user.email || '',
    username: user.displayName || '',
  };

  // ✅ read friend’s public directory entry instead of /users/*
  const dirSnap = await getDoc(doc(db, "userDirectory", fromUserId));
  const friendPublic = dirSnap.exists() ? dirSnap.data() : {};
  const friendDetails = {
    uid: fromUserId,
    avatarUrl: friendPublic.avatarUrl || '',
    name: friendPublic.displayName || '',
  };

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

// Call this whenever someone swipes on an activity
export async function recordSwipe(meetupId, userId, activityId, decision /* 'yes'|'no' */, name) {
  // doc ID could be `${userId}_${activityId}` to dedupe per user-activity
  const swipeDocRef = doc(db, 'meetups', meetupId, 'swipes', `${userId}_${activityId}`);
  await setDoc(swipeDocRef, {
    userId,
    activityId,
    decision,
    name,
    timestamp: new Date(),
  });
}

// Call this when the meetup ends to clear out the swipe data
export async function clearMeetupSwipes(meetupId) {
  const swipesColRef = collection(db, 'meetups', meetupId, 'swipes');
  const snap = await getDocs(swipesColRef);
  const batchDeletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(batchDeletes);
}

export async function getMeetupLeaderboard(meetupId) {
  // grab all docs under /meetups/{meetupId}/swipes
  const swipesRef = collection(db, 'meetups', meetupId, 'swipes');
  const snap = await getDocs(swipesRef);

  // tally up yes/no per activity
  const tally: Record<string, { yesCount: number; noCount: number }> = {};
  snap.docs.forEach(docSnap => {
    const { activityId, decision, name } = docSnap.data();
    // initialize
    if (!tally[activityId]) tally[activityId] = { yesCount: 0, noCount: 0 };
    // increment
    if (decision === 'yes') tally[activityId].yesCount++;
    else tally[activityId].noCount++;
    // also store name once
    tally[activityId].name = name;
  });

  // build leaderboard array
  return Object.entries(tally).map(([activityId, stats]: any) => ({
    name: stats.name || activityId,
    yesCount: stats.yesCount,
    noCount: stats.noCount,
  }));
}

// Convert degrees → radians
function toRad(d) {
  return (d * Math.PI) / 180
}

// Haversine formula (km)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Grabs _all_ docs in /places, then filters by distance.
 * (With ~100 docs this is fine — if you grow much bigger you can add a geo‐query lib.)
 */
export async function fetchPlacesNearby(userLat, userLng, maxKm = 5) {
  const snap = await getDocs(collection(db, 'places'))
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (!isFinite(userLat) || !isFinite(userLng) || !maxKm) return all; // no filter
  return all.filter(p =>
    haversine(userLat, userLng, p.location.lat, p.location.lng) <= maxKm
  )
}

/**
 * Reads /places/{placeId} doc
 */
export async function fetchPlaceDetails(placeId) {
  const snap = await getDoc(doc(db, 'places', placeId))
  if (!snap.exists()) throw new Error('Place not found')
  return { id: snap.id, ...snap.data() }
}

/**
 * Given a place doc with `photos: string[]` of storage paths,
 * turn them into download URLs.
 */
export async function fetchPlacePhotos(place) {
  if (!Array.isArray(place.photos)) return []
  return Promise.all(
    place.photos.map(path =>
      getDownloadURL(ref(storage, path))
    )
  )
}