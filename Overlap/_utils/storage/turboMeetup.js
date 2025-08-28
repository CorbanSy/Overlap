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
  increment 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

// Calculate minimum swipes per person based on group size
export function getMinSwipesForGroupSize(groupSize) {
  if (groupSize <= 4) return 8;
  if (groupSize <= 6) return 10;
  return 12; // 7-9 people
}

// Calculate deathmatch duration based on group size
export function getDeathmatchDuration(groupSize) {
  return groupSize <= 6 ? 30 : 45; // seconds
}

// Initialize turbo session
export async function initializeTurboSession(meetupId, groupSize) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

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

// Join turbo session (becomes active after 3 swipes)
export async function joinTurboSession(meetupId) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  
  await updateDoc(turboRef, {
    [`members.${user.uid}`]: {
      uid: user.uid,
      joinedAt: serverTimestamp(),
      swipes: 0,
      active: false,
    }
  });
}

// Start briefing phase
export async function startTurboBriefing(meetupId) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  
  await updateDoc(turboRef, {
    state: 'briefing',
    briefingStartedAt: serverTimestamp(),
  });

  // Auto-advance to sprint after 15 seconds
  setTimeout(() => {
    startTurboSprint(meetupId);
  }, 15000);
}

// Start sprint phase
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
    }
  });
}

// Record turbo swipe and check for benchmark
export async function recordTurboSwipe(meetupId, userId, activityId, decision, activityName) {
  const batch = writeBatch(db);
  
  // Record the swipe
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
    [`members.${userId}.active`]: true, // Active after any swipe for simplicity
  });

  await batch.commit();

  // Check if we should trigger deathmatch
  await checkBenchmarkAndAdvance(meetupId);
}

// Check benchmark and advance to deathmatch if met
async function checkBenchmarkAndAdvance(meetupId) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  
  if (!turboSnap.exists() || turboSnap.data().state !== 'sprint') {
    return;
  }

  const data = turboSnap.data();
  const members = data.members || {};
  
  // Count active members (≥3 swipes)
  const activeMembers = Object.values(members).filter(m => m.swipes >= 3);
  const activeCount = activeMembers.length;
  
  if (activeCount < 2) return; // Need at least 2 active members

  // Calculate benchmark
  const minSwipesPerPerson = data.minSwipesPerPerson;
  const benchmarkTarget = Math.ceil(0.8 * activeCount * minSwipesPerPerson);
  
  // Count total swipes from active members
  const totalActiveSwipes = activeMembers.reduce((sum, m) => sum + m.swipes, 0);
  
  // Check if 80% of active members hit their minimum
  const membersAtMinimum = activeMembers.filter(m => m.swipes >= minSwipesPerPerson).length;
  const percentageAtMinimum = membersAtMinimum / activeCount;
  
  // Trigger deathmatch if benchmark is met
  if (totalActiveSwipes >= benchmarkTarget || percentageAtMinimum >= 0.8) {
    await advanceToTurboDeathmatch(meetupId);
  }
}

// Advance to deathmatch phase
async function advanceToTurboDeathmatch(meetupId) {
  // Get top 2 activities
  const top2 = await getTop2Activities(meetupId);
  
  if (top2.length < 2) {
    console.warn('Not enough activities for deathmatch');
    return;
  }

  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  const deathmatchDuration = turboSnap.data().deathmatchDuration;
  
  const deathmatchEndTime = new Date(Date.now() + deathmatchDuration * 1000);

  await updateDoc(turboRef, {
    state: 'deathmatch',
    top2: top2,
    deathmatch: {
      startedAt: serverTimestamp(),
      endsAt: deathmatchEndTime,
      votesA: 0,
      votesB: 0,
      voters: {},
    }
  });
}

