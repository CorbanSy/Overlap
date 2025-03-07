// storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs, addDoc } from 'firebase/firestore';
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
  
  const likeDocRef = doc(db, "users", user.uid, "likes", place.id);
  await setDoc(likeDocRef, {
    name: place.name,
    rating: place.rating || 0,
    userRatingsTotal: place.userRatingsTotal || 0,
    photoReference: place.photoReference || null,
    types: place.types || [],
    createdAt: new Date()
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

