// _utils/storage/meetupParticipants.js
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs,
  query,
  where 
} from 'firebase/firestore';
import { db } from '../../FirebaseConfig';

export async function getMeetupParticipants(meetupId) {
  try {
    const meetupDoc = await getDoc(doc(db, 'meetups', meetupId));
    if (!meetupDoc.exists()) throw new Error('Meetup not found');

    const participantIds = meetupDoc.data().participants || [];
    if (participantIds.length === 0) return [];

    const participants = await Promise.all(
      participantIds.map(async (userId) => {
        try {
          // 1) userDirectory
          const dirSnap = await getDoc(doc(db, 'userDirectory', userId));
          const fromDir = dirSnap.exists() ? dirSnap.data() : null;

          // 2) users/{uid}/profile/main
          const profSnap = await getDoc(doc(db, 'users', userId, 'profile', 'main'));
          const fromProf = profSnap.exists() ? profSnap.data() : null;

          // 3) legacy users root
          const rootSnap = await getDoc(doc(db, 'users', userId));
          const fromRoot = rootSnap.exists() ? rootSnap.data() : null;

          const name =
            fromDir?.displayName ||
            fromProf?.name ||
            fromProf?.username ||
            fromRoot?.displayName ||
            fromRoot?.name ||
            'Unknown User';

          const profilePicture =
            (fromDir?.avatarUrl && String(fromDir.avatarUrl).trim()) ||
            (fromProf?.avatarUrl && String(fromProf.avatarUrl).trim()) ||
            (fromRoot?.avatarUrl && String(fromRoot.avatarUrl).trim()) ||
            (fromRoot?.profilePicture && String(fromRoot.profilePicture).trim()) ||
            (fromRoot?.photoURL && String(fromRoot.photoURL).trim()) ||
            null;

          const email = fromDir?.emailLower || fromProf?.email || fromRoot?.email || null;

          return { id: userId, name, profilePicture, email, source: 'merged' };
        } catch (e) {
          console.error(`Error fetching user ${userId}:`, e);
          return { id: userId, name: 'Unknown User', profilePicture: null, email: null, source: 'error' };
        }
      })
    );

    return participants;
  } catch (error) {
    console.error('❌ Error in getMeetupParticipants:', error);
    throw error;
  }
}

export async function getMeetupParticipantsCount(meetupId) {
  try {
    const meetupDoc = await getDoc(doc(db, 'meetups', meetupId));
    
    if (!meetupDoc.exists()) {
      return 0;
    }

    const meetupData = meetupDoc.data();
    const participants = meetupData.participants || [];
    
    return participants.length;
  } catch (error) {
    console.error('Error fetching participant count:', error);
    return 0;
  }
}

// Debug function to check what data is available
export async function debugMeetupParticipants(meetupId) {
  try {
    console.log('🔍 =================================');
    console.log('🔍 DEBUG: Meetup Participants');
    console.log('🔍 Meetup ID:', meetupId);
    console.log('🔍 =================================');

    // Check meetup document
    const meetupDoc = await getDoc(doc(db, 'meetups', meetupId));
    if (!meetupDoc.exists()) {
      console.error('❌ Meetup document does not exist');
      return;
    }

    const meetupData = meetupDoc.data();
    console.log('✅ Meetup data keys:', Object.keys(meetupData));
    console.log('✅ Participants field:', meetupData.participants);

    const participantIds = meetupData.participants || [];
    if (participantIds.length === 0) {
      console.log('⚠️ No participants in meetup');
      return;
    }

    // Check first participant in both collections
    const firstUserId = participantIds[0];
    console.log('🔍 Checking first user:', firstUserId);

    // Check userDirectory
    try {
      const userDirDoc = await getDoc(doc(db, 'userDirectory', firstUserId));
      if (userDirDoc.exists()) {
        console.log('✅ userDirectory data:', userDirDoc.data());
      } else {
        console.log('❌ User not found in userDirectory');
      }
    } catch (error) {
      console.log('❌ Error accessing userDirectory:', error.message);
    }

    // Check users collection
    try {
      const userDoc = await getDoc(doc(db, 'users', firstUserId));
      if (userDoc.exists()) {
        console.log('✅ users collection data:', userDoc.data());
      } else {
        console.log('❌ User not found in users collection');
      }
    } catch (error) {
      console.log('❌ Error accessing users collection:', error.message);
    }

    console.log('🔍 =================================');

  } catch (error) {
    console.error('❌ Debug function failed:', error);
  }
}

// Alternative method if participants are stored differently
export async function getMeetupParticipantsFromCollection(meetupId) {
  try {
    // If participants are stored as a subcollection
    const participantsRef = collection(db, 'meetups', meetupId, 'participants');
    const participantsSnap = await getDocs(participantsRef);

    const participants = await Promise.all(
      participantsSnap.docs.map(async (participantDoc) => {
        const participantData = participantDoc.data();
        const userId = participantData.userId || participantDoc.id;

        try {
          // Try userDirectory first
          let userData = null;
          try {
            const userDirDoc = await getDoc(doc(db, 'userDirectory', userId));
            if (userDirDoc.exists()) {
              userData = userDirDoc.data();
            }
          } catch (error) {
            console.warn(`Failed to fetch from userDirectory for ${userId}:`, error);
          }

          // Fall back to users collection
          if (!userData) {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              userData = userDoc.data();
            }
          }

          if (userData) {
            return {
              id: userId,
              name: userData.displayName || userData.name || userData.usernamePublic || 'Unknown User',
              profilePicture: userData.avatarUrl || userData.profilePicture || userData.photoURL || null,
              email: userData.email || userData.emailLower || null,
              joinedAt: participantData.joinedAt || null,
              role: participantData.role || 'participant',
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch user data for ${userId}:`, error);
        }

        return {
          id: userId,
          name: participantData.name || 'Unknown User',
          profilePicture: participantData.profilePicture || null,
          email: participantData.email || null,
          joinedAt: participantData.joinedAt || null,
          role: participantData.role || 'participant',
        };
      })
    );

    return participants;
  } catch (error) {
    console.error('Error fetching meetup participants from collection:', error);
    throw error;
  }
}