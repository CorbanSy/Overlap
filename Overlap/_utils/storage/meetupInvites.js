// _utils/storage/meetupInvites.js
import { 
  doc, setDoc, getDoc, collection, getDocs, addDoc, query, where, 
  updateDoc, writeBatch 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';
import { exportMyLikesToMeetup } from './meetupActivities';

export async function sendMeetupInvite(meetupId, friend) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');
  
  await addDoc(collection(db, "meetupInvites"), {
    meetupId,
    invitedBy: user.uid,
    invitedFriendId: friend.uid,
    status: "pending",
    createdAt: new Date(),
  });
}

export async function getPendingMeetupInvites() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const invitesQuery = query(
    collection(db, "meetupInvites"),
    where("invitedFriendId", "==", user.uid),
    where("status", "==", "pending")
  );
  const querySnapshot = await getDocs(invitesQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// UNIFIED: Single acceptMeetupInvite function using batches for atomic operations
export async function acceptMeetupInvite(inviteId, meetupId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  // Get meetup data first
  const meetupRef = doc(db, "meetups", meetupId);
  const meetupSnap = await getDoc(meetupRef);
  if (!meetupSnap.exists()) {
    throw new Error("Meetup not found");
  }

  const meetupData = meetupSnap.data();

  // Check if user is already a participant
  if (meetupData.participants && meetupData.participants.includes(user.uid)) {
    const inviteRef = doc(db, "meetupInvites", inviteId);
    await updateDoc(inviteRef, { status: "accepted" });
    return;
  }

  // Try to get user data from friendships first (more reliable)
  let userData = null;
  
  try {
    const friendshipsQuery = query(
      collection(db, "friendships"),
      where("users", "array-contains", user.uid)
    );
    const friendshipsSnap = await getDocs(friendshipsQuery);
    
    friendshipsSnap.docs.forEach(doc => {
      const friendship = doc.data();
      if (friendship.userDetails && friendship.userDetails[user.uid]) {
        userData = friendship.userDetails[user.uid];
      }
    });
  } catch (error) {
    console.warn('Could not fetch friendship data:', error);
  }

  // Fallback to userDirectory if friendship data not found
  if (!userData) {
    const userDirRef = doc(db, 'userDirectory', user.uid);
    const userDirSnap = await getDoc(userDirRef);
    userData = userDirSnap.exists() ? userDirSnap.data() : {};
  }

  // Create friend object with better data priority
  const friendObject = {
    uid: user.uid,
    name: userData.name || userData.displayName || user.displayName || '',
    displayName: userData.displayName || userData.name || user.displayName || '',
    email: userData.email || userData.emailLower || user.email || '',
    avatarUrl: userData.avatarUrl || ''
  };

  // Rest of your existing batch logic...
  const batch = writeBatch(db);

  const inviteRef = doc(db, "meetupInvites", inviteId);
  batch.update(inviteRef, { status: "accepted" });

  const updatedParticipants = [...(meetupData.participants || [])];
  if (!updatedParticipants.includes(user.uid)) {
    updatedParticipants.push(user.uid);
  }

  const existingFriends = meetupData.friends || [];
  const existingFriendIndex = existingFriends.findIndex(f => f.uid === user.uid);
  
  let updatedFriends;
  if (existingFriendIndex >= 0) {
    updatedFriends = [...existingFriends];
    updatedFriends[existingFriendIndex] = friendObject;
  } else {
    updatedFriends = [...existingFriends, friendObject];
  }

  batch.update(meetupRef, { 
    participants: updatedParticipants,
    friends: updatedFriends
  });

  const userMeetupRef = doc(db, 'users', user.uid, 'meetups', meetupId);
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

export async function declineMeetupInvite(inviteId) {
  const inviteRef = doc(db, "meetupInvites", inviteId);
  await updateDoc(inviteRef, { status: "declined" });
}

export async function joinMeetup(inviteId) {
  const inviteRef = doc(db, "meetupInvites", inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error("Invite not found");
  const inviteData = inviteSnap.data();
  if (!inviteData.meetupId) throw new Error("Meetup ID missing in invite");

  // Accept the invite (this handles all the participant logic)
  await acceptMeetupInvite(inviteId, inviteData.meetupId);

  // Export user's likes to the meetup
  try {
    await exportMyLikesToMeetup(inviteData.meetupId);
  } catch (error) {
    console.warn('Failed to export likes to meetup:', error);
    // Don't fail the join operation if likes export fails
  }

  return inviteData.meetupId;
}

export async function joinMeetupByCode(inviteCode) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const meetupsColRef = collection(db, "meetups");
  const q = query(meetupsColRef, where("code", "==", inviteCode));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("No meetup found with the provided code.");

  const meetupDoc = snap.docs[0];
  const meetupData = meetupDoc.data();
  const meetupId = meetupDoc.id;

  // Check if user is already a participant
  if (meetupData.participants && meetupData.participants.includes(user.uid)) {
    throw new Error('You are already a participant in this meetup');
  }

  // Use a batch for atomic operations
  const batch = writeBatch(db);

  // 1. Add user to meetup participants
  const updatedParticipants = [...(meetupData.participants || []), user.uid];
  batch.update(doc(db, "meetups", meetupId), { participants: updatedParticipants });

  // 2. Add meetup reference to user's subcollection
  const userMeetupRef = doc(db, 'users', user.uid, 'meetups', meetupId);
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

  // Commit all operations atomically
  await batch.commit();

  // Export user's likes to the meetup
  try {
    await exportMyLikesToMeetup(meetupId);
  } catch (error) {
    console.warn('Failed to export likes to meetup:', error);
    // Don't fail the join operation if likes export fails
  }

  return meetupId;
}

export async function declineMeetup(inviteId) {
  await declineMeetupInvite(inviteId);
}