// _utils/storage/liveRecommendations.js
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  getDocs,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../FirebaseConfig';

// Wilson confidence interval calculation (90% confidence level)
function wilsonLowerBound(positive, total, confidence = 0.90) {
  if (total === 0) return 0;
  
  const z = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90%
  const p = positive / total;
  const denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const margin = (z / denominator) * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  
  return Math.max(0, centre - margin);
}

// Calculate minimum exposures needed based on participant count
function getMinExposures(participantCount) {
  return Math.max(3, Math.min(8, Math.ceil(0.6 * participantCount) + 2));
}

// Calculate strong recommendation threshold
function getStrongThreshold(participantCount) {
  return Math.min(10, Math.ceil(0.8 * participantCount));
}

// Initialize meetup meta document
export async function initializeMeetupMeta(meetupId, participantCount, activities) {
  const metaRef = doc(db, 'meetups', meetupId, 'meta', 'session');
  
  // Create deterministic order (sort by relevance/rating with light category mixing)
  const sortedActivities = [...activities].sort((a, b) => {
    // Primary sort: rating (desc)
    if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
    // Secondary: category diversity (simple hash-based mixing)
    const aHash = (a.category || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3;
    const bHash = (b.category || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3;
    return aHash - bHash;
  });

  // Cap activities: M = clamp(2×U + 6, 10, 30)
  const maxActivities = Math.max(10, Math.min(30, 2 * participantCount + 6));
  const cappedActivities = sortedActivities.slice(0, maxActivities);

  await setDoc(metaRef, {
    participantCount,
    currentIndex: 0,
    currentBanner: null,
    lastBannerUpdate: null,
    activityQueue: cappedActivities.map(a => ({
      id: a.id,
      name: a.name,
      category: a.category || 'Unknown'
    })),
    totalActivities: cappedActivities.length,
    sessionStarted: new Date(),
    finished: false
  });

  return cappedActivities;
}

// Get current session state
export async function getMeetupSession(meetupId) {
  const metaRef = doc(db, 'meetups', meetupId, 'meta', 'session');
  const snap = await getDoc(metaRef);
  return snap.exists() ? snap.data() : null;
}

// Record vote and update aggregations
export async function recordVoteWithAggregation(meetupId, userId, activityId, decision, activityName) {
  const batch = writeBatch(db);
  
  // Record individual vote
  const voteRef = doc(db, 'meetups', meetupId, 'votes', `${userId}_${activityId}`);
  batch.set(voteRef, {
    userId,
    activityId,
    like: decision === 'right',
    timestamp: new Date()
  });
  
  // Update aggregation
  const itemRef = doc(db, 'meetups', meetupId, 'items', activityId);
  const itemSnap = await getDoc(itemRef);
  
  let likes = 0, noes = 0, viewers = new Set();
  
  if (itemSnap.exists()) {
    const data = itemSnap.data();
    likes = data.likes || 0;
    noes = data.noes || 0;
    viewers = new Set(data.viewers || []);
  }
  
  // Update counts
  if (decision === 'right') likes++;
  else if (decision === 'left') noes++;
  viewers.add(userId);
  
  batch.set(itemRef, {
    activityId,
    activityName,
    likes,
    noes,
    viewers: Array.from(viewers),
    lastUpdated: new Date()
  }, { merge: true });
  
  await batch.commit();
  
  // Check for recommendation updates
  await checkRecommendationUpdates(meetupId);
}

// Update the checkRecommendationUpdates function to detect Great Matches
async function checkRecommendationUpdates(meetupId) {
  const [sessionSnap, itemsSnap] = await Promise.all([
    getDoc(doc(db, 'meetups', meetupId, 'meta', 'session')),
    getDocs(collection(db, 'meetups', meetupId, 'items'))
  ]);
  
  if (!sessionSnap.exists()) return;
  
  const session = sessionSnap.data();
  const participantCount = session.participantCount;
  const minExposures = getMinExposures(participantCount);
  const strongThreshold = getStrongThreshold(participantCount);
  
  let bestItem = null;
  let bestScore = 0;
  let hasUnanimous = false;
  let hasNearUnanimous = false;
  let hasGreatMatch = false;
  
  // Analyze all items
  itemsSnap.docs.forEach(doc => {
    const item = doc.data();
    const { likes, noes, viewers } = item;
    const totalVotes = likes + noes;
    const viewerCount = viewers.length;
    
    // Check for unanimous (highest priority)
    if (likes === participantCount && viewerCount === participantCount) {
      hasUnanimous = true;
      bestItem = { ...item, type: 'unanimous', score: 1.0 };
      return;
    }
    
    // Check for Great Match (second priority)
    if (!hasUnanimous && isGreatMatch(likes, participantCount, viewers)) {
      if (!hasGreatMatch || likes > (bestItem?.likes || 0)) {
        hasGreatMatch = true;
        bestItem = { 
          ...item, 
          type: 'great-match', 
          score: likes / participantCount,
          participantCount 
        };
      }
    }
    
    // Check for near-unanimous (third priority)
    if (!hasUnanimous && !hasGreatMatch && noes === 0 && likes >= Math.ceil(0.9 * participantCount) && viewerCount >= Math.ceil(0.9 * participantCount)) {
      if (!hasNearUnanimous || likes > (bestItem?.likes || 0)) {
        hasNearUnanimous = true;
        bestItem = { ...item, type: 'near-unanimous', score: likes / participantCount };
      }
    }
    
    // Calculate Wilson score for regular recommendations (lowest priority)
    if (!hasUnanimous && !hasGreatMatch && !hasNearUnanimous && viewerCount >= minExposures && totalVotes > 0) {
      const wilsonScore = wilsonLowerBound(likes, totalVotes, 0.90);
      
      // Strong recommendation
      if (wilsonScore >= 0.70 && viewerCount >= strongThreshold) {
        if (!bestItem || (bestItem.type === 'recommendation' && wilsonScore > bestItem.score)) {
          bestItem = { ...item, type: 'strong', score: wilsonScore };
        }
      }
      // Soft recommendation
      else if (wilsonScore >= 0.60) {
        if (!bestItem || (bestItem.type === 'recommendation' && wilsonScore > bestItem.score)) {
          bestItem = { ...item, type: 'soft', score: wilsonScore };
        }
      }
    }
  });
  
  // Update banner if significant improvement (debounced)
  const now = new Date();
  const lastUpdate = session.lastBannerUpdate?.toDate() || new Date(0);
  const canUpdate = (now - lastUpdate) > 15000; // 15 second debounce
  
  if (bestItem && canUpdate) {
    const currentScore = session.currentBanner?.score || 0;
    const scoreImprovement = bestItem.score - currentScore;
    
    // Always update for unanimous or great matches
    const shouldUpdate = hasUnanimous || hasGreatMatch || hasNearUnanimous || scoreImprovement >= 0.03;
    
    if (shouldUpdate) {
      await updateDoc(doc(db, 'meetups', meetupId, 'meta', 'session'), {
        currentBanner: bestItem,
        lastBannerUpdate: now
      });
    }
  }
}


// Auto-advance queue when current item hits minimum exposures
export async function checkAutoAdvance(meetupId) {
  const sessionSnap = await getDoc(doc(db, 'meetups', meetupId, 'meta', 'session'));
  if (!sessionSnap.exists()) return false;
  
  const session = sessionSnap.data();
  const { currentIndex, activityQueue, participantCount } = session;
  
  if (currentIndex >= activityQueue.length) return false;
  
  const currentActivity = activityQueue[currentIndex];
  const itemSnap = await getDoc(doc(db, 'meetups', meetupId, 'items', currentActivity.id));
  
  if (!itemSnap.exists()) return false;
  
  const item = itemSnap.data();
  const minExposures = getMinExposures(participantCount);
  
  // Advance if minimum exposures reached
  if (item.viewers.length >= minExposures) {
    const newIndex = currentIndex + 1;
    await updateDoc(doc(db, 'meetups', meetupId, 'meta', 'session'), {
      currentIndex: newIndex,
      finished: newIndex >= activityQueue.length
    });
    return true;
  }
  
  return false;
}

// Subscribe to real-time session updates
export function subscribeToMeetupSession(meetupId, callback) {
  const metaRef = doc(db, 'meetups', meetupId, 'meta', 'session');
  return onSnapshot(metaRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
}

// Subscribe to real-time item updates
export function subscribeToMeetupItems(meetupId, callback) {
  const itemsRef = collection(db, 'meetups', meetupId, 'items');
  return onSnapshot(itemsRef, (snap) => {
    const items = {};
    snap.docs.forEach(doc => {
      items[doc.id] = doc.data();
    });
    callback(items);
  });
}

// Get final recommendations (when session ends)
export async function getFinalRecommendations(meetupId) {
  const itemsSnap = await getDocs(collection(db, 'meetups', meetupId, 'items'));
  
  const recommendations = itemsSnap.docs
    .map(doc => {
      const item = doc.data();
      const totalVotes = item.likes + item.noes;
      return {
        ...item,
        score: totalVotes > 0 ? wilsonLowerBound(item.likes, totalVotes, 0.90) : 0,
        percentage: totalVotes > 0 ? (item.likes / totalVotes) * 100 : 0
      };
    })
    .filter(item => item.viewers.length > 0)
    .sort((a, b) => b.score - a.score);
  
  return recommendations;
}

// Finalize a recommendation (when user chooses to lock it in)
export async function finalizeRecommendation(meetupId, activityId) {
  await updateDoc(doc(db, 'meetups', meetupId, 'meta', 'session'), {
    finalizedActivity: activityId,
    finalizedAt: new Date(),
    finished: true
  });
}

// Clear all session data and start fresh
export async function resetMeetupSession(meetupId) {
  const batch = writeBatch(db);
  
  try {
    // Delete all votes
    const votesSnap = await getDocs(collection(db, 'meetups', meetupId, 'votes'));
    votesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete all items
    const itemsSnap = await getDocs(collection(db, 'meetups', meetupId, 'items'));
    itemsSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete session meta
    const metaRef = doc(db, 'meetups', meetupId, 'meta', 'session');
    batch.delete(metaRef);
    
    await batch.commit();
    console.log(`Session reset complete for meetup ${meetupId}`);
  } catch (error) {
    console.error('Error resetting session:', error);
    throw error;
  }
}

// Check if a session exists and is finished
export async function isSessionFinished(meetupId) {
  const sessionSnap = await getDoc(doc(db, 'meetups', meetupId, 'meta', 'session'));
  
  if (!sessionSnap.exists()) {
    return false; // No session means not finished
  }
  
  const session = sessionSnap.data();
  return session.finished === true || !!session.finalizedActivity;
}

// Restart session with new parameters (preserving participant count)
export async function restartMeetupSession(meetupId, activities, participantCount = null) {
  // First reset everything
  await resetMeetupSession(meetupId);
  
  // Get participant count if not provided
  let finalParticipantCount = participantCount;
  if (!finalParticipantCount) {
    const { getMeetupParticipantsCount } = await import('./meetupParticipants');
    finalParticipantCount = await getMeetupParticipantsCount(meetupId);
  }
  
  // Initialize new session
  return await initializeMeetupMeta(meetupId, finalParticipantCount, activities);
}

// Check if session should be reset (when category/filters change)
export async function shouldResetSession(meetupId, newCategory, currentCategory) {
  const session = await getMeetupSession(meetupId);
  
  // Reset if:
  // 1. Session is finished
  // 2. Category changed
  // 3. Session has votes but user wants to change parameters
  
  if (!session) return false; // No session to reset
  
  const isFinished = session.finished || !!session.finalizedActivity;
  const categoryChanged = newCategory !== currentCategory;
  const hasVotes = session.currentIndex > 0;
  
  return isFinished || (categoryChanged && hasVotes);
}

// Calculate if an item qualifies as a "Great Match"
function isGreatMatch(likes, totalParticipants, viewers) {
  // Must have significant exposure (at least 60% of participants have seen it)
  const minViewers = Math.max(3, Math.ceil(0.6 * totalParticipants));
  if (viewers.length < minViewers) return false;
  
  // Define the strong ratio thresholds
  const greatMatchRatios = [
    { participants: 4, requiredLikes: 3 },   // 3/4 = 75%
    { participants: 5, requiredLikes: 4 },   // 4/5 = 80%
    { participants: 6, requiredLikes: 5 },   // 5/6 = 83%
    { participants: 7, requiredLikes: 5 },   // 5/7 = 71%
    { participants: 8, requiredLikes: 6 },   // 6/8 = 75%
    { participants: 9, requiredLikes: 7 },   // 7/9 = 78%
    { participants: 10, requiredLikes: 8 },  // 8/10 = 80%
    { participants: 12, requiredLikes: 9 },  // 9/12 = 75%
    { participants: 15, requiredLikes: 11 }, // 11/15 = 73%
    { participants: 20, requiredLikes: 15 }, // 15/20 = 75%
  ];
  
  // For groups larger than 20, use 75% threshold
  if (totalParticipants > 20) {
    const threshold = Math.ceil(0.75 * totalParticipants);
    return likes >= threshold && likes < totalParticipants; // Not unanimous
  }
  
  // Find the matching ratio for this group size
  const matchingRatio = greatMatchRatios.find(ratio => ratio.participants === totalParticipants);
  if (matchingRatio) {
    return likes >= matchingRatio.requiredLikes && likes < totalParticipants;
  }
  
  // For sizes not in our predefined ratios, use 75% threshold
  const threshold = Math.ceil(0.75 * totalParticipants);
  return likes >= threshold && likes < totalParticipants;
}

export { isGreatMatch };