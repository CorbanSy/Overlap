// _utils/storage/meetups.js
import { 
  doc, setDoc, deleteDoc, getDoc, collection, getDocs, 
  addDoc, query, where, updateDoc 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

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
  };

  console.log("Final meetup data sent to Firestore:", data);

  // Create the meetup document
  const meetupRef = await addDoc(collection(db, "meetups"), data);
  
  // Add a meetupId field to the document
  await updateDoc(meetupRef, { meetupId: meetupRef.id });
  
  return meetupRef.id;
}
export async function getUserMeetups() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const meetupsColRef = collection(db, "meetups");

  // Query for meetups where the user is the creator
  const createdQuery = query(meetupsColRef, where("creatorId", "==", user.uid));
  const createdSnap = await getDocs(createdQuery);
  const createdMeetups = createdSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Query for meetups where the user is in the participants array
  const joinedQuery = query(meetupsColRef, where("participants", "array-contains", user.uid));
  const joinedSnap = await getDocs(joinedQuery);
  const joinedMeetups = joinedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Combine and deduplicate meetups
  const allMeetupsMap = new Map();
  createdMeetups.forEach(meetup => allMeetupsMap.set(meetup.id, meetup));
  joinedMeetups.forEach(meetup => allMeetupsMap.set(meetup.id, meetup));

  return Array.from(allMeetupsMap.values());
}

export async function getMeetupData(meetupId) {
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
  const meetupRef = doc(db, 'meetups', meetupData.id);
  
  // Build an object with only the fields that are defined
  const updateFields = {};
  if (meetupData.eventName !== undefined) updateFields.eventName = meetupData.eventName;
  if (meetupData.mood !== undefined) updateFields.mood = meetupData.mood;
  if (meetupData.description !== undefined) updateFields.description = meetupData.description;
  if (meetupData.restrictions !== undefined) updateFields.restrictions = meetupData.restrictions;
  if (meetupData.ongoing !== undefined) updateFields.ongoing = meetupData.ongoing;
  if (meetupData.friends !== undefined) updateFields.friends = meetupData.friends;
  
  await updateDoc(meetupRef, updateFields);
}

export async function removeMeetup(meetupId) {
  if (!meetupId) {
    throw new Error('No meetup id provided');
  }
  const meetupRef = doc(db, 'meetups', meetupId);
  await deleteDoc(meetupRef);
}
