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
  updateDoc,  // <-- imported updateDoc for updating collections
  setDoc,
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFilters } from '../../context/FiltersContext';

import {
  getProfileData,
  likePlace,
  unlikePlace,
  storeReviewsForPlace,
} from '../utils/storage';

import ExploreMoreCard from '../../components/ExploreMoreCard'; 

const GOOGLE_PLACES_API_KEY = 'AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY';

// Some helper functions ...
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

  // State variables
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

  // NEW: Modal state for "Add to Collection"
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [selectedPlaceForCollection, setSelectedPlaceForCollection] = useState<any>(null);

  // Ref for FlatList scrolling
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

  /* Listen for user collections */
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
          photos: p.photos || [],
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
    if (searchQuery && fuseRef.current) {
      const results = fuseRef.current.search(searchQuery);
      list = results.map((r) => r.item);
    }
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
          await likePlace(place);
        }
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  /* NEW: Handle Save press to open the collection modal */
  const handleSavePress = (place: any) => {
    if (!user) return;
    setSelectedPlaceForCollection(place);
    setCollectionModalVisible(true);
  };

  /* fetch by keyword for Explore More category */
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

  /* NEW: Helper function to add an activity to a collection */
  const addActivityToCollection = async (collectionId: string, activity: any) => {
    if (!user) return;
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const currentCollection = userCollections[collectionId];
      const currentActivities = currentCollection?.activities || [];
      // Check if the activity already exists in the collection
      if (!currentActivities.some((a: any) => a.id === activity.id)) {
        const newActivities = [...currentActivities, activity];
        await updateDoc(collectionRef, { activities: newActivities });
      } else {
        console.log("Activity already in this collection");
      }
    } catch (err) {
      console.error("Error adding activity to collection:", err);
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

  // Render single image function remains unchanged
  function renderSingleImage(item: any) {
    // If we do have an array of photos
    if (item.photos?.length) {
      const firstPhoto = item.photos[0];
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${firstPhoto.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;
      return <Image source={{ uri: photoUrl }} style={[styles.imageWrapper, { resizeMode: 'cover' }]} />;
    } 
    // Otherwise, if you only have a single photoReference
    else if (item.photoReference) {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${item.photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
      return <Image source={{ uri: photoUrl }} style={[styles.imageWrapper, { resizeMode: 'cover' }]} />;
    }
  
    // Fallback: No photo
    return (
      <View style={[styles.imageWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#ccc' }}>No Photo</Text>
      </View>
    );
  }
  

  /* Render each list item */
  const renderItem = ({ item }: { item: any }) => {
    if (item._type === 'exploreMoreCard') {
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

      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterScrollContainer, { flexDirection: 'row' }]}
        style={{ backgroundColor: '#0D1117' }}
      >
        <TouchableOpacity style={styles.filterButton} onPress={() => {}}>
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
        <TouchableOpacity style={styles.filterButton} onPress={() => {}}>
          <Text style={styles.filterButtonText}>Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => router.push('/morefilters')}>
          <Text style={styles.filterButtonText}>More Filters</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Main list */}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#F5A623']} />
        }
      />

      {/* NEW: Modal for adding to a collection */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={collectionModalVisible}
        onRequestClose={() => setCollectionModalVisible(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle}>Select a Collection</Text>
            <ScrollView>
              {Object.keys(userCollections).length > 0 ? (
                Object.keys(userCollections).map((collectionId) => {
                  const collection = userCollections[collectionId];
                  return (
                    <TouchableOpacity
                      key={collectionId}
                      style={modalStyles.collectionItem}
                      onPress={async () => {
                        await addActivityToCollection(collectionId, selectedPlaceForCollection);
                        setCollectionModalVisible(false);
                        setSelectedPlaceForCollection(null);
                      }}
                    >
                      <Text style={modalStyles.collectionTitle}>{collection.title}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={modalStyles.noCollectionsText}>No collections available.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => {
                setCollectionModalVisible(false);
                setSelectedPlaceForCollection(null);
              }}
            >
              <Text style={modalStyles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  collectionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  collectionTitle: {
    fontSize: 16,
  },
  noCollectionsText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    color: '#888',
  },
  closeButton: {
    marginTop: 15,
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    color: '#007BFF',
    fontSize: 16,
  },
});

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
    height: 35,
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
