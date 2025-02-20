// home.tsx
const GOOGLE_PLACES_API_KEY = 'AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY';
// ${GOOGLE_PLACES_API_KEY}
// home.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, getFirestore } from 'firebase/firestore';
import * as Location from 'expo-location';
import Fuse from 'fuse.js';
import { useFilters } from '../../context/FiltersContext';
import { getPreferences, likePlace, unlikePlace } from '../utils/storage';
import { logEvent } from '../utils/analytics';
import ExploreMoreCard from './ExploreMoreCard'; // Ensure the path is correct!

const { width, height } = Dimensions.get('window');

// Helper functions for distance calculation
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

// Reusable component for Place Card in Reels Style
const PlaceCard = ({ item, userLocation, onLikePress, userLiked, screenHeight }: any) => {
  // Build the URL for the image
  const photoUrl = item.photoReference
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${item.photoReference}&key=${GOOGLE_PLACES_API_KEY}`
    : null;

  // Calculate distance if location is available
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

  // We define a dynamic style for the container that ensures it's the full screenHeight
  const placeCardStyles = StyleSheet.create({
    fullScreenCard: {
      width: width,
      height: screenHeight,
      backgroundColor: '#161622',
      position: 'relative',
    },
    carousel: {
      width: '100%',
      height: screenHeight * 0.7,
    },
    carouselImage: {
      width: width,
      height: '100%',
      resizeMode: 'cover',
    },
    detailsOverlay: {
      position: 'absolute',
      bottom: 170,
      left: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 15,
      borderRadius: 10,
    },
    placeName: {
      color: '#fff',
      fontSize: 26,
      fontWeight: 'bold',
    },
    placeInfo: {
      color: '#fff',
      fontSize: 16,
      marginTop: 5,
    },
    placeDescription: {
      color: '#fff',
      fontSize: 14,
      marginTop: 10,
    },
    buttonsOverlay: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    button: {
      backgroundColor: 'rgba(245, 166, 35, 0.9)',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
      marginHorizontal: 10,
    },
    buttonText: {
      fontSize: 16,
      color: '#0D1117',
      fontWeight: 'bold',
    },
  });

  return (
    <View style={placeCardStyles.fullScreenCard}>
      {/* Use a carousel (horizontal FlatList) for multiple images */}
      <FlatList
        data={item.photos || (item.photoReference ? [item.photoReference] : [])}
        renderItem={({ item: photoRef }) => {
          const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;
          return <Image source={{ uri: url }} style={placeCardStyles.carouselImage} />;
        }}
        keyExtractor={(photoRef, index) => `${photoRef}_${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        snapToAlignment="center"
        decelerationRate="fast"
        disableIntervalMomentum
        style={placeCardStyles.carousel}
      />
      {/* Overlay for place details */}
      <View style={placeCardStyles.detailsOverlay}>
        <Text style={placeCardStyles.placeName}>{item.name}</Text>
        <Text style={placeCardStyles.placeInfo}>
          {item.rating.toFixed(1)} ⭐ | {distanceText}
        </Text>
        {item.description && (
          <Text style={placeCardStyles.placeDescription}>{item.description}</Text>
        )}
      </View>

      {/* Like and Save buttons, repositioned to the bottom */}
      <View style={placeCardStyles.buttonsOverlay}>
        <TouchableOpacity
          onPress={() => {
            onLikePress(item.id);
            logEvent('like_pressed', { placeId: item.id });
          }}
          style={placeCardStyles.button}
        >
          <Text style={placeCardStyles.buttonText}>{userLiked ? '♥ Liked' : '♡ Like'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            logEvent('save_pressed', { placeId: item.id });
            // Add your "save to collection" logic here.
          }}
          style={placeCardStyles.button}
        >
          <Text style={placeCardStyles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const screenHeight = height - (insets.top + insets.bottom);

  const [places, setPlaces] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { filterState } = useFilters();
  const [userTopPrefs, setUserTopPrefs] = useState([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    async function loadUserPrefs() {
      try {
        const prefs = await getPreferences();
        setUserTopPrefs(prefs);
      } catch (err) {
        console.error("Error loading user prefs:", err);
      }
    }
    loadUserPrefs();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

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

  // Fetch places from Google Places API
  const fetchPlaces = async (pageToken?: string) => {
    if (!userLocation) return;
    setLoading(true);
    try {
      const radius = filterState.distance ?? 5000;
      let keyword = 'activities';
      if (filterState.sort === 'Movies') {
        keyword = 'movies';
      } else if (filterState.sort === 'Dining') {
        keyword = 'restaurant';
      }
      let url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${GOOGLE_PLACES_API_KEY}` +
        `&location=${userLocation.lat},${userLocation.lng}` +
        `&radius=${radius}` +
        `&type=establishment` +
        `&keyword=${encodeURIComponent(keyword)}`;
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
          types: p.types ?? [],
          // Description is not returned by Nearby Search API.
          description: null,
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

  useEffect(() => {
    if (userLocation) {
      fetchPlaces();
    }
  }, [userLocation, filterState]);

  // Infinite scrolling
  const loadMore = () => {
    if (!loading && nextPageToken) {
      fetchPlaces(nextPageToken);
    }
  };

  // Local sorting/weighting (simplified)
  const getDisplayedPlaces = useCallback(() => {
    return places.map((item) => ({ ...item, liked: !!userLikes[item.id] }));
  }, [places, userLikes]);

  // Handle like button press
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

  // Combine displayed places with an Explore More card inserted every 20 items
  const combinedList = useCallback(() => {
    const list = getDisplayedPlaces();
    const modifiedList: any[] = [];
    const exploreInterval = 20;
    list.forEach((item, index) => {
      modifiedList.push(item);
      if ((index + 1) % exploreInterval === 0) {
        modifiedList.push({ id: `explore_more_${index}`, isExploreMore: true });
      }
    });
    return modifiedList;
  }, [getDisplayedPlaces]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.isExploreMore) {
      return <ExploreMoreCard />;
    } else {
      return (
        <PlaceCard
          item={item}
          userLocation={userLocation}
          onLikePress={handleLikePress}
          userLiked={!!userLikes[item.id]}
          screenHeight={screenHeight}
        />
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={combinedList()}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      />
      {loading && (
        <ActivityIndicator
          style={styles.loadingIndicator}
          size="large"
          color="#fff"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#161622',
  },
  loadingIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
});



