// storage.js - Organized by functionality

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, addDoc, query, where, updateDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../FirebaseConfig'

/* ============================================================================
   📱 LOCAL STORAGE (AsyncStorage)
   ============================================================================ */

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

/* ============================================================================
   👤 USER PROFILE & SETTINGS
   ============================================================================ */

export async function saveProfileData({ topCategories, name, bio, avatarUrl, email, username }) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
  const cleanedData = { lastUpdated: new Date() };
  if (topCategories !== undefined) cleanedData.topCategories = topCategories || [];
  if (name !== undefined) cleanedData.name = name;
  if (bio !== undefined) cleanedData.bio = bio;
  if (avatarUrl !== undefined) cleanedData.avatarUrl = avatarUrl;
  if (email !== undefined) cleanedData.email = email;
  if (username !== undefined) cleanedData.username = username;

  await setDoc(profileRef, cleanedData, { merge: true });

  // Also maintain a public directory doc
  const dirRef = doc(db, 'userDirectory', user.uid);
  await setDoc(dirRef, {
    emailLower: (email || user.email || '').toLowerCase(),
    displayName: name || username || user.displayName || '',
    avatarUrl: avatarUrl || '',
    usernamePublic: username || '',
    bioPublic: (bio || '').slice(0, 500),
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
    return null;
  }
}

export async function ensureDirectoryForCurrentUser() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const dirRef = doc(db, 'userDirectory', user.uid);
  const dirSnap = await getDoc(dirRef);
  if (dirSnap.exists()) return;

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

export async function getPrivacySettings() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const refDoc = doc(db, 'users', user.uid, 'settings', 'privacy');
  const snap = await getDoc(refDoc);
  if (snap.exists()) return snap.data();

  // first-time defaults
  const defaults = {
    showProfilePublic: true,
    showActivityToFriends: true,
    allowFriendRequests: true,
    shareEmailWithFriends: false,
    blockedUsers: [],
    updatedAt: new Date(),
  };
  await setDoc(refDoc, defaults, { merge: true });

  // mirror flags to userDirectory so other screens can read them quickly
  await setDoc(doc(db, 'userDirectory', user.uid), {
    isPublicProfile: defaults.showProfilePublic,
    allowFriendRequests: defaults.allowFriendRequests,
    shareEmailWithFriends: defaults.shareEmailWithFriends,
    updatedAt: new Date(),
  }, { merge: true });

  return defaults;
}

export async function setPrivacySettings(patch) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const refDoc = doc(db, 'users', user.uid, 'settings', 'privacy');
  await setDoc(refDoc, { ...patch, updatedAt: new Date() }, { merge: true });

  // keep public directory in sync with the main flags
  const dirPatch = {};
  if (patch.showProfilePublic !== undefined) dirPatch.isPublicProfile = !!patch.showProfilePublic;
  if (patch.allowFriendRequests !== undefined) dirPatch.allowFriendRequests = !!patch.allowFriendRequests;
  if (patch.shareEmailWithFriends !== undefined) dirPatch.shareEmailWithFriends = !!patch.shareEmailWithFriends;
  if (Object.keys(dirPatch).length) {
    await setDoc(doc(db, 'userDirectory', user.uid), { ...dirPatch, updatedAt: new Date() }, { merge: true });
  }
}

/* ============================================================================
   ❤️ LIKES & COLLECTIONS
   ============================================================================ */

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

/* ============================================================================
   🤝 SOCIAL - FRIENDS & FRIEND REQUESTS
   ============================================================================ */

export async function sendFriendRequest(targetUserId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // sender info
  const fromProfileRef = doc(db, 'users', user.uid, 'profile', 'main');
  const fromSnap = await getDoc(fromProfileRef);
  const fromEmail = user.email || '';
  const fromAvatarUrl = fromSnap.exists() ? (fromSnap.data().avatarUrl || '') : '';

  // get target's public directory info
  const dirSnap = await getDoc(doc(db, 'userDirectory', targetUserId));
  const toEmail = dirSnap.exists() ? (dirSnap.data().emailLower || '') : '';
  const toDisplayName = dirSnap.exists() ? (dirSnap.data().displayName || '') : '';

  await addDoc(collection(db, 'friendRequests'), {
    from: user.uid,
    fromEmail,
    to: targetUserId,
    toEmail,
    toDisplayName,
    profilePicUrl: fromAvatarUrl,
    status: 'pending',
    timestamp: new Date(),
  });
}

export async function acceptFriendRequest(requestId, fromUserId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // 1) mark accepted
  await updateDoc(doc(db, "friendRequests", requestId), { status: "accepted" });

  // 2) create MY friend edge only
  await setDoc(doc(db, 'users', user.uid, 'friends', fromUserId), {
    createdAt: new Date(),
  });

  // 3) build friendship doc for both
  const currentUserDetails = {
    uid: user.uid,
    email: user.email || '',
    username: user.displayName || '',
  };

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

export async function removeFriend(friendUid) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");
  
  await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid));
  await deleteDoc(doc(db, 'users', friendUid, 'friends', user.uid));
  
  // Find all friendship docs that contain the current user
  const friendshipsRef = collection(db, "friendships");
  const q = query(friendshipsRef, where("users", "array-contains", user.uid));
  const snapshot = await getDocs(q);

  // For each matching doc, check if the doc's "users" also includes friendUid
  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    if (data.users.includes(friendUid)) {
      await deleteDoc(doc(db, "friendships", docSnap.id));
    }
  });
}

