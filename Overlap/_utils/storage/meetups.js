// _utils/storage/meetups.js
import { 
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, 
  addDoc, query, where, updateDoc, writeBatch
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

// Helper function to add meetup reference to user's meetups subcollection
async function addMeetupToUser(userId, meetupId, meetupData) {
  const userMeetupRef = doc(db, 'users', userId, 'meetups', meetupId);
  await setDoc(userMeetupRef, {
    meetupId,
    eventName: meetupData.eventName || '',
    createdAt: meetupData.createdAt || new Date(),
    isCreator: userId === meetupData.creatorId,
    role: userId === meetupData.creatorId ? 'creator' : 'participant',
    ongoing: meetupData.ongoing || false,
    // Store basic meetup info for quick access
    category: meetupData.category,
    date: meetupData.date,
    time: meetupData.time,
    location: meetupData.location,
  });
}

// Helper function to remove meetup reference from user's meetups subcollection
async function removeMeetupFromUser(userId, meetupId) {
  const userMeetupRef = doc(db, 'users', userId, 'meetups', meetupId);
  await deleteDoc(userMeetupRef);
}

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
    ongoing: false,
  };

  console.log("Final meetup data sent to Firestore:", data);

  // Use a batch to create meetup and user references atomically
  const batch = writeBatch(db);
  
  // Create the meetup document
  const meetupRef = doc(collection(db, "meetups"));
  const meetupId = meetupRef.id;
  
  // Add meetupId to the data
  data.meetupId = meetupId;
  batch.set(meetupRef, data);
  
  // Add meetup reference to creator's meetups subcollection
  const creatorMeetupRef = doc(db, 'users', user.uid, 'meetups', meetupId);
  batch.set(creatorMeetupRef, {
    meetupId,
    eventName: data.eventName,
    createdAt: data.createdAt,
    isCreator: true,
    role: 'creator',
    ongoing: false,
    category: data.category,
    date: data.date,
    time: data.time,
    location: data.location,
  });
  
  // Add meetup references to all participants' meetups subcollections
  invitedFriends.forEach(friend => {
    const participantMeetupRef = doc(db, 'users', friend.uid, 'meetups', meetupId);
    batch.set(participantMeetupRef, {
      meetupId,
      eventName: data.eventName,
      createdAt: data.createdAt,
      isCreator: false,
      role: 'participant',
      ongoing: false,
      category: data.category,
      date: data.date,
      time: data.time,
      location: data.location,
    });
  });
  
  // Commit the batch
  await batch.commit();
  
  return meetupId;
}

export async function getUserMeetups() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  try {
    // Get user's meetup references from their subcollection
    const userMeetupsRef = collection(db, 'users', user.uid, 'meetups');
    const userMeetupsSnapshot = await getDocs(userMeetupsRef);
    
    if (userMeetupsSnapshot.empty) {
      return [];
    }
    
    // Get the full meetup data for each meetup
    const meetupIds = userMeetupsSnapshot.docs.map(doc => doc.id);
    const meetupPromises = meetupIds.map(async (meetupId) => {
      try {
        const meetupRef = doc(db, 'meetups', meetupId);
        const meetupSnapshot = await getDoc(meetupRef);
        
        if (meetupSnapshot.exists()) {
          return { id: meetupSnapshot.id, ...meetupSnapshot.data() };
        } else {
          // If meetup doesn't exist anymore, clean up the reference
          await removeMeetupFromUser(user.uid, meetupId);
          return null;
        }
      } catch (error) {
        console.error(`Error fetching meetup ${meetupId}:`, error);
        return null;
      }
    });
    
    const meetups = await Promise.all(meetupPromises);
    return meetups.filter(meetup => meetup !== null);
    
  } catch (error) {
    console.error('Error fetching user meetups:', error);
    throw error;
  }
}

