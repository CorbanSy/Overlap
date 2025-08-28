// _utils/categoryMapping.js

export const MEETUP_CATEGORY_TO_PLACE_TYPES = {
  'Dining': [
    'restaurant',
    'cafe',
    'bar'
  ],
  'Fitness': [
    'gym',
    'park'
  ],
  'Outdoors': [
    'park',
    'tourist_attraction',
    'zoo',
    'aquarium'
  ],
  'Movies': [
    'movie_theater'
  ],
  'Gaming': [
    'bowling_alley',
    'casino',
    'amusement_park'
  ],
  'Social': [
    'bar',
    'night_club',
    'cafe',
    'restaurant'
  ],
  'Music': [
    'night_club',
    'bar'
  ],
  'Shopping': [
    'shopping_mall'
  ],
  'Travel': [
    'tourist_attraction',
    'museum',
    'hotel'
  ],
  'Art': [
    'art_gallery',
    'museum'
  ],
  'Relaxing': [
    'spa',
    'park',
    'cafe'
  ],
  'Learning': [
    'library',
    'museum',
    'university',
    'school'
  ],
  'Cooking': [
    'restaurant',
    'cafe'
  ],
  'Nightlife': [
    'night_club',
    'bar'
  ]
};

// Helper function to get place types for a meetup category
export function getPlaceTypesForCategory(category) {
  return MEETUP_CATEGORY_TO_PLACE_TYPES[category] || [];
}

// Function to check if a place matches the meetup category
export function doesPlaceMatchCategory(place, meetupCategory) {
  const allowedTypes = getPlaceTypesForCategory(meetupCategory);
  
  if (!allowedTypes.length) {
    // If no specific mapping, allow all places
    return true;
  }
  
  // Check if any of the place's types match the allowed types
  const placeTypes = place.types || [];
  return allowedTypes.some(allowedType => 
    placeTypes.includes(allowedType)
  );
}