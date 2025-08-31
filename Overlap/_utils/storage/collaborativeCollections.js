// _utils/storage/collaborativeCollections.js
import { 
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, 
  addDoc, query, where, updateDoc, arrayUnion, arrayRemove,
  onSnapshot, writeBatch
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

// Collection roles
export const COLLECTION_ROLES = {
  OWNER: 'owner',
  COLLABORATOR: 'collaborator',
  VIEWER: 'viewer'
};

// Collection privacy levels
export const COLLECTION_PRIVACY = {
  PUBLIC: 'public',
  FRIENDS: 'friends', 
  PRIVATE: 'private'
};

/**
 * Create a new collaborative collection
 */
export async function createCollaborativeCollection({
  title,
  description = '',
  privacy = COLLECTION_PRIVACY.PRIVATE,
  allowMembersToAdd = true
}) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionData = {
    title,
    description,
    privacy,
    allowMembersToAdd,
    owner: user.uid,
    members: {
      [user.uid]: {
        role: COLLECTION_ROLES.OWNER,
        joinedAt: new Date(),
        displayName: user.displayName || user.email || 'Anonymous',
        email: user.email || '',
        avatarUrl: ''
      }
    },
    activities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAddedAt: null,
    totalActivities: 0
  };

  // Create the collection document
  const collectionRef = await addDoc(collection(db, 'collaborativeCollections'), collectionData);
  
  // Add to user's collections index for quick lookup
  await setDoc(doc(db, 'users', user.uid, 'collectionMemberships', collectionRef.id), {
    role: COLLECTION_ROLES.OWNER,
    joinedAt: new Date(),
    collectionTitle: title
  });

  return collectionRef.id;
}

/**
 * Invite a user to join a collection
 */
