// _utils/storage/social.js
import { 
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, 
  addDoc, query, where, updateDoc 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, auth } from '../../FirebaseConfig';

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

// Enhanced debug version of sendFriendRequest with detailed logging
console.log('🔍 Social.js loaded, auth instance:', !!auth);
console.log('🔍 Social.js loaded, db instance:', !!db);

// Debug Firebase setup function
export async function debugFirebaseSetup() {
  console.log('🔍 Starting Firebase setup debug...');
  
  try {
    // Test 1: Check if db is defined
    console.log('✅ Test 1 - DB object:', !!db, typeof db);
    
    // Test 2: Check if auth is working
    console.log('✅ Test 2 - Auth object:', !!auth, typeof auth);
    
    // Test 3: Check current user
    const user = auth.currentUser;
    console.log('✅ Test 3 - Current user:', user ? `${user.uid} (${user.email})` : 'No user');
    
    if (!user) {
      throw new Error('No user authenticated - please sign in first');
    }
    
    // Test 4: Try to read from a collection
    console.log('🔍 Test 4 - Testing Firestore read...');
    const testCollectionRef = collection(db, 'userDirectory');
    const testQuery = query(testCollectionRef);
    const testSnapshot = await getDocs(testQuery);
    console.log('✅ Test 4 - Firestore read successful, docs count:', testSnapshot.size);
    
    // Test 5: Try to create a simple document
    console.log('🔍 Test 5 - Testing Firestore write...');
    const testData = {
      testField: 'debug test',
      userId: user.uid,
      timestamp: new Date(),
    };
    
    const testDocRef = await addDoc(collection(db, 'debugTest'), testData);
    console.log('✅ Test 5 - Firestore write successful, doc ID:', testDocRef.id);
    
    return 'All tests passed!';
    
  } catch (error) {
    console.error('❌ Firebase setup debug failed:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    throw error;
  }
}

// Enhanced debug version of sendFriendRequest
export async function sendFriendRequestDebug(targetUserId) {
  console.log('🔍 =================================');
  console.log('🔍 Starting sendFriendRequestDebug');
  console.log('🔍 Target user ID:', targetUserId);
  console.log('🔍 =================================');
  
  try {
    // Step 1: Basic setup check
    console.log('🔍 Step 1: Checking basic setup...');
    if (!db) {
      throw new Error('Database not initialized');
    }
    console.log('✅ Database object exists');
    
    if (!auth) {
      throw new Error('Auth not initialized');
    }
    console.log('✅ Auth object exists');
    
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user signed in');
    }
    console.log('✅ User authenticated:', user.uid, user.email);
    
    // Step 2: Validate input
    console.log('🔍 Step 2: Validating input...');
    if (!targetUserId || typeof targetUserId !== 'string') {
      throw new Error('Invalid target user ID: ' + targetUserId);
    }
    console.log('✅ Target user ID valid:', targetUserId);
    
    if (user.uid === targetUserId) {
      throw new Error('Cannot send friend request to yourself');
    }
    console.log('✅ Not sending to self');
    
    // Step 3: Check for existing requests
    console.log('🔍 Step 3: Checking for existing requests...');
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
    
    // Step 4: Prepare request data
    console.log('🔍 Step 4: Preparing data...');
    const requestData = {
      from: user.uid,
      fromEmail: user.email || '',
      to: targetUserId,
      status: 'pending',
      timestamp: new Date(),
    };
    console.log('✅ Request data prepared:', requestData);
    
    // Step 5: Get collection reference
    console.log('🔍 Step 5: Getting collection reference...');
    const friendRequestsRef = collection(db, 'friendRequests');
    console.log('✅ Collection reference created');
    
    // Step 6: Attempt to create document
    console.log('🔍 Step 6: Creating document...');
    console.log('🔍 About to call addDoc with collection: friendRequests');
    
    const docRef = await addDoc(friendRequestsRef, requestData);
    
    console.log('✅ SUCCESS! Document created with ID:', docRef.id);
    console.log('🔍 =================================');
    return docRef.id;
    
  } catch (error) {
    console.log('🔍 =================================');
    console.error('❌ FAILED at some step:');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    if (error.code === 'permission-denied') {
      console.error('❌ PERMISSION DENIED - Check your Firestore security rules!');
    }
    console.error('❌ Full error object:', error);
    console.log('🔍 =================================');
    throw error;
  }
}

