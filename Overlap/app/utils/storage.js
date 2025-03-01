// storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs } from 'firebase/firestore';
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

// Save an array of categories (the user's top preferences)
export async function savePreferences(topCategories) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  // doc path => /users/{uid}/preferences/main
  const prefDocRef = doc(db, 'users', user.uid, 'preferences', 'main');
  await setDoc(prefDocRef, {
    topCategories,
    lastUpdated: new Date(),
  });
}
// Read the user's preferences (array of categories)
export async function getPreferences() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const prefDocRef = doc(db, 'users', user.uid, 'preferences', 'main');
  const snap = await getDoc(prefDocRef);
  if (snap.exists()) {
    const data = snap.data();
    return data.topCategories || [];
  } else {
    return [];
  }
}


/* ------------------------------------------------------------------
   3) Firestore: Likes Subcollection
      /users/{uid}/likes/{placeId}
   ------------------------------------------------------------------ */
   export async function likePlace(place) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No user is signed in');
  
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
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const likeDocRef = doc(db, 'users', user.uid, 'likes', placeId);
  await deleteDoc(likeDocRef);
}

// Return an array of placeIds the user has liked
export async function getAllLikes() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const likesColRef = collection(db, 'users', user.uid, 'likes');
  const snap = await getDocs(likesColRef);
  
  // Return full place details
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(), // This will now include name, rating, photo, etc.
  }));
}


