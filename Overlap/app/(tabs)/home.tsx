// home.tsx (paginated + deferred search + server-side prefilter)
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
}

// Constants
const SORT_OPTIONS = ['recommended', 'distance', 'rating'] as const;
const FUSE_OPTIONS = {
  keys: ['name', 'types'],
  threshold: 0.4,
  includeScore: true,
};
const PAGE_SIZE = 30; // tune this (20–40 is a good range)

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

const checkIfPlaceIsOpen = (place: Place): boolean => {
  if (!place.openingHours?.length) return true; // Assume open if no hours data
  const now = new Date();
  const currentDay = now.getDay();
  const todayHours = place.openingHours[currentDay];
  if (!todayHours || todayHours.includes('Closed')) return false;
  // Simplified - in production, you'd parse actual times
  return true;
};

const matchesPriceLevel = (place: Place, priceRange: string): boolean => {
  if (!priceRange || !place.priceLevel) return true;
  const targetLevel = priceRange.length;
  return place.priceLevel === targetLevel;
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
  const [exhausted, setExhausted] = useState(false); // no more pages
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery); // smoother typing
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Pagination cursor
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // User data state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userSaves, setUserSaves] = useState<Record<string, boolean>>({});
  const [userCollections, setUserCollections] = useState<Record<string, any>>({});

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

  // Listen to likes & collections
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];
    try {
      const likesUnsub = onSnapshot(
        collection(db, 'users', user.uid, 'likes'),
        (snap) => {
          const newLikes: Record<string, boolean> = {};
          snap.forEach((docSnap) => { newLikes[docSnap.id] = true; });
          setUserLikes(newLikes);
        },
        (error) => console.error('Error listening to likes:', error)
      );
      unsubscribers.push(likesUnsub);

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
        (error) => console.error('Error listening to collections:', error)
      );
      unsubscribers.push(savesUnsub);
    } catch (err) {
      console.error('Error setting up Firebase listeners:', err);
      setError('Failed to sync user data');
    }

    return () => unsubscribers.forEach(u => u());
  }, [user]);

  /**
   * Build a Firestore query that prefilters server-side
   * We avoid multiple range filters; keep it indexable.
   */
  const buildPlacesQuery = useCallback(
    (opts?: { startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null }) => {
      const constraints: any[] = [];

      // Primary order: most popular first (reduces client work)
      constraints.push(orderBy('userRatingsTotal', 'desc'));

      // Server-side filters we can index cheaply:
      if (filterState.selectedTypes?.length) {
        // array-contains-any supports up to 10 elements
        constraints.push(where('types', 'array-contains-any', filterState.selectedTypes.slice(0, 10)));
      }
      if (filterState.priceRange) {
        // priceLevel is 1..4; priceRange is '$', '$$', ...
        constraints.push(where('priceLevel', '==', filterState.priceRange.length));
      }
      // We *could* also do rating >= X, but that forces orderBy('rating') and more composite indexes.
      // To keep it simple/reliable, we’ll filter by rating client-side.

      constraints.push(limit(PAGE_SIZE));
      if (opts?.startAfterDoc) {
        constraints.push(startAfter(opts.startAfterDoc));
      }

      return query(collection(db, 'places'), ...constraints);
    },
    [filterState.selectedTypes, filterState.priceRange]
  );

  // Initial page (and refetch on filter changes)
  const loadInitial = useCallback(async () => {
    if (inFlightRef.current) return;     // hard guard against re-entry
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
  }, [buildPlacesQuery]);  // ← no `loading` here

  // Load next page
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

  // Run initial load and re-run when server-side filter knobs change
  useEffect(() => {
    loadInitial();
  }, [buildPlacesQuery]);   // re-load when server-side filters change

  // Setup search index
  useEffect(() => {
    if (places.length) {
      fuseRef.current = new Fuse(places, FUSE_OPTIONS);
    } else {
      fuseRef.current = null;
    }
  }, [places]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadInitial(); // re-run first page with current filters
    } finally {
      setRefreshing(false);
    }
  }, [loadInitial]);

  // Filtering/sorting (client-side only for what Firestore can't do)
  const getDisplayedPlaces = useCallback(() => {
    let filteredPlaces = places;

    // Defer search to prevent heavy recompute on each keystroke
    if (deferredSearchQuery && fuseRef.current) {
      const searchResults = fuseRef.current.search(deferredSearchQuery);
      filteredPlaces = searchResults.map((r) => r.item);
    }

    // Apply rating filter client-side (keeps Firestore query simple)
    if (filterState.minRating && filterState.minRating > 0) {
      filteredPlaces = filteredPlaces.filter(p => (p.rating || 0) >= filterState.minRating!);
    }

    // Distance filter and sort: only compute distances when needed
    const needDistance =
      !!filterState.maxDistance ||
      (filterState.sort === 'distance' && userLocation);

    if (needDistance && userLocation) {
      filteredPlaces = filteredPlaces.filter((place) => {
        const d = getDistanceFromLatLonInKm(
          userLocation.lat, userLocation.lng,
          place.location.lat, place.location.lng
        );
        // Annotate distance on the fly to re-use below
        (place as any).__distanceKm = d;
        return !filterState.maxDistance || d <= filterState.maxDistance!;
      });
    }

    if (filterState.openNow) {
      filteredPlaces = filteredPlaces.filter(place => checkIfPlaceIsOpen(place));
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
      filteredPlaces = [...filteredPlaces].sort((a: any, b: any) => {
        const da = a.__distanceKm ?? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng);
        const db = b.__distanceKm ?? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng);
        return da - db;
      });
    } else if (sortType === 'rating') {
      filteredPlaces = [...filteredPlaces].sort((a, b) => {
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0);
        }
        return (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0);
      });
    }

    // Add user interaction flags
    return filteredPlaces.map((place) => ({
      ...place,
      liked: !!userLikes[place.id],
      saved: !!userSaves[place.id],
    }));
  }, [
    places,
    deferredSearchQuery,
    filterState.minRating,
    filterState.maxDistance,
    filterState.openNow,
    filterState.sort,
    userLikes,
    userSaves,
    userLocation,
    currentCategory,
  ]);

  // Insert ExploreMore cards
  const getFinalData = useCallback(() => {
    const displayedPlaces = getDisplayedPlaces();
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

  // Filter modal apply handlers
  const applyDistanceFilter = useCallback((distance: number) => {
    updateFilters({ maxDistance: distance || undefined });
    // Reset list to reflect new (potentially expensive) client filter
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [updateFilters]);

  const applyRatingFilter = useCallback((rating: number) => {
    updateFilters({ minRating: rating > 0 ? rating : undefined });
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [updateFilters]);

  const applyTypesFilter = useCallback((types: string[]) => {
    updateFilters({ selectedTypes: types.length > 0 ? types : undefined });
    // Server-side filter -> relaunch initial page
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [updateFilters]);

  const applyPriceFilter = useCallback((priceRange: string) => {
    updateFilters({ priceRange: priceRange || undefined });
    // Server-side filter -> relaunch initial page
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [updateFilters]);

  const handleClearSearch = useCallback(() => setSearchQuery(''), []);
  const handleClearAllFilters = useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

  const finalData = useMemo(() => getFinalData(), [getFinalData]);

  // Error + Loader
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

        // 🔽 Infinite scroll hooks (ensure HomePlacesList forwards to its FlatList)
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        // You can also pass windowing hints if your list component supports them:
        // initialNumToRender={10}
        // maxToRenderPerBatch={10}
        // windowSize={7}
        // removeClippedSubviews
      />

      {/* Loading overlay */}
      {showHomeLoader && (
        <View style={styles.loadingOverlay}>
          <VennLoader size={120} />
        </View>
      )}

      {/* Modals */}
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
