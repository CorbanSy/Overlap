// storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs, addDoc, query, where } from 'firebase/firestore';
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
export async function saveProfileData(topCategories) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
  await setDoc(
    profileRef,
    {
      topCategories,         // array of default categories
      lastUpdated: new Date(),
    },
    { merge: true }         // merge to avoid overwriting existing data
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