// _utils/storage/likesCollections.js
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../FirebaseConfig';
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
    photoUrls,     // what UI uses
    photoPaths,    // optional reference
  };
}

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

export async function deleteCollection(collectionId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  if (!collectionId) throw new Error('Collection ID is required');

  const collectionRef = doc(db, 'users', user.uid, 'collections', collectionId);
  await deleteDoc(collectionRef);
}

export async function getUserCollections() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const colRef = collection(db, 'users', user.uid, 'collections');
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
