// _utils/storage/social.js
import { 
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, 
  addDoc, query, where, updateDoc 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

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

  // 3) Get current user's directory info for better data
  const currentUserDirSnap = await getDoc(doc(db, "userDirectory", user.uid));
  const currentUserDir = currentUserDirSnap.exists() ? currentUserDirSnap.data() : {};
  
  // 4) Get friend's directory info
  const friendDirSnap = await getDoc(doc(db, "userDirectory", fromUserId));
  const friendDir = friendDirSnap.exists() ? friendDirSnap.data() : {};

  // 5) Build comprehensive user details
  const currentUserDetails = {
    uid: user.uid,
    email: user.email || currentUserDir.emailLower || '',
    emailLower: currentUserDir.emailLower || user.email?.toLowerCase() || '',
    name: currentUserDir.displayName || user.displayName || currentUserDir.usernamePublic || '',
    displayName: currentUserDir.displayName || user.displayName || '',
    username: currentUserDir.usernamePublic || user.displayName || '',
    avatarUrl: currentUserDir.avatarUrl || '',
  };

  const friendDetails = {
    uid: fromUserId,
    email: friendDir.emailLower || '',
    emailLower: friendDir.emailLower || '',
    name: friendDir.displayName || friendDir.usernamePublic || friendDir.emailLower || '',
    displayName: friendDir.displayName || '',
    username: friendDir.usernamePublic || '',
    avatarUrl: friendDir.avatarUrl || '',
  };

  // 6) Create friendship document with comprehensive data
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
