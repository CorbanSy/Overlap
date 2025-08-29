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
    console.log('🔍 Fetching participants for meetup:', meetupId);
    
    // Get the meetup document to access participants
    const meetupDoc = await getDoc(doc(db, 'meetups', meetupId));
    
    if (!meetupDoc.exists()) {
      console.error('❌ Meetup not found:', meetupId);
      throw new Error('Meetup not found');
    }

    const meetupData = meetupDoc.data();
    const participantIds = meetupData.participants || [];
    
    console.log('✅ Found participant IDs:', participantIds);

    if (participantIds.length === 0) {
      return [];
    }

    // Fetch user data for each participant - try userDirectory first, then users collection
    const participants = await Promise.all(
      participantIds.map(async (userId) => {
        try {
          console.log(`🔍 Fetching data for user: ${userId}`);
          
          // First, try userDirectory (this is more likely to be accessible)
          let userData = null;
          let source = '';
          
          try {
            const userDirDoc = await getDoc(doc(db, 'userDirectory', userId));
            if (userDirDoc.exists()) {
              userData = userDirDoc.data();
              source = 'userDirectory';
              console.log(`✅ Found user data in userDirectory for ${userId}`);
            }
          } catch (dirError) {
            console.warn(`⚠️ Failed to fetch from userDirectory for ${userId}:`, dirError.message);
          }

          // If not found in userDirectory, try users collection
          if (!userData) {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                userData = userDoc.data();
                source = 'users';
                console.log(`✅ Found user data in users collection for ${userId}`);
              }
            } catch (userError) {
              console.warn(`⚠️ Failed to fetch from users for ${userId}:`, userError.message);
            }
          }

          if (userData) {
            const participant = {
              id: userId,
              name: userData.displayName || userData.name || userData.usernamePublic || 'Unknown User',
              profilePicture: userData.avatarUrl || userData.profilePicture || userData.photoURL || null,
              email: userData.email || userData.emailLower || null,
              source: source // for debugging
            };
            console.log(`✅ Built participant data for ${userId}:`, participant.name);
            return participant;
          }
          
          // Fallback if no data found
          console.warn(`⚠️ No data found for user ${userId}, using fallback`);
          return {
            id: userId,
            name: 'Unknown User',
            profilePicture: null,
            email: null,
            source: 'fallback'
          };
          
        } catch (error) {
          console.error(`❌ Error fetching user data for ${userId}:`, error);
          return {
            id: userId,
            name: 'Unknown User',
            profilePicture: null,
            email: null,
            source: 'error'
          };
        }
      })
    );

    console.log('✅ Successfully fetched all participants:', participants.length);
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