// home.tsx
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

// Helpers (distance, etc.)
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
  const d = R * c;
  return d;
}
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const GOOGLE_PLACES_API_KEY = 'AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY';

// Array of categories to be shown in the Sort dropdown.
const SORT_CATEGORIES = [
  'Dining',
  'Fitness',
  'Outdoors',
  'Movies',
  'Gaming',
  'Social',
  'Music',
  'Shopping',
  'Travel',
  'Art',
  'Relaxing',
  'Learning',
  'Cooking',
  'Nightlife',
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  // ------ State ------
  const [places, setPlaces] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // New states for the location modal and manual input
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState('');

  // New state for the Sort dropdown modal visibility
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // ----- Pull filterState & setFilterState from the context -----
  const { filterState, setFilterState } = useFilters();

  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  // For fuzzy search
  const fuseRef = useRef<Fuse<any> | null>(null);

  // Request location once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  // --- FETCH places whenever location or filterState changes ---
  useEffect(() => {
    if (userLocation) {
      fetchPlaces();
    }
  }, [userLocation, filterState]);

  // Listen for user likes
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

  // ------ Fetching Logic ------
  const fetchPlaces = async (pageToken?: string) => {
    if (!userLocation) return;
    setLoading(true);

    try {
      const radius = filterState.distance ?? 5000;
      // Use the selected sort category as the keyword, default to 'activities'
      const keyword = filterState.sort ? filterState.sort : 'activities';

      let url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${GOOGLE_PLACES_API_KEY}` +
        `&location=${userLocation.lat},${userLocation.lng}` +
        `&radius=${radius}` +
        `&type=tourist_attraction` +
        `&keyword=${encodeURIComponent(keyword)}`;

      // If openNow is toggled:
      if (filterState.openNow) { 
        url += `&opennow=true`;
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

  // Infinite scrolling
  const loadMore = () => {
    if (nextPageToken) {
      fetchPlaces(nextPageToken);
    }
  };

  // Fuzzy search
  useEffect(() => {
    if (places.length) {
      fuseRef.current = new Fuse(places, {
        keys: ['name'],
        threshold: 0.4,
      });
    }
  }, [places]);

  // Filter & sort places
  const getDisplayedPlaces = useCallback(() => {
    let list = places;
  
    // Fuzzy search filtering
    if (searchQuery && fuseRef.current) {
      const results = fuseRef.current.search(searchQuery);
      list = results.map((r) => r.item);
    }
  
    // (Additional sorting logic could be added here if needed.)
    // Mark liked
    return list.map((item) => ({
      ...item,
      liked: !!userLikes[item.id],
    }));
  }, [places, searchQuery, filterState, userLikes, userLocation]);

  // Like/unlike
  const handleLikePress = async (placeId: string) => {
    if (!user) return;
    const docRef = doc(firestore, `users/${user.uid}/likes`, placeId);
    const isLiked = !!userLikes[placeId];
    try {
      if (isLiked) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { placeId, createdAt: new Date() });
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  // Filter Toggles
  const toggleOpenNow = () => {
    setFilterState((prev) => ({
      ...prev,
      openNow: !prev.openNow,
    }));
  };

  const handlePressMoreFilters = () => {
    router.push('/morefilters');
  };

  // New: Handler to set location based on manual input (or keep current if empty)
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

  // Render each place (DoorDash style)
  const renderPlaceItem = ({ item }: { item: any }) => {
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
      <TouchableOpacity style={styles.dashCard} onPress={() => {}}>
        <View style={styles.dashImageContainer}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.dashImage} />
          ) : (
            <View style={[styles.dashImage, { backgroundColor: '#333' }]} />
          )}

          <TouchableOpacity
            style={styles.likeIconContainer}
            onPress={() => handleLikePress(item.id)}
          >
            <Text style={[styles.likeIcon, item.liked && { color: 'red' }]}>
              {item.liked ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
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

  // Main Render
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
              {filterState.sort ? filterState.sort : 'Sort'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filterState.openNow && styles.filterButtonActive]}
            onPress={toggleOpenNow}
          >
            <Text style={styles.filterText}>Open Now</Text>
          </TouchableOpacity>

          {/* Replace Ratings button with Location button */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setLocationModalVisible(true)}
          >
            <Text style={styles.filterText}>Location</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton} onPress={handlePressMoreFilters}>
            <Text style={styles.filterText}>More Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Sort Dropdown Modal */}
        {sortModalVisible && (
          <Modal visible={sortModalVisible} transparent animationType="fade">
            <View style={styles.modalContainer}>
              <View style={styles.sortModalContent}>
                <ScrollView>
                  {SORT_CATEGORIES.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.sortModalItem}
                      onPress={() => handleSelectSortCategory(category)}
                    >
                      <Text style={styles.sortModalItemText}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
                  placeholder="Enter a location (leave blank for current)"
                  placeholderTextColor="#aaa"
                  value={manualLocationInput}
                  onChangeText={setManualLocationInput}
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleSetLocation}>
                  <Text style={styles.modalButtonText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={() => setLocationModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Places List */}
        <FlatList
          data={getDisplayedPlaces()}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaceItem}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!loading) loadMore();
          }}
          ListFooterComponent={
            loading ? <ActivityIndicator size="small" color="#fff" /> : null
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

// ---------- STYLES ------------
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
  likeIconContainer: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 8,
  },
  likeIcon: {
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
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  sortModalContent: {
    width: '80%',
    maxHeight: '60%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
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
});
