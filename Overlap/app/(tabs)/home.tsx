// home.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Fuse from 'fuse.js';
import * as Location from 'expo-location';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, getFirestore, deleteDoc, doc, setDoc, updateDoc, } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFilters } from '../../context/FiltersContext';

import {
  getProfileData,
  likePlace,
  unlikePlace,
  storeReviewsForPlace,
  addToCollection,
} from '../_utils/storage';

import ExploreMoreCard from '../../components/ExploreMoreCard';
import { PLACE_CATEGORIES } from '../_utils/placeCategories'; // single source

const GOOGLE_PLACES_API_KEY = 'AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY';

// -------------- Helpers --------------
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
  if (!Array.isArray(googleTypes)) return [];
  const matchedCategories: string[] = [];
  for (const cat of PLACE_CATEGORIES) {
    if (cat.includedTypes?.some((t) => googleTypes.includes(t))) {
      matchedCategories.push(cat.key);
    }
  }
  return matchedCategories;
}

/**
 * Build a comma-separated list of types from the given category keys.
 * (Since we're now using only the top category, this function is used only when needed.)
 */
function buildIncludedTypesString(categoryKeys: string[]): string {
  const allTypes: string[] = [];
  for (const catKey of categoryKeys) {
    const catObj = PLACE_CATEGORIES.find((c) => c.key === catKey);
    if (catObj && catObj.includedTypes) {
      allTypes.push(...catObj.includedTypes);
    }
  }
  const uniqueTypes = Array.from(new Set(allTypes));
  return uniqueTypes.join(',');
}

