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
import { db } from '../../FirebaseConfig';
import {
  getDocs,
  onSnapshot,
  collection,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useFilters } from '../../context/FiltersContext';

import {
  getProfileData,
  likePlace,
  storeReviewsForPlace,
  addToCollection,
  fetchPlacesNearby,
  fetchPlaceDetails,
} from '../../_utils/storage';

import ExploreMoreCard from '../../components/ExploreMoreCard';
import { PLACE_CATEGORIES } from '../../_utils/placeCategories';

// Helpers
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
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
  const matched: string[] = [];
  for (const cat of PLACE_CATEGORIES) {
    if (cat.includedTypes?.some((t) => googleTypes.includes(t))) {
      matched.push(cat.key);
    }
  }
  return matched;
}

export default function HomeScreen() {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const { filterState } = useFilters();

  // State
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fuseRef = useRef<Fuse<any> | null>(null);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userSaves, setUserSaves] = useState<Record<string, boolean>>({});
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const flatListRef = useRef<FlatList<any>>(null);
  const [userCollections, setUserCollections] = useState<Record<string, any>>({});
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [selectedPlaceForCollection, setSelectedPlaceForCollection] = useState<any>(null);

  // Load user top category
  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfileData();
        if (profile?.topCategories?.length) {
          setCurrentCategory(profile.topCategories[0]);
        }
      } catch (err) {
        console.error('Error loading prefs:', err);
      }
    })();
  }, []);

  // Listen for user likes
  useEffect(() => {
    if (!user) return;
    const likesRef = collection(db, 'users', user.uid, 'likes');
    const unsub = onSnapshot(likesRef, (snap) => {
      const newLikes: Record<string, boolean> = {};
      snap.forEach((docSnap) => {
        newLikes[docSnap.id] = true;
      });
      setUserLikes(newLikes);
    });
    return () => unsub();
  }, [user]);

  // Listen for user saves (collections)
  useEffect(() => {
    if (!user) return;
    const savesRef = collection(db, 'users', user.uid, 'collections');
    const unsub = onSnapshot(savesRef, (snap) => {
      const newSaves: Record<string, boolean> = {};
      snap.forEach((docSnap) => {
        newSaves[docSnap.id] = true;
      });
      setUserSaves(newSaves);
    });
    return () => unsub();
  }, [user]);

  // Listen for user collections (for modal)
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'users', user.uid, 'collections');
    const unsub = onSnapshot(colRef, (snap) => {
      const temp: Record<string, any> = {};
      snap.forEach((docSnap) => {
        temp[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setUserCollections(temp);
    });
    return () => unsub();
  }, [user]);

  // Request user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  // Fetch places whenever location or category changes
  useEffect(() => {
    if (userLocation && currentCategory) fetchPlaces();
  }, [userLocation, filterState, currentCategory]);

  // Setup Fuse for search
  useEffect(() => {
    if (places.length) {
      fuseRef.current = new Fuse(places, { keys: ['name'], threshold: 0.4 });
    }
  }, [places]);

  async function fetchPlaces() {
  setLoading(true);
  try {
    const snap = await getDocs(collection(db, 'places'));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // if some docs store Storage paths instead of full URLs, resolve them:
    // const withUrls = await Promise.all(all.map(async p => ({ ...p, photos: await fetchPlacePhotos(p) })));
    setPlaces(all); // or setPlaces(withUrls)
    console.log('[fetchPlaces] unfiltered count:', all.length);
  } catch (e) {
    console.error('fetchPlaces error:', e);
  } finally {
    setLoading(false);
  }
}
  // // Fetch from Firestore
  // async function fetchPlaces() {
  //   if (!userLocation || !currentCategory) return;
  //   setLoading(true);
  //   try {
  //     const radiusKm = (filterState.distance ?? 50000) / 1000;
  //     let all = await fetchPlacesNearby(
  //       userLocation.lat,
  //       userLocation.lng,
  //       radiusKm
  //     );
  //     console.log('[fetchPlaces] raw count:', all.length, 'cat:', currentCategory);
  //     const catObj = PLACE_CATEGORIES.find((c) => c.key === currentCategory);
  //     if (catObj?.representativeType) {
  //       all = all.filter(
  //         (p) =>
  //           Array.isArray(p.types) &&
  //           p.types.includes(catObj.representativeType)
  //       );
  //       console.log('[fetchPlaces] after representativeType filter:', all.length, 'rep:', catObj.representativeType);
  //     }
  //     setPlaces(all);
  //   } catch (err) {
  //     console.error('fetchPlaces error:', err);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlaces();
    setRefreshing(false);
  };

  // Prepare displayed + sorted + searched
  const getDisplayedPlaces = useCallback(() => {
    let list = places;
    if (searchQuery && fuseRef.current) {
      list = fuseRef.current.search(searchQuery).map((r) => r.item);
    }
    // Sorting
    if (!filterState.sort || filterState.sort === 'recommended') {
      list = list
        .map((place) => {
          const matched = mapGoogleTypesToCategory(place.types);
          let score = 0;
          matched.forEach((cat) => {
            if (cat === currentCategory) score += 10;
          });
          return { ...place, preferenceScore: score };
        })
        .sort((a, b) => (b.preferenceScore || 0) - (a.preferenceScore || 0));
    } else if (filterState.sort === 'distance' && userLocation) {
      list = [...list].sort((a, b) => {
        const da = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          a.location.lat,
          a.location.lng
        );
        const db = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          b.location.lat,
          b.location.lng
        );
        return da - db;
      });
    } else if (filterState.sort === 'rating') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }
    return list.map((item) => ({
      ...item,
      liked: !!userLikes[item.id],
      saved: !!userSaves[item.id],
    }));
  }, [
    places,
    searchQuery,
    filterState,
    userLikes,
    userLocation,
    currentCategory,
    userSaves,
  ]);

  // Insert ExploreMoreCard every 20
  const getFinalData = () => {
    const displayed = getDisplayedPlaces();
    const finalData: any[] = [];
    displayed.forEach((p, i) => {
      finalData.push(p);
      if ((i + 1) % 20 === 0) {
        finalData.push({ _type: 'exploreMoreCard', key: `exploreMore_${i + 1}` });
      }
    });
    if (displayed.length && displayed.length % 20 !== 0) {
      finalData.push({ _type: 'exploreMoreCard', key: 'exploreMore_end' });
    }
    return finalData;
  };

  // Like / unlike
  async function handleLikePress(place: any) {
    if (!user) return;
    const isLiked = !!userLikes[place.id];
    try {
      if (isLiked) {
        await deleteDoc(doc(db, 'users', user.uid, 'likes', place.id));
      } else {
        const details = await fetchPlaceDetails(place.id);
        if (details.reviews?.length) {
          await storeReviewsForPlace(place.id, details.reviews);
        }
        await likePlace({
          id: place.id,
          name: details.name,
          rating: details.rating,
          userRatingsTotal: details.userRatingsTotal,
          photos: details.photos,   // paths; likePlace converts to URLs
          types: details.types,
        });
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  }

  // Render images from URLs
  function renderImages(item: any) {
    const urls: string[] = item.photos ?? [];
    if (!urls.length) {
      return (
        <View style={[styles.imageWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#ccc' }}>No Photo</Text>
        </View>
      );
    }
    const screenWidth = Dimensions.get('window').width;
    if (urls.length === 1) {
      return <Image source={{ uri: urls[0] }} style={{ width: screenWidth - 32, height: 180, resizeMode: 'cover' }} />;
    }
    return (
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
        {urls.map((url) => (
          <Image key={url} source={{ uri: url }} style={{ width: screenWidth - 32, height: 180, resizeMode: 'cover' }} />
        ))}
      </ScrollView>
    );
  }

  // Render each item or explore-more card
  function renderItem({ item }: { item: any }) {
    if (item._type === 'exploreMoreCard') {
      return (
        <ExploreMoreCard
          style={styles.exploreCard}
          onSubCategoryPress={(sub) => {
            /* handle text search if desired */
          }}
          onBroadCategoryPress={(k) => setCurrentCategory(k)}
          currentSubCategories={
            PLACE_CATEGORIES.find((c) => c.key === currentCategory)?.subCategories || []
          }
          otherBroadCategories={PLACE_CATEGORIES.filter((c) => c.key !== currentCategory)}
        />
      );
    }
    const distText =
      userLocation && item.location
        ? `${getDistanceFromLatLonInKm(
            userLocation.lat,
            userLocation.lng,
            item.location.lat,
            item.location.lng
          ).toFixed(2)} km`
        : '';
    return (
      <TouchableOpacity style={styles.dashCard} onPress={() => router.push(`/moreInfo?placeId=${item.id}`)}>
        <View style={{ position: 'relative' }}>
          {renderImages(item)}
          <View style={styles.iconRow}>
            <TouchableOpacity style={styles.iconContainer} onPress={() => handleLikePress(item)}>
              <Text style={[styles.iconText, item.liked && { color: 'red' }]}>{item.liked ? '♥' : '♡'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => {
                setSelectedPlaceForCollection(item);
                setCollectionModalVisible(true);
              }}
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
            {distText ? `  •  ${distText} away` : ''}
          </Text>
          {item.types?.length ? (
            <Text style={styles.typesText} numberOfLines={2}>
              {item.types.join(', ')}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  // Add to collection
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

  // Collection Modal
  const renderCollectionModal = () => (
    <Modal visible={collectionModalVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add to Collection</Text>
          <ScrollView>
            {Object.values(userCollections).map((col: any) => (
              <TouchableOpacity key={col.id} style={styles.collectionItem} onPress={() => addPlaceToCollectionHandler(col.id)}>
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
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>{filterState.sort ? `Sort: ${filterState.sort}` : 'Sort'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, filterState.openNow && { backgroundColor: '#F5A623' }]}>
          <Text style={styles.filterButtonText}>Open Now</Text>
        </TouchableOpacity>
      </ScrollView>
      <FlatList
        ref={flatListRef}
        data={finalData}
        keyExtractor={(item, index) => (item._type === 'exploreMoreCard' ? item.key : item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={loading ? <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} /> : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#F5A623']} />
        }
      />
      {renderCollectionModal()}
    </SafeAreaView>
  );
}

// Styles (unchanged)
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
