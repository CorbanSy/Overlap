//app/moreInfo.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Alert,
  StatusBar,
  Share,
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
import { Ionicons } from '@expo/vector-icons';

import { fetchPlaceDetails, fetchPlacePhotos } from '../_utils/storage/places';
import { likePlace, unlikePlace } from '../_utils/storage/likesCollections';
import { storeReviewsForPlace } from '../_utils/storage/reviews';

// Types
interface PlaceDetails {
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  address?: string;
  phone?: string;
  website?: string;
  types?: string[];
  openingHours?: string[];
  priceLevel?: number;
  description?: string;
}

interface Review {
  authorName: string;
  text: string;
  rating?: number;
  relativeTime?: string;
}

interface Collection {
  title: string;
  activities: any[];
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export default function MoreInfoScreen() {
  const router = useRouter();
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();

  // Core state
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // User state
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userCollections, setUserCollections] = useState<Record<string, Collection>>({});
  
  // Modal state
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Memoized values
  const isLiked = useMemo(() => !!userLikes[placeId!], [userLikes, placeId]);
  
  const collectionsArray = useMemo(() => 
    Object.entries(userCollections).map(([id, data]) => ({ id, ...data })),
    [userCollections]
  );

  const priceLevel = useMemo(() => {
    if (!details?.priceLevel) return null;
    return '$'.repeat(details.priceLevel);
  }, [details?.priceLevel]);

  // Load place details with error handling
  useEffect(() => {
    if (!placeId) {
      setError('No place ID provided');
      setLoading(false);
      return;
    }

    const loadPlaceData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const placeDetails = await fetchPlaceDetails(placeId);
        setDetails(placeDetails);
        
        // Load photos
        const placePhotos = await fetchPlacePhotos(placeDetails);
        setPhotos(placePhotos);
        
        // Load reviews from Firestore
        const reviewsSnap = await getDocs(collection(db, 'places', placeId, 'reviews'));
        const reviewsData = reviewsSnap.docs.map(doc => doc.data() as Review);
        setReviews(reviewsData);
        
      } catch (err: any) {
        console.error('Error loading place data:', err);
        setError(err.message || 'Failed to load place information');
      } finally {
        setLoading(false);
      }
    };

