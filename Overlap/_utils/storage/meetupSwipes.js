import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
export async function recordSwipe(meetupId, userId, activityId, decision, name) {
  // doc ID could be `${userId}_${activityId}` to dedupe per user-activity
  const swipeDocRef = doc(db, 'meetups', meetupId, 'swipes', `${userId}_${activityId}`);
  await setDoc(swipeDocRef, {
    userId,
    activityId,
    decision,
    name,
    timestamp: new Date(),
  });
}

export async function getMeetupActivityLeaderboard(meetupId) {
  // grab all docs under /meetups/{meetupId}/swipes
  const swipesRef = collection(db, 'meetups', meetupId, 'swipes');
  const snap = await getDocs(swipesRef);

  // tally up yes/no per activity
  const tally = {};
  snap.docs.forEach(docSnap => {
    const { activityId, decision, name } = docSnap.data();
    // initialize
    if (!tally[activityId]) {
      tally[activityId] = { 
        yesCount: 0, 
        noCount: 0,
        activityId,
        activityName: name
      };
    }
    // increment based on decision
    if (decision === 'right') {
      tally[activityId].yesCount++;
    } else if (decision === 'left') {
      tally[activityId].noCount++;
    }
    // also store name
    tally[activityId].activityName = name;
  });

  // build leaderboard array with calculated fields
  return Object.values(tally).map(activity => ({
    activityId: activity.activityId,
    activityName: activity.activityName || activity.activityId,
    yesCount: activity.yesCount,
    noCount: activity.noCount,
    totalVotes: activity.yesCount + activity.noCount,
    yesPercentage: activity.yesCount + activity.noCount > 0 
      ? (activity.yesCount / (activity.yesCount + activity.noCount)) * 100 
      : 0,
  }));
}

export async function clearMeetupSwipes(meetupId) {
  const swipesColRef = collection(db, 'meetups', meetupId, 'swipes');
  const snap = await getDocs(swipesColRef);
  const batchDeletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(batchDeletes);
}
