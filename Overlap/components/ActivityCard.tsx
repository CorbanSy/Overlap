// components/ActivityCard.tsx
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Professional color palette matching the ProfileScreen
const Colors = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  secondary: '#F59E0B',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  card: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.8)',
  dropdownOverlay: 'rgba(15, 23, 42, 0.95)',
};

interface ActivityCardProps {
  item: {
    id: string;
    name: string;
    rating?: number;
    photos?: { photoUri: string }[];
    photoUrls?: string[];
  };
  onRemoveFromCollection?: (id: string) => void;
  onRemoveFromLiked?: (id: string) => void;
  onAddToCollection?: (item: any) => void;
  isInCollection?: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  item,
  onRemoveFromCollection,
  onRemoveFromLiked,
  onAddToCollection,
  isInCollection,
}) => {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Pick the first available image URI
  const imageUri =
    item.photoUrls?.[0] ||
    item.photos?.[0]?.photoUri ||
    null;

  // Animation handlers for press feedback
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  // Toggle dropdown animation
  const toggleDropdown = (e: any) => {
    e.stopPropagation();
    
    const toValue = isDropdownOpen ? 0 : 1;
    const rotateToValue = isDropdownOpen ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(dropdownAnim, {
        toValue,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: rotateToValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Share Activity
  const handleShare = async (e: any) => {
    e.stopPropagation();
    try {
      const message = `Check out this activity: ${item.name}${
        item.rating ? `\nRating: ${item.rating} ⭐` : ''
      }\nMore details in the app!`;
      await Share.share({ message });
      // Close dropdown after action
      setIsDropdownOpen(false);
      dropdownAnim.setValue(0);
      rotateAnim.setValue(0);
    } catch (error) {
      console.error('Error sharing activity:', error);
    }
  };

  const handleRemove = (e: any) => {
    e.stopPropagation();
    isInCollection
      ? onRemoveFromCollection?.(item.id)
      : onRemoveFromLiked?.(item.id);
    // Close dropdown after action
    setIsDropdownOpen(false);
    dropdownAnim.setValue(0);
    rotateAnim.setValue(0);
  };

  const handleAddToCollection = (e: any) => {
    e.stopPropagation();
    onAddToCollection?.(item);
    // Close dropdown after action
    setIsDropdownOpen(false);
    dropdownAnim.setValue(0);
    rotateAnim.setValue(0);
  };

  // Format rating display
  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  // Create dropdown items array
  const getDropdownItems = () => {
    const items = [];
    
    // Always include share
    items.push({
      key: 'share',
      icon: 'share-outline',
      label: 'Share',
      color: Colors.secondary,
      onPress: handleShare,
    });
    
    // Add to collection (if available)
    if (onAddToCollection) {
      items.push({
        key: 'add',
        icon: 'add-circle-outline',
        label: 'Add to Collection',
        color: Colors.primary,
        onPress: handleAddToCollection,
      });
    }
    
    // Remove action (if available)
    if (onRemoveFromLiked || onRemoveFromCollection) {
      items.push({
        key: 'remove',
        icon: 'trash-outline',
        label: isInCollection ? 'Remove from Collection' : 'Remove from Liked',
        color: Colors.error,
        onPress: handleRemove,
      });
    }
    
    return items;
  };

  const dropdownItems = getDropdownItems();
  
  // Animated rotation for the chevron
  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/moreInfo?placeId=${item.id}`)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Image Section with Overlay */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.noImageText}>No Photo Available</Text>
            </View>
          )}
          
          {/* Title Overlay at Bottom */}
          <View style={styles.titleOverlay}>
            <Text style={styles.titleOverlayText} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          
          {/* Rating Badge */}
          {item.rating != null && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={Colors.secondary} />
              <Text style={styles.ratingText}>{formatRating(item.rating)}</Text>
            </View>
          )}
          
          {/* Dropdown Toggle Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.dropdownToggle, isDropdownOpen && styles.dropdownToggleActive]}
              onPress={toggleDropdown}
            >
              <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                <Ionicons name="chevron-down" size={16} color={Colors.white} />
              </Animated.View>
            </TouchableOpacity>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <Animated.View
                style={[
                  styles.dropdownMenu,
                  {
                    opacity: dropdownAnim,
                    transform: [
                      {
                        translateY: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-10, 0],
                        }),
                      },
                      {
                        scale: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {dropdownItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.dropdownItem,
                      index === dropdownItems.length - 1 && styles.lastDropdownItem,
                    ]}
                    onPress={item.onPress}
                  >
                    <View style={[styles.dropdownIconContainer, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon} size={16} color={item.color} />
                    </View>
                    <Text style={[styles.dropdownText, { color: item.color }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
          </View>
        </View>

        {/* Content Section - Now only for rating details */}
        <View style={styles.contentContainer}>
          {/* Rating details row */}
          <View style={styles.detailsRow}>
            {item.rating != null && (
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>Rating</Text>
                <View style={styles.starContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= Math.round(item.rating!) ? "star" : "star-outline"}
                      size={12}
                      color={star <= Math.round(item.rating!) ? Colors.secondary : Colors.textMuted}
                    />
                  ))}
                </View>
              </View>
            )}
            
            {/* Navigate indicator */}
            <View style={styles.navigateIndicator}>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 6,
    marginHorizontal: 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  
  // Image Section
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
  },
  noImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  
  // Rating Badge
  ratingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Title Overlay at bottom of image
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 48, // Leave space for dropdown button
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleOverlayText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  
  // Dropdown Action Container
  actionContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    zIndex: 1000, // Add this line
  },
  dropdownToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1001, // Add this line
  },
  dropdownToggleActive: {
    backgroundColor: Colors.primary,
  },
  
  // Dropdown Menu
  dropdownMenu: {
    backgroundColor: Colors.dropdownOverlay,
    borderRadius: 12,
    marginTop: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 1002, // Add this line - highest priority
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 1003, // Add this line
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  
  // Content Section
  contentContainer: {
    padding: 16,
  },
  
  // Details Row
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flex: 1,
  },
  ratingLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  starContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  navigateIndicator: {
    padding: 4,
  },
});

export default ActivityCard;