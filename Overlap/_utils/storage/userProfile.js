// _utils/storage/userProfile.js
import { doc, setDoc, getDoc } from 'firebase/firestore';
// Import auth from your config instead of using getAuth
import { db, auth } from '../../FirebaseConfig';

export async function saveProfileData({ topCategories, name, bio, avatarUrl, email, username }) {
  const user = auth.currentUser; // Use imported auth
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
  const user = auth.currentUser; // Use imported auth
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
  const user = auth.currentUser; // Use imported auth
  if (!user) return;

  console.log('🔍 ensureDirectoryForCurrentUser called for:', user.uid);

  const dirRef = doc(db, 'userDirectory', user.uid);
  const dirSnap = await getDoc(dirRef);
  if (dirSnap.exists()) {
    console.log('✅ Directory already exists');
    return;
  }

  console.log('🔍 Creating directory for user');

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
    console.log('⚠️ Could not read profile data:', e.message);
    // ignore — rules allow you to read your own; just being defensive
  }

  await setDoc(dirRef, {
    emailLower: (user.email || '').trim().toLowerCase(),
    displayName,
    avatarUrl,
    updatedAt: new Date(),
  }, { merge: true });

  console.log('✅ Directory created successfully');
}

export async function getPrivacySettings() {
  const user = auth.currentUser; // Use imported auth
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
  const user = auth.currentUser; // Use imported auth
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