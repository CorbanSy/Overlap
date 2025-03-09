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
  getDocs,
  deleteDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFilters } from '../../context/FiltersContext';
import { getProfileData, likePlace, unlikePlace, storeReviewsForPlace } from '../utils/storage';

import ExploreMoreCard from './ExploreMoreCard';

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
async function fetchPlaceDetailsFromGoogle(placeId: string) {
  // Make sure to include 'reviews' in 'fields=' so you actually get the reviews
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_PLACES_API_KEY}&place_id=${placeId}&fields=name,rating,reviews,types,photos,user_ratings_total`;
  const resp = await fetch(detailsUrl);
  const data = await resp.json();
  return data?.result; // Usually the place data is in 'result'
}
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
function HomeScreen() {
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
  const [userCollections, setUserCollections] = useState<Record<string, { title: string; activities: any[] }>>({});
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  
  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  // For fuzzy search
  const fuseRef = useRef<Fuse<any> | null>(null);

  // We'll ref our FlatList so we can scroll to top
  const flatListRef = useRef<FlatList<any>>(null);

  async function getUserCollections() {
    if (!user) return {};
  
    const collectionsRef = collection(firestore, `users/${user.uid}/collections`);
  
    try {
      const snapshot = await getDocs(collectionsRef);
      const collections: Record<string, { title: string; activities: any[] }> = {};
  
      snapshot.forEach((doc) => {
        const data = doc.data();
        collections[doc.id] = {
          title: data.title || "Unnamed Collection",
          activities: Array.isArray(data.activities) ? data.activities : [],
        };
      });
  
      return collections;
    } catch (error) {
      console.error("Error fetching user collections:", error);
      return {};
    }
  }
  
  /* -------------------------
     Load user preferences
  ------------------------- */
  useEffect(() => {
    async function loadUserPrefs() {
      try {
        const prefs = await getProfileData();
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
     Listen for user collections
  --------------------- */
  useEffect(() => {
    async function fetchUserCollections() {
      try {
        const collections = await getUserCollections();
        setUserCollections(collections || {});
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    }
    fetchUserCollections();
  }, []);

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
          formatted_address: p.vicinity || '',
          phoneNumber: p.international_phone_number || '',
          website: p.website || '',
          openingHours: p.opening_hours ? p.opening_hours.weekday_text : [],
          description: p.description || '',
          liked: false,
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
     New fetchPlacesByKeyword that scrolls to top.
  ------------------------- */
  const fetchPlacesByKeyword = async (keyword: string) => {
    if (!userLocation) return;
    setLoading(true);
    try {
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
  ----------------------- 
  const loadMore = () => {
    if (nextPageToken) {
      fetchPlaces(nextPageToken);
    }
  };*/

  const sanitizeActivity = (activity: any) => {
    return {
      id: activity.id,
      name: activity.name,
      rating: activity.rating || 0,
      userRatingsTotal: activity.userRatingsTotal || 0,
      photoReference: activity.photoReference || null,
      formatted_address: activity.formatted_address || '',
      phoneNumber: activity.phoneNumber || '',
      website: activity.website || '',
      openingHours: activity.openingHours || [],
      description: activity.description || '',
    };
  };
  
  const toggleActivityInCollection = async (collectionId: string) => {
    if (!selectedActivity || !user) return;
  
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const currentCollection = userCollections[collectionId] || { title: "New Collection", activities: [] };
  
      const sanitizedActivity = sanitizeActivity(selectedActivity);
      const isAlreadyAdded = currentCollection.activities.some(a => a.id === sanitizedActivity.id);
      const updatedActivities = isAlreadyAdded
        ? currentCollection.activities.filter(a => a.id !== sanitizedActivity.id)
        : [...currentCollection.activities, sanitizedActivity];
  
      await updateDoc(collectionRef, { activities: updatedActivities });
  
      setUserCollections(prev => ({
        ...prev,
        [collectionId]: { ...currentCollection, activities: updatedActivities }
      }));
  
    } catch (error) {
      console.error("Error updating collection:", error);
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
    if (searchQuery && fuseRef.current) {
      const results = fuseRef.current.search(searchQuery);
      list = results.map((r) => r.item);
    }

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
    } else if (filterState.sort === 'distance' && userLocation) {
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
    } else if (filterState.sort === 'rating') {
      list = list.slice().sort((a, b) => b.rating - a.rating);
    }

    return list.map((item) => ({
      ...item,
      liked: !!userLikes[item.id],
      saved: !!userSaves[item.id],
    }));
  }, [places, searchQuery, filterState, userLikes, userSaves, userLocation, userTopPrefs]);

  const isActivityInCollection = (collectionId: string, activityId: string) => {
    const collection = userCollections[collectionId];
    return (
      collection &&
      Array.isArray(collection.activities) &&
      collection.activities.some(activity => activity.id === activityId)
    );
  };

  /* ----------------------
     Like / Unlike
  ---------------------- */
  const handleLikePress = async (place) => {
    if (!user) return;

    const isLiked = !!userLikes[placeId];

    try {
      if (isLiked) {
        // If already liked, user is "unliking"
        await unlikePlace(placeId);
      } else {
        // 2) Not yet liked => fetch place details from Google
        const placeDetails = await fetchPlaceDetailsFromGoogle(placeId);
        if (!placeDetails) {
          console.warn("No place details found for placeId=", placeId);
          return;
        }
        // 3) Cache the place's reviews
        if (placeDetails.reviews && placeDetails.reviews.length > 0) {
          await storeReviewsForPlace(placeId, placeDetails.reviews);
        }

        // 4) Then call likePlace with the relevant fields
        await likePlace({
          id: placeId,
          name: placeDetails.name,
          rating: placeDetails.rating,
          userRatingsTotal: placeDetails.user_ratings_total,
          photoReference: placeDetails.photos?.[0]?.photo_reference || null,
          types: placeDetails.types || [],
        });
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  /* ----------------------
     Save / Open Collections Modal
  ---------------------- */
  const handleSavePress = (place: any) => {
    if (!user) return;
    setSelectedActivity(place);
    setCollectionModalVisible(true);
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

    for (let i = 0; i < displayed.length; i++) {
      finalData.push(displayed[i]);
      if ((i + 1) % 20 === 0) {
        finalData.push({ _type: 'exploreMoreCard', key: `exploreMore_${i + 1}` });
      }
    }
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
    if (item._type === 'exploreMoreCard') {
      return (
        <ExploreMoreCard
          style={styles.exploreCard}
          onCategoryPress={(keyword) => {
            fetchPlacesByKeyword(keyword);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        />
      );
    }

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

          <View style={styles.iconRow}>
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => handleLikePress(item)}
            >
              <Text style={[styles.iconText, item.liked && { color: 'red' }]}>
                {item.liked ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => handleSavePress(item)}
            >
              <Text style={styles.iconText}>💾</Text>
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
        <View style={styles.header}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            placeholderTextColor="#aaa"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Horizontal scrollable filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScrollContainer}
        >
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
        </ScrollView>

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

        {collectionModalVisible && selectedActivity && (
          <Modal visible={collectionModalVisible} transparent animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select a Collection</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {Object.entries(userCollections).map(([collectionId, collectionData]) => {
                    const isAdded = isActivityInCollection(collectionId, selectedActivity.id);
                    return (
                      <TouchableOpacity
                        key={collectionId}
                        style={[styles.modalButton, isAdded ? styles.selectedCollection : {}]}
                        onPress={() => toggleActivityInCollection(collectionId)}
                      >
                        <Text style={[styles.modalButtonText, isAdded ? { color: '#0D1117' } : {}]}>
                          {isAdded ? `✓ ${collectionData.title}` : collectionData.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setCollectionModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <FlatList
          ref={flatListRef}
          data={finalData}
          keyExtractor={(item, index) =>
            item._type === 'exploreMoreCard' ? item.key : item.id
          }
          renderItem={renderItem}
          //onEndReachedThreshold={0.5}
          //onEndReached={() => {
          //  if (!loading) loadMore();
          //}}
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
  filterScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0D1117',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#F5A623',
  },
  filterText: {
    color: '#0D1117',
    fontSize: 14,
    lineHeight: 30,
    fontWeight: '600',
    textAlign: 'center',
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
  selectedCollection: {
    backgroundColor: '#ccc',
  },
});

export default HomeScreen;
