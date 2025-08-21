// _utils/storage/meetupActivities.js
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';
export async function exportMyLikesToMeetup(meetupId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  // read ONLY my likes
  const likesColRef = collection(db, "users", user.uid, "likes");
  const snap = await getDocs(likesColRef);

  const writes = snap.docs.map(d => {
    const data = d.data();
    const destRef = doc(db, "meetups", meetupId, "likes", `${user.uid}_${d.id}`);
    return setDoc(destRef, {
      uid: user.uid,
      activityId: d.id,
      name: data.name || "",
      rating: data.rating || 0,
      photoUrls: data.photoUrls || [],
      createdAt: new Date(),
    }, { merge: true });
  });

  await Promise.all(writes);
}

export async function getMeetupLikes(meetupId) {
  const col = collection(db, "meetups", meetupId, "likes");
  const snap = await getDocs(col);
  // dedupe by activity
  const map = new Map();
  snap.docs.forEach(docSnap => {
    const d = docSnap.data();
    if (!map.has(d.activityId)) {
      map.set(d.activityId, {
        id: d.activityId,
        name: d.name || d.activityId,
        rating: d.rating || 0,
        photoUrls: d.photoUrls || [],
      });
    }
  });
  return Array.from(map.values());
}