    loadPlaceData();
  }, [placeId, db]);

  // Subscribe to user data
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    try {
      // Listen for likes
      const likesUnsub = onSnapshot(
        collection(db, 'users', user.uid, 'likes'),
        (snap) => {
          const likes: Record<string, boolean> = {};
          snap.forEach(doc => {
            likes[doc.id] = true;
          });
          setUserLikes(likes);
        },
        (error) => console.error('Error listening to likes:', error)
      );
      unsubscribers.push(likesUnsub);

      // Listen for collections
      const collectionsUnsub = onSnapshot(
        collection(db, 'users', user.uid, 'collections'),
        (snap) => {
          const collections: Record<string, Collection> = {};
          snap.forEach(doc => {
            const data = doc.data();
            collections[doc.id] = {
              title: data.title || '',
              activities: data.activities || []
            };
          });
          setUserCollections(collections);
        },
        (error) => console.error('Error listening to collections:', error)
      );
      unsubscribers.push(collectionsUnsub);

    } catch (err) {
      console.error('Error setting up listeners:', err);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, db]);

  // Event handlers
  const handleLikePress = useCallback(async () => {
    if (!user || !details || !placeId) return;

    try {
      if (isLiked) {
        await unlikePlace(placeId);
      } else {
        await likePlace({
          id: placeId,
          name: details.name,
          rating: details.rating || 0,
          userRatingsTotal: details.userRatingsTotal || 0,
          photos: photos.map(uri => ({ photoUri: uri })),
          types: details.types || [],
        });

        if (reviews.length > 0) {
          await storeReviewsForPlace(placeId, reviews);
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      Alert.alert('Error', 'Failed to update like status');
    }
  }, [user, details, placeId, isLiked, photos, reviews]);

  const handleCollectionToggle = useCallback(async (collectionId: string) => {
    if (!user || !details || !placeId) return;

    try {
      const collection = userCollections[collectionId];
      if (!collection) return;

      const isInCollection = collection.activities.some((activity: any) => activity.id === placeId);
      
      const newActivities = isInCollection
        ? collection.activities.filter((activity: any) => activity.id !== placeId)
        : [
            ...collection.activities,
            {
              id: placeId,
              name: details.name,
              rating: details.rating || 0,
              photoUri: photos[0] || null,
            },
          ];

      const collectionRef = doc(db, 'users', user.uid, 'collections', collectionId);
      await setDoc(collectionRef, { activities: newActivities }, { merge: true });

    } catch (err) {
      console.error('Error toggling collection:', err);
      Alert.alert('Error', 'Failed to update collection');
    }
  }, [user, details, placeId, userCollections, photos, db]);

  const handleShare = useCallback(async () => {
    if (!details) return;

    try {
      await Share.share({
        message: `Check out ${details.name}${details.address ? ` at ${details.address}` : ''}`,
        title: details.name,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  }, [details]);

  const handlePhonePress = useCallback(() => {
    if (details?.phone) {
      Linking.openURL(`tel:${details.phone}`);
    }
  }, [details?.phone]);

  const handleWebsitePress = useCallback(() => {
    if (details?.website) {
      Linking.openURL(details.website);
    }
  }, [details?.website]);

  const handlePhotoPress = useCallback((index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoModalVisible(true);
  }, []);

  const isInCollection = useCallback((collectionId: string) => {
    const collection = userCollections[collectionId];
    return !!collection && collection.activities.some((activity: any) => activity.id === placeId);
  }, [userCollections, placeId]);

  // Render functions
  const renderPhotos = () => {
    if (photos.length === 0) {
      return (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="image-outline" size={48} color="#666" />
          <Text style={styles.placeholderText}>No Photos Available</Text>
        </View>
      );
    }

    return (
      <View style={styles.photoContainer}>
        <ScrollView 
          horizontal 
          pagingEnabled 
          style={styles.photosScroll}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
            setPhotoIndex(index);
          }}
        >
          {photos.map((uri, index) => (
            <TouchableOpacity
              key={uri}
              onPress={() => handlePhotoPress(index)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri }} 
                style={styles.photo}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {photos.length > 1 && (
          <View style={styles.photoIndicator}>
            <Text style={styles.photoCount}>
              {photoIndex + 1} / {photos.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderActionButtons = () => (
    <View style={styles.actionRow}>
      <TouchableOpacity 
        onPress={handleLikePress} 
        style={[styles.actionButton, isLiked && styles.actionButtonActive]}
      >
        <Ionicons 
          name={isLiked ? "heart" : "heart-outline"} 
          size={24} 
          color={isLiked ? "#FF6B6B" : "#FFF"} 
        />
        <Text style={[styles.actionButtonText, isLiked && { color: "#FF6B6B" }]}>
          {isLiked ? "Liked" : "Like"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => setCollectionModalVisible(true)}
        style={styles.actionButton}
      >
        <Ionicons name="bookmark-outline" size={24} color="#FFF" />
        <Text style={styles.actionButtonText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handleShare}
        style={styles.actionButton}
      >
        <Ionicons name="share-outline" size={24} color="#FFF" />
        <Text style={styles.actionButtonText}>Share</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContactInfo = () => (
    <View style={styles.contactSection}>
      {details?.phone && (
        <TouchableOpacity onPress={handlePhonePress} style={styles.contactItem}>
          <Ionicons name="call" size={20} color="#4DA6FF" />
          <Text style={styles.contactText}>{details.phone}</Text>
        </TouchableOpacity>
      )}

      {details?.website && (
        <TouchableOpacity onPress={handleWebsitePress} style={styles.contactItem}>
          <Ionicons name="globe" size={20} color="#4DA6FF" />
          <Text style={styles.contactText}>Visit Website</Text>
        </TouchableOpacity>
      )}

      {details?.address && (
        <View style={styles.contactItem}>
          <Ionicons name="location" size={20} color="#AAAAAA" />
          <Text style={styles.addressText}>{details.address}</Text>
        </View>
      )}
    </View>
  );

  const renderReviews = () => {
    if (reviews.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {reviews.slice(0, 3).map((review, index) => (
          <View key={index} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{review.authorName}</Text>
              {review.rating && (
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={14} color="#F5A623" />
                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewText} numberOfLines={4}>
              {review.text}
            </Text>
            {review.relativeTime && (
              <Text style={styles.reviewTime}>{review.relativeTime}</Text>
            )}
          </View>
        ))}
        
        {reviews.length > 3 && (
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>
              Show {reviews.length - 3} more reviews
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCollectionModal = () => (
    <Modal
      visible={collectionModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCollectionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Save to Collection</Text>
            <TouchableOpacity 
              onPress={() => setCollectionModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.collectionsScrollView}>
            {collectionsArray.length === 0 ? (
              <View style={styles.emptyCollections}>
                <Ionicons name="folder-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No collections yet</Text>
                <Text style={styles.emptySubtext}>Create a collection to save places</Text>
              </View>
            ) : (
              collectionsArray.map(collection => (
                <TouchableOpacity
                  key={collection.id}
                  style={[
                    styles.collectionItem,
                    isInCollection(collection.id) && styles.collectionItemActive
                  ]}
                  onPress={() => handleCollectionToggle(collection.id)}
                >
                  <Ionicons 
                    name={isInCollection(collection.id) ? "checkmark-circle" : "add-circle-outline"}
                    size={24} 
                    color={isInCollection(collection.id) ? "#4CAF50" : "#666"} 
                  />
                  <Text style={styles.collectionText}>{collection.title}</Text>
                  <Text style={styles.collectionCount}>
                    {collection.activities.length} places
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderPhotoModal = () => (
    <Modal
      visible={photoModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setPhotoModalVisible(false)}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <View style={styles.photoModalOverlay}>
        <TouchableOpacity 
          style={styles.photoModalClose}
          onPress={() => setPhotoModalVisible(false)}
        >
          <Ionicons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
        
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: selectedPhotoIndex * windowWidth, y: 0 }}
        >
          {photos.map((uri, index) => (
            <Image 
              key={uri}
              source={{ uri }} 
              style={styles.fullPhoto}
              resizeMode="contain"
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F5A623" />
        <Text style={styles.loadingText}>Loading place details...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!details) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#0D1117" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#F5A623" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {details.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photos */}
        {renderPhotos()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{details.name}</Text>
          
          <View style={styles.metaRow}>
            {details.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={18} color="#F5A623" />
                <Text style={styles.rating}>
                  {details.rating.toFixed(1)}
                </Text>
                {details.userRatingsTotal && (
                  <Text style={styles.ratingCount}>
                    ({details.userRatingsTotal.toLocaleString()})
                  </Text>
                )}
              </View>
            )}
            
            {priceLevel && (
              <Text style={styles.priceLevel}>{priceLevel}</Text>
            )}
          </View>

          {details.types && details.types.length > 0 && (
            <View style={styles.typesContainer}>
              {details.types.slice(0, 3).map((type, index) => (
                <View key={index} style={styles.typeTag}>
                  <Text style={styles.typeText}>{type.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Contact Info */}
          {renderContactInfo()}

          {/* Opening Hours */}
          {details.openingHours && details.openingHours.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hours</Text>
              {details.openingHours.map((hours, index) => (
                <Text key={index} style={styles.hoursText}>{hours}</Text>
              ))}
            </View>
          )}

          {/* Reviews */}
          {renderReviews()}
        </View>
      </ScrollView>

      {/* Modals */}
      {renderCollectionModal()}
      {renderPhotoModal()}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
  },
  loadingText: {
    color: '#AAAAAA',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#232533',
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#F5A623',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  photoContainer: {
    position: 'relative',
  },
  photosScroll: {
    height: 300,
  },
  photo: {
    width: windowWidth,
    height: 300,
  },
  photoPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1F24',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
    marginTop: 8,
  },
  photoIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1F24',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5A623',
  },
  ratingCount: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  priceLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeTag: {
    backgroundColor: '#2A2E35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  contactSection: {
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactText: {
    color: '#4DA6FF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  addressText: {
    color: '#AAAAAA',
    fontSize: 16,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  hoursText: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 4,
  },
  reviewCard: {
    backgroundColor: '#1B1F24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    color: '#F5A623',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewTime: {
    fontSize: 12,
    color: '#666',
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  showMoreText: {
    color: '#F5A623',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1B1F24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  collectionsScrollView: {
    maxHeight: 400,
  },
  emptyCollections: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2E35',
    gap: 12,
  },
  collectionItemActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  collectionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  collectionCount: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullPhoto: {
    width: windowWidth,
    height: windowHeight,
  },
});