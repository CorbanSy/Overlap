// app/moreInfo.tsx

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

const GOOGLE_PLACES_API_KEY = 'AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY';

export default function MoreInfoScreen() {
  const router = useRouter();
  const { placeId } = useLocalSearchParams() as { placeId: string };
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for auto-scrolling images
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const windowWidth = Dimensions.get('window').width;

  // State for full-screen image expansion
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  // State for expanded reviews (keyed by review index)
  const [expandedReviews, setExpandedReviews] = useState<{ [key: number]: boolean }>({});

  // Renamed state for hours expansion
  const [isHoursExpanded, setIsHoursExpanded] = useState<boolean>(false);

  // Fetch details on mount
  useEffect(() => {
    if (placeId) {
      fetchPlaceDetails();
    }
  }, [placeId]);

  const fetchPlaceDetails = async () => {
    setLoading(true);
    try {
      // Request only the necessary fields.
      const fields = [
        'name',
        'formatted_phone_number',
        'formatted_address',
        'opening_hours',
        'website',
        'photos',
        'reviews',
        'rating',
        'url',
        'editorial_summary',
      ].join(',');
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=${fields}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK') {
        setDetails(data.result);
      } else {
        setError(data.status);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll images every 5 seconds if more than one photo exists.
  useEffect(() => {
    if (details?.photos && details.photos.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % details.photos.length;
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ x: nextIndex * windowWidth, animated: true });
          }
          return nextIndex;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [details, windowWidth]);

  // Helper: Render a star rating similar to Yelp.
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
      stars += '★';
    }
    if (halfStar) {
      stars += '½';
    }
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars += '☆';
    }
    return stars;
  };

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
        <Text style={styles.errorText}>Error: {error}</Text>
      </SafeAreaView>
    );
  }

  if (!details) return null;

  // Prepare photos array if available.
  const photos = details.photos || [];
  const renderPhoto = (photo: any, index: number) => {
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;
    return (
      <TouchableOpacity key={index} activeOpacity={0.8} onPress={() => setExpandedImageUrl(photoUrl)}>
        <Image source={{ uri: photoUrl }} style={[styles.photo, { width: windowWidth - 32 }]} />
      </TouchableOpacity>
    );
  };

  // Use the editorial summary as the description (if available).
  const description = details.editorial_summary?.overview || 'No description available.';

  // Render reviews with expandable text if longer than 40 words.
  const renderReview = (review: any, index: number) => {
    const words = review.text.split(' ');
    const isLong = words.length > 40;
    const isExpanded = expandedReviews[index] || false;
    const displayedText = isLong && !isExpanded ? words.slice(0, 40).join(' ') + '...' : review.text;

    return (
      <View key={index} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewAuthor}>{review.author_name}</Text>
          <Text style={styles.reviewRating}>
            {review.rating.toFixed(1)} {renderStars(review.rating)}
          </Text>
        </View>
        <Text style={styles.reviewText}>{displayedText}</Text>
        {isLong && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() =>
              setExpandedReviews((prev) => ({
                ...prev,
                [index]: !isExpanded,
              }))
            }
          >
            <Text style={styles.expandButtonText}>{isExpanded ? 'Collapse' : 'Expand'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {details.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Horizontal Auto-Scrolling Images */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            ref={scrollViewRef}
            style={styles.imagesScroll}
          >
            {photos.map((photo: any, index: number) => renderPhoto(photo, index))}
          </ScrollView>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{details.name}</Text>
          {details.rating && (
            <Text style={styles.subtitle}>
              {details.rating.toFixed(1)} ⭐ ({details.reviews?.length || 0} reviews)
            </Text>
          )}
          {details.formatted_address && <Text style={styles.info}>{details.formatted_address}</Text>}
          {details.formatted_phone_number && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${details.formatted_phone_number}`)}>
              <Text style={[styles.info, styles.link]}>📞 {details.formatted_phone_number}</Text>
            </TouchableOpacity>
          )}
          {details.website && (
            <TouchableOpacity onPress={() => Linking.openURL(details.website)}>
              <Text style={[styles.info, styles.link]}>🌐 Visit Website</Text>
            </TouchableOpacity>
          )}

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.info}>{description}</Text>
          </View>

          {/* Hours of Operation Dropdown */}
          {details.opening_hours && details.opening_hours.weekday_text && (
            <View style={styles.section}>
              <TouchableOpacity
                onPress={() => setIsHoursExpanded((prev) => !prev)}
                style={styles.toggleButton}
              >
                <Text style={styles.sectionTitle}>Hours of Operation</Text>
                <Text style={styles.toggleText}>{isHoursExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {isHoursExpanded &&
                details.opening_hours.weekday_text.map((line: string, index: number) => (
                  <Text key={index} style={styles.info}>
                    {line}
                  </Text>
                ))}
            </View>
          )}

          {/* Google Maps Button (placed above reviews) */}
          {details.url && (
            <TouchableOpacity style={styles.mapButton} onPress={() => Linking.openURL(details.url)}>
              <Text style={styles.mapButtonText}>View on Google Maps</Text>
            </TouchableOpacity>
          )}

          {/* Reviews Section */}
          {details.reviews && details.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {details.reviews.map((review: any, index: number) => renderReview(review, index))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Full-Screen Image Modal */}
      <Modal visible={!!expandedImageUrl} transparent={true} animationType="fade">
        <SafeAreaView style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setExpandedImageUrl(null)}>
            <Text style={styles.modalCloseButtonText}>✕</Text>
          </TouchableOpacity>
          {expandedImageUrl && (
            <Image source={{ uri: expandedImageUrl }} style={styles.expandedImage} resizeMode="contain" />
          )}
        </SafeAreaView>
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
  errorText: {
    color: '#F5A623',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0D1117',
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
    color: '#FFFFFF',
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
    height: 200,
    borderRadius: 8,
    marginRight: 10,
  },
  content: {
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    textDecorationLine: 'underline',
    color: '#4DA6FF',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  mapButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#0D1117',
    fontSize: 16,
    fontWeight: 'bold',
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
    color: '#FFFFFF',
  },
  reviewRating: {
    fontSize: 14,
    color: '#F5A623',
  },
  reviewText: {
    fontSize: 14,
    color: '#CCCCCC',
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
    zIndex: 1,
  },
  modalCloseButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  expandedImage: {
    width: '100%',
    height: '80%',
  },
});

export { MoreInfoScreen };
