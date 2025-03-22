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
export async function saveProfileData({ topCategories, name, bio, avatarUrl }) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
  await setDoc(
    profileRef,
    {
      topCategories: topCategories !== undefined ? topCategories : [],
      name,
      bio,
      avatarUrl,
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

  const data = {
    ...meetupData,
    creatorId: user.uid,
    participants: [user.uid],
    createdAt: new Date(),
  };

  const meetupRef = await addDoc(collection(db, "meetups"), data);
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

/**
 * Send a friend request from the current user to another user.
 * Creates a new document in the "friendRequests" collection.
 */
export async function sendFriendRequest(targetUserId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  await addDoc(collection(db, "friendRequests"), {
    from: user.uid,
    to: targetUserId,
    status: "pending",  // other statuses could be 'accepted' or 'rejected'
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

  // Create a new friendship document in "friendships" collection
  // Store the UIDs of both users and the timestamp when the friendship was established.
  await addDoc(collection(db, "friendships"), {
    users: [user.uid, fromUserId],
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
export async function getPendingFriendRequests() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const requestsQuery = query(
    collection(db, "friendRequests"),
    where("to", "==", user.uid),
    where("status", "==", "pending")
  );
  const querySnapshot = await getDocs(requestsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
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
  // You can update only the fields that might change.
  // Alternatively, if you want to update all fields, you can spread the meetupData.
  await updateDoc(meetupRef, {
    eventName: meetupData.eventName,
    mood: meetupData.mood,
    description: meetupData.description,
    restrictions: meetupData.restrictions,
    // Add additional fields if necessary.
    // Note: Do not include fields like "id" if not stored in the document.
  });
}

// storage.js

export async function removeMeetup(meetupId) {
  if (!meetupId) {
    throw new Error('No meetup id provided');
  }
  const meetupRef = doc(db, 'meetups', meetupId);
  await deleteDoc(meetupRef);
}
