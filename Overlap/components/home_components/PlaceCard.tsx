// components/home_components/PlaceCard.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Dimensions, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserLocation {
  lat: number;
  lng: number;
}

interface Place {
  id: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  photos?: string[];
  types?: string[];
  location: UserLocation;
  liked?: boolean;
  saved?: boolean;
  priceLevel?: number;
  openingHours?: string[];
}

interface PlaceCardProps {
  place: Place;
  userLocation?: UserLocation | null;
  onPress: () => void;
  onLikePress: (place: Place) => void;
  onSavePress: (place: Place) => void;
  getDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  showDistance?: boolean;
  showTypes?: boolean;
  imageHeight?: number;
}

export default function PlaceCard({ 
  place, 
  userLocation, 
  onPress, 
  onLikePress, 
  onSavePress,
  getDistance,
  showDistance = true,
  showTypes = true,
  imageHeight = 200,
}: PlaceCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 32;

  // Memoized calculations
  const distanceText = useMemo(() => {
    if (!showDistance || !userLocation || !place.location) return '';
    
    const distance = getDistance(
      userLocation.lat,
      userLocation.lng,
      place.location.lat,
      place.location.lng
    );
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)} km`;
  }, [userLocation, place.location, getDistance, showDistance]);

  const priceLevel = useMemo(() => {
    if (!place.priceLevel) return null;
    return '$'.repeat(place.priceLevel);
  }, [place.priceLevel]);

  const isOpenNow = useMemo(() => {
    if (!place.openingHours) return null;
    
    const now = new Date();
    const currentDay = now.getDay();
    const todayHours = place.openingHours[currentDay];
    
    if (!todayHours || todayHours.includes('Closed')) return false;
    return true; // Simplified - could implement actual time checking
  }, [place.openingHours]);

  const displayTypes = useMemo(() => {
    if (!showTypes || !place.types?.length) return null;
    
    return place.types
      .slice(0, 2)
      .map(type => type.replace(/_/g, ' ').toLowerCase())
      .map(type => type.charAt(0).toUpperCase() + type.slice(1));
  }, [place.types, showTypes]);

  // Event handlers
  const handleImageError = useCallback((url: string) => {
    setImageError(prev => ({ ...prev, [url]: true }));
  }, []);

  const handleScrollEnd = useCallback((event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setCurrentPhotoIndex(index);
  }, [cardWidth]);

  const handleLikePress = useCallback((event: any) => {
    event.stopPropagation();
    onLikePress(place);
  }, [onLikePress, place]);

  const handleSavePress = useCallback((event: any) => {
    event.stopPropagation();
    onSavePress(place);
  }, [onSavePress, place]);

  // Render functions
  const renderImages = () => {
    const photos = place.photos?.filter(url => !imageError[url]) || [];
    
    if (!photos.length) {
      return (
        <View style={[styles.imageWrapper, { height: imageHeight }, styles.noImageContainer]}>
          <Ionicons name="image-outline" size={32} color="#666" />
          <Text style={styles.noImageText}>No Photo Available</Text>
        </View>
      );
    }

    if (photos.length === 1) {
      return (
        <Image 
          source={{ uri: photos[0] }} 
          style={[styles.singleImage, { width: cardWidth, height: imageHeight }]}
          onError={() => handleImageError(photos[0])}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.carouselContainer}>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={[styles.carousel, { height: imageHeight }]}
          onMomentumScrollEnd={handleScrollEnd}
          decelerationRate="fast"
        >
          {photos.map((url, index) => (
            <Image 
              key={`${place.id}-${index}`}
              source={{ uri: url }} 
              style={[styles.carouselImage, { width: cardWidth, height: imageHeight }]}
              onError={() => handleImageError(url)}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        
        {photos.length > 1 && (
          <View style={styles.photoIndicator}>
            <Text style={styles.photoCount}>
              {currentPhotoIndex + 1}/{photos.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={[styles.actionButton, place.liked && styles.likedButton]} 
        onPress={handleLikePress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={place.liked ? "heart" : "heart-outline"} 
          size={20} 
          color={place.liked ? "#FF6B6B" : "#FFF"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, place.saved && styles.savedButton]}
        onPress={handleSavePress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={place.saved ? "bookmark" : "bookmark-outline"} 
          size={20} 
          color={place.saved ? "#4CAF50" : "#FFF"} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderStatusBadge = () => {
    if (isOpenNow === null) return null;
    
    return (
      <View style={[styles.statusBadge, isOpenNow ? styles.openBadge : styles.closedBadge]}>
        <View style={[styles.statusDot, isOpenNow ? styles.openDot : styles.closedDot]} />
        <Text style={styles.statusText}>
          {isOpenNow ? 'Open' : 'Closed'}
        </Text>
      </View>
    );
  };

  const renderRatingStars = () => {
    const stars = [];
    const fullStars = Math.floor(place.rating);
    const hasHalfStar = place.rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={14} color="#F5A623" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color="#F5A623" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color="#666" />
        );
      }
    }
    
    return (
      <View style={styles.starsContainer}>
        {stars}
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={styles.placeCard} 
      onPress={onPress}
      activeOpacity={0.95}
    >
      <View style={styles.imageContainer}>
        {renderImages()}
        {renderActionButtons()}
        {renderStatusBadge()}
      </View>
      
      <View style={styles.placeInfo}>
        <View style={styles.headerRow}>
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name}
          </Text>
          {priceLevel && (
            <Text style={styles.priceLevel}>{priceLevel}</Text>
          )}
        </View>
        
        <View style={styles.ratingRow}>
          {renderRatingStars()}
          <Text style={styles.ratingText}>
            {place.rating.toFixed(1)}
          </Text>
          <Text style={styles.reviewCount}>
            ({place.userRatingsTotal.toLocaleString()})
          </Text>
          {distanceText && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.distanceText}>{distanceText}</Text>
            </>
          )}
        </View>
        
        {displayTypes && (
          <View style={styles.typesRow}>
            {displayTypes.map((type, index) => (
              <View key={index} style={styles.typeTag}>
                <Text style={styles.typeText}>{type}</Text>
              </View>
            ))}
            {place.types && place.types.length > 2 && (
              <Text style={styles.moreTypes}>
                +{place.types.length - 2} more
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  placeCard: {
    backgroundColor: '#1B1F24',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    backgroundColor: '#2A2E35',
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  singleImage: {
    resizeMode: 'cover',
  },
  carouselContainer: {
    position: 'relative',
  },
  carousel: {
    width: '100%',
  },
  carouselImage: {
    resizeMode: 'cover',
  },
  photoIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    position: 'absolute',
    flexDirection: 'row',
    top: 12,
    right: 12,
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  savedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  openBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  closedBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openDot: {
    backgroundColor: '#FFF',
  },
  closedDot: {
    backgroundColor: '#FFF',
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  placeInfo: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  placeName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  priceLevel: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    color: '#F5A623',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCount: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  separator: {
    color: '#666',
    fontSize: 14,
  },
  distanceText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  typesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTag: {
    backgroundColor: '#2A2E35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: '#F5A623',
    fontSize: 11,
    fontWeight: '500',
  },
  moreTypes: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
  },
});