export async function inviteToCollection(collectionId, targetUserId, role = COLLECTION_ROLES.COLLABORATOR) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Check if current user has permission to invite (owner or collaborator)
  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  const currentUserRole = collectionData.members?.[user.uid]?.role;
  
  if (currentUserRole !== COLLECTION_ROLES.OWNER && currentUserRole !== COLLECTION_ROLES.COLLABORATOR) {
    throw new Error("You don't have permission to invite users to this collection");
  }

  // Check if user is already a member
  if (collectionData.members?.[targetUserId]) {
    throw new Error("User is already a member of this collection");
  }

  // Get target user info
  const targetUserRef = doc(db, 'userDirectory', targetUserId);
  const targetUserSnap = await getDoc(targetUserRef);
  
  if (!targetUserSnap.exists()) {
    throw new Error("Target user not found");
  }

  const targetUserData = targetUserSnap.data();

  // Create invitation
  await addDoc(collection(db, 'collectionInvitations'), {
    collectionId,
    collectionTitle: collectionData.title,
    fromUserId: user.uid,
    fromDisplayName: user.displayName || user.email || 'Anonymous',
    toUserId: targetUserId,
    toDisplayName: targetUserData.displayName || '',
    toEmail: targetUserData.emailLower || '',
    role,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
}

/**
 * Accept a collection invitation
 */
export async function acceptCollectionInvitation(invitationId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const invitationRef = doc(db, 'collectionInvitations', invitationId);
  const invitationSnap = await getDoc(invitationRef);
  
  if (!invitationSnap.exists()) {
    throw new Error("Invitation not found");
  }

  const invitation = invitationSnap.data();
  
  if (invitation.toUserId !== user.uid) {
    throw new Error("This invitation is not for you");
  }

  if (invitation.status !== 'pending') {
    throw new Error("This invitation has already been responded to");
  }

  // Check if invitation has expired
  if (invitation.expiresAt.toDate() < new Date()) {
    throw new Error("This invitation has expired");
  }

  const batch = writeBatch(db);

  // Add user to collection
  const collectionRef = doc(db, 'collaborativeCollections', invitation.collectionId);
  const userMemberData = {
    role: invitation.role,
    joinedAt: new Date(),
    displayName: user.displayName || user.email || 'Anonymous',
    email: user.email || '',
    avatarUrl: '' // You can get this from user profile if needed
  };

  batch.update(collectionRef, {
    [`members.${user.uid}`]: userMemberData,
    updatedAt: new Date()
  });

  // Add to user's collection memberships
  const membershipRef = doc(db, 'users', user.uid, 'collectionMemberships', invitation.collectionId);
  batch.set(membershipRef, {
    role: invitation.role,
    joinedAt: new Date(),
    collectionTitle: invitation.collectionTitle
  });

  // Mark invitation as accepted
  batch.update(invitationRef, {
    status: 'accepted',
    respondedAt: new Date()
  });

  await batch.commit();
}

/**
 * Reject a collection invitation
 */
export async function rejectCollectionInvitation(invitationId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const invitationRef = doc(db, 'collectionInvitations', invitationId);
  await updateDoc(invitationRef, {
    status: 'rejected',
    respondedAt: new Date()
  });
}

/**
 * Add activity to collaborative collection
 */
export async function addActivityToCollaborativeCollection(collectionId, activity) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  const userRole = collectionData.members?.[user.uid]?.role;
  
  // Check permissions
  if (!userRole) {
    throw new Error("You are not a member of this collection");
  }

  if (!collectionData.allowMembersToAdd && userRole !== COLLECTION_ROLES.OWNER) {
    throw new Error("Only the owner can add activities to this collection");
  }

  // Normalize activity data
  const normalizedActivity = {
    id: activity.id,
    name: activity.name || '',
    rating: activity.rating || 0,
    types: activity.types || [],
    photoUrls: activity.photoUrls || [],
    photoPaths: activity.photoPaths || [],
    formatted_address: activity.formatted_address || '',
    phoneNumber: activity.phoneNumber || '',
    website: activity.website || '',
    openingHours: activity.openingHours || [],
    description: activity.description || '',
    addedBy: user.uid,
    addedByName: user.displayName || user.email || 'Anonymous',
    addedAt: new Date()
  };

  // Check if activity already exists
  const existingActivities = collectionData.activities || [];
  if (existingActivities.some(a => a.id === activity.id)) {
    throw new Error("Activity is already in this collection");
  }

  // Add activity
  await updateDoc(collectionRef, {
    activities: arrayUnion(normalizedActivity),
    totalActivities: existingActivities.length + 1,
    lastActivityAddedAt: new Date(),
    updatedAt: new Date()
  });
}

/**
 * Remove activity from collaborative collection
 */
export async function removeActivityFromCollaborativeCollection(collectionId, activityId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  const userRole = collectionData.members?.[user.uid]?.role;
  
  if (!userRole) {
    throw new Error("You are not a member of this collection");
  }

  const activities = collectionData.activities || [];
  const activityToRemove = activities.find(a => a.id === activityId);
  
  if (!activityToRemove) {
    throw new Error("Activity not found in collection");
  }

  // Check permissions - owner can remove anything, others can only remove their own additions
  if (userRole !== COLLECTION_ROLES.OWNER && activityToRemove.addedBy !== user.uid) {
    throw new Error("You can only remove activities you added");
  }

  // Remove activity
  await updateDoc(collectionRef, {
    activities: arrayRemove(activityToRemove),
    totalActivities: Math.max(0, activities.length - 1),
    updatedAt: new Date()
  });
}

/**
 * Update collection member role
 */
export async function updateCollectionMemberRole(collectionId, memberId, newRole) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  
  // Only owner can change roles
  if (collectionData.owner !== user.uid) {
    throw new Error("Only the collection owner can change member roles");
  }

  // Can't change owner's role
  if (memberId === user.uid) {
    throw new Error("Cannot change owner's role");
  }

  if (!collectionData.members?.[memberId]) {
    throw new Error("User is not a member of this collection");
  }

  await updateDoc(collectionRef, {
    [`members.${memberId}.role`]: newRole,
    updatedAt: new Date()
  });
}

/**
 * Remove member from collection
 */
