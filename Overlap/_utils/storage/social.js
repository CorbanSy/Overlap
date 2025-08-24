// _utils/storage/social.js
import { 
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, 
  addDoc, query, where, updateDoc 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

// TypeScript-like interfaces for JSDoc (optional, for better IDE support)
/**
 * @typedef {Object} BlockedUser
 * @property {string} uid
 * @property {string} displayName
 * @property {string} email
 * @property {string} avatarUrl
 * @property {Date} blockedAt
 */

/**
 * @typedef {Object} UserDetails
 * @property {string} uid
 * @property {string} displayName
 * @property {string} name
 * @property {string} email
 * @property {string} username
 * @property {string} avatarUrl
 */

// Debug version of sendFriendRequest with detailed logging
export async function sendFriendRequest(targetUserId) {
  console.log('🔍 Starting sendFriendRequest for:', targetUserId);
  
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No user signed in');
    throw new Error("No user is signed in");
  }
  
  console.log('✅ Current user:', user.uid, user.email);

  try {
    // Check if request already exists
    console.log('🔍 Checking for existing requests...');
    const existingRequestsRef = collection(db, 'friendRequests');
    const existingQuery = query(
      existingRequestsRef,
      where('from', '==', user.uid),
      where('to', '==', targetUserId),
      where('status', '==', 'pending')
    );
    const existingSnap = await getDocs(existingQuery);
    
    if (!existingSnap.empty) {
      console.log('⚠️ Friend request already exists');
      throw new Error("Friend request already sent");
    }
    console.log('✅ No existing request found');

    // Get sender info
    console.log('🔍 Getting sender profile info...');
    const fromProfileRef = doc(db, 'users', user.uid, 'profile', 'main');
    const fromSnap = await getDoc(fromProfileRef);
    const fromEmail = user.email || '';
    const fromAvatarUrl = fromSnap.exists() ? (fromSnap.data().avatarUrl || '') : '';
    console.log('✅ Sender info retrieved:', { fromEmail, hasAvatar: !!fromAvatarUrl });

    // Get target's public directory info
    console.log('🔍 Getting target user directory info...');
    const dirSnap = await getDoc(doc(db, 'userDirectory', targetUserId));
    if (!dirSnap.exists()) {
      console.error('❌ Target user directory does not exist');
      throw new Error("Target user not found");
    }
    
    const dirData = dirSnap.data();
    const toEmail = dirData.emailLower || '';
    const toDisplayName = dirData.displayName || '';
    console.log('✅ Target info retrieved:', { toEmail, toDisplayName });

    // Prepare the friend request data
    const requestData = {
      from: user.uid,
      fromEmail,
      to: targetUserId,
      toEmail,
      toDisplayName,
      profilePicUrl: fromAvatarUrl,
      status: 'pending',
      timestamp: new Date(),
    };
    
    console.log('🔍 Preparing to create friend request with data:', requestData);

    // Try to create the friend request
    console.log('🔍 Attempting to create friend request document...');
    const docRef = await addDoc(collection(db, 'friendRequests'), requestData);
    console.log('✅ Friend request created successfully with ID:', docRef.id);
    
  } catch (error) {
    console.error('❌ Error in sendFriendRequest:', {
      code: error.code,
      message: error.message,
      name: error.name
    });
    throw error;
  }
}

export async function acceptFriendRequest(requestId, fromUserId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // 1) mark accepted
  await updateDoc(doc(db, "friendRequests", requestId), { status: "accepted" });

  // 2) create BOTH friend edges (bidirectional relationship)
  await setDoc(doc(db, 'users', user.uid, 'friends', fromUserId), {
    createdAt: new Date(),
  });
  
  await setDoc(doc(db, 'users', fromUserId, 'friends', user.uid), {
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
  
  // Remove both sides of the friendship
  await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid));
  await deleteDoc(doc(db, 'users', friendUid, 'friends', user.uid));
  
  // Find and remove friendship document
  const friendshipsRef = collection(db, "friendships");
  const q = query(friendshipsRef, where("users", "array-contains", user.uid));
  const snapshot = await getDocs(q);

  // For each matching doc, check if the doc's "users" also includes friendUid
  const deletePromises = snapshot.docs
    .filter(docSnap => {
      const data = docSnap.data();
      return data.users.includes(friendUid);
    })
    .map(docSnap => deleteDoc(doc(db, "friendships", docSnap.id)));
  
  await Promise.all(deletePromises);
}

