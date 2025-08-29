// _utils/storage/turboMeetup.js
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  getDoc,
  writeBatch,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

/**
 * Calculate minimum swipes per person based on group size
 */
export function getMinSwipesForGroupSize(groupSize) {
  if (groupSize <= 1) return 5;  // Solo mode - fewer swipes
  if (groupSize <= 2) return 6;  // Duo mode
  if (groupSize <= 4) return 8;
  if (groupSize <= 6) return 10;
  return 12; // 7+ people
}

/**
 * Calculate deathmatch duration based on group size
 */
export function getDeathmatchDuration(groupSize) {
  if (groupSize <= 1) return 20; // Solo gets less time
  if (groupSize <= 2) return 25; // Duo gets a bit more
  return groupSize <= 6 ? 30 : 45;
}

/**
 * Initialize turbo session
 */
export async function initializeTurboSession(meetupId, groupSize) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const minSwipesPerPerson = getMinSwipesForGroupSize(groupSize);
  const deathmatchDuration = getDeathmatchDuration(groupSize);

  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');

  await setDoc(turboRef, {
    state: 'lobby',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    groupSize,
    minSwipesPerPerson,
    deathmatchDuration,
    sprint: null,
    deathmatch: null,
    result: null,
    members: {},
  });

  return turboRef;
}

/**
 * Join turbo session (becomes active after any swipe)
 */
export async function joinTurboSession(meetupId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');

  await updateDoc(turboRef, {
    [`members.${user.uid}`]: {
      uid: user.uid,
      joinedAt: serverTimestamp(),
      swipes: 0,
      active: false,
    },
  });
}

/**
 * Start briefing phase
 */
export async function startTurboBriefing(meetupId) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');

  await updateDoc(turboRef, {
    state: 'briefing',
    briefingStartedAt: serverTimestamp(),
  });

  // Auto-advance to sprint after 6 seconds
  setTimeout(() => {
    startTurboSprint(meetupId);
  }, 6000);
}

/**
 * Start sprint phase
 */
export async function startTurboSprint(meetupId) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const sprintStartTime = new Date();
  const sprintEndTime = new Date(sprintStartTime.getTime() + 120000); // 120s max

  await updateDoc(turboRef, {
    state: 'sprint',
    sprint: {
      startedAt: serverTimestamp(),
      endsAt: sprintEndTime,
      benchmarkHit: false,
    },
  });
}

/**
 * Record turbo swipe and check for benchmark
 */
export async function recordTurboSwipe(meetupId, userId, activityId, decision, activityName) {
  const batch = writeBatch(db);

  // Record the swipe (one doc per user+activity keeps it idempotent per card)
  const swipeRef = doc(db, 'meetups', meetupId, 'swipes', `${userId}_${activityId}`);
  batch.set(swipeRef, {
    userId,
    activityId,
    decision,
    name: activityName,
    timestamp: serverTimestamp(),
  });

  // Update member stats
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  batch.update(turboRef, {
    [`members.${userId}.swipes`]: increment(1),
    [`members.${userId}.active`]: true, // active after any swipe
  });

  await batch.commit();

  // Check if we should trigger deathmatch
  await checkBenchmarkAndAdvance(meetupId);
}

/**
 * Subscribe to turbo session changes
 */
export function subscribeTurboSession(meetupId, callback) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  return onSnapshot(turboRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
}

/**
 * Vote in deathmatch
 */
export async function voteTurboDeathmatch(meetupId, choice) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);

  if (!turboSnap.exists() || turboSnap.data().state !== 'deathmatch') {
    throw new Error('Not in deathmatch phase');
  }

  const data = turboSnap.data();
  const currentVote = data.deathmatch?.voters?.[user.uid];

  const updates = {
    [`deathmatch.voters.${user.uid}`]: choice,
  };

  // If user switches sides, decrement previous bucket
  if (currentVote && currentVote !== choice) {
    updates[`deathmatch.votes${currentVote.toUpperCase()}`] = increment(-1);
  }

  // If first vote or changed vote, increment new bucket
  if (!currentVote || currentVote !== choice) {
    updates[`deathmatch.votes${choice.toUpperCase()}`] = increment(1);
  }

  await updateDoc(turboRef, updates);

  // Check for winner
  await checkDeathmatchWinner(meetupId);
}

