// home.tsx (improved)
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFilters } from '../../context/FiltersContext';
import VennLoader from '../../components/vennloader';
import { getProfileData } from '../../_utils/storage/userProfile';
import { likePlace, addToCollection } from '../../_utils/storage/likesCollections';
import { storeReviewsForPlace } from '../../_utils/storage/reviews';
import { fetchPlaceDetails } from '../../_utils/storage/places';
import { PLACE_CATEGORIES } from '../../_utils/placeCategories';

// Import components
import {
  HomeSearchHeader,
  HomeFilterBar,
  HomePlacesList,
  CollectionModal
} from '../../components/home_components';

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
}

// Constants
const SORT_OPTIONS = ['recommended', 'distance', 'rating'] as const;
const FUSE_OPTIONS = {
  keys: ['name', 'types'],
  threshold: 0.4,
  includeScore: true,
};

// Helper functions
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
  score += place.rating * 2;
  score += Math.min(place.userRatingsTotal / 100, 5);
  
  return score;
};

export default function HomeScreen() {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const { filterState, updateFilters, clearAllFilters } = useFilters();

  // Core state
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // User data state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userSaves, setUserSaves] = useState<Record<string, boolean>>({});
  const [userCollections, setUserCollections] = useState<Record<string, any>>({});
  
  // Modal state
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [selectedPlaceForCollection, setSelectedPlaceForCollection] = useState<Place | null>(null);
  
  // Refs
  const fuseRef = useRef<Fuse<Place> | null>(null);
  const flatListRef = useRef<any>(null);

  // Memoized values
  const showHomeLoader = useMemo(() => loading && places.length === 0, [loading, places.length]);
  
  const hasActiveFilters = useMemo(() => {
    return !!(
      filterState.openNow ||
      filterState.maxDistance ||
      filterState.minRating ||
      filterState.selectedTypes?.length ||
      (filterState.sort && filterState.sort !== 'recommended')
    );
  }, [filterState]);

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

  // Setup user location with error handling
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

  // Setup Firebase listeners with error handling
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    try {
      // Listen for likes
      const likesUnsub = onSnapshot(
        collection(db, 'users', user.uid, 'likes'),
        (snap) => {
          const newLikes: Record<string, boolean> = {};
          snap.forEach((docSnap) => {
            newLikes[docSnap.id] = true;
          });
          setUserLikes(newLikes);
        },
        (error) => {
          console.error('Error listening to likes:', error);
        }
      );
      unsubscribers.push(likesUnsub);

      // Listen for saves/collections
      const savesUnsub = onSnapshot(
        collection(db, 'users', user.uid, 'collections'),
        (snap) => {
          const newSaves: Record<string, boolean> = {};
          const collections: Record<string, any> = {};
          
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            newSaves[docSnap.id] = true;
            collections[docSnap.id] = { id: docSnap.id, ...data };
          });
          
          setUserSaves(newSaves);
          setUserCollections(collections);
        },
        (error) => {
          console.error('Error listening to collections:', error);
        }
      );
      unsubscribers.push(savesUnsub);

    } catch (err) {
      console.error('Error setting up Firebase listeners:', err);
      setError('Failed to sync user data');
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  // Fetch places with improved error handling
  const fetchPlaces = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const snap = await getDocs(collection(db, 'places'));
      const allPlaces = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Place));
      
      setPlaces(allPlaces);
      console.log('[fetchPlaces] loaded places:', allPlaces.length);
    } catch (error) {
      console.error('Error fetching places:', error);
      setError('Failed to load places. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Fetch places when dependencies change
  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // Setup search with improved options
  useEffect(() => {
    if (places.length) {
      fuseRef.current = new Fuse(places, FUSE_OPTIONS);
    }
  }, [places]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlaces();
    setRefreshing(false);
  }, [fetchPlaces]);

  // Enhanced filtering and sorting logic
  const getDisplayedPlaces = useCallback(() => {
    let filteredPlaces = places;

    // Apply search filter with improved relevance
    if (searchQuery && fuseRef.current) {
      const searchResults = fuseRef.current.search(searchQuery);
      filteredPlaces = searchResults.map((result) => result.item);
    }

    // Apply filters
    if (filterState.minRating) {
      filteredPlaces = filteredPlaces.filter(place => 
        place.rating >= filterState.minRating!
      );
    }

    if (filterState.maxDistance && userLocation) {
      filteredPlaces = filteredPlaces.filter(place => {
        const distance = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          place.location.lat,
          place.location.lng
        );
        return distance <= filterState.maxDistance!;
      });
    }

    if (filterState.selectedTypes?.length) {
      filteredPlaces = filteredPlaces.filter(place =>
        place.types?.some(type => filterState.selectedTypes!.includes(type))
      );
    }

    if (filterState.openNow) {
      const now = new Date();
      const currentDay = now.getDay();

      filteredPlaces = filteredPlaces.filter(place => {
        if (!place.openingHours?.length) return true;
        
        const todayHours = place.openingHours[currentDay];
        if (!todayHours || todayHours.includes('Closed')) return false;
        
        return true; // Simplified for now - could implement proper time parsing
      });
    }

    // Apply sorting
    const sortType = filterState.sort || 'recommended';
    
    if (sortType === 'recommended') {
      filteredPlaces = filteredPlaces
        .map((place) => ({
          ...place,
          preferenceScore: calculatePlaceScore(place, currentCategory)
        }))
        .sort((a, b) => (b.preferenceScore || 0) - (a.preferenceScore || 0));
    } else if (sortType === 'distance' && userLocation) {
      filteredPlaces = [...filteredPlaces].sort((a, b) => {
        const distanceA = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          a.location.lat,
          a.location.lng
        );
        const distanceB = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          b.location.lat,
          b.location.lng
        );
        return distanceA - distanceB;
      });
    } else if (sortType === 'rating') {
      filteredPlaces = [...filteredPlaces].sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return b.userRatingsTotal - a.userRatingsTotal;
      });
    }

    // Add user interaction states
    return filteredPlaces.map((place) => ({
      ...place,
      liked: !!userLikes[place.id],
      saved: !!userSaves[place.id],
    }));
  }, [places, searchQuery, filterState, userLikes, userLocation, currentCategory, userSaves]);

  // Generate final data with explore cards
  const getFinalData = useCallback(() => {
    const displayedPlaces = getDisplayedPlaces();
    const finalData: any[] = [];
    
    displayedPlaces.forEach((place, index) => {
      finalData.push(place);
      
      // Insert ExploreMoreCard every 20 items
      if ((index + 1) % 20 === 0) {
        finalData.push({ 
          _type: 'exploreMoreCard', 
          key: `exploreMore_${index + 1}` 
        });
      }
    });
    
    // Add final ExploreMoreCard if needed
    if (displayedPlaces.length && displayedPlaces.length % 20 !== 0) {
      finalData.push({ 
        _type: 'exploreMoreCard', 
        key: 'exploreMore_end' 
      });
    }
    
    return finalData;
  }, [getDisplayedPlaces]);

  // Event handlers
  const handleLikePress = useCallback(async (place: Place) => {
    if (!user) return;
    
    const isLiked = !!userLikes[place.id];
    
    try {
      if (isLiked) {
        await deleteDoc(doc(db, 'users', user.uid, 'likes', place.id));
      } else {
        const details = await fetchPlaceDetails(place.id);
        
        if (details.reviews?.length) {
          await storeReviewsForPlace(place.id, details.reviews);
        }
        
        await likePlace({
          id: place.id,
          name: details.name,
          rating: details.rating,
          userRatingsTotal: details.userRatingsTotal,
          photos: details.photos,
          types: details.types,
        });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  }, [user, userLikes]);

  const handleSavePress = useCallback((place: Place) => {
    setSelectedPlaceForCollection(place);
    setCollectionModalVisible(true);
  }, []);

  const addPlaceToCollection = useCallback(async (collectionId: string) => {
    if (!user || !selectedPlaceForCollection) return;
    
    try {
      await addToCollection(collectionId, selectedPlaceForCollection);
      setCollectionModalVisible(false);
      setSelectedPlaceForCollection(null);
    } catch (error) {
      console.error('Failed to add to collection:', error);
      Alert.alert('Error', 'Failed to add place to collection');
    }
  }, [user, selectedPlaceForCollection]);

  const handlePlacePress = useCallback((placeId: string) => {
    router.push(`/moreInfo?placeId=${placeId}`);
  }, [router]);

  // Filter handlers with proper context updates
  const handleSortChange = useCallback(() => {
    const currentIndex = SORT_OPTIONS.indexOf(filterState.sort as any || 'recommended');
    const nextSort = SORT_OPTIONS[(currentIndex + 1) % SORT_OPTIONS.length];
    updateFilters({ sort: nextSort });
  }, [filterState.sort, updateFilters]);

  const toggleOpenNow = useCallback(() => {
    updateFilters({ openNow: !filterState.openNow });
  }, [filterState.openNow, updateFilters]);

  const handleDistanceFilter = useCallback(() => {
    // This would typically open a modal or sheet for distance selection
    console.log('Distance filter - implement modal');
  }, []);

  const handleRatingFilter = useCallback(() => {
    // This would typically open a modal or sheet for rating selection
    console.log('Rating filter - implement modal');
  }, []);

  const handlePriceFilter = useCallback(() => {
    console.log('Price filter - implement modal');
  }, []);

  const handleTypesFilter = useCallback(() => {
    console.log('Types filter - implement modal');
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleClearAllFilters = useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

  const finalData = useMemo(() => getFinalData(), [getFinalData]);

  // Show error state if needed
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
      />

      {/* Loading Overlay */}
      {showHomeLoader && (
        <View style={styles.loadingOverlay}>
          <VennLoader size={120} />
        </View>
      )}

      <CollectionModal
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