export async function getMeetupData(meetupId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Check if user has access to this meetup
  const userMeetupRef = doc(db, 'users', user.uid, 'meetups', meetupId);
  const userMeetupSnapshot = await getDoc(userMeetupRef);
  
  if (!userMeetupSnapshot.exists()) {
    throw new Error("You don't have access to this meetup");
  }

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

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const meetupRef = doc(db, 'meetups', meetupData.id);
  
  // Build an object with only the fields that are defined
  const updateFields = {};
  if (meetupData.eventName !== undefined) updateFields.eventName = meetupData.eventName;
  if (meetupData.mood !== undefined) updateFields.mood = meetupData.mood;
  if (meetupData.description !== undefined) updateFields.description = meetupData.description;
  if (meetupData.restrictions !== undefined) updateFields.restrictions = meetupData.restrictions;
  if (meetupData.ongoing !== undefined) updateFields.ongoing = meetupData.ongoing;
  if (meetupData.friends !== undefined) updateFields.friends = meetupData.friends;
  
  // Update the main meetup document
  await updateDoc(meetupRef, updateFields);
  
  // If certain fields changed, update user meetup references
  if (meetupData.eventName !== undefined || meetupData.ongoing !== undefined) {
    const meetupSnapshot = await getDoc(meetupRef);
    const meetupDataFull = meetupSnapshot.data();
    
    if (meetupDataFull && meetupDataFull.participants) {
      // Update all participants' user meetup references
      const batch = writeBatch(db);
      
      meetupDataFull.participants.forEach(participantId => {
        const userMeetupRef = doc(db, 'users', participantId, 'meetups', meetupData.id);
        const userUpdateFields = {};
        
        if (meetupData.eventName !== undefined) userUpdateFields.eventName = meetupData.eventName;
        if (meetupData.ongoing !== undefined) userUpdateFields.ongoing = meetupData.ongoing;
        
        if (Object.keys(userUpdateFields).length > 0) {
          batch.update(userMeetupRef, userUpdateFields);
        }
      });
      
      await batch.commit();
    }
  }
}

export async function removeMeetup(meetupId) {
  if (!meetupId) {
    throw new Error('No meetup id provided');
  }

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // Get the meetup data first to find all participants
  const meetupRef = doc(db, 'meetups', meetupId);
  const meetupSnapshot = await getDoc(meetupRef);
  
  if (!meetupSnapshot.exists()) {
    throw new Error('Meetup not found');
  }
  
  const meetupData = meetupSnapshot.data();
  
  // Check if user is the creator
  if (meetupData.creatorId !== user.uid) {
    throw new Error('Only the creator can delete this meetup');
  }

  // Use a batch to delete meetup and all user references atomically
  const batch = writeBatch(db);
  
  // Delete the main meetup document
  batch.delete(meetupRef);
  
  // Delete meetup references from all participants' subcollections
  if (meetupData.participants) {
    meetupData.participants.forEach(participantId => {
      const userMeetupRef = doc(db, 'users', participantId, 'meetups', meetupId);
      batch.delete(userMeetupRef);
    });
  }
  
  // Commit the batch
  await batch.commit();
}

// New function to add a user to an existing meetup (for joining via invite)
export async function addUserToMeetup(meetupId, userId) {
  const meetupRef = doc(db, 'meetups', meetupId);
  const meetupSnapshot = await getDoc(meetupRef);
  
  if (!meetupSnapshot.exists()) {
    throw new Error('Meetup not found');
  }
  
  const meetupData = meetupSnapshot.data();
  
  // Check if user is already a participant
  if (meetupData.participants.includes(userId)) {
    return; // User is already a participant
  }
  
  // Use a batch to update both the meetup and user references
  const batch = writeBatch(db);
  
  // Add user to participants array
  const updatedParticipants = [...meetupData.participants, userId];
  batch.update(meetupRef, { participants: updatedParticipants });
  
  // Add meetup reference to user's subcollection
  const userMeetupRef = doc(db, 'users', userId, 'meetups', meetupId);
  batch.set(userMeetupRef, {
    meetupId,
    eventName: meetupData.eventName || '',
    createdAt: meetupData.createdAt || new Date(),
    isCreator: false,
    role: 'participant',
    ongoing: meetupData.ongoing || false,
    category: meetupData.category,
    date: meetupData.date,
    time: meetupData.time,
    location: meetupData.location,
  });
  
  await batch.commit();
}

// New function to remove a user from a meetup (for leaving)
export async function removeUserFromMeetup(meetupId, userId) {
  const meetupRef = doc(db, 'meetups', meetupId);
  const meetupSnapshot = await getDoc(meetupRef);
  
  if (!meetupSnapshot.exists()) {
    throw new Error('Meetup not found');
  }
  
  const meetupData = meetupSnapshot.data();
  
  // Don't allow creator to leave their own meetup
  if (meetupData.creatorId === userId) {
    throw new Error('Creator cannot leave their own meetup. Delete the meetup instead.');
  }
  
  // Use a batch to update both the meetup and user references
  const batch = writeBatch(db);
  
  // Remove user from participants array
  const updatedParticipants = meetupData.participants.filter(id => id !== userId);
  batch.update(meetupRef, { participants: updatedParticipants });
  
  // Remove meetup reference from user's subcollection
  const userMeetupRef = doc(db, 'users', userId, 'meetups', meetupId);
  batch.delete(userMeetupRef);
  
  await batch.commit();
}