// Block/Unblock and User Management Functions
export async function blockUser(userIdToBlock) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Get current privacy settings
  const privacyRef = doc(db, 'users', user.uid, 'settings', 'privacy');
  const privacySnap = await getDoc(privacyRef);
  
  let currentBlocked = [];
  if (privacySnap.exists()) {
    currentBlocked = privacySnap.data().blockedUsers || [];
  }

  // Add to blocked list if not already there
  if (!currentBlocked.includes(userIdToBlock)) {
    currentBlocked.push(userIdToBlock);
    await setDoc(privacyRef, {
      blockedUsers: currentBlocked,
      updatedAt: new Date(),
    }, { merge: true });
  }

  // Remove any existing friend connections
  try {
    await removeFriend(userIdToBlock);
  } catch (error) {
    // Ignore if they weren't friends
  }
}

export async function unblockUser(userIdToUnblock) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const privacyRef = doc(db, 'users', user.uid, 'settings', 'privacy');
  const privacySnap = await getDoc(privacyRef);
  
  if (privacySnap.exists()) {
    const currentBlocked = privacySnap.data().blockedUsers || [];
    const updatedBlocked = currentBlocked.filter(id => id !== userIdToUnblock);
    
    await setDoc(privacyRef, {
      blockedUsers: updatedBlocked,
      updatedAt: new Date(),
    }, { merge: true });
  }
}

export async function getBlockedUsers() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const privacyRef = doc(db, 'users', user.uid, 'settings', 'privacy');
  const privacySnap = await getDoc(privacyRef);
  
  if (!privacySnap.exists()) {
    return [];
  }

  const blockedUserIds = privacySnap.data().blockedUsers || [];
  if (blockedUserIds.length === 0) {
    return [];
  }

  // Get details for blocked users
  const blockedUserDetails = await Promise.all(
    blockedUserIds.map(async (userId) => {
      try {
        const userDirRef = doc(db, 'userDirectory', userId);
        const userDirSnap = await getDoc(userDirRef);
        
        if (userDirSnap.exists()) {
          const userData = userDirSnap.data();
          return {
            uid: userId,
            displayName: userData.displayName || '',
            email: userData.emailLower || '',
            avatarUrl: userData.avatarUrl || '',
            blockedAt: new Date(), // You might want to store this timestamp when blocking
          };
        }
        return {
          uid: userId,
          displayName: 'Unknown User',
          email: '',
          avatarUrl: '',
          blockedAt: new Date(),
        };
      } catch (error) {
        console.error(`Error fetching blocked user ${userId}:`, error);
        return {
          uid: userId,
          displayName: 'Unknown User',
          email: '',
          avatarUrl: '',
          blockedAt: new Date(),
        };
      }
    })
  );

  return blockedUserDetails;
}

export async function searchUsers(searchTerm, limit = 10) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const searchLower = searchTerm.toLowerCase().trim();
  if (!searchLower) return [];

  try {
    // Search by email
    const userDirectoryRef = collection(db, 'userDirectory');
    const emailQuery = query(
      userDirectoryRef,
      where('emailLower', '>=', searchLower),
      where('emailLower', '<=', searchLower + '\uf8ff')
    );
    
    const emailSnapshot = await getDocs(emailQuery);
    
    // Search by display name
    const nameQuery = query(
      userDirectoryRef,
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff')
    );
    
    const nameSnapshot = await getDocs(nameQuery);

    // Combine and deduplicate results
    const allResults = new Map();
    
    [...emailSnapshot.docs, ...nameSnapshot.docs].forEach(doc => {
      const data = doc.data();
      // Don't include the current user in search results
      if (doc.id !== user.uid) {
        allResults.set(doc.id, {
          uid: doc.id,
          displayName: data.displayName || '',
          name: data.displayName || data.usernamePublic || '',
          email: data.emailLower || '',
          username: data.usernamePublic || '',
          avatarUrl: data.avatarUrl || '',
        });
      }
    });

    return Array.from(allResults.values()).slice(0, limit);
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

export async function reportUser(reportedUserId, reason, description = '') {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Create a report document
  await addDoc(collection(db, 'userReports'), {
    reportedBy: user.uid,
    reportedUser: reportedUserId,
    reason: reason,
    description: description,
    timestamp: new Date(),
    status: 'pending',
  });

  // Automatically block the reported user
  await blockUser(reportedUserId);
}