// ------------------------------------------
export default function HomeScreen() {
  const router = useRouter();
  const firestore = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;

  // State
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fuseRef = useRef<Fuse<any> | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { filterState } = useFilters();
  const [userSaves, setUserSaves] = useState<Record<string, boolean>>({});
  // Using only a single top category
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const flatListRef = useRef<FlatList<any>>(null);
  // Collections
  const [userCollections, setUserCollections] = useState<Record<string, any>>({});

  // Modal flow
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [selectedPlaceForCollection, setSelectedPlaceForCollection] = useState<any>(null);
  // ---------------------------
  // Load user top category from profile (preferences.tsx now saves only one)
  // ---------------------------
  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfileData();
        if (profile?.topCategories && profile.topCategories.length > 0) {
          const topCat = profile.topCategories[0];
          setCurrentCategory(topCat);
        }
      } catch (err) {
        console.error('Error loading user prefs:', err);
      }
    })();
  }, []);

  // Load user collections
  useEffect(() => {
    if (!user) return;
    const colRef = collection(firestore, `users/${user.uid}/collections`);
    const unsub = onSnapshot(colRef, (snap) => {
      const temp: any = {};
      snap.forEach((docSnap) => {
        temp[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setUserCollections(temp);
    });
    return () => unsub();
  }, [user]);

  // ---------------------------
  // Request user location
  // ---------------------------
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
    if (!user) return;
    const savesRef = collection(firestore, `users/${user.uid}/collections`);
    const unsubscribe = onSnapshot(savesRef, (snapshot) => {
      const newSaves: Record<string, boolean> = {};
      snapshot.forEach((docSnap) => {
        newSaves[docSnap.id] = true;
      });
      setUserSaves(newSaves);
    });
    return () => unsubscribe();
  }, [user]);

  // ---------------------------
  // Listen for user likes
  // ---------------------------
  useEffect(() => {
    if (!user) return;
    const likesRef = collection(firestore, `users/${user.uid}/likes`);
    const unsubscribe = onSnapshot(likesRef, (snapshot) => {
      const newLikes: Record<string, boolean> = {};
      snapshot.forEach((docSnap) => {
        newLikes[docSnap.id] = true;
      });
      setUserLikes(newLikes);
    });
    return () => unsubscribe();
  }, [user]);

    // ---------------------------
  // Listen for user collections
  // Each collection doc has a "title" and an array of "activities", for example.
  // We'll store them in userCollections by docId => { title, activities, ... }
  // ---------------------------
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
  
  // ---------------------------
  // Fetch places whenever location, filters, or currentCategory change
  // ---------------------------
  useEffect(() => {
    if (userLocation && currentCategory) {
      fetchPlaces();
    }
  }, [userLocation, filterState, currentCategory]);

  // ---------------------------
  // Setup Fuse for fuzzy searching
  // ---------------------------
  useEffect(() => {
    if (places.length) {
      fuseRef.current = new Fuse(places, {
        keys: ['name'],
        threshold: 0.4,
      });
    }
  }, [places]);

  async function fetchPlaceDetailsFromGoogle(placeId: string) {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_PLACES_API_KEY}&place_id=${placeId}&fields=name,rating,reviews,types,photos,user_ratings_total`;
    const resp = await fetch(detailsUrl);
    const data = await resp.json();
    return data?.result;
  }
  
  // ---------------------------
  // fetchPlaces: Use new Nearby Search API with currentCategory's representativeType
  // ---------------------------
  async function fetchPlaces() {
    if (!userLocation || !currentCategory) return;
    setLoading(true);
    try {
      const catObj = PLACE_CATEGORIES.find((c) => c.key === currentCategory);
      if (!catObj) {
        console.warn('Current category not found:', currentCategory);
        return;
      }
      const radius = filterState.distance ?? 5000;
      const payload: any = {
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: userLocation.lat,
              longitude: userLocation.lng,
            },
            radius: radius,
          },
        },
        excludedTypes: ["doctor"],
        // Use the representative type for the API call.
        includedTypes: [catObj.representativeType],
      };
      console.log('fetchPlaces payload =>', payload);
      const resp = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.id,places.formattedAddress,places.types,places.location,places.rating,places.userRatingCount,places.photos",
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      console.log('New API data:', JSON.stringify(data, null, 2));
      if (data.places && Array.isArray(data.places)) {
        const newPlaces = data.places.map((p: any) => {
          const lat = p.location?.latitude ?? 0;
          const lng = p.location?.longitude ?? 0;
          return {
            id: p.id, // "id" is now returned from the API
            name: p.displayName?.text || p.name,
            rating: p.rating || 0,
            userRatingsTotal: p.userRatingCount || 0,
            // Map photos: construct a usable photoUri using the photo's "name"
            photos: p.photos
              ? p.photos.map((photo: any) => ({
                  photoUri: `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_PLACES_API_KEY}`,
                }))
              : [],
            geometry: { location: { lat, lng } },
            types: p.types || [],
          };
        });
        setPlaces(newPlaces);
      } else {
        console.warn('Google Places API (New) error or empty response', data);
      }
    } catch (err) {
      console.error('fetchPlaces error:', err);
    } finally {
      setLoading(false);
    }
  }
  

  // ---------------------------
  // fetchPlacesByKeyword: Use new Text Search API with representativeType
  // ---------------------------
  async function fetchPlacesByKeyword(keyword: string) {
    if (!userLocation || !currentCategory) return;
    setLoading(true);
    try {
      const catObj = PLACE_CATEGORIES.find((c) => c.key === currentCategory);
      let repType = "establishment";
      if (catObj?.representativeType) {
        repType = catObj.representativeType;
      }
      const radius = filterState.distance ?? 5000;
      const payload = {
        query: keyword,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: userLocation.lat,
              longitude: userLocation.lng,
            },
            radius: radius,
          },
        },
        includedType: repType,
        excludedTypes: ["doctor"],
      };
      console.log('fetchPlacesByKeyword payload =>', payload);
      const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,place.id,places.formattedAddress,places.types,places.location,places.rating,places.userRatingCount,places.photos",
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      console.log('New API text search data:', data);
      if (data.places && Array.isArray(data.places)) {
        const newPlaces = data.places.map((p: any) => {
          const lat = p.location?.latitude ?? 0;
          const lng = p.location?.longitude ?? 0;
          return {
            id: p.id, // "id" is now returned from the API
            name: p.displayName?.text || p.name,
            rating: p.rating || 0,
            userRatingsTotal: p.userRatingCount || 0,
            // Map photos: construct a usable photoUri using the photo's "name"
            photos: p.photos
              ? p.photos.map((photo: any) => ({
                  photoUri: `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_PLACES_API_KEY}`,
                }))
              : [],
            geometry: { location: { lat, lng } },
            types: p.types || [],
          };
        });
        setPlaces(newPlaces);
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      } else {
        console.warn('Google Places API (New) text search error or empty response', data);
      }
    } catch (error) {
      console.error('fetchPlacesByKeyword error:', error);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // Pull-down to refresh
  // ---------------------------
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlaces();
    setRefreshing(false);
  };

  // ---------------------------
  // getDisplayedPlaces: processes and sorts the list of places
  // ---------------------------
  const getDisplayedPlaces = useCallback(() => {
    let list = places;
    if (searchQuery && fuseRef.current) {
      const results = fuseRef.current.search(searchQuery);
      list = results.map((r) => r.item);
    }
    if (!filterState.sort || filterState.sort === 'recommended') {
      list = list.map((place) => {
        const matchedCats = mapGoogleTypesToCategory(place.types);
        let score = 0;
        matchedCats.forEach((catKey) => {
          if (catKey === currentCategory) {
            score += 10;
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
  }, [places, searchQuery, filterState, userLikes, userLocation, currentCategory]);

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

  const handleLikePress = async (place: any) => {
    if (!user) return;
    const isLiked = !!userLikes[place.id];
    try {
      if (isLiked) {
        await deleteDoc(doc(firestore, 'users', user.uid, 'likes', place.id));
      } else {
        const details = await fetchPlaceDetailsFromGoogle(place.id);
        if (details) {
          if (details.reviews?.length) {
            await storeReviewsForPlace(place.id, details.reviews);
          }
          await likePlace({
            id: place.id,
            name: details.displayName?.text || details.name,
            rating: details.rating || place.rating,
            userRatingsTotal: details.userRatingCount || place.userRatingsTotal,
            photos: details.photos || [],
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

  // Open modal to pick collection
  const handleAddToCollection = (place: any) => {
    setSelectedPlaceForCollection(place);
    setCollectionModalVisible(true);
  };
  
  // ---------------------------
  // Render images: if one image, show it; if multiple, display a carousel.
  // ---------------------------
  function renderImages(item: any) {
    if (!item.photos || item.photos.length === 0) {
      return (
        <View style={[styles.imageWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#ccc' }}>No Photo</Text>
        </View>
      );
    }
    const screenWidth = Dimensions.get('window').width;
    if (item.photos.length === 1) {
      return (
        <Image
          source={{ uri: item.photos[0].photoUri }}
          style={{ width: screenWidth - 32, height: 180, resizeMode: 'cover' }}
        />
      );
    }
    // For multiple images, you can do something similar:
    return (
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
      >
        {item.photos.map((photo: any) => (
          <Image
            key={photo.photoUri}        // ← use the URI (or any other unique id) here
            source={{ uri: photo.photoUri }}
            style={{ width: screenWidth - 32, height: 180, resizeMode: 'cover' }}
          />
        ))}
      </ScrollView>
    );
  }

  function renderItem({ item }: { item: any }) {
    if (item._type === 'exploreMoreCard') {
      return (
        <ExploreMoreCard
          style={styles.exploreCard}
          onSubCategoryPress={(subLabel) => {
            fetchPlacesByKeyword(subLabel);
          }}
          onBroadCategoryPress={(catKey) => {
            setCurrentCategory(catKey);
          }}
          currentSubCategories={
            (PLACE_CATEGORIES.find((c) => c.key === currentCategory)?.subCategories) || []
          }
          otherBroadCategories={PLACE_CATEGORIES.filter((c) => c.key !== currentCategory)}
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
    const typesString = item.types?.length ? item.types.join(', ') : '';
    return (
      <TouchableOpacity
        style={styles.dashCard}
        onPress={() => router.push(`/moreInfo?placeId=${item.id}`)}
      >
        <View style={{ position: 'relative' }}>
          {renderImages(item)}
          <View style={styles.iconRow}>
            <TouchableOpacity style={styles.iconContainer} onPress={() => handleLikePress(item)}>
              <Text style={[styles.iconText, item.liked && { color: 'red' }]}>
                {item.liked ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconContainer} onPress={() => handleAddToCollection(item)}>
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
          {typesString !== '' && (
            <Text style={styles.typesText} numberOfLines={2}>
              {typesString}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

const addPlaceToCollectionHandler = async (collectionId: string) => {
  if (!user || !selectedPlaceForCollection) return;
  try {
    await addToCollection(collectionId, selectedPlaceForCollection);
  } catch (err) {
    console.error('Failed to add to collection:', err);
  }
  setCollectionModalVisible(false);
  setSelectedPlaceForCollection(null);
};
// Modal listing all collections
const renderCollectionModal = () => (
  <Modal visible={collectionModalVisible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Add to Collection</Text>
        <ScrollView>
          {Object.values(userCollections).map((col: any) => (
            <TouchableOpacity
              key={col.id}
              style={styles.collectionItem}
              onPress={() => addPlaceToCollectionHandler(col.id)}
            >
              <Text style={styles.collectionText}>{col.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={() => setCollectionModalVisible(false)} style={styles.modalCancel}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

  const finalData = getFinalData();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContainer}
        style={{ backgroundColor: '#0D1117' }}
      >
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            // handle sort cycling
          }}
        >
          <Text style={styles.filterButtonText}>
            {filterState.sort ? `Sort: ${filterState.sort}` : 'Sort'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterState.openNow && { backgroundColor: '#F5A623' }]}
          onPress={() => {
            // handle openNow toggle
          }}
        >
          <Text style={styles.filterButtonText}>Open Now</Text>
        </TouchableOpacity>
      </ScrollView>
      <FlatList
        ref={flatListRef}
        data={finalData}
        keyExtractor={(item, index) =>
          item._type === 'exploreMoreCard' ? item.key : item.id
        }
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
      {renderCollectionModal()}
    </SafeAreaView>
  );
}

// -------------- STYLES --------------
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
  carousel: {
    width: '100%',
    height: 180,
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
  typesText: {
    color: '#F5A623',
    fontSize: 12,
    marginTop: 4,
  },
  exploreCard: {
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1B1F24',
    width: '80%',
    maxHeight: '60%',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  collectionItem: {
    paddingVertical: 10,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  collectionText: {
    color: '#FFF',
    fontSize: 16,
  },
  modalCancel: {
    marginTop: 12,
    alignSelf: 'center',
  },
  modalCancelText: {
    color: '#F44336',
    fontSize: 16,
  },
});
