import { doc, setDoc, getDoc, collection, getDocs, addDoc, query, where, updateDoc } from 'firebase/firestore';
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

export async function acceptMeetupInvite(inviteId, meetupId) {
  // Update the invite document's status
  const inviteRef = doc(db, "meetupInvites", inviteId);
  await updateDoc(inviteRef, { status: "accepted" });

  // Update the corresponding meetup document to ensure the user is in the participants
  const meetupRef = doc(db, "meetups", meetupId);
  const meetupSnap = await getDoc(meetupRef);
  if (meetupSnap.exists()) {
    const meetupData = meetupSnap.data();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!meetupData.participants.includes(user.uid)) {
      await updateDoc(meetupRef, {
        participants: [...meetupData.participants, user.uid]
      });
    }
  }
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

  // mark accepted + add participant if needed
  await acceptMeetupInvite(inviteId, inviteData.meetupId);

  // immediately mirror my likes into the meetup
  await exportMyLikesToMeetup(inviteData.meetupId);

  return inviteData.meetupId;
}

export async function joinMeetupByCode(inviteCode) {
  const meetupsColRef = collection(db, "meetups");
  const q = query(meetupsColRef, where("code", "==", inviteCode));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("No meetup found with the provided code.");

  const meetupDoc = snap.docs[0];
  const meetupData = meetupDoc.data();

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  if (!meetupData.participants.includes(user.uid)) {
    await updateDoc(doc(db, "meetups", meetupDoc.id), {
      participants: [...meetupData.participants, user.uid],
    });
  }
  await exportMyLikesToMeetup(meetupDoc.id);
  return meetupDoc.id;
}

export async function declineMeetup(inviteId) {
  await declineMeetupInvite(inviteId);
}