/* ============================================================================
   🎉 MEETUPS - CRUD Operations
   ============================================================================ */

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
    date: meetupData.date,
    time: meetupData.time,
    priceRange: meetupData.priceRange || 0,
    description: meetupData.description || "",
    restrictions: meetupData.restrictions || "",
    friends: (meetupData.friends || []).map(friend => ({
      uid: friend.uid || "",
      email: friend.email || "",
      name: friend.name || "",
      avatarUrl: friend.avatarUrl || ""
    })),
    location: meetupData.location || "",
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

  console.log("Final meetup data sent to Firestore:", data);

  // Create the meetup document
  const meetupRef = await addDoc(collection(db, "meetups"), data);
  
  // Add a meetupId field to the document
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

  // Combine and deduplicate meetups
  const allMeetupsMap = new Map();
  createdMeetups.forEach(meetup => allMeetupsMap.set(meetup.id, meetup));
  joinedMeetups.forEach(meetup => allMeetupsMap.set(meetup.id, meetup));

  return Array.from(allMeetupsMap.values());
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

export async function updateMeetup(meetupData) {
  if (!meetupData.id) {
    throw new Error('No meetup id provided');
  }
  const meetupRef = doc(db, 'meetups', meetupData.id);
  
  // Build an object with only the fields that are defined
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

/* ============================================================================
   📨 MEETUP INVITES & JOINING
   ============================================================================ */

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

export async function acceptMeetupInvite(inviteId, meetupId) {
  // Update the invite document's status
  const inviteRef = doc(db, "meetupInvites", inviteId);
  await updateDoc(inviteRef, { status: "accepted" });

  // Update the corresponding meetup document to ensure the user is in the participants
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

export async function joinMeetup(inviteId) {
  const inviteRef = doc(db, "meetupInvites", inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error("Invite not found");
  const inviteData = inviteSnap.data();
  if (!inviteData.meetupId) throw new Error("Meetup ID missing in invite");

  // mark accepted + add participant if needed
  await acceptMeetupInvite(inviteId, inviteData.meetupId);

  // immediately mirror my likes into the meetup
  await exportMyLikesToMeetup(inviteData.meetupId);

  return inviteData.meetupId;
}

export async function joinMeetupByCode(inviteCode) {
  const meetupsColRef = collection(db, "meetups");
  const q = query(meetupsColRef, where("code", "==", inviteCode));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("No meetup found with the provided code.");

  const meetupDoc = snap.docs[0];
  const meetupData = meetupDoc.data();

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  if (!meetupData.participants.includes(user.uid)) {
    await updateDoc(doc(db, "meetups", meetupDoc.id), {
      participants: [...meetupData.participants, user.uid],
    });
  }
  await exportMyLikesToMeetup(meetupDoc.id);
  return meetupDoc.id;
}

export async function declineMeetup(inviteId) {
  await declineMeetupInvite(inviteId);
}

/* ============================================================================
   💖 MEETUP LIKES & ACTIVITY MANAGEMENT
   ============================================================================ */

export async function exportMyLikesToMeetup(meetupId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // read ONLY my likes
  const likesColRef = collection(db, "users", user.uid, "likes");
  const snap = await getDocs(likesColRef);

  const writes = snap.docs.map(d => {
    const data = d.data();
    const destRef = doc(db, "meetups", meetupId, "likes", `${user.uid}_${d.id}`);
    return setDoc(destRef, {
      uid: user.uid,
      activityId: d.id,
      name: data.name || "",
      rating: data.rating || 0,
      photoUrls: data.photoUrls || [],
      createdAt: new Date(),
    }, { merge: true });
  });

  await Promise.all(writes);
}

export async function getMeetupLikes(meetupId) {
  const col = collection(db, "meetups", meetupId, "likes");
  const snap = await getDocs(col);
  // dedupe by activity
  const map = new Map();
  snap.docs.forEach(docSnap => {
    const d = docSnap.data();
    if (!map.has(d.activityId)) {
      map.set(d.activityId, {
        id: d.activityId,
        name: d.name || d.activityId,
        rating: d.rating || 0,
        photoUrls: d.photoUrls || [],
      });
    }
  });
  return Array.from(map.values());
}

/* ============================================================================
   📊 MEETUP SWIPES & LEADERBOARD
   ============================================================================ */

export async function recordSwipe(meetupId, userId, activityId, decision, name) {
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

export async function getMeetupLeaderboard(meetupId) {
  // grab all docs under /meetups/{meetupId}/swipes
  const swipesRef = collection(db, 'meetups', meetupId, 'swipes');
  const snap = await getDocs(swipesRef);

  // tally up yes/no per activity
  const tally = {};
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
  return Object.entries(tally).map(([activityId, stats]) => ({
    name: stats.name || activityId,
    yesCount: stats.yesCount,
    noCount: stats.noCount,
  }));
}

export async function clearMeetupSwipes(meetupId) {
  const swipesColRef = collection(db, 'meetups', meetupId, 'swipes');
  const snap = await getDocs(swipesColRef);
  const batchDeletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(batchDeletes);
}

/* ============================================================================
   📍 PLACES & LOCATION DATA
   ============================================================================ */

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

export async function fetchPlacesNearby(userLat, userLng, maxKm = 5) {
  const snap = await getDocs(collection(db, 'places'))
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (!isFinite(userLat) || !isFinite(userLng) || !maxKm) return all;
  return all.filter(p =>
    haversine(userLat, userLng, p.location.lat, p.location.lng) <= maxKm
  )
}

export async function fetchPlaceDetails(placeId) {
  const snap = await getDoc(doc(db, 'places', placeId))
  if (!snap.exists()) throw new Error('Place not found')
  return { id: snap.id, ...snap.data() }
}

export async function fetchPlacePhotos(place) {
  if (!Array.isArray(place.photos)) return []
  return Promise.all(
    place.photos.map(path =>
      getDownloadURL(ref(storage, path))
    )
  )
}

/* ============================================================================
   📝 REVIEWS
   ============================================================================ */

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