import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  RefreshControl,
  Dimensions,
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
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFilters } from '../../context/FiltersContext';

import {
  getProfileData,
  likePlace,
  unlikePlace,
  storeReviewsForPlace,
} from '../utils/storage';

// Make sure ExploreMoreCard.tsx is outside (tabs) so it doesn't become a tab
import ExploreMoreCard from '../../components/ExploreMoreCard'; 

const GOOGLE_PLACES_API_KEY = 'AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY';

/* Some helpers */
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
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

function mapGoogleTypesToCategory(googleTypes: string[]): string[] {
  if (!Array.isArray(googleTypes)) return ['other'];

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
  return categories.length ? categories : ['other'];
}

async function fetchPlaceDetailsFromGoogle(placeId: string) {
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_PLACES_API_KEY}&place_id=${placeId}&fields=name,rating,reviews,types,photos,user_ratings_total`;
  const resp = await fetch(detailsUrl);
  const data = await resp.json();
  return data?.result;
}

export default function HomeScreen() {
  const router = useRouter();
  const firestore = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;

  // State
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const fuseRef = useRef<Fuse<any> | null>(null);

  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userSaves, setUserSaves] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const { filterState, setFilterState } = useFilters();
  const [userTopPrefs, setUserTopPrefs] = useState<string[]>([]);
  const [userCollections, setUserCollections] = useState<Record<string, any>>({});

  // We’ll use this to scroll the list to top after new fetches
  const flatListRef = useRef<FlatList<any>>(null);

  /* Load user prefs (top categories) */
  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfileData();
        if (profile?.topCategories) {
          setUserTopPrefs(profile.topCategories);
        }
      } catch (err) {
        console.error('Error loading user prefs:', err);
      }
    })();
  }, []);

  /* Request user location */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  /* Listen for user likes */
  useEffect(() => {
    if (!user) return;
    const likesRef = collection(firestore, `users/${user.uid}/likes`);
    const unsubscribe = onSnapshot(likesRef, (snapshot) => {
      const newLikes: Record<string, boolean> = {};
      snapshot.forEach((doc) => {
        newLikes[doc.id] = true;
      });
      setUserLikes(newLikes);
    });
    return () => unsubscribe();
  }, [user]);

  /* Listen for user collections (if needed) */
  useEffect(() => {
    if (!user) return;
    const colRef = collection(firestore, `users/${user.uid}/collections`);
    const unsub = onSnapshot(colRef, (snap) => {
      const temp: Record<string, any> = {};
      snap.forEach((docSnap) => {
        temp[docSnap.id] = {
          title: docSnap.data().title || 'Untitled',
          activities: docSnap.data().activities || [],
        };
      });
      setUserCollections(temp);
    });
    return () => unsub();
  }, [user]);

  /* Fetch places whenever user location or filters change */
  useEffect(() => {
    if (userLocation) {
      fetchPlaces();
    }
  }, [userLocation, filterState]);

  /* Setup FUSE for fuzzy searching by 'name' */
  useEffect(() => {
    if (places.length) {
      fuseRef.current = new Fuse(places, {
        keys: ['name'],
        threshold: 0.4,
      });
    }
  }, [places]);

  // main fetch
  const fetchPlaces = async (pageToken?: string) => {
    if (!userLocation) return;
    setLoading(true);

    try {
      const radius = filterState.distance ?? 5000;
      let keyword = 'activities';
      if (filterState.sort === 'Movies') keyword = 'movies';
      if (filterState.sort === 'Dining') keyword = 'restaurant';
      if (filterState.sort === 'Outdoors') keyword = 'park';

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
          photos: p.photos || [], // entire array
          geometry: p.geometry,
          types: p.types || [],
        }));
        setPlaces((prev) => (pageToken ? [...prev, ...newPlaces] : newPlaces));
      } else {
        console.warn('Google Places API error:', data.status, data.error_message);
      }
    } catch (err) {
      console.error('fetchPlaces error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* For user pulling down to refresh */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlaces();
    setRefreshing(false);
  };

  /* Fuzzy search + custom sort => final array */
  const getDisplayedPlaces = useCallback(() => {
    let list = places;

    // Fuzzy search
    if (searchQuery && fuseRef.current) {
      const results = fuseRef.current.search(searchQuery);
      list = results.map((r) => r.item);
    }

    // Sort
    if (!filterState.sort || filterState.sort === 'recommended') {
      list = list.map((place) => {
        const cats = mapGoogleTypesToCategory(place.types);
        let score = 0;
        cats.forEach((c) => {
          const idx = userTopPrefs.indexOf(c);
          if (idx !== -1) {
            score += 5 - idx;
          }
        });
        return { ...place, preferenceScore: score };
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

    // attach liked/saved flags
    return list.map((item) => ({
      ...item,
      liked: !!userLikes[item.id],
      saved: !!userSaves[item.id],
    }));
  }, [places, searchQuery, filterState, userLikes, userSaves, userTopPrefs, userLocation]);

  /* Like / Unlike */
  const handleLikePress = async (place: any) => {
    if (!user) return;
    const isLiked = !!userLikes[place.id];
    try {
      if (isLiked) {
        await unlikePlace(place.id);
      } else {
        // fetch extended place details
        const details = await fetchPlaceDetailsFromGoogle(place.id);
        if (details) {
          if (details.reviews?.length) {
            await storeReviewsForPlace(place.id, details.reviews);
          }
          await likePlace({
            id: place.id,
            name: details.name || place.name,
            rating: details.rating || place.rating,
            userRatingsTotal: details.user_ratings_total || place.userRatingsTotal,
            photoReference: details.photos?.[0]?.photo_reference || null,
            types: details.types || place.types,
          });
        } else {
          // fallback: just store the place
          await likePlace(place);
        }
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  /* Save press => optional logic. Not fully implemented here. */
  const handleSavePress = (place: any) => {
    if (!user) return;
    // Show a modal for collections, or implement your logic
  };

  /* fetch by keyword => user taps exploreMore category */
  const fetchPlacesByKeyword = async (keyword: string) => {
    if (!userLocation) return;
    setLoading(true);
    setNextPageToken(null);

    try {
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
        const newPlaces = data.results.map((p: any) => ({
          id: p.place_id,
          name: p.name,
          rating: p.rating || 0,
          userRatingsTotal: p.user_ratings_total || 0,
          photos: p.photos || [],
          geometry: p.geometry,
          types: p.types ?? [],
        }));
        setPlaces(newPlaces);

        // scroll to top
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      } else {
        console.warn('fetchPlacesByKeyword error:', data.status, data.error_message);
      }
    } catch (error) {
      console.error('fetchPlacesByKeyword error:', error);
    } finally {
      setLoading(false);
    }
  };

  /* Build final data => insert ExploreMoreCard every 20 items */
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

  // *** REVERT BACK TO A SINGLE IMAGE INSTEAD OF A CAROUSEL ***
  function renderSingleImage(item: any) {
    if (!item.photos?.length) {
      return (
        <View style={[styles.imageWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#ccc' }}>No Photo</Text>
        </View>
      );
    }
    // Just the first photo
    const firstPhoto = item.photos[0];
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${firstPhoto.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.imageWrapper, { resizeMode: 'cover' }]}
      />
    );
  }

  /* Render each list item */
  const renderItem = ({ item }: { item: any }) => {
    if (item._type === 'exploreMoreCard') {
      // Our "Explore More" section
      return (
        <ExploreMoreCard
          style={styles.exploreCard}
          onCategoryPress={(kw) => {
            fetchPlacesByKeyword(kw);
          }}
        />
      );
    }

    const distanceText =
      userLocation && item.geometry?.location
        ? `${getDistanceFromLatLonInKm(
            userLocation.lat,
            userLocation.lng,
            item.geometry.location.lat,
            item.geometry.location.lng
          ).toFixed(2)} km`
        : '';

    return (
      <TouchableOpacity
        style={styles.dashCard}
        onPress={() => router.push(`/moreInfo?placeId=${item.id}`)}
      >
        {/* SINGLE IMAGE */}
        <View style={{ position: 'relative' }}>
          {renderSingleImage(item)}
          <View style={styles.iconRow}>
            <TouchableOpacity style={styles.iconContainer} onPress={() => handleLikePress(item)}>
              <Text style={[styles.iconText, item.liked && { color: 'red' }]}>
                {item.liked ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconContainer} onPress={() => handleSavePress(item)}>
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
            {distanceText ? `  •  ${distanceText} away` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* Final data, plus optional loading spinner at bottom */
  const finalData = getFinalData();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search bar / header */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Horizontal scrollable filter bar with spacing */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterScrollContainer, { flexDirection: 'row' }]}
        style={{ backgroundColor: '#0D1117' }}
      >
        <TouchableOpacity style={styles.filterButton} onPress={() => {
          // open a sort modal or cycle sort
        }}>
          <Text style={styles.filterButtonText}>
            {filterState.sort ? `Sort: ${filterState.sort}` : 'Sort'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filterState.openNow && { backgroundColor: '#F5A623' }]}
          onPress={() => setFilterState((prev) => ({ ...prev, openNow: !prev.openNow }))}
        >
          <Text style={styles.filterButtonText}>Open Now</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton}
          onPress={() => {
            // open a location modal
          }}
        >
          <Text style={styles.filterButtonText}>Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton}
          onPress={() => router.push('/morefilters')}
        >
          <Text style={styles.filterButtonText}>More Filters</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        ref={flatListRef}
        data={finalData}
        keyExtractor={(item, index) => (item._type === 'exploreMoreCard' ? item.key : item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          loading ? <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#F5A623']}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginRight: 8,
    height: 35, // fixed height prevents clipping
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  filterButtonText: {
    color: '#0D1117',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 30,
  },
  dashCard: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  // We'll reuse imageWrapper for the single image's size
  imageWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: '#333',
  },
  iconRow: {
    position: 'absolute',
    flexDirection: 'row',
    right: 10,
    bottom: 10,
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
  exploreCard: {
    marginVertical: 20,
  },
});