// Original function with proper auth import
export async function sendFriendRequest(targetUserId) {
  console.log('🔍 Starting sendFriendRequest for:', targetUserId);
  
  const user = auth.currentUser; // Use imported auth instead of getAuth()
  
  if (!user) {
    console.error('❌ No user signed in');
    throw new Error("No user is signed in");
  }
  
  console.log('✅ Current user:', user.uid, user.email);

  if (user.uid === targetUserId) {
    console.error('❌ Cannot send friend request to self');
    throw new Error("Cannot send friend request to yourself");
  }

  try {
    // Check for existing requests
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
    console.log('✅ Sender info retrieved');

    // Get target's directory info
    console.log('🔍 Getting target user directory info...');
    const dirSnap = await getDoc(doc(db, 'userDirectory', targetUserId));
    if (!dirSnap.exists()) {
      console.error('❌ Target user directory does not exist');
      throw new Error("Target user not found");
    }
    
    const dirData = dirSnap.data();
    const toEmail = dirData.emailLower || '';
    const toDisplayName = dirData.displayName || '';
    console.log('✅ Target info retrieved');

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
    
    console.log('🔍 Creating friend request document...');
    const docRef = await addDoc(collection(db, 'friendRequests'), requestData);
    console.log('✅ Friend request created successfully with ID:', docRef.id);
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error in sendFriendRequest:', {
      code: error.code,
      message: error.message,
      name: error.name
    });
    throw error;
  }
}

// Add this enhanced debug version to your social.js file
export async function acceptFriendRequestDebug(requestId, fromUserId) {
  console.log('🔍 =================================');
  console.log('🔍 Starting acceptFriendRequestDebug');
  console.log('🔍 Request ID:', requestId);
  console.log('🔍 From User ID:', fromUserId);
  console.log('🔍 =================================');

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No user is signed in");
    }
    console.log('✅ Current user:', user.uid);

    // Step 1: Mark request as accepted
    console.log('🔍 Step 1: Marking request as accepted...');
    await updateDoc(doc(db, "friendRequests", requestId), { status: "accepted" });
    console.log('✅ Request marked as accepted');

    // Step 2: Create bidirectional friendship documents
    console.log('🔍 Step 2: Creating bidirectional friendship...');
    
    console.log('🔍 Creating friend doc for current user...');
    await setDoc(doc(db, 'users', user.uid, 'friends', fromUserId), {
      createdAt: new Date(),
    });
    console.log('✅ Friend doc created for current user');
    
    console.log('🔍 Creating friend doc for sender...');
    await setDoc(doc(db, 'users', fromUserId, 'friends', user.uid), {
      createdAt: new Date(),
    });
    console.log('✅ Friend doc created for sender');

    // Step 3: Get user directory info
    console.log('🔍 Step 3: Getting user directory info...');
    
    console.log('🔍 Getting current user directory info...');
    const currentUserDirSnap = await getDoc(doc(db, "userDirectory", user.uid));
    const currentUserDir = currentUserDirSnap.exists() ? currentUserDirSnap.data() : {};
    console.log('✅ Current user directory info retrieved');
    
    console.log('🔍 Getting friend directory info...');
    const friendDirSnap = await getDoc(doc(db, "userDirectory", fromUserId));
    const friendDir = friendDirSnap.exists() ? friendDirSnap.data() : {};
    console.log('✅ Friend directory info retrieved');

    // Step 4: Build user details
    console.log('🔍 Step 4: Building user details...');
    
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

    console.log('✅ User details built');

    // Step 5: Create friendship document
    console.log('🔍 Step 5: Creating friendship document...');
    await addDoc(collection(db, "friendships"), {
      users: [user.uid, fromUserId],
      userDetails: {
        [user.uid]: currentUserDetails,
        [fromUserId]: friendDetails,
      },
      establishedAt: new Date(),
    });
    console.log('✅ Friendship document created');

    console.log('✅ SUCCESS! Friend request accepted successfully');
    console.log('🔍 =================================');

  } catch (error) {
    console.log('🔍 =================================');
    console.error('❌ FAILED in acceptFriendRequestDebug:');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Full error object:', error);
    console.log('🔍 =================================');
    throw error;
  }
}

export async function rejectFriendRequest(requestId) {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const requestRef = doc(db, "friendRequests", requestId);
  await updateDoc(requestRef, { status: "rejected" });
}

export async function getFriendships() {
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
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");
  
  await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid));
  await deleteDoc(doc(db, 'users', friendUid, 'friends', user.uid));
  
  const friendshipsRef = collection(db, "friendships");
  const q = query(friendshipsRef, where("users", "array-contains", user.uid));
  const snapshot = await getDocs(q);

  const deletePromises = snapshot.docs
    .filter(docSnap => {
      const data = docSnap.data();
      return data.users.includes(friendUid);
    })
    .map(docSnap => deleteDoc(doc(db, "friendships", docSnap.id)));
  
  await Promise.all(deletePromises);
}

export async function blockUser(userIdToBlock) {
  const user = auth.currentUser; // Use imported auth
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
  const user = auth.currentUser; // Use imported auth
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
  const user = auth.currentUser; // Use imported auth
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
  const user = auth.currentUser; // Use imported auth
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
  const user = auth.currentUser; // Use imported auth
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