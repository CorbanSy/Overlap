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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Fuse from 'fuse.js';
import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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

  // ----- Pull filterState & setFilterState from the context -----
  const { filterState, setFilterState } = useFilters(); // CHANGED (no "filters" here)

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
  }, [userLocation, filterState]); // CHANGED: Use "filterState" instead of "filters"

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

      let url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${GOOGLE_PLACES_API_KEY}` +
        `&location=${userLocation.lat},${userLocation.lng}` +
        `&radius=${radius}` +
        `&type=tourist_attraction` +
        `&keyword=activities`;

      // If openNow is toggled:
      if (filterState.openNow) { 
        url += `&opennow=true`;
      }
      // If you had categories, do so here. If you had filterState.distance, override radius, etc.

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

    // Fuzzy search
    if (searchQuery && fuseRef.current) {
      const results = fuseRef.current.search(searchQuery);
      list = results.map((r) => r.item);
    }

    // If user wants only ratings >= 4
    if (filterState.ratings) { // CHANGED
      list = list.filter((item) => item.rating >= 4.0);
    }

    // Sort by distance or rating
    if (filterState.sort === 'distance' && userLocation) { // CHANGED
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
    } else if (filterState.sort === 'rating') { // CHANGED
      // sort by rating desc
      list = list.slice().sort((a, b) => b.rating - a.rating);
    }

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

  const toggleRatings = () => {
    setFilterState((prev) => ({
      ...prev,
      ratings: !prev.ratings,
    }));
  };

  const toggleSort = () => {
    setFilterState((prev) => ({
      ...prev,
      sort: prev.sort === 'distance' ? 'rating' : 'distance',
    }));
  };

  const handlePressMoreFilters = () => {
    router.push('/morefilters');
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
          <TouchableOpacity style={styles.filterButton} onPress={toggleSort}>
            <Text style={styles.filterText}>Sort</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterState.openNow && styles.filterButtonActive,
            ]}
            onPress={toggleOpenNow}
          >
            <Text style={styles.filterText}>Open Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterState.ratings && styles.filterButtonActive,
            ]}
            onPress={toggleRatings}
          >
            <Text style={styles.filterText}>Ratings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={handlePressMoreFilters}
          >
            <Text style={styles.filterText}>More Filters</Text>
          </TouchableOpacity>
        </View>

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
});