/**
 * Force end deathmatch (for timer expiry or host decision)
 */
export async function endTurboDeathmatch(meetupId, hostChoice = null) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  if (!turboSnap.exists()) return;

  const data = turboSnap.data();
  const { votesA = 0, votesB = 0 } = data.deathmatch || {};

  let winner;
  let winningActivity;

  if (hostChoice) {
    winner = hostChoice;
    winningActivity =
      (hostChoice === 'A' ? data.top2?.[0] : data.top2?.[1]) ||
      data.top2?.[0] ||
      null;
  } else if (votesA > votesB) {
    winner = 'A';
    winningActivity = data.top2?.[0] || null;
  } else if (votesB > votesA) {
    winner = 'B';
    winningActivity = data.top2?.[1] || data.top2?.[0] || null;
  } else {
    winner = 'A';
    winningActivity = data.top2?.[0] || null;
  }

  await updateDoc(turboRef, {
    state: 'results',
    result: {
      winner,
      winningActivity,
      votesA,
      votesB,
      completedAt: serverTimestamp(),
      decidedBy: hostChoice ? 'host' : 'vote',
    },
  });
}

/* ================================
   Internal helpers (not exported)
================================ */

/**
 * Idempotent benchmark check + transition to deathmatch
 */
async function checkBenchmarkAndAdvance(meetupId) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  if (!turboSnap.exists()) return;

  const data = turboSnap.data();
  if (data.state !== 'sprint') return;

  // If benchmark was already hit but deathmatch never started, try again
  if (data.sprint?.benchmarkHit) {
    if (!data.deathmatch && data.state === 'sprint') {
      await advanceToTurboDeathmatch(meetupId);
    }
    return;
  }

  const members = data.members || {};
  const activeMembers = Object.values(members).filter((m) => (m?.swipes || 0) >= 1);
  const activeCount = activeMembers.length;
  if (activeCount < 1) return; // need at least one active member

  const minSwipesPerPerson = data.minSwipesPerPerson;

  // Benchmark target
  let benchmarkTarget;
  if (activeCount === 1) {
    // Solo: just need minimum
    benchmarkTarget = minSwipesPerPerson;
  } else {
    // Group: 80% of expected swipes
    benchmarkTarget = Math.ceil(0.8 * activeCount * minSwipesPerPerson);
  }

  const totalActiveSwipes = activeMembers.reduce((sum, m) => sum + (m?.swipes || 0), 0);

  let benchmarkMet = false;
  if (activeCount === 1) {
    benchmarkMet = totalActiveSwipes >= benchmarkTarget;
  } else {
    const membersAtMinimum = activeMembers.filter((m) => (m?.swipes || 0) >= minSwipesPerPerson).length;
    const pctAtMinimum = membersAtMinimum / activeCount;
    benchmarkMet = totalActiveSwipes >= benchmarkTarget || pctAtMinimum >= 0.8;
  }

  if (benchmarkMet) {
    // Mark as hit to prevent repeated triggers
    await updateDoc(turboRef, { 'sprint.benchmarkHit': true });
    await advanceToTurboDeathmatch(meetupId);
  }
}

/**
 * Compute top 2 activities from swipe tallies with robust fallbacks.
 * Returns array of 0, 1, or 2 items shaped like:
 *   { activityId, name, yesCount, noCount, totalVotes, approvalRating }
 */
