// home.tsx (updated for collaborative collections)
import React, { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Fuse from 'fuse.js';
import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';
import {
  getDocs,
  onSnapshot,
  collection,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFilters } from '../../context/FiltersContext';
import VennLoader from '../../components/vennloader';
import { getProfileData } from '../../_utils/storage/userProfile';
import { likePlace } from '../../_utils/storage/likesCollections';
import { storeReviewsForPlace } from '../../_utils/storage/reviews';
import { fetchPlaceDetails } from '../../_utils/storage/places';
import { PLACE_CATEGORIES } from '../../_utils/placeCategories';

// Import collaborative collections utilities
import { 
  subscribeToUserCollections,
  addActivityToCollaborativeCollection 
} from '../../_utils/storage/collaborativeCollections';

// Import components
import {
  HomeSearchHeader,
  HomeFilterBar,
  HomePlacesList,
} from '../../components/home_components';

// Import the new collaborative collection modal
import CollectionSelectionModal from '../../components/profile_components/modals/CollectionSelectionModal';

// Import filter modals
import {
  DistanceFilterModal,
  RatingFilterModal,
  TypesFilterModal,
  PriceFilterModal,
} from '../../components/home_components/FilterModals';

// Types
interface UserLocation {
  lat: number;
  lng: number;
}

interface Place {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  photos?: string[];
  types?: string[];
  location: UserLocation;
  liked?: boolean;
  saved?: boolean;
  preferenceScore?: number;
  openingHours?: string[];
  priceLevel?: number;
  distanceKm?: number; // Pre-calculated distance
  formatted_address?: string;
  phoneNumber?: string;
  website?: string;
  description?: string;
}

// Collaborative Collection interface
interface CollaborativeCollection {
  id: string;
  title: string;
  description?: string;
  activities?: any[];
  userRole: string;
  privacy: string;
  allowMembersToAdd: boolean;
  totalActivities: number;
}

// Constants
const SORT_OPTIONS = ['recommended', 'distance', 'rating'] as const;
const FUSE_OPTIONS = {
  keys: ['name', 'types'],
  threshold: 0.4,
  includeScore: true,
};
const PAGE_SIZE = 30;
const DEBOUNCE_DELAY = 300;

// Helpers
const deg2rad = (deg: number) => deg * (Math.PI / 180);

const getDistanceFromLatLonInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const mapGoogleTypesToCategory = (googleTypes: string[]): string[] => {
  if (!Array.isArray(googleTypes)) return [];
  const matched: string[] = [];
  for (const cat of PLACE_CATEGORIES) {
    if (cat.includedTypes?.some((t) => googleTypes.includes(t))) {
      matched.push(cat.key);
    }
  }
  return matched;
};

const calculatePlaceScore = (place: Place, currentCategory: string): number => {
  const matchedCategories = mapGoogleTypesToCategory(place.types || []);
  let score = 0;
  // Category match bonus
  matchedCategories.forEach((cat) => {
    if (cat === currentCategory) score += 10;
  });
  // Rating and popularity bonus
  score += (place.rating || 0) * 2;
  score += Math.min((place.userRatingsTotal || 0) / 100, 5);
  return score;
};

const checkIfPlaceIsOpen = (place: Place): { isOpen: boolean; status: string; nextChange?: string } => {
  if (!place.openingHours?.length) {
    return { isOpen: true, status: 'Hours Unknown' };
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const todayHours = place.openingHours[currentDay];
  
  if (!todayHours || todayHours.toLowerCase().includes('closed')) {
    // Check if it opens later today or tomorrow
    const tomorrowDay = (currentDay + 1) % 7;
    const tomorrowHours = place.openingHours[tomorrowDay];
    
    if (tomorrowHours && !tomorrowHours.toLowerCase().includes('closed')) {
      const openMatch = tomorrowHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (openMatch) {
        const [, openHour, openMin, openPeriod] = openMatch;
        return { 
          isOpen: false, 
          status: 'Closed',
          nextChange: `Opens tomorrow at ${openHour}:${openMin} ${openPeriod}`
        };
      }
    }
    
    return { isOpen: false, status: 'Closed' };
  }

  // Parse hours like "9:00 AM – 9:00 PM" or "9:00 AM - 9:00 PM"
  const timeMatch = todayHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM).*?(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  
  if (!timeMatch) {
    // Try to match 24-hour format like "09:00 - 21:00"
    const time24Match = todayHours.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    
    if (!time24Match) {
      return { isOpen: true, status: 'Open' };
    }
    
    const [, openHour, openMin, closeHour, closeMin] = time24Match;
    const openTime = parseInt(openHour) * 60 + parseInt(openMin);
    const closeTime = parseInt(closeHour) * 60 + parseInt(closeMin);
    
    const isOpen = currentTime >= openTime && currentTime < closeTime;
    const minutesToClose = closeTime - currentTime;
    const minutesToOpen = openTime - currentTime;

    if (isOpen) {
      if (minutesToClose <= 30) {
        return { 
          isOpen: true, 
          status: 'Closing Soon',
          nextChange: `Closes at ${closeHour}:${closeMin}`
        };
      }
      return { 
        isOpen: true, 
        status: 'Open',
        nextChange: `Closes at ${closeHour}:${closeMin}`
      };
    } else {
      return { 
        isOpen: false, 
        status: 'Closed',
        nextChange: minutesToOpen > 0 ? `Opens at ${openHour}:${openMin}` : undefined
      };
    }
  }

  const [, openHour, openMin, openPeriod, closeHour, closeMin, closePeriod] = timeMatch;
  
  // Convert to 24-hour format
  let openTime = parseInt(openHour) * 60 + parseInt(openMin);
  let closeTime = parseInt(closeHour) * 60 + parseInt(closeMin);
  
  if (openPeriod.toLowerCase() === 'pm' && parseInt(openHour) !== 12) {
    openTime += 12 * 60;
  }
  if (closePeriod.toLowerCase() === 'pm' && parseInt(closeHour) !== 12) {
    closeTime += 12 * 60;
  }
  if (openPeriod.toLowerCase() === 'am' && parseInt(openHour) === 12) {
    openTime -= 12 * 60;
  }
  if (closePeriod.toLowerCase() === 'am' && parseInt(closeHour) === 12) {
    closeTime -= 12 * 60;
  }

  // Handle cases where closing time is next day (like 11 PM to 2 AM)
  if (closeTime < openTime) {
    closeTime += 24 * 60;
  }

  const isOpen = currentTime >= openTime && currentTime < closeTime;
  const minutesToClose = closeTime - currentTime;
  const minutesToOpen = openTime - currentTime;

  if (isOpen) {
    if (minutesToClose <= 30) {
      return { 
        isOpen: true, 
        status: 'Closing Soon',
        nextChange: `Closes at ${closeHour}:${closeMin} ${closePeriod}`
      };
    }
    return { 
      isOpen: true, 
      status: 'Open',
      nextChange: `Closes at ${closeHour}:${closeMin} ${closePeriod}`
    };
  } else {
    if (minutesToOpen > 0 && minutesToOpen < 24 * 60) {
      return { 
        isOpen: false, 
        status: 'Closed',
        nextChange: `Opens at ${openHour}:${openMin} ${openPeriod}`
      };
    }
    
    // If it won't open today, check tomorrow
    const tomorrowDay = (currentDay + 1) % 7;
    const tomorrowHours = place.openingHours[tomorrowDay];
    
    if (tomorrowHours && !tomorrowHours.toLowerCase().includes('closed')) {
      const tomorrowMatch = tomorrowHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (tomorrowMatch) {
        const [, tomorrowOpenHour, tomorrowOpenMin, tomorrowOpenPeriod] = tomorrowMatch;
        return { 
          isOpen: false, 
          status: 'Closed',
          nextChange: `Opens tomorrow at ${tomorrowOpenHour}:${tomorrowOpenMin} ${tomorrowOpenPeriod}`
        };
      }
    }
    
    return { isOpen: false, status: 'Closed' };
  }
};

// Custom debounce hook
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Background function to fetch and store details without blocking UI
const fetchAndStoreDetailsBackground = async (placeId: string) => {
  try {
    const details = await fetchPlaceDetails(placeId);
    if (details.reviews?.length) {
      await storeReviewsForPlace(placeId, details.reviews);
    }
  } catch (error) {
    console.error('Background fetch failed:', error);
  }
};

export default function HomeScreen() {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const { filterState, updateFilters, clearAllFilters } = useFilters();
  
  // Core state
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Pagination cursor
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // User data state - UPDATED for collaborative collections
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userCollections, setUserCollections] = useState<CollaborativeCollection[]>([]);

  // Debounced user data to reduce render frequency
  const debouncedUserLikes = useDebouncedValue(userLikes, DEBOUNCE_DELAY);

  // Modal state
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [selectedPlaceForCollection, setSelectedPlaceForCollection] = useState<Place | null>(null);

  // Filter modal states
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [typesModalVisible, setTypesModalVisible] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);

  // Refs
  const fuseRef = useRef<Fuse<Place> | null>(null);
  const flatListRef = useRef<any>(null);
  const inFlightRef = useRef(false);
  const collectionsUnsubscribeRef = useRef<(() => void) | null>(null);

  // Memo
  const showHomeLoader = useMemo(() => loading && places.length === 0, [loading, places.length]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      filterState.openNow ||
      filterState.maxDistance ||
      filterState.minRating ||
      filterState.selectedTypes?.length ||
      filterState.priceRange ||
      (filterState.sort && filterState.sort !== 'recommended')
    );
  }, [filterState]);

  // Pre-calculate distances when places or location change
  const placesWithDistance = useMemo(() => {
    if (!userLocation || !places.length) return places;
    
    return places.map(place => ({
      ...place,
      distanceKm: getDistanceFromLatLonInKm(
        userLocation.lat,
        userLocation.lng,
        place.location.lat,
        place.location.lng
      )
    }));
  }, [places, userLocation]);

  // Initialize user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        setError(null);
        const profile = await getProfileData();
        if (profile?.topCategories?.length) {
          setCurrentCategory(profile.topCategories[0]);
        }
      } catch (err) {
        console.error('Error loading user preferences:', err);
        setError('Failed to load user preferences');
      }
    };
    loadUserPreferences();
  }, []);

  // Setup user location
  useEffect(() => {
    const setupLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude
          });
        } else {
          console.warn('Location permission denied');
        }
      } catch (err) {
        console.error('Error setting up location:', err);
        setError('Unable to get your location');
      }
    };
    setupLocation();
  }, []);

  // UPDATED: Listen to likes & collaborative collections with error handling
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];
    
    try {
      // Listen to likes (unchanged)
      const likesUnsub = onSnapshot(
        collection(db, 'users', user.uid, 'likes'),
        (snap) => {
          const newLikes: Record<string, boolean> = {};
          snap.forEach((docSnap) => { newLikes[docSnap.id] = true; });
          setUserLikes(newLikes);
        },
        (error) => {
          console.error('Error listening to likes:', error);
          setError('Failed to sync likes');
        }
      );
      unsubscribers.push(likesUnsub);

      // UPDATED: Listen to collaborative collections
      const collectionsUnsub = subscribeToUserCollections((collections) => {
        setUserCollections(collections);
      });
      collectionsUnsubscribeRef.current = collectionsUnsub;
      unsubscribers.push(collectionsUnsub);

    } catch (err) {
      console.error('Error setting up Firebase listeners:', err);
      setError('Failed to sync user data');
    }

    return () => {
      unsubscribers.forEach(u => u());
      if (collectionsUnsubscribeRef.current) {
        collectionsUnsubscribeRef.current();
        collectionsUnsubscribeRef.current = null;
      }
    };
  }, [user]);

  // Build Firestore query with server-side prefilters
  const buildPlacesQuery = useCallback(
    (opts?: { startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null }) => {
      const constraints: any[] = [];

      // Primary order: most popular first
      constraints.push(orderBy('userRatingsTotal', 'desc'));

      // Server-side filters
      if (filterState.selectedTypes?.length) {
        constraints.push(where('types', 'array-contains-any', filterState.selectedTypes.slice(0, 10)));
      }
      if (filterState.priceRange) {
        constraints.push(where('priceLevel', '==', filterState.priceRange.length));
      }

      constraints.push(limit(PAGE_SIZE));
      if (opts?.startAfterDoc) {
        constraints.push(startAfter(opts.startAfterDoc));
      }

      return query(collection(db, 'places'), ...constraints);
    },
    [filterState.selectedTypes, filterState.priceRange]
  );

  // Initial page load
  const loadInitial = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setLoading(true);
    setError(null);
    setExhausted(false);
    setLastDoc(null);

    try {
      const q = buildPlacesQuery();
      const snap = await getDocs(q);
      const docs = snap.docs;
      const list = docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Place[];

      setPlaces(list);
      setLastDoc(docs.length ? docs[docs.length - 1] : null);
      setExhausted(docs.length < PAGE_SIZE);
      console.log('[loadInitial] loaded places:', list.length);
    } catch (e) {
      console.error('Error fetching places:', e);
      setError('Failed to load places. Please try again.');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [buildPlacesQuery]);

  // Load more pages
  const loadMore = useCallback(async () => {
    if (loadingMore || exhausted || !lastDoc) return;
    setLoadingMore(true);
    try {
      const q = buildPlacesQuery({ startAfterDoc: lastDoc });
      const snap = await getDocs(q);
      const docs = snap.docs;
      if (!docs.length) {
        setExhausted(true);
      } else {
        const list = docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Place[];
        setPlaces(prev => [...prev, ...list]);
        setLastDoc(docs[docs.length - 1]);
        if (docs.length < PAGE_SIZE) setExhausted(true);
      }
    } catch (e) {
      console.error('Error loading more places:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [buildPlacesQuery, loadingMore, exhausted, lastDoc]);

  // Load initial data when filters change
  useEffect(() => {
    loadInitial();
  }, [buildPlacesQuery]);

  // Setup search index - only when places change significantly
  useEffect(() => {
    if (placesWithDistance.length) {
      fuseRef.current = new Fuse(placesWithDistance, FUSE_OPTIONS);
    } else {
      fuseRef.current = null;
    }
  }, [placesWithDistance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadInitial();
    } finally {
      setRefreshing(false);
    }
  }, [loadInitial]);

  // Split filtering logic to reduce dependencies and recalculations
  const baseFilteredPlaces = useMemo(() => {
    let filtered = placesWithDistance;

    // Search filtering (most expensive - use deferred value)
    if (deferredSearchQuery && fuseRef.current) {
      const searchResults = fuseRef.current.search(deferredSearchQuery);
      filtered = searchResults.map((r) => r.item);
    }

    // Client-side filters that don't need server-side indexing
    if (filterState.minRating && filterState.minRating > 0) {
      filtered = filtered.filter(p => (p.rating || 0) >= filterState.minRating!);
    }

    if (filterState.maxDistance && userLocation) {
      filtered = filtered.filter(place => 
        (place.distanceKm || 0) <= filterState.maxDistance!
      );
    }

    if (filterState.openNow) {
      filtered = filtered.filter(place => checkIfPlaceIsOpen(place));
    }

    return filtered;
  }, [placesWithDistance, deferredSearchQuery, filterState.minRating, filterState.maxDistance, filterState.openNow, userLocation]);

  // Separate sorting logic to minimize recalculations
  const sortedPlaces = useMemo(() => {
    const sortType = filterState.sort || 'recommended';
    let sorted = [...baseFilteredPlaces];

    if (sortType === 'recommended') {
      sorted = sorted
        .map((place) => ({
          ...place,
          preferenceScore: calculatePlaceScore(place, currentCategory)
        }))
        .sort((a, b) => (b.preferenceScore || 0) - (a.preferenceScore || 0));
    } else if (sortType === 'distance' && userLocation) {
      sorted = sorted.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    } else if (sortType === 'rating') {
      sorted = sorted.sort((a, b) => {
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0);
        }
        return (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0);
      });
    }

    return sorted;
  }, [baseFilteredPlaces, filterState.sort, currentCategory, userLocation]);

  // Final display data with user interaction flags
  const displayedPlaces = useMemo(() => {
    return sortedPlaces.map((place) => ({
      ...place,
      liked: !!debouncedUserLikes[place.id],
      saved: userCollections.some(col => 
        col.activities?.some((activity: any) => activity.id === place.id)
      ),
    }));
  }, [sortedPlaces, debouncedUserLikes, userCollections]);

  // Insert ExploreMore cards
  const getFinalData = useCallback(() => {
    const finalData: any[] = [];
    displayedPlaces.forEach((place, index) => {
      finalData.push(place);
      if ((index + 1) % 20 === 0) {
        finalData.push({ _type: 'exploreMoreCard', key: `exploreMore_${index + 1}` });
      }
    });
    if (displayedPlaces.length && displayedPlaces.length % 20 !== 0) {
      finalData.push({ _type: 'exploreMoreCard', key: 'exploreMore_end' });
    }
    return finalData;
  }, [displayedPlaces]);

  // Optimized like handler with optimistic updates
  const handleLikePress = useCallback(async (place: Place) => {
    if (!user) return;
    
    const wasLiked = !!userLikes[place.id];
    
    // Optimistic update
    setUserLikes(prev => ({ ...prev, [place.id]: !wasLiked }));
    
    try {
      if (wasLiked) {
        await deleteDoc(doc(db, 'users', user.uid, 'likes', place.id));
      } else {
        // Like immediately, fetch details in background
        await likePlace({
          id: place.id,
          name: place.name,
          rating: place.rating,
          userRatingsTotal: place.userRatingsTotal,
          photos: place.photos,
          types: place.types,
        });
        
        // Fetch additional details in background without blocking
        fetchAndStoreDetailsBackground(place.id);
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserLikes(prev => ({ ...prev, [place.id]: wasLiked }));
      console.error('Failed to toggle like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  }, [user, userLikes]);

  const handleSavePress = useCallback((place: Place) => {
    setSelectedPlaceForCollection(place);
    setCollectionModalVisible(true);
  }, []);

  // UPDATED: Add place to collaborative collection
  const addPlaceToCollection = useCallback(async (collectionId: string) => {
    if (!user || !selectedPlaceForCollection) return;
    
    try {
      // Transform the place data to match the SharedActivity interface
      const activityData = {
        id: selectedPlaceForCollection.id,
        name: selectedPlaceForCollection.name,
        title: selectedPlaceForCollection.name,
        rating: selectedPlaceForCollection.rating,
        types: selectedPlaceForCollection.types || [],
        photoUrls: selectedPlaceForCollection.photos || [],
        formatted_address: selectedPlaceForCollection.formatted_address || '',
        phoneNumber: selectedPlaceForCollection.phoneNumber || '',
        website: selectedPlaceForCollection.website || '',
        description: selectedPlaceForCollection.description || '',
        openingHours: selectedPlaceForCollection.openingHours || [],
        userRatingsTotal: selectedPlaceForCollection.userRatingsTotal,
      };
      
      await addActivityToCollaborativeCollection(collectionId, activityData);
      setCollectionModalVisible(false);
      setSelectedPlaceForCollection(null);
      Alert.alert('Success', 'Place added to collection!');
    } catch (error) {
      console.error('Failed to add to collection:', error);
      Alert.alert('Error', error.message || 'Failed to add place to collection');
    }
  }, [user, selectedPlaceForCollection]);

  const handlePlacePress = useCallback((placeId: string) => {
    router.push(`/moreInfo?placeId=${placeId}`);
  }, [router]);

  // Filter handlers
  const handleSortChange = useCallback(() => {
    const currentIndex = SORT_OPTIONS.indexOf((filterState.sort as any) || 'recommended');
    const nextSort = SORT_OPTIONS[(currentIndex + 1) % SORT_OPTIONS.length];
    updateFilters({ sort: nextSort });
  }, [filterState.sort, updateFilters]);

  const toggleOpenNow = useCallback(() => {
    updateFilters({ openNow: !filterState.openNow });
  }, [filterState.openNow, updateFilters]);

  // Filter modal handlers
  const handleDistanceFilter = useCallback(() => setDistanceModalVisible(true), []);
  const handleRatingFilter = useCallback(() => setRatingModalVisible(true), []);
  const handleTypesFilter = useCallback(() => setTypesModalVisible(true), []);
  const handlePriceFilter = useCallback(() => setPriceModalVisible(true), []);

  // Filter modal apply handlers with scroll reset
  const applyDistanceFilter = useCallback((distance: number) => {
    updateFilters({ maxDistance: distance || undefined });
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [updateFilters]);

  const applyRatingFilter = useCallback((rating: number) => {
    updateFilters({ minRating: rating > 0 ? rating : undefined });
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [updateFilters]);

  const applyTypesFilter = useCallback((types: string[]) => {
    updateFilters({ selectedTypes: types.length > 0 ? types : undefined });
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [updateFilters]);

  const applyPriceFilter = useCallback((priceRange: string) => {
    updateFilters({ priceRange: priceRange || undefined });
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [updateFilters]);

  const handleClearSearch = useCallback(() => setSearchQuery(''), []);
  const handleClearAllFilters = useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

  const finalData = useMemo(() => getFinalData(), [getFinalData]);

  // Error handling
  if (error && places.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <VennLoader size={80} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HomeSearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={handleClearSearch}
        placeholder="Search places, cuisines, activities..."
      />

      <HomeFilterBar
        filterState={filterState}
        onSortPress={handleSortChange}
        onOpenNowPress={toggleOpenNow}
        onDistancePress={handleDistanceFilter}
        onRatingPress={handleRatingFilter}
        onTypesPress={handleTypesFilter}
        onPricePress={handlePriceFilter}
        onClearAllFilters={hasActiveFilters ? handleClearAllFilters : undefined}
        showClearAll={hasActiveFilters}
      />

      <HomePlacesList
        ref={flatListRef}
        data={finalData}
        loading={loading}
        refreshing={refreshing}
        userLocation={userLocation}
        currentCategory={currentCategory}
        onRefresh={onRefresh}
        onPlacePress={handlePlacePress}
        onLikePress={handleLikePress}
        onSavePress={handleSavePress}
        onCategoryPress={setCurrentCategory}
        getDistance={getDistanceFromLatLonInKm}
        
        // Infinite scroll with performance optimizations
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {/* Loading overlay */}
      {showHomeLoader && (
        <View style={styles.loadingOverlay}>
          <VennLoader size={120} />
        </View>
      )}

      {/* Filter Modals */}
      <DistanceFilterModal
        visible={distanceModalVisible}
        onClose={() => setDistanceModalVisible(false)}
        currentDistance={filterState.maxDistance}
        onApply={applyDistanceFilter}
      />

      <RatingFilterModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        currentRating={filterState.minRating}
        onApply={applyRatingFilter}
      />

      <TypesFilterModal
        visible={typesModalVisible}
        onClose={() => setTypesModalVisible(false)}
        currentTypes={filterState.selectedTypes}
        onApply={applyTypesFilter}
      />

      <PriceFilterModal
        visible={priceModalVisible}
        onClose={() => setPriceModalVisible(false)}
        currentPriceRange={filterState.priceRange}
        onApply={applyPriceFilter}
      />

      {/* UPDATED: Collaborative Collection Selection Modal */}
      <CollectionSelectionModal
        visible={collectionModalVisible}
        collections={userCollections}
        onClose={() => setCollectionModalVisible(false)}
        onSelectCollection={addPlaceToCollection}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});