// Get top 2 activities by approval rating
async function getTop2Activities(meetupId) {
  const swipesRef = collection(db, 'meetups', meetupId, 'swipes');
  const swipesSnap = await getDocs(swipesRef);
  
  // Tally votes per activity
  const tally = {};
  swipesSnap.docs.forEach(doc => {
    const { activityId, decision, name } = doc.data();
    if (!tally[activityId]) {
      tally[activityId] = { 
        activityId, 
        name: name || activityId,
        yesCount: 0, 
        noCount: 0 
      };
    }
    if (decision === 'right') {
      tally[activityId].yesCount++;
    } else if (decision === 'left') {
      tally[activityId].noCount++;
    }
  });

  // Sort by approval rating (yes percentage), then by total votes
  const sortedActivities = Object.values(tally)
    .map(activity => ({
      ...activity,
      totalVotes: activity.yesCount + activity.noCount,
      approvalRating: activity.totalVotes > 0 ? 
        activity.yesCount / activity.totalVotes : 0
    }))
    .sort((a, b) => {
      if (b.approvalRating !== a.approvalRating) {
        return b.approvalRating - a.approvalRating;
      }
      return b.totalVotes - a.totalVotes;
    });

  return sortedActivities.slice(0, 2);
}

// Vote in deathmatch
export async function voteTurboDeathmatch(meetupId, choice) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in");

  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  
  if (!turboSnap.exists() || turboSnap.data().state !== 'deathmatch') {
    throw new Error('Not in deathmatch phase');
  }

  const data = turboSnap.data();
  const currentVote = data.deathmatch?.voters?.[user.uid];
  
  // Remove previous vote if any
  const updates = {
    [`deathmatch.voters.${user.uid}`]: choice,
  };
  
  if (currentVote && currentVote !== choice) {
    // Remove previous vote
    updates[`deathmatch.votes${currentVote.toUpperCase()}`] = increment(-1);
  }
  
  if (!currentVote || currentVote !== choice) {
    // Add new vote
    updates[`deathmatch.votes${choice.toUpperCase()}`] = increment(1);
  }

  await updateDoc(turboRef, updates);

  // Check for winner
  await checkDeathmatchWinner(meetupId);
}

// Check for deathmatch winner
async function checkDeathmatchWinner(meetupId) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  
  if (!turboSnap.exists() || turboSnap.data().state !== 'deathmatch') {
    return;
  }

  const data = turboSnap.data();
  const { votesA = 0, votesB = 0 } = data.deathmatch;
  const members = data.members || {};
  
  // Count active members
  const activeCount = Object.values(members).filter(m => m.active).length;
  const majorityNeeded = Math.floor(activeCount / 2) + 1;

  let winner = null;
  if (votesA >= majorityNeeded) {
    winner = 'A';
  } else if (votesB >= majorityNeeded) {
    winner = 'B';
  }

  if (winner) {
    const winningActivity = winner === 'A' ? data.top2[0] : data.top2[1];
    
    await updateDoc(turboRef, {
      state: 'results',
      result: {
        winner: winner,
        winningActivity: winningActivity,
        votesA: votesA,
        votesB: votesB,
        completedAt: serverTimestamp(),
      }
    });
  }
}

// Force end deathmatch (for timer expiry or host decision)
export async function endTurboDeathmatch(meetupId, hostChoice = null) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  const turboSnap = await getDoc(turboRef);
  
  if (!turboSnap.exists()) return;

  const data = turboSnap.data();
  const { votesA = 0, votesB = 0 } = data.deathmatch;
  
  let winner;
  let winningActivity;
  
  if (hostChoice) {
    // Host decided
    winner = hostChoice;
    winningActivity = hostChoice === 'A' ? data.top2[0] : data.top2[1];
  } else if (votesA > votesB) {
    winner = 'A';
    winningActivity = data.top2[0];
  } else if (votesB > votesA) {
    winner = 'B';
    winningActivity = data.top2[1];
  } else {
    // Tie - use tie-breakers (simplified: just pick A)
    winner = 'A';
    winningActivity = data.top2[0];
  }

  await updateDoc(turboRef, {
    state: 'results',
    result: {
      winner: winner,
      winningActivity: winningActivity,
      votesA: votesA,
      votesB: votesB,
      completedAt: serverTimestamp(),
      decidedBy: hostChoice ? 'host' : 'vote',
    }
  });
}

// Subscribe to turbo session changes
export function subscribeTurboSession(meetupId, callback) {
  const turboRef = doc(db, 'meetups', meetupId, 'turbo', 'session');
  return onSnapshot(turboRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
}