export async function removeMemberFromCollection(collectionId, memberId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  
  // Check permissions
  if (collectionData.owner !== user.uid && memberId !== user.uid) {
    throw new Error("You can only remove yourself or be removed by the owner");
  }

  // Can't remove the owner
  if (memberId === collectionData.owner) {
    throw new Error("Cannot remove the collection owner");
  }

  const batch = writeBatch(db);

  // Remove from collection members
  const newMembers = { ...collectionData.members };
  delete newMembers[memberId];
  
  batch.update(collectionRef, {
    members: newMembers,
    updatedAt: new Date()
  });

  // Remove from user's memberships
  const membershipRef = doc(db, 'users', memberId, 'collectionMemberships', collectionId);
  batch.delete(membershipRef);

  await batch.commit();
}

/**
 * Leave a collection (user removes themselves)
 */
export async function leaveCollection(collectionId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  await removeMemberFromCollection(collectionId, user.uid);
}

/**
 * Get all collections user is a member of
 */
export async function getUserCollaborativeCollections() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Get user's collection memberships
  const membershipsRef = collection(db, 'users', user.uid, 'collectionMemberships');
  const membershipsSnap = await getDocs(membershipsRef);
  
  if (membershipsSnap.empty) {
    return [];
  }

  // Get full collection data for each membership
  const collectionIds = membershipsSnap.docs.map(doc => doc.id);
  const collectionsPromises = collectionIds.map(id => 
    getDoc(doc(db, 'collaborativeCollections', id))
  );
  
  const collectionsSnaps = await Promise.all(collectionsPromises);
  
  return collectionsSnaps
    .filter(snap => snap.exists())
    .map(snap => ({
      id: snap.id,
      ...snap.data(),
      userRole: snap.data().members?.[user.uid]?.role || null
    }));
}

/**
 * Search for public collections
 */
export async function searchPublicCollections(searchTerm, limit = 20) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionsRef = collection(db, 'collaborativeCollections');
  const publicQuery = query(
    collectionsRef,
    where('privacy', '==', COLLECTION_PRIVACY.PUBLIC)
  );
  
  const snapshot = await getDocs(publicQuery);
  let results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Filter by search term if provided
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    results = results.filter(collection => 
      collection.title.toLowerCase().includes(term) ||
      collection.description.toLowerCase().includes(term)
    );
  }

  // Exclude collections user is already a member of
  results = results.filter(collection => !collection.members?.[user.uid]);

  return results.slice(0, limit);
}

/**
 * Join a public collection
 */
export async function joinPublicCollection(collectionId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  
  if (collectionData.privacy !== COLLECTION_PRIVACY.PUBLIC) {
    throw new Error("This collection is not public");
  }

  if (collectionData.members?.[user.uid]) {
    throw new Error("You are already a member of this collection");
  }

  const batch = writeBatch(db);

  // Add user to collection
  const userMemberData = {
    role: COLLECTION_ROLES.VIEWER,
    joinedAt: new Date(),
    displayName: user.displayName || user.email || 'Anonymous',
    email: user.email || '',
    avatarUrl: ''
  };

  batch.update(collectionRef, {
    [`members.${user.uid}`]: userMemberData,
    updatedAt: new Date()
  });

  // Add to user's memberships
  const membershipRef = doc(db, 'users', user.uid, 'collectionMemberships', collectionId);
  batch.set(membershipRef, {
    role: COLLECTION_ROLES.VIEWER,
    joinedAt: new Date(),
    collectionTitle: collectionData.title
  });

  await batch.commit();
}

/**
 * Update collection settings
 */
export async function updateCollectionSettings(collectionId, updates) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  
  // Only owner can update settings
  if (collectionData.owner !== user.uid) {
    throw new Error("Only the collection owner can update settings");
  }

  const allowedUpdates = [
    'title', 'description', 'privacy', 'allowMembersToAdd'
  ];
  
  const filteredUpdates = Object.keys(updates)
    .filter(key => allowedUpdates.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {});

  if (Object.keys(filteredUpdates).length === 0) {
    throw new Error("No valid updates provided");
  }

  await updateDoc(collectionRef, {
    ...filteredUpdates,
    updatedAt: new Date()
  });
}

