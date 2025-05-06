import React, { useState, useEffect, useRef } from 'react';
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
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getFirestore,
} from 'firebase/firestore';
import { storeReviewsForPlace } from './_utils/storage';

const GOOGLE_PLACES_API_KEY = 'AIzaSyB6fvIePcBwSZQvyXtZvW-9XCbcKMf2I7o';

export default function MoreInfoScreen() {
  const router = useRouter();
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const firestore = getFirestore();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Horizontal scroll for images
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [isHoursExpanded, setIsHoursExpanded] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<{ [key: number]: boolean }>({});

  // Single Like (heart)
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});

  // For collections
  const [userCollections, setUserCollections] = useState<Record<string, any>>({});
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const windowWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (!placeId) return;
    fetchPlaceDetails();
  }, [placeId]);

  useEffect(() => {
    if (!user) return;
    // Listen for likes
    const likesRef = collection(firestore, `users/${user.uid}/likes`);
    const unsubLikes = onSnapshot(likesRef, (snap) => {
      const newLikes: Record<string, boolean> = {};
      snap.forEach((docSnap) => {
        newLikes[docSnap.id] = true;
      });
      setUserLikes(newLikes);
    });

    // Listen for collections
    const colRef = collection(firestore, `users/${user.uid}/collections`);
    const unsubCols = onSnapshot(colRef, (snap) => {
      const temp: Record<string, any> = {};
      snap.forEach((docSnap) => {
        temp[docSnap.id] = {
          title: docSnap.data().title || 'Untitled',
          activities: docSnap.data().activities || [],
        };
      });
      setUserCollections(temp);
    });

    return () => {
      unsubLikes();
      unsubCols();
    };
  }, [user]);

  const fetchPlaceDetails = async () => {
    setLoading(true);
    try {
      // GET request with placeId in path
      const url = `https://places.googleapis.com/v1/places/${placeId}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": [
            "displayName",
            "id",
            "formattedAddress",
            "types",
            "location",
            "rating",
            "userRatingCount",
            "photos",
            "regularOpeningHours",
            "currentOpeningHours",
            "internationalPhoneNumber",
            "nationalPhoneNumber",
            "websiteUri",
            "editorialSummary",
            "reviews"
          ].join(",")
        },
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`HTTP error ${resp.status}: ${errorText}`);
      }
      
      const data = await resp.json();
      console.log("Complete Place Details API response:", data);
      
      // Construct photoUri for each photo
      if (data.photos && Array.isArray(data.photos)) {
        data.photos = data.photos.map((photo: any) => ({
          photoUri: `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_PLACES_API_KEY}`,
        }));
      }

      setDetails(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Single heart like
  const handleLikePress = async () => {
    if (!user || !details) return;
    const key = placeId as string;
    const isLiked = !!userLikes[key];
    try {
      if (isLiked) {
        await deleteDoc(doc(firestore, 'users', user.uid, 'likes', key));
      } else {
        await setDoc(doc(firestore, 'users', user.uid, 'likes', key), {
          name: details.displayName?.text || details.name,
          rating: details.rating || 0,
          userRatingsTotal: details.userRatingCount || 0,
          photoUri: details.photos && details.photos[0]?.photoUri ? details.photos[0].photoUri : null,
          formattedAddress: details.formattedAddress || '',
        });
        if (details.reviews?.length) {
          await storeReviewsForPlace(key, details.reviews);
        }
      }
    } catch (error) {
      console.error('handleLikePress error:', error);
    }
  };

  // Collections
  const handleCollectionToggle = async (collectionId: string) => {
    if (!user || !details) return;
    const key = placeId as string;
    const colDoc = doc(firestore, `users/${user.uid}/collections`, collectionId);
    const existing = userCollections[collectionId];
    if (!existing) return;

    const alreadyIn = existing.activities.some((act: any) => act.id === key);
    let newActivities = [];
    if (alreadyIn) {
      newActivities = existing.activities.filter((act: any) => act.id !== key);
    } else {
      newActivities = [
        ...existing.activities,
        {
          id: key,
          name: details.displayName?.text || details.name,
          rating: details.rating || 0,
          photoUri: details.photos && details.photos[0]?.photoUri ? details.photos[0].photoUri : null,
        },
      ];
    }
    try {
      await setDoc(colDoc, { activities: newActivities }, { merge: true });
    } catch (err) {
      console.error('handleCollectionToggle error:', err);
    }
  };

  function isInCollection(collectionId: string) {
    const c = userCollections[collectionId];
    if (!c) return false;
    return c.activities.some((act: any) => act.id === placeId);
  }

  // Star rating
  function renderStars(rating: number) {
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (halfStar) stars += '½';
    const empty = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < empty; i++) stars += '☆';
    return stars;
  }

  // Expand/collapse reviews
  function renderReview(review: any, idx: number) {
    const authorName = review.authorAttribution?.displayName || "Anonymous";
    const reviewRating = review.rating || 0;
    // The actual text is stored in `review.text.text`
    const fullText =
      typeof review.text === "object" && review.text?.text
        ? review.text.text
        : "";

    // Simple snippet approach
    const words = fullText.split(" ");
    const long = words.length > 40;
    const expanded = expandedReviews[idx] || false;
    const snippet = long && !expanded ? words.slice(0, 40).join(" ") + "..." : fullText;

    return (
      <View key={idx} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewAuthor}>{authorName}</Text>
          <Text style={styles.reviewRating}>
            {reviewRating.toFixed(1)} {renderStars(reviewRating)}
          </Text>
        </View>
        <Text style={styles.reviewText}>{snippet}</Text>
        {long && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpandedReviews((prev) => ({ ...prev, [idx]: !expanded }))}
          >
            <Text style={styles.expandButtonText}>{expanded ? 'Collapse' : 'Expand'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
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

  // Photos
  const photos = details.photos || [];

  // Use editorialSummary.text if available; otherwise fallback
  const editorialText = details.editorialSummary?.text || "No description available.";

  // Hours: can come from regularOpeningHours or currentOpeningHours
  const hoursList =
    details.regularOpeningHours?.weekdayDescriptions ||
    details.currentOpeningHours?.weekdayDescriptions ||
    [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {details.displayName?.text || details.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Photos Carousel */}
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={true}
            style={styles.imagesScroll}
          >
            {photos.map((p: any, index: number) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => setExpandedImageUrl(p.photoUri)}
              >
                <Image
                  source={{ uri: p.photoUri }}
                  style={[styles.photo, { width: windowWidth - 32 }]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.photoPlaceholder]}>
            <Text style={{ color: "#fff" }}>No Photos Available</Text>
          </View>
        )}

        {/* Like / Save Icons */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleLikePress} style={styles.iconButton}>
            <Text style={[styles.iconButtonText, userLikes[placeId!] && { color: 'red' }]}>
              {userLikes[placeId!] ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setCollectionModalVisible(true)}
          >
            <Text style={styles.iconButtonText}>💾</Text>
          </TouchableOpacity>
        </View>

        {/* Info Content */}
        <View style={styles.content}>
          {/* Place Name & Rating */}
          <Text style={styles.title}>
            {details.displayName?.text || details.name}
          </Text>
          {details.rating && (
            <Text style={styles.subtitle}>
              {details.rating.toFixed(1)} ⭐ ({details.userRatingCount || 0} reviews)
            </Text>
          )}

          {/* Address */}
          {details.formattedAddress && (
            <Text style={styles.info}>{details.formattedAddress}</Text>
          )}

          {/* Phone Numbers */}
          {details.internationalPhoneNumber && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${details.internationalPhoneNumber}`)}>
              <Text style={[styles.info, styles.link]}>
                📞 {details.internationalPhoneNumber}
              </Text>
            </TouchableOpacity>
          )}
          {/* If you prefer nationalPhoneNumber: */}
          {/* details.nationalPhoneNumber && ... */}

          {/* Website */}
          {details.websiteUri && (
            <TouchableOpacity onPress={() => Linking.openURL(details.websiteUri)}>
              <Text style={[styles.info, styles.link]}>🌐 Visit Website</Text>
            </TouchableOpacity>
          )}

          {/* Editorial Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.info}>{editorialText}</Text>
          </View>

          {/* Hours */}
          {hoursList.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsHoursExpanded(!isHoursExpanded)}
              >
                <Text style={styles.sectionTitle}>Hours of Operation</Text>
                <Text style={styles.toggleText}>{isHoursExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {isHoursExpanded &&
                hoursList.map((line: string, i: number) => (
                  <Text key={i} style={styles.info}>
                    {line}
                  </Text>
                ))}
            </View>
          )}

          {/* Reviews */}
          {Array.isArray(details.reviews) && details.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {details.reviews.map((review: any, index: number) => renderReview(review, index))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={!!expandedImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedImageUrl(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setExpandedImageUrl(null)}
          >
            <Text style={styles.modalCloseButtonText}>✕</Text>
          </TouchableOpacity>
          {expandedImageUrl && (
            <Image
              source={{ uri: expandedImageUrl }}
              style={styles.expandedImage}
              resizeMode="contain"
            />
          )}
        </SafeAreaView>
      </Modal>

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
            {Object.entries(userCollections).map(([cid, cdata]) => {
              const inCol = isInCollection(cid);
              return (
                <TouchableOpacity
                  key={cid}
                  style={[styles.colButton, inCol && { backgroundColor: '#333' }]}
                  onPress={() => handleCollectionToggle(cid)}
                >
                  <Text style={styles.colButtonText}>
                    {inCol ? `✓ ${cdata.title}` : cdata.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    color: '#F5A623',
    fontSize: 20,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 32,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  imagesScroll: {
    marginVertical: 10,
  },
  photo: {
    height: 250,
    borderRadius: 8,
    marginRight: 10,
  },
  photoPlaceholder: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    marginBottom: 16,
    borderRadius: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 16,
  },
  iconButton: {
    marginRight: 20,
  },
  iconButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  content: {
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#F5A623',
    marginBottom: 8,
  },
  info: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 6,
  },
  link: {
    color: '#4DA6FF',
    textDecorationLine: 'underline',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleText: {
    fontSize: 20,
    color: '#fff',
  },
  reviewCard: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewRating: {
    fontSize: 14,
    color: '#F5A623',
  },
  reviewText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  expandButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#4DA6FF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
  modalCloseButtonText: {
    fontSize: 28,
    color: '#fff',
  },
  expandedImage: {
    width: '100%',
    height: '80%',
  },
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
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  colButton: {
    backgroundColor: '#272B30',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  colButtonText: {
    color: '#fff',
  },
  closeModalBtn: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 14,
  },
});
