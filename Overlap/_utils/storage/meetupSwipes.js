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

export async function getMeetupLeaderboard(meetupId) {
  // grab all docs under /meetups/{meetupId}/swipes
  const swipesRef = collection(db, 'meetups', meetupId, 'swipes');
  const snap = await getDocs(swipesRef);

  // tally up yes/no per activity
  const tally = {};
  snap.docs.forEach(docSnap => {
    const { activityId, decision, name } = docSnap.data();
    // initialize
    if (!tally[activityId]) tally[activityId] = { yesCount: 0, noCount: 0 };
    // increment
    if (decision === 'yes') tally[activityId].yesCount++;
    else tally[activityId].noCount++;
    // also store name once
    tally[activityId].name = name;
  });

  // build leaderboard array
  return Object.entries(tally).map(([activityId, stats]) => ({
    name: stats.name || activityId,
    yesCount: stats.yesCount,
    noCount: stats.noCount,
  }));
}

export async function clearMeetupSwipes(meetupId) {
  const swipesColRef = collection(db, 'meetups', meetupId, 'swipes');
  const snap = await getDocs(swipesColRef);
  const batchDeletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(batchDeletes);
}