/**
 * Delete a collaborative collection
 */
export async function deleteCollaborativeCollection(collectionId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  
  // Only owner can delete
  if (collectionData.owner !== user.uid) {
    throw new Error("Only the collection owner can delete this collection");
  }

  const batch = writeBatch(db);

  // Delete collection
  batch.delete(collectionRef);

  // Remove from all members' memberships
  const memberIds = Object.keys(collectionData.members || {});
  memberIds.forEach(memberId => {
    const membershipRef = doc(db, 'users', memberId, 'collectionMemberships', collectionId);
    batch.delete(membershipRef);
  });

  // Delete any pending invitations
  const invitationsRef = collection(db, 'collectionInvitations');
  const invitationsQuery = query(
    invitationsRef,
    where('collectionId', '==', collectionId),
    where('status', '==', 'pending')
  );
  const invitationsSnap = await getDocs(invitationsQuery);
  
  invitationsSnap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

/**
 * Get pending collection invitations for current user
 */
export async function getPendingCollectionInvitations() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const invitationsRef = collection(db, 'collectionInvitations');
  const q = query(
    invitationsRef,
    where('toUserId', '==', user.uid),
    where('status', '==', 'pending')
  );
  
  const snapshot = await getDocs(q);
  const invitations = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Filter out expired invitations
  const now = new Date();
  return invitations.filter(inv => 
    inv.expiresAt && inv.expiresAt.toDate() > now
  );
}

/**
 * Get collection activity feed (recent additions by all members)
 */
export async function getCollectionActivityFeed(collectionId, limit = 50) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  
  // Check if user is a member
  if (!collectionData.members?.[user.uid]) {
    throw new Error("You are not a member of this collection");
  }

  const activities = collectionData.activities || [];
  
  // Sort by when they were added (most recent first)
  return activities
    .sort((a, b) => {
      const aDate = a.addedAt?.toDate?.() || new Date(0);
      const bDate = b.addedAt?.toDate?.() || new Date(0);
      return bDate.getTime() - aDate.getTime();
    })
    .slice(0, limit);
}

/**
 * Set up real-time listener for collaborative collections
 */
export function subscribeToUserCollections(callback) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Listen to user's collection memberships
  const membershipsRef = collection(db, 'users', user.uid, 'collectionMemberships');
  
  return onSnapshot(membershipsRef, async (membershipsSnap) => {
    if (membershipsSnap.empty) {
      callback([]);
      return;
    }

    // Get full collection data for each membership
    const collectionIds = membershipsSnap.docs.map(doc => doc.id);
    const collectionsPromises = collectionIds.map(id => 
      getDoc(doc(db, 'collaborativeCollections', id))
    );
    
    try {
      const collectionsSnaps = await Promise.all(collectionsPromises);
      
      const collections = collectionsSnaps
        .filter(snap => snap.exists())
        .map(snap => ({
          id: snap.id,
          ...snap.data(),
          userRole: snap.data().members?.[user.uid]?.role || null
        }));

      callback(collections);
    } catch (error) {
      console.error('Error loading collaborative collections:', error);
      callback([]);
    }
  });
}

/**
 * Get collection members with their details
 */
export async function getCollectionMembers(collectionId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const collectionRef = doc(db, 'collaborativeCollections', collectionId);
  const collectionSnap = await getDoc(collectionRef);
  
  if (!collectionSnap.exists()) {
    throw new Error("Collection not found");
  }

  const collectionData = collectionSnap.data();
  
  // Check if user is a member
  if (!collectionData.members?.[user.uid]) {
    throw new Error("You are not a member of this collection");
  }

  return Object.entries(collectionData.members || {}).map(([userId, memberData]) => ({
    userId,
    ...memberData,
    isOwner: userId === collectionData.owner
  }));
}