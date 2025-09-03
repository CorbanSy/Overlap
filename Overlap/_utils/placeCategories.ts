// _utils/placeCategories.ts
// Canonical “broad buckets” used across the app (siloed recs, filters, etc.)
// Keep includedTypes limited to filterable Google Places (New) types.

export interface AppCategory {
  key: string;
  label: string;
  image: any;
  description: string;
  representativeType: string;
  includedTypes: string[];
  subCategories: { key: string; label: string }[];
}

export const PLACE_CATEGORIES: AppCategory[] = [
  {
    key: 'Dining',
    label: 'Dining',
    image: require('../assets/categoryImg/dining.png'),
    description: 'Restaurants, cafés, bakeries, and more.',
    representativeType: 'restaurant',
    includedTypes: [
      'restaurant',
      'cafe',
      'fine_dining_restaurant',
      'fast_food_restaurant',
    ],
    subCategories: [
      { key: 'restaurant', label: 'Restaurant' },
      { key: 'cafe', label: 'Cafe' },
      { key: 'fine_dining_restaurant', label: 'Fine Dining Restaurant' },
      { key: 'fast_food_restaurant', label: 'Fast Food Restaurant' },
    ],
  },

  {
    key: 'Nightlife',
    label: 'Nightlife',
    image: require('../assets/categoryImg/nightlife.png'),
    description: 'Bars, clubs, dancing spots, etc.',
    representativeType: 'night_club',
    includedTypes: [
      'night_club',
      'bar',
      'karaoke',
      'dance_hall',
    ],
    subCategories: [
      { key: 'night_club', label: 'Night Club' },
      { key: 'bar', label: 'Bar' },
      { key: 'karaoke', label: 'Karaoke' },
      { key: 'dance_hall', label: 'Dance Hall' },
    ],
  },

  {
    key: 'Shopping',
    label: 'Shopping',
    image: require('../assets/categoryImg/shopping.png'),
    description: 'Malls, outlets, and boutique stores.',
    representativeType: 'shopping_mall',
    includedTypes: [
      'shopping_mall',
      'market',
      'clothing_store',
      'grocery_store',
      'gift_shop',
    ],
    subCategories: [
      { key: 'shopping_mall', label: 'Shopping Mall' },
      { key: 'market', label: 'Market' },
      { key: 'clothing_store', label: 'Clothing Store' },
      { key: 'grocery_store', label: 'Grocery Store' },
      { key: 'gift_shop', label: 'Gift Shop' },
    ],
  },

  {
    key: 'Entertainment',
    label: 'Entertainment',
    image: require('../assets/categoryImg/entertainment.png'),
    description: 'Movies, arcades, comedy clubs, and more.',
    representativeType: 'movie_theater',
    includedTypes: [
      'movie_theater',
      'comedy_club',
      'video_arcade',
      'amusement_center',
      'amusement_park',
      'bowling_alley',
      'casino',
      'zoo',
    ],
    subCategories: [
      { key: 'movie_theater', label: 'Movie Theater' },
      { key: 'comedy_club', label: 'Comedy Club' },
      { key: 'video_arcade', label: 'Video Arcade' },
      { key: 'amusement_center', label: 'Amusement Center' },
      { key: 'amusement_park', label: 'Amusement Park' },
      { key: 'bowling_alley', label: 'Bowling Alley' },
      { key: 'casino', label: 'Casino' },
    ],
  },

  {
    key: 'ArtsAndCulture',
    label: 'Arts & Culture',
    image: require('../assets/categoryImg/art.png'),
    description: 'Museums, galleries, and cultural landmarks.',
    representativeType: 'cultural_landmark',
    includedTypes: [
      'art_gallery',
      'museum',
      'historical_place',
      'cultural_landmark',
      'auditorium',
      'performing_arts_theater',
      'sculpture',
      'opera_house',
    ],
    subCategories: [
      { key: 'art_gallery', label: 'Art Gallery' },
      { key: 'museum', label: 'Museum' },
      { key: 'historical_place', label: 'Historical Place' },
      { key: 'cultural_landmark', label: 'Cultural Landmark' },
      { key: 'auditorium', label: 'Auditorium' },
      { key: 'performing_arts_theater', label: 'Performing Arts Theater' },
      { key: 'sculpture', label: 'Sculpture' },
      { key: 'opera_house', label: 'Opera House' },
    ],
  },

  {
    key: 'Outdoors',
    label: 'Outdoors',
    image: require('../assets/categoryImg/outdoors.png'),
    description: 'Parks, campgrounds, beaches, etc.',
    representativeType: 'park',
    includedTypes: [
      'park',
      'beach',
      'campground',
      'hiking_area',
      'national_park',
      'ski_resort',
    ],
    subCategories: [
      { key: 'park', label: 'Park' },
      { key: 'beach', label: 'Beach' },
      { key: 'campground', label: 'Campground' },
      { key: 'hiking_area', label: 'Hiking Area' },
      { key: 'national_park', label: 'National Park' },
      { key: 'ski_resort', label: 'Ski Resort' },
    ],
  },

  {
    key: 'SportsAndFitness',
    label: 'Sports & Fitness',
    image: require('../assets/categoryImg/sports.png'),
    description: 'Gyms, golf courses, stadiums, skating rinks...',
    representativeType: 'fitness_center',
    includedTypes: [
      'gym',
      'fitness_center',
      'golf_course',
      'stadium',
      'arena',
      'athletic_field',
      'ice_skating_rink',
      'ski_resort',
      'sports_activity_location',
      'swimming_pool',
    ],
    subCategories: [
      { key: 'gym', label: 'Gym' },
      { key: 'fitness_center', label: 'Fitness Center' },
      { key: 'golf_course', label: 'Golf Course' },
      { key: 'stadium', label: 'Stadium' },
      { key: 'athletic_field', label: 'Athletic Field' },
      { key: 'ice_skating_rink', label: 'Ice Skating Rink' },
      { key: 'ski_resort', label: 'Ski Resort' },
    ],
  },

  {
    key: 'Wellness',
    label: 'Wellness',
    image: require('../assets/categoryImg/wellness.png'),
    description: 'Spas, saunas, massages, and more.',
    representativeType: 'spa',
    includedTypes: [
      'spa',
      'sauna',
      'massage',
      'yoga_studio',
    ],
    subCategories: [
      { key: 'spa', label: 'Spa' },
      { key: 'sauna', label: 'Sauna' },
      { key: 'massage', label: 'Massage' },
      { key: 'yoga_studio', label: 'Yoga Studio' },
    ],
  },

  {
    key: 'Gaming',
    label: 'Gaming',
    image: require('../assets/categoryImg/gaming.png'),
    description: 'Amusement parks, bowling, casinos, etc.',
    representativeType: 'amusement_park',
    includedTypes: [
      'amusement_park',
      'bowling_alley',
      'casino',
      'internet_cafe',
    ],
    subCategories: [
      { key: 'amusement_park', label: 'Amusement Park' },
      { key: 'bowling_alley', label: 'Bowling Alley' },
      { key: 'casino', label: 'Casino' },
      { key: 'internet_cafe', label: 'Internet Cafe' },
    ],
  },

  {
    key: 'Travel',
    label: 'Travel',
    image: require('../assets/categoryImg/travel.png'),
    description: 'Tourist attractions, event venues, visitor centers.',
    representativeType: 'tourist_attraction',
    includedTypes: [
      'tourist_attraction',
      'visitor_center',
      'event_venue',
      'hotel',
    ],
    subCategories: [
      { key: 'tourist_attraction', label: 'Tourist Attraction' },
      { key: 'visitor_center', label: 'Visitor Center' },
      { key: 'event_venue', label: 'Event Venue' },
      { key: 'hotel', label: 'Hotel' },
    ],
  },

  {
    key: 'FamilyFun',
    label: 'Family Fun',
    image: require('../assets/categoryImg/familyfun.png'),
    description: 'Kid-friendly outings, playgrounds, etc.',
    representativeType: 'playground',
    includedTypes: [
      'playground',
      'childrens_camp',
      'ice_skating_rink',
      'picnic_ground',
      'zoo',
      'water_park',
      'tourist_attraction',
      'botanical_garden',
      'aquarium',
    ],
    subCategories: [
      { key: 'playground', label: 'Playground' },
      { key: 'childrens_camp', label: 'Children\'s Camp' },
      { key: 'ice_skating_rink', label: 'Ice Skating Rink' },
      { key: 'picnic_ground', label: 'Picnic Ground' },
      { key: 'zoo', label: 'Zoo' },
      { key: 'water_park', label: 'Water Park' },
      { key: 'tourist_attraction', label: 'Tourist Attraction' },
      { key: 'botanical_garden', label: 'Botanical Garden' },
      { key: 'aquarium', label: 'Aquarium' },
    ],
  },

  {
    key: 'Education',
    label: 'Education',
    image: require('../assets/categoryImg/education.png'),
    description: 'Museums, planetariums, libraries, etc.',
    representativeType: 'museum',
    includedTypes: [
      'museum',
      'planetarium',
      'library',        // added to align with your default fetch types
      'state_park',     // you had this previously; keep if you want it under Education
    ],
    subCategories: [
      { key: 'museum', label: 'Museum' },
      { key: 'planetarium', label: 'Planetarium' },
      { key: 'library', label: 'Library' },
      { key: 'state_park', label: 'State Park' },
    ],
  },
];
