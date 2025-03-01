const GOOGLE_PLACES_API_KEY = 'AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Fuse from 'fuse.js';
import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFilters } from '../../context/FiltersContext';
import { getPreferences, likePlace, unlikePlace } from '../utils/storage';

import ExploreMoreCard from './ExploreMoreCard';

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
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
}
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Example: map Google place types to your 14 categories
function mapGoogleTypesToCategory(googleTypes: string[]): string[] {
  if (!googleTypes || !Array.isArray(googleTypes)) return ['other'];

  const categories: string[] = [];
  if (googleTypes.includes('restaurant') || googleTypes.includes('food')) {
    categories.push('Dining');
  }
  if (googleTypes.includes('gym')) {
    categories.push('Fitness');
  }
  if (googleTypes.includes('park') || googleTypes.includes('campground')) {
    categories.push('Outdoors');
  }
  if (googleTypes.includes('movie_theater')) {
    categories.push('Movies');
  }
  if (googleTypes.includes('casino') || googleTypes.includes('arcade')) {
    categories.push('Gaming');
  }
  if (googleTypes.includes('bar') || googleTypes.includes('night_club')) {
    categories.push('Nightlife');
  }
  // ... (etc.)

  return categories.length ? categories : ['other'];
}

/* --------------------------------------------------
   Main Component
-------------------------------------------------- */
export default function HomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  /* -------------------
     State & Firebase
  ------------------- */
  const [places, setPlaces] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userSaves, setUserSaves] = useState<Record<string, boolean>>({});

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState('');

  const { filterState, setFilterState } = useFilters();
  const [userTopPrefs, setUserTopPrefs] = useState<string[]>([]);

  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  // For fuzzy search
  const fuseRef = useRef<Fuse<any> | null>(null);

  // We'll ref our FlatList so we can scroll to top
  const flatListRef = useRef<FlatList<any>>(null);

  /* -------------------------
     Load user preferences
  ------------------------- */
  useEffect(() => {
    async function loadUserPrefs() {
      try {
        const prefs = await getPreferences();
        setUserTopPrefs(prefs);
      } catch (err) {
        console.error('Error loading user prefs:', err);
      }
    }
    loadUserPrefs();
  }, []);

  /* -------------------------
     Request location once
  ------------------------- */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  /* ----------------------------------------------
     Fetch places whenever location or filter changes
  ---------------------------------------------- */
  useEffect(() => {
    if (userLocation) {
      fetchPlaces();
    }
  }, [userLocation, filterState]);

  /* --------------------
     Listen for user likes
  -------------------- */
  useEffect(() => {
    if (user) {
      const likesRef = collection(firestore, `users/${user.uid}/likes`);
      const unsubscribe = onSnapshot(likesRef, (snapshot) => {
        const newLikes: Record<string, boolean> = {};
        snapshot.forEach((doc) => {
          newLikes[doc.id] = true;
        });
        setUserLikes(newLikes);
      });
      return () => unsubscribe();
    }
  }, [user]);

  /* ---------------------
     Listen for user saves
  --------------------- */
  useEffect(() => {
    if (user) {
      const savesRef = collection(firestore, `users/${user.uid}/collections`);
      const unsubscribe = onSnapshot(savesRef, (snapshot) => {
        const newSaves: Record<string, boolean> = {};
        snapshot.forEach((doc) => {
          newSaves[doc.id] = true;
        });
        setUserSaves(newSaves);
      });
      return () => unsubscribe();
    }
  }, [user]);

  /* -------------------------
     Fetching places logic
  ------------------------- */
  const fetchPlaces = async (pageToken?: string) => {
    if (!userLocation) return;
    setLoading(true);

    try {
      const radius = filterState.distance ?? 5000;
      let keyword = 'activities'; // default
      if (filterState.sort === 'Movies') {
        keyword = 'movies';
      } else if (filterState.sort === 'Dining') {
        keyword = 'restaurant';
      }
      // etc.

      let url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${GOOGLE_PLACES_API_KEY}` +
        `&location=${userLocation.lat},${userLocation.lng}` +
        `&radius=${radius}` +
        `&type=establishment` +
        `&keyword=${encodeURIComponent(keyword)}`;

      if (filterState.openNow) {
        url += '&opennow=true';
      }
      if (pageToken) {
        url += `&pagetoken=${pageToken}`;
      }

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status === 'OK') {
        setNextPageToken(data.next_page_token || null);
        const newPlaces = data.results.map((p: any) => ({
          id: p.place_id,
          name: p.name,
          rating: p.rating || 0,
          userRatingsTotal: p.user_ratings_total || 0,
          photoReference: p.photos ? p.photos[0].photo_reference : null,
          geometry: p.geometry,
          types: p.types ?? [],
          liked: false, // will be updated from Firestore
        }));
        setPlaces((prev) => (pageToken ? [...prev, ...newPlaces] : newPlaces));
      } else {
        console.warn('Google Places API error:', data.status);
      }
    } catch (err) {
      console.error('fetchPlaces error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------
     We add a new fetchPlacesByKeyword
     that also scrolls to top.
  ------------------------- */
  const fetchPlacesByKeyword = async (keyword: string) => {
    if (!userLocation) return;
    setLoading(true);
    try {
      // Clear next page so we start fresh
      setNextPageToken(null);

      const radius = filterState.distance ?? 5000;
      let url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${GOOGLE_PLACES_API_KEY}` +
        `&location=${userLocation.lat},${userLocation.lng}` +
        `&radius=${radius}` +
        `&type=establishment` +
        `&keyword=${encodeURIComponent(keyword)}`;

      if (filterState.openNow) {
        url += '&opennow=true';
      }

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status === 'OK') {
        setNextPageToken(data.next_page_token || null);

        const newPlaces = data.results.map((p: any) => ({
          id: p.place_id,
          name: p.name,
          rating: p.rating || 0,
          userRatingsTotal: p.user_ratings_total || 0,
          photoReference: p.photos ? p.photos[0].photo_reference : null,
          geometry: p.geometry,
          types: p.types ?? [],
          liked: false,
        }));

        setPlaces(newPlaces);

        // Scroll to top after new data is set
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);

      } else {
        console.warn('Google Places API error:', data.status);
      }
    } catch (err) {
      console.error('fetchPlacesByKeyword error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------
     Infinite scrolling
  ----------------------- */
  const loadMore = () => {
    if (nextPageToken) {
      fetchPlaces(nextPageToken);
    }
  };

  /* ---------------------
     Fuzzy search setup
  --------------------- */
  useEffect(() => {
    if (places.length) {
      fuseRef.current = new Fuse(places, {
        keys: ['name'],
        threshold: 0.4,
      });
    }
  }, [places]);

  /* --------------------------------------------------------
     getDisplayedPlaces => sorting, search, preferences
  -------------------------------------------------------- */
  const getDisplayedPlaces = useCallback(() => {
    let list = places;

    // 1) Fuzzy search
    if (searchQuery && fuseRef.current) {
      const results = fuseRef.current.search(searchQuery);
      list = results.map((r) => r.item);
    }

    // 2) Weighted approach if sort === "recommended"
    if (filterState.sort === 'recommended' || !filterState.sort) {
      list = list.map((place) => {
        const placeCategories = mapGoogleTypesToCategory(place.types);
        let preferenceScore = 0;
        placeCategories.forEach((cat) => {
          const rankIndex = userTopPrefs.indexOf(cat);
          if (rankIndex !== -1) {
            preferenceScore += 5 - rankIndex;
          }
        });
        return { ...place, preferenceScore };
      });
      list.sort((a, b) => (b.preferenceScore || 0) - (a.preferenceScore || 0));
    }
    // 3) If sort === "distance"
    else if (filterState.sort === 'distance' && userLocation) {
      list = list.slice().sort((a, b) => {
        const distA = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          a.geometry.location.lat,
          a.geometry.location.lng
        );
        const distB = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          b.geometry.location.lat,
          b.geometry.location.lng
        );
        return distA - distB;
      });
    }
    // 4) If sort === "rating"
    else if (filterState.sort === 'rating') {
      list = list.slice().sort((a, b) => b.rating - a.rating);
    }

    // Mark liked & saved
    return list.map((item) => ({
      ...item,
      liked: !!userLikes[item.id],
      saved: !!userSaves[item.id],
    }));
  }, [places, searchQuery, filterState, userLikes, userSaves, userLocation]);

  /* ----------------------
     Like / Unlike
  ---------------------- */
  const handleLikePress = async (placeId: string) => {
    if (!user) return;
    const isLiked = !!userLikes[placeId];
    try {
      if (isLiked) {
        await unlikePlace(placeId);
      } else {
        await likePlace(placeId);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  /* ----------------------
     Save / Unsave
  ---------------------- */
  const handleSavePress = async (placeId: string, placeName: string) => {
    if (!user) return;
    const isSaved = !!userSaves[placeId];
    try {
      if (isSaved) {
        await deleteDoc(doc(firestore, `users/${user.uid}/collections`, placeId));
      } else {
        await setDoc(doc(firestore, `users/${user.uid}/collections`, placeId), {
          placeId,
          name: placeName,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
    }
  };

  /* ----------------------
     Filter toggles
  ---------------------- */
  const toggleOpenNow = () => {
    setFilterState((prev) => ({
      ...prev,
      openNow: !prev.openNow,
    }));
  };

  /* -------------------------------------
     Location Modal => handleSetLocation
  ------------------------------------- */
  const handleSetLocation = async () => {
    if (manualLocationInput.trim() !== '') {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            manualLocationInput
          )}&key=${GOOGLE_PLACES_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          setUserLocation({ lat, lng });
        } else {
          console.error('Location not found.');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }
    setLocationModalVisible(false);
  };

  /* ------------------------
     Sort Modal Options
  ------------------------ */
  const SORT_OPTIONS = ['recommended', 'distance', 'rating'];
  const handleSelectSortOption = (option: string) => {
    setFilterState((prev) => ({
      ...prev,
      sort: option,
    }));
    setSortModalVisible(false);
  };

  /* -------------------------
     Build final data array
     => Show ExploreMoreCard after every 20 items
  ------------------------- */
  const getFinalData = () => {
    const displayed = getDisplayedPlaces();
    const finalData: any[] = [];

    // Insert ExploreMoreCard after every 20 items
    for (let i = 0; i < displayed.length; i++) {
      finalData.push(displayed[i]);
      // After every 20 items, insert a card
      if ((i + 1) % 20 === 0) {
        finalData.push({ _type: 'exploreMoreCard', key: `exploreMore_${i + 1}` });
      }
    }
    // If the total is not a multiple of 20, still insert one at the end
    if (displayed.length === 0) {
      return finalData;
    } else if (displayed.length % 20 !== 0) {
      finalData.push({ _type: 'exploreMoreCard', key: 'exploreMore_end' });
    }

    return finalData;
  };

  /* --------------------------------
     Render each item
  -------------------------------- */
  const renderItem = ({ item }: { item: any }) => {
    // If it's our special ExploreMoreCard item
    if (item._type === 'exploreMoreCard') {
      return (
        <ExploreMoreCard
          style={styles.exploreCard}
          onCategoryPress={(keyword) => {
            // 1) fetch new places with that keyword
            fetchPlacesByKeyword(keyword);
            // 2) Immediately scroll to top (or do in fetchPlacesByKeyword)
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        />
      );
    }

    // Otherwise, render a normal place card
    const photoUrl = item.photoReference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${item.photoReference}&key=${GOOGLE_PLACES_API_KEY}`
      : null;

    let distanceText = '';
    if (userLocation && item.geometry?.location) {
      const dist = getDistanceFromLatLonInKm(
        userLocation.lat,
        userLocation.lng,
        item.geometry.location.lat,
        item.geometry.location.lng
      );
      distanceText = `${dist.toFixed(2)} km`;
    }

    return (
      <TouchableOpacity
        style={styles.dashCard}
        onPress={() => router.push(`/moreInfo?placeId=${item.id}`)}
      >
        <View style={styles.dashImageContainer}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.dashImage} />
          ) : (
            <View style={[styles.dashImage, { backgroundColor: '#333' }]} />
          )}

          {/* Icon row at bottom-right corner */}
          <View style={styles.iconRow}>
            {/* Like button */}
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => handleLikePress(item.id)}
            >
              <Text style={[styles.iconText, item.liked && { color: 'red' }]}>
                {item.liked ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>

            {/* Save-to-collections button */}
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => handleSavePress(item.id, item.name)}
            >
              <Text style={[styles.iconText, item.saved && { color: '#F5A623' }]}>
                {item.saved ? '🔖' : '📑'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dashInfoContainer}>
          <Text style={styles.dashTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.dashSubtitle}>
            {item.rating.toFixed(1)} ⭐ ({item.userRatingsTotal}+)
            {'  •  '}
            {distanceText} away
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* --------------------------------
     Main render
  -------------------------------- */
  const finalData = getFinalData();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header / Search */}
        <View style={styles.header}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            placeholderTextColor="#aaa"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Row */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setSortModalVisible(true)}
          >
            <Text style={styles.filterText}>
              {filterState.sort && filterState.sort !== 'recommended'
                ? `Sort: ${capitalize(filterState.sort)}`
                : 'Sort ↓'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterState.openNow && styles.filterButtonActive]}
            onPress={toggleOpenNow}
          >
            <Text style={styles.filterText}>Open Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setLocationModalVisible(true)}
          >
            <Text style={styles.filterText}>Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => router.push('/morefilters')}
          >
            <Text style={styles.filterText}>More Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Sort Modal */}
        {sortModalVisible && (
          <Modal visible={sortModalVisible} transparent animationType="fade">
            <View style={styles.modalContainer}>
              <View style={styles.sortModalContent}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.sortModalItem}
                    onPress={() => handleSelectSortOption(option)}
                  >
                    <Text style={styles.sortModalItemText}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.modalButton, { marginTop: 10 }]}
                  onPress={() => setSortModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Location Modal */}
        {locationModalVisible && (
          <Modal visible={locationModalVisible} transparent animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Set Location</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter a location (or leave blank)"
                  placeholderTextColor="#aaa"
                  value={manualLocationInput}
                  onChangeText={setManualLocationInput}
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleSetLocation}>
                  <Text style={styles.modalButtonText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setLocationModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Places List + ExploreMoreCard */}
        <FlatList
          ref={flatListRef}
          data={finalData}
          keyExtractor={(item, index) =>
            item._type === 'exploreMoreCard' ? item.key : item.id
          }
          renderItem={renderItem}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!loading) loadMore();
          }}
          ListFooterComponent={loading ? <ActivityIndicator size="small" color="#fff" /> : null}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------
   Styles
------------------------------------ */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0D1117',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0D1117',
    justifyContent: 'space-between',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#F5A623',
  },
  filterText: {
    color: '#0D1117',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  dashCard: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  dashImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  dashImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconRow: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
  },
  iconContainer: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  iconText: {
    fontSize: 20,
    color: '#fff',
  },
  dashInfoContainer: {
    padding: 12,
  },
  dashTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dashSubtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sortModalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  sortModalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortModalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0D1117',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 5,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  exploreCard: {
    marginVertical: 20,
    marginTop: 5,
  },
});

export default HomeScreen;