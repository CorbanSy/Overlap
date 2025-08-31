// _utils//collectionsMigration.js
import { 
  collection, getDocs, doc, getDoc, setDoc, writeBatch 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';
import { COLLECTION_ROLES, COLLECTION_PRIVACY } from '../storage/collaborativeCollections';

/**
 * Migrate existing user collections to collaborative collections
 * Run this once for all existing users
 */
export async function migrateUserCollectionsToCollaborative() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  console.log('🔄 Starting migration for user:', user.uid);

  try {
    // Get all existing collections for this user
    const oldCollectionsRef = collection(db, `users/${user.uid}/collections`);
    const oldCollectionsSnap = await getDocs(oldCollectionsRef);

    if (oldCollectionsSnap.empty) {
      console.log('✅ No collections to migrate');
      return;
    }

    // Get user profile data for member info
    const userProfileRef = doc(db, `users/${user.uid}/profile/main`);
    const userProfileSnap = await getDoc(userProfileRef);
    const profileData = userProfileSnap.exists() ? userProfileSnap.data() : {};

    // Get user directory data
    const userDirRef = doc(db, 'userDirectory', user.uid);
    const userDirSnap = await getDoc(userDirRef);
    const dirData = userDirSnap.exists() ? userDirSnap.data() : {};

    const userMemberData = {
      role: COLLECTION_ROLES.OWNER,
      joinedAt: new Date(),
      displayName: profileData.name || dirData.displayName || user.displayName || user.email || 'Anonymous',
      email: user.email || '',
      avatarUrl: profileData.avatarUrl || dirData.avatarUrl || ''
    };

    const batch = writeBatch(db);
    let migratedCount = 0;

    // Process each old collection
    for (const oldDoc of oldCollectionsSnap.docs) {
      const oldData = oldDoc.data();
      
      // Create new collaborative collection
      const newCollectionRef = doc(collection(db, 'collaborativeCollections'));
      const newCollectionData = {
        title: oldData.title || 'Untitled Collection',
        description: oldData.description || '',
        privacy: COLLECTION_PRIVACY.PRIVATE, // Default to private for migrated collections
        allowMembersToAdd: true,
        owner: user.uid,
        members: {
          [user.uid]: userMemberData
        },
        activities: (oldData.activities || []).map(activity => ({
          ...activity,
          addedBy: user.uid,
          addedByName: userMemberData.displayName,
          addedAt: oldData.createdAt || new Date()
        })),
        createdAt: oldData.createdAt || new Date(),
        updatedAt: new Date(),
        lastActivityAddedAt: oldData.createdAt || new Date(),
        totalActivities: (oldData.activities || []).length,
        // Keep reference to old collection for debugging
        migratedFrom: `users/${user.uid}/collections/${oldDoc.id}`
      };

      batch.set(newCollectionRef, newCollectionData);

      // Add to user's collection memberships
      const membershipRef = doc(db, 'users', user.uid, 'collectionMemberships', newCollectionRef.id);
      batch.set(membershipRef, {
        role: COLLECTION_ROLES.OWNER,
        joinedAt: new Date(),
        collectionTitle: newCollectionData.title
      });

      migratedCount++;
    }

    // Commit all changes
    await batch.commit();
    
    console.log(`✅ Successfully migrated ${migratedCount} collections`);
    return migratedCount;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Check if user has already been migrated
 */
export async function checkMigrationStatus() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return false;

  try {
    // Check if user has any collection memberships (new system)
    const membershipsRef = collection(db, 'users', user.uid, 'collectionMemberships');
    const membershipsSnap = await getDocs(membershipsRef);
    
    // Check if user has old collections
    const oldCollectionsRef = collection(db, `users/${user.uid}/collections`);
    const oldCollectionsSnap = await getDocs(oldCollectionsRef);

    return {
    hasNewCollections: !membershipsSnap.empty,
    hasOldCollections: !oldCollectionsSnap.empty,
    needsMigration: membershipsSnap.empty && !oldCollectionsSnap.empty  // Fixed logic
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return { hasNewCollections: false, hasOldCollections: false, needsMigration: false };
  }
}