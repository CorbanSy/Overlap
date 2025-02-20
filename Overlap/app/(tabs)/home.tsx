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
import { useFilters } from '../../context/FiltersContext';
import { getPreferences, likePlace, unlikePlace } from '../utils/storage';
import { logEvent } from '../utils/analytics';
import ExploreMoreCard from './ExploreMoreCard';

const { width, height } = Dimensions.get('window');

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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const screenHeight = height - (insets.top + insets.bottom);

  const [places, setPlaces] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { filterState } = useFilters();
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

  // Local sorting/weighting
  const getDisplayedPlaces = useCallback(() => {
    return places.map((item) => ({ ...item, liked: !!userLikes[item.id] }));
  }, [places, userLikes]);

  // Handle like button press
  const handleLikePress = async (placeId: string) => {
    if (!user) return;
  
    try {
      const place = places.find((p) => p.id === placeId);
  
      if (!place) {
        console.error(`Place with ID ${placeId} not found`);
        return;
      }
  
      const isLiked = !!userLikes[placeId];
  
      if (isLiked) {
        await unlikePlace(placeId);
      } else {
        await likePlace(place);
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
        <ActivityIndicator style={styles.loadingIndicator} size="large" color="#fff" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#161622' },
  loadingIndicator: { position: 'absolute', bottom: 50, alignSelf: 'center' },
});
