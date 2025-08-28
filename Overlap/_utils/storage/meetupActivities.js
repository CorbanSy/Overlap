// _utils/storage/meetupActivities.js
import { doc, setDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';
import { fetchPlacesNearby } from './places';
import { doesPlaceMatchCategory } from './categoryMapping';

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

/**
 * Get activities from places database based on meetup criteria
 * @param {string} meetupId - The meetup ID
 * @param {number} userLat - User's latitude (default San Diego)
 * @param {number} userLng - User's longitude (default San Diego)
 * @returns {Promise<Array>} Array of activity objects
 */
export async function getMeetupActivitiesFromPlaces(
  meetupId, 
  userLat = 32.7157, // San Diego default
  userLng = -117.1611
) {
  try {
    console.log(`[getMeetupActivitiesFromPlaces] Starting fetch for meetupId: ${meetupId}`);
    
    // Get meetup details for filtering - ALWAYS fetch fresh from database
    const meetupDoc = await getDoc(doc(db, 'meetups', meetupId));
    if (!meetupDoc.exists()) {
      throw new Error('Meetup not found');
    }
    
    const meetupData = meetupDoc.data();
    
    // Extract filter criteria
    const category = meetupData.category; // 'Dining', 'Fitness', etc.
    const priceRange = meetupData.priceRange || 0; // 0-100
    const maxBudgetPerDollar = 25; // $25 per $ symbol
    
    console.log(`[getMeetupActivitiesFromPlaces] Fetching places for meetup ${meetupId}:`, {
      category,
      priceRange,
      location: `${userLat}, ${userLng}`
    });
    
    // Fetch places within 10km radius
    const allPlaces = await fetchPlacesNearby(userLat, userLng, 10);
    
    if (!allPlaces || allPlaces.length === 0) {
      console.log('[getMeetupActivitiesFromPlaces] No places found in the area');
      return [];
    }
    
    console.log(`[getMeetupActivitiesFromPlaces] Found ${allPlaces.length} total places in area`);
    
    // Filter places based on meetup criteria
    let filteredPlaces = allPlaces.filter(place => {
      // 1. Category filtering
      if (category && !doesPlaceMatchCategory(place, category)) {
        return false;
      }
      
      // 2. Price range filtering (if specified)
      if (priceRange > 0) {
        // Convert priceRange (0-100) to price level (1-4)
        const maxPriceLevel = Math.ceil(priceRange / maxBudgetPerDollar);
        const placePriceLevel = place.priceLevel || 1; // Default to $ if not specified
        
        if (placePriceLevel > maxPriceLevel) {
          return false;
        }
      }
      
      // 3. Basic quality filtering
      if (place.rating && place.rating < 3.0) {
        return false; // Filter out poorly rated places
      }
      
      // 4. Must have a name
      if (!place.name || place.name.trim() === '') {
        return false;
      }
      
      return true;
    });
    
    console.log(`[getMeetupActivitiesFromPlaces] After filtering by category "${category}": ${filteredPlaces.length} places match criteria`);
    
    // Sort by rating (highest first), then by review count
    filteredPlaces.sort((a, b) => {
      // Primary sort: rating (descending)
      if (b.rating !== a.rating) {
        return (b.rating || 0) - (a.rating || 0);
      }
      // Secondary sort: review count (descending)
      return (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0);
    });
    
    // Limit to top 50 places maximum
    const limitedPlaces = filteredPlaces.slice(0, 50);
    
    console.log(`[getMeetupActivitiesFromPlaces] Returning ${limitedPlaces.length} activities for swiping`);
    
    // Convert to the format expected by SwipingScreen
    const result = limitedPlaces.map(place => ({
      id: place.id || place.place_id,
      name: place.name,
      rating: place.rating,
      photoUrls: place.photos || [], // URLs to images
      address: place.formatted_address,
      category: place.types?.[0], // Primary category
      priceLevel: place.priceLevel,
      description: place.description || ''
    }));
    
    console.log(`[getMeetupActivitiesFromPlaces] Sample activities:`, result.slice(0, 3).map(r => r.name));
    
    return result;
    
  } catch (error) {
    console.error('[getMeetupActivitiesFromPlaces] Error fetching meetup activities from places:', error);
    throw error;
  }
}

/**
 * Get activities from places database with explicit category override
 * This bypasses the database lookup for category and uses the provided category directly
 * @param {string} meetupId - The meetup ID
 * @param {number} userLat - User's latitude (default San Diego)
 * @param {number} userLng - User's longitude (default San Diego)
 * @param {string} categoryOverride - Category to use instead of fetching from database
 * @returns {Promise<Array>} Array of activity objects
 */
export async function getMeetupActivitiesFromPlacesWithCategory(
  meetupId, 
  userLat = 32.7157, // San Diego default
  userLng = -117.1611,
  categoryOverride = null
) {
  try {
    console.log(`[getMeetupActivitiesFromPlacesWithCategory] Starting fetch for meetupId: ${meetupId} with category override: ${categoryOverride}`);
    
    // Still need to fetch meetup for other criteria like priceRange, but use category override
    const meetupDoc = await getDoc(doc(db, 'meetups', meetupId));
    if (!meetupDoc.exists()) {
      throw new Error('Meetup not found');
    }
    
    const meetupData = meetupDoc.data();
    
    // Use the override category instead of database category
    const category = categoryOverride || meetupData.category || 'Dining';
    const priceRange = meetupData.priceRange || 0; // 0-100
    const maxBudgetPerDollar = 25; // $25 per $ symbol
    
    console.log(`[getMeetupActivitiesFromPlacesWithCategory] Using category: ${category} (override: ${!!categoryOverride})`);
    console.log(`[getMeetupActivitiesFromPlacesWithCategory] Fetching places for meetup ${meetupId}:`, {
      category,
      priceRange,
      location: `${userLat}, ${userLng}`
    });
    
    // Fetch places within 10km radius
    const allPlaces = await fetchPlacesNearby(userLat, userLng, 10);
    
    if (!allPlaces || allPlaces.length === 0) {
      console.log('[getMeetupActivitiesFromPlacesWithCategory] No places found in the area');
      return [];
    }
    
    console.log(`[getMeetupActivitiesFromPlacesWithCategory] Found ${allPlaces.length} total places in area`);
    
    // Filter places based on meetup criteria using the override category
    let filteredPlaces = allPlaces.filter(place => {
      // 1. Category filtering using the explicit category
      if (category && !doesPlaceMatchCategory(place, category)) {
        return false;
      }
      
      // 2. Price range filtering (if specified)
      if (priceRange > 0) {
        const maxPriceLevel = Math.ceil(priceRange / maxBudgetPerDollar);
        const placePriceLevel = place.priceLevel || 1;
        
        if (placePriceLevel > maxPriceLevel) {
          return false;
        }
      }
      
      // 3. Basic quality filtering
      if (place.rating && place.rating < 3.0) {
        return false;
      }
      
      // 4. Must have a name
      if (!place.name || place.name.trim() === '') {
        return false;
      }
      
      return true;
    });
    
    console.log(`[getMeetupActivitiesFromPlacesWithCategory] After filtering by category "${category}": ${filteredPlaces.length} places match criteria`);
    
    // Sort by rating (highest first), then by review count
    filteredPlaces.sort((a, b) => {
      if (b.rating !== a.rating) {
        return (b.rating || 0) - (a.rating || 0);
      }
      return (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0);
    });
    
    // Limit to top 50 places maximum
    const limitedPlaces = filteredPlaces.slice(0, 50);
    
    console.log(`[getMeetupActivitiesFromPlacesWithCategory] Returning ${limitedPlaces.length} activities for swiping`);
    
    // Convert to the format expected by SwipingScreen
    const result = limitedPlaces.map(place => ({
      id: place.id || place.place_id,
      name: place.name,
      rating: place.rating,
      photoUrls: place.photos || [],
      address: place.formatted_address,
      category: place.types?.[0],
      priceLevel: place.priceLevel,
      description: place.description || ''
    }));
    
    console.log(`[getMeetupActivitiesFromPlacesWithCategory] Sample activities:`, result.slice(0, 3).map(r => r.name));
    
    return result;
    
  } catch (error) {
    console.error('[getMeetupActivitiesFromPlacesWithCategory] Error fetching meetup activities from places:', error);
    throw error;
  }
}