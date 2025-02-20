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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, getFirestore, doc, setDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import { useFilters } from '../../context/FiltersContext';
import { getPreferences, likePlace, unlikePlace } from '../utils/storage';
import { logEvent } from '../utils/analytics';
import ExploreMoreCard from './ExploreMoreCard';

const { width, height } = Dimensions.get('window');

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
  const { filterState, setFilterState } = useFilters();
  const [loading, setLoading] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [userTopPrefs, setUserTopPrefs] = useState([]);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [collections, setCollections] = useState<any[]>([]);

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

  useEffect(() => {
    if (user) {
      const collectionsRef = collection(firestore, `users/${user.uid}/collections`);
      const unsubscribe = onSnapshot(collectionsRef, (snapshot) => {
        const userCollections = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCollections(userCollections);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleCollectionPress = (activity: any) => {
    setSelectedActivity(activity);
    setCollectionModalVisible(true);
  };

  const addToCollection = async (collectionId: string) => {
    if (!user || !selectedActivity) return;
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      await setDoc(
        collectionRef,
        {
          activities: [...(collections.find((col) => col.id === collectionId)?.activities || []), selectedActivity],
        },
        { merge: true }
      );
      setCollectionModalVisible(false);
      setSelectedActivity(null);
    } catch (error) {
      console.error("Error adding to collection:", error);
    }
  };

  const fetchPlaces = async (pageToken?: string) => {
    if (!userLocation) return;
    setLoading(true);
    try {
      const radius = filterState.distance ?? 5000;
      let keyword = 'activities';
      if (filterState.sort === 'Movies') keyword = 'movies';
      else if (filterState.sort === 'Dining') keyword = 'restaurant';

      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${GOOGLE_PLACES_API_KEY}&location=${userLocation.lat},${userLocation.lng}&radius=${radius}&type=establishment&keyword=${encodeURIComponent(keyword)}`;
      if (filterState.openNow) url += `&opennow=true`;
      if (pageToken) url += `&pagetoken=${pageToken}`;

      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status === 'OK') {
        setNextPageToken(data.next_page_token || null);
        setPlaces((prev) => (pageToken ? [...prev, ...data.results] : data.results));
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
    if (userLocation) fetchPlaces();
  }, [userLocation, filterState]);

  const loadMore = () => {
    if (!loading && nextPageToken) fetchPlaces(nextPageToken);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExploreMoreCard />}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        showsVerticalScrollIndicator={false}
      />
      {loading && <ActivityIndicator style={styles.loadingIndicator} size="large" color="#fff" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#161622' },
  loadingIndicator: { position: 'absolute', bottom: 50, alignSelf: 'center' },
});