async function getTop2Activities(meetupId) {
  const swipesRef = collection(db, 'meetups', meetupId, 'swipes');
  const swipesSnap = await getDocs(swipesRef);

  const tally = {};
  swipesSnap.docs.forEach((d) => {
    const { activityId, decision, name } = d.data();
    if (!tally[activityId]) {
      tally[activityId] = {
        activityId,
        name: name || activityId,
        yesCount: 0,
        noCount: 0,
      };
    }
    if (decision === 'right') tally[activityId].yesCount += 1;
    else if (decision === 'left') tally[activityId].noCount += 1;
  });

  const list = Object.values(tally).map((a) => {
    const totalVotes = a.yesCount + a.noCount;
    const approvalRating = totalVotes ? a.yesCount / totalVotes : 0;
    return { ...a, totalVotes, approvalRating };
  });

  // Prefer items with at least one YES, sorted by approval, then volume
  const preferred = list
    .filter((a) => a.yesCount > 0)
    .sort(
      (a, b) =>
        b.approvalRating - a.approvalRating || b.totalVotes - a.totalVotes
    );

  let top2 = preferred.slice(0, 2);

  // Fill remaining with highest totalVotes even if zero YES
  if (top2.length < 2) {
    const byTotal = [...list].sort((a, b) => b.totalVotes - a.totalVotes);
    for (const cand of byTotal) {
      if (!top2.find((t) => t.activityId === cand.activityId)) {
        top2.push(cand);
      }
      if (top2.length === 2) break;
    }
  }

  return top2;
}

/**
 * Advance to deathmatch (guaranteed to resolve state, even with few/no swipes)
 */
async function advanceToTurboDeathmatch(meetupId) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  if (!turboSnap.exists()) return;

  const data = turboSnap.data();
  const top2 = await getTop2Activities(meetupId);

  // If there are literally no tallies/swipes, fail-safe directly to results
  if (top2.length === 0) {
    await updateDoc(turboRef, {
      state: 'results',
      result: {
        winner: 'A',
        winningActivity: null,
        votesA: 0,
        votesB: 0,
        completedAt: serverTimestamp(),
        decidedBy: 'timeout',
      },
    });
    return;
  }

  // If only one activity, duplicate it to keep UI logic simple (A vs A)
  let finalTop2 = top2;
  if (top2.length === 1) {
    finalTop2 = [top2[0], { ...top2[0] }];
  }

  const deathmatchDuration = data.deathmatchDuration || getDeathmatchDuration(data.groupSize || 1);
  const deathmatchEndTime = new Date(Date.now() + deathmatchDuration * 1000);

  await updateDoc(turboRef, {
    state: 'deathmatch',
    top2: finalTop2,
    deathmatch: {
      startedAt: serverTimestamp(),
      endsAt: deathmatchEndTime,
      votesA: 0,
      votesB: 0,
      voters: {},
    },
  });
}

/**
 * Check for deathmatch winner
 */
async function checkDeathmatchWinner(meetupId) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  if (!turboSnap.exists()) return;

  const data = turboSnap.data();
  if (data.state !== 'deathmatch') return;

  const { votesA = 0, votesB = 0 } = data.deathmatch || {};
  const members = data.members || {};
  const activeCount = Object.values(members).filter((m) => m?.active).length;

  // Majority logic tuned for small groups
  let majorityNeeded;
  if (activeCount === 1) majorityNeeded = 1; // solo
  else if (activeCount === 2) majorityNeeded = 1; // first vote wins for duo (tweak if you prefer 2)
  else majorityNeeded = Math.floor(activeCount / 2) + 1;

  let winner = null;
  if (votesA >= majorityNeeded) winner = 'A';
  else if (votesB >= majorityNeeded) winner = 'B';

  if (winner) {
    const winningActivity =
      (winner === 'A' ? data.top2?.[0] : data.top2?.[1]) ||
      data.top2?.[0] ||
      null;

    await updateDoc(turboRef, {
      state: 'results',
      result: {
        winner,
        winningActivity,
        votesA,
        votesB,
        completedAt: serverTimestamp(),
      },
    });
  }
}
