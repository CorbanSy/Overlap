// moreInfo.tsx

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';

import { fetchPlaceDetails, fetchPlacePhotos } from '../_utils/storage/places';
import { likePlace, unlikePlace } from '../_utils/storage/likesCollections';
import { storeReviewsForPlace } from '../_utils/storage/reviews';

const windowWidth = Dimensions.get('window').width;

export default function MoreInfoScreen() {
  const router = useRouter();
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();

  const [details, setDetails] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userCollections, setUserCollections] = useState<Record<string, any>>({});
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);

  // load the place details + photos
  useEffect(() => {
    if (!placeId) return;
    setLoading(true);
    fetchPlaceDetails(placeId)
      .then(d => setDetails(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [placeId]);

  useEffect(() => {
    if (!details) return;
    fetchPlacePhotos(details).then(setPhotos);
    // load any Firestore-stored reviews
    getDocs(collection(db, 'places', placeId, 'reviews'))
      .then(snap => setReviews(snap.docs.map(d => d.data())))
      .catch(console.error);
  }, [details, db, placeId]);

  // subscribe to likes + collections
  useEffect(() => {
    if (!user) return;
    const likesUnsub = onSnapshot(
      collection(db, 'users', user.uid, 'likes'),
      snap => {
        const m: Record<string, boolean> = {};
        snap.forEach(d => (m[d.id] = true));
        setUserLikes(m);
      }
    );
    const colUnsub = onSnapshot(
      collection(db, 'users', user.uid, 'collections'),
      snap => {
        const m: Record<string, any> = {};
        snap.forEach(d => {
          m[d.id] = { title: d.data().title, activities: d.data().activities || [] };
        });
        setUserCollections(m);
      }
    );
    return () => {
      likesUnsub();
      colUnsub();
    };
  }, [user, db]);

  const handleLikePress = async () => {
    if (!user || !details) return;
    const key = placeId!;
    try {
      if (userLikes[key]) {
        await unlikePlace(key);
      } else {
        await likePlace({
          id: key,
          name: details.name,
          rating: details.rating,
          userRatingsTotal: details.userRatingsTotal,
          photos: photos.map(uri => ({ photoUri: uri })),
          types: details.types || [],
        });
        if (reviews.length) {
          await storeReviewsForPlace(key, reviews);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCollectionToggle = async (cid: string) => {
    if (!user || !details) return;
    const colRef = doc(db, 'users', user.uid, 'collections', cid);
    const existing = userCollections[cid];
    if (!existing) return;
    const inCol = existing.activities.some((a: any) => a.id === placeId);
    const newActs = inCol
      ? existing.activities.filter((a: any) => a.id !== placeId)
      : [
          ...existing.activities,
          { id: placeId, name: details.name, rating: details.rating, photoUri: photos[0] },
        ];
    await setDoc(colRef, { activities: newActs }, { merge: true });
  };

  function isInCollection(cid: string) {
    const c = userCollections[cid];
    return !!c && c.activities.some((a: any) => a.id === placeId);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F5A623" />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={{ color: '#fff' }}>{error}</Text>
      </SafeAreaView>
    );
  }
  if (!details) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{details.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled style={styles.imagesScroll}>
            {photos.map(uri => (
              <Image key={uri} source={{ uri }} style={[styles.photo, { width: windowWidth - 32 }]} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={{ color: '#fff' }}>No Photos Available</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleLikePress} style={styles.iconButton}>
            <Text style={[styles.iconButtonText, userLikes[placeId!] && { color: 'red' }]}>
              {userLikes[placeId!] ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCollectionModalVisible(true)}
            style={styles.iconButton}
          >
            <Text style={styles.iconButtonText}>💾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{details.name}</Text>
          {details.rating != null && (
            <Text style={styles.subtitle}>{details.rating.toFixed(1)} ⭐</Text>
          )}
          {details.address && <Text style={styles.info}>{details.address}</Text>}
          {details.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${details.phone}`)}>
              <Text style={[styles.info, styles.link]}>📞 {details.phone}</Text>
            </TouchableOpacity>
          )}
          {details.website && (
            <TouchableOpacity onPress={() => Linking.openURL(details.website)}>
              <Text style={[styles.info, styles.link]}>🌐 Visit Website</Text>
            </TouchableOpacity>
          )}

          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {reviews.map((r, i) => (
                <View key={i} style={styles.reviewCard}>
                  <Text style={styles.reviewAuthor}>{r.authorName}</Text>
                  <Text style={styles.reviewText}>{r.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Collections Modal */}
      <Modal
        visible={collectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCollectionModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select a Collection</Text>
            {Object.entries(userCollections).map(([cid, cdata]) => (
              <TouchableOpacity
                key={cid}
                style={[styles.colButton, isInCollection(cid) && { backgroundColor: '#333' }]}
                onPress={() => handleCollectionToggle(cid)}
              >
                <Text style={styles.colButtonText}>
                  {isInCollection(cid) ? `✓ ${cdata.title}` : cdata.title}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setCollectionModalVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: '#232533',
    borderBottomWidth: 1,
  },
  backButton: { paddingRight: 16 },
  backButtonText: { color: '#F5A623', fontSize: 20 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  container: { padding: 16, paddingBottom: 32 },
  imagesScroll: { marginVertical: 10 },
  photo: { height: 250, borderRadius: 8, marginRight: 10 },
  photoPlaceholder: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    marginBottom: 16,
    borderRadius: 8,
  },
  actionRow: { flexDirection: 'row', marginTop: 4, marginBottom: 16 },
  iconButton: { marginRight: 20 },
  iconButtonText: { fontSize: 24, color: '#fff' },
  content: { marginTop: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 20, color: '#F5A623', marginBottom: 8 },
  info: { fontSize: 16, color: '#CCCCCC', marginBottom: 6 },
  link: { color: '#4DA6FF', textDecorationLine: 'underline' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 20, color: '#fff', fontWeight: '600', marginBottom: 8 },
  reviewCard: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewAuthor: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  reviewText: { fontSize: 14, color: '#ccc', marginTop: 4 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  colButton: { backgroundColor: '#272B30', padding: 12, borderRadius: 6, marginBottom: 8 },
  colButtonText: { color: '#fff' },
  closeModalBtn: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 14,
  },
});
