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
    collections: normalizeCollections(meetupData.collections || []),
    code: meetupData.code,
  };

  // Build additional fields - only include creator in participants initially
  const data = {
    ...cleanedData,
    creatorId: user.uid,
    participants: [user.uid], // Only creator initially
    invitedFriends: cleanedData.friends, // Store invited friends separately
    createdAt: new Date(),
    ongoing: false,
  };

  console.log("Final meetup data sent to Firestore:", data);

  // Use a batch to create meetup and creator reference atomically
  const batch = writeBatch(db);
  
  // Create the meetup document
  const meetupRef = doc(collection(db, "meetups"));
  const meetupId = meetupRef.id;
  
  // Add meetupId to the data
  data.meetupId = meetupId;
  batch.set(meetupRef, data);
  
  // Add meetup reference ONLY to creator's meetups subcollection
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
  if (!meetupData.id) throw new Error('No meetup id provided');

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const meetupRef = doc(db, 'meetups', meetupData.id);
  const existingSnap = await getDoc(meetupRef);
  if (!existingSnap.exists()) throw new Error('Meetup not found');
  const existing = existingSnap.data();

  // Only the creator/host can change details
  const isHost = user.uid === existing.creatorId;
  const attemptedDetailFields = [
    'eventName','mood','description','restrictions','category',
    'groupSize','date','time','priceRange','location','code',
    'ongoing','friends','collections'
  ].some((k) => meetupData[k] !== undefined);

  if (attemptedDetailFields && !isHost) {
    throw new Error('Only the host can edit this meetup.');
  }

  // Build minimal update set
  const updateFields = {};
  if (meetupData.eventName !== undefined) updateFields.eventName = meetupData.eventName;
  if (meetupData.mood !== undefined) updateFields.mood = meetupData.mood;
  if (meetupData.description !== undefined) updateFields.description = meetupData.description;
  if (meetupData.restrictions !== undefined) updateFields.restrictions = meetupData.restrictions;
  if (meetupData.category !== undefined) updateFields.category = meetupData.category;
  if (meetupData.groupSize !== undefined) updateFields.groupSize = meetupData.groupSize;
  if (meetupData.date !== undefined) updateFields.date = meetupData.date;
  if (meetupData.time !== undefined) updateFields.time = meetupData.time;
  if (meetupData.priceRange !== undefined) updateFields.priceRange = meetupData.priceRange;
  if (meetupData.location !== undefined) updateFields.location = meetupData.location;
  if (meetupData.code !== undefined) updateFields.code = meetupData.code;
  if (meetupData.ongoing !== undefined) updateFields.ongoing = meetupData.ongoing;

  if (meetupData.friends !== undefined) updateFields.friends = meetupData.friends;
  if (meetupData.collections !== undefined) {
    updateFields.collections = normalizeCollections(meetupData.collections);
  }

  if (Object.keys(updateFields).length === 0) return; // nothing to update

  // Update the main meetup document
  await updateDoc(meetupRef, updateFields);

  // Propagate mirrored fields to participants' user subcollections
  const mirrorKeys = ['eventName','ongoing','category','date','time','location'];
  const needsMirror = mirrorKeys.some((k) => updateFields[k] !== undefined);

  if (needsMirror) {
    const refreshed = await getDoc(meetupRef);
    const full = refreshed.data();

    if (full && Array.isArray(full.participants)) {
      const batch = writeBatch(db);
      full.participants.forEach((participantId) => {
        const userMeetupRef = doc(db, 'users', participantId, 'meetups', meetupData.id);
        const mirrorUpdate = {};
        mirrorKeys.forEach((k) => {
          if (updateFields[k] !== undefined) mirrorUpdate[k] = updateFields[k];
        });
        if (Object.keys(mirrorUpdate).length > 0) batch.update(userMeetupRef, mirrorUpdate);
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

// REMOVED: acceptMeetupInvite function - use the one in meetupInvites.js instead

// Function to remove a user from a meetup (for leaving)
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
  const updatedParticipants = (meetupData.participants || []).filter(id => id !== userId);
  batch.update(meetupRef, { participants: updatedParticipants });
  
  // Remove meetup reference from user's subcollection
  const userMeetupRef = doc(db, 'users', userId, 'meetups', meetupId);
  batch.delete(userMeetupRef);
  
  await batch.commit();
}

function normalizeCollections(cols = []) {
  if (!Array.isArray(cols)) return [];
  return cols.map((c) => ({
    id: c.id,
    title: c.title || c.name || 'Untitled Collection',
    // optional lightweight preview for UI
    activityCount: c.activityCount ?? (Array.isArray(c.activities) ? c.activities.length : 0),
    previewUrl: c.previewUrl 
      ?? c.activities?.[0]?.image 
      ?? c.activities?.[0]?.photoUrls?.[0] 
      ?? null,
  }));
}
export async function getMeetupStats() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  try {
    const userMeetupsRef = collection(db, 'users', user.uid, 'meetups');
    const userMeetupsSnapshot = await getDocs(userMeetupsRef);
    
    let activeCount = 0;
    let participantCount = 0;  // Changed from totalCount
    let hostedCount = 0;
    
    for (const docSnap of userMeetupsSnapshot.docs) {
      const meetupRef = docSnap.data();
      
      if (meetupRef.ongoing) {
        activeCount++;
      }
      
      if (meetupRef.isCreator) {
        hostedCount++;
      } else {
        // Only count as participant if NOT the creator
        participantCount++;
      }
    }
    
    return {
      active: activeCount,
      participant: participantCount,  // Changed from total
      hosted: hostedCount
    };
  } catch (error) {
    console.error('Error fetching meetup stats:', error);
    return { active: 0, participant: 0, hosted: 0 };  // Changed from total
  }
}