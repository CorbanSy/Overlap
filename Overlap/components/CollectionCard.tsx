// components/CollectionCard.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Professional color palette matching home.tsx
const Colors = {
  primary: '#F5A623',        // Orange from home.tsx
  primaryLight: '#FCD34D',   // Lighter orange
  secondary: '#6366F1',      // Blue as secondary
  background: '#0D1117',     // Dark background from home.tsx
  surface: '#1B1F24',        // Card background from home.tsx
  surfaceLight: '#333333',   // Lighter surface
  card: '#1B1F24',          // Same as surface for consistency
  border: '#333333',         // Border color
  text: '#FFFFFF',          // White text from home.tsx
  textSecondary: '#AAAAAA', // Gray text from home.tsx
  textMuted: '#888888',     // Muted text
  success: '#10B981',       // Keep success green
  warning: '#F5A623',       // Same as primary
  error: '#F44336',         // Keep error red
  white: '#FFFFFF',
  overlay: 'rgba(13, 17, 23, 0.8)', // Dark overlay to match background
  dropdownOverlay: 'rgba(27, 31, 36, 0.95)', // Updated to match surface
};

interface Activity {
  id: string;
  name: string;
  photos?: { photoUri: string }[];
  photoUrls?: string[];
}

interface Collection {
  id: string;
  title: string;
  description?: string;
  activities: Activity[];
}

interface CollectionCardProps {
  collection: Collection;
  onPress?: (col: Collection) => void;
  onDelete?: (col: Collection) => void;
  previewOnly?: boolean;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onPress,
  onDelete,
  previewOnly = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  if (!collection.activities) return null;

  // Helper: pick up to 4 image URIs from activities
  const previewImages = collection.activities.slice(0, 4).map((activity) => {
    return (
      activity.photoUrls?.[0] ||
      activity.photos?.[0]?.photoUri ||
      null
    );
  });

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

  // Share Collection
  const handleShare = async (e: any) => {
    e.stopPropagation();
    try {
      const message = `Check out my collection: ${collection.title}\n${collection.activities.length} activities included!\nMore details in the app!`;
      await Share.share({ message });
      // Close dropdown after action
      setIsDropdownOpen(false);
      dropdownAnim.setValue(0);
      rotateAnim.setValue(0);
    } catch (error) {
      console.error('Error sharing collection:', error);
    }
  };

  const handleDelete = (e: any) => {
    e.stopPropagation();
    onDelete?.(collection);
    // Close dropdown after action
    setIsDropdownOpen(false);
    dropdownAnim.setValue(0);
    rotateAnim.setValue(0);
  };

  // Create dropdown items array
  const getDropdownItems = () => {
    const items = [];
    
    // Always include share
    items.push({
      key: 'share',
      icon: 'share-outline',
      label: 'Share Collection',
      color: Colors.primary,     // Now using orange F5A623
      onPress: handleShare,
    });
    
    // Delete action (if available)
    if (onDelete) {
      items.push({
        key: 'delete',
        icon: 'trash-outline',
        label: 'Delete Collection',
        color: Colors.error,
        onPress: handleDelete,
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

  // Handle main card press
  const handleCardPress = () => {
    onPress?.(collection);
  };

  // Empty collection case
  if (collection.activities.length === 0) {
    return (
      <Animated.View
        style={[
          styles.cardContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={handleCardPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {/* Empty State Content */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="folder-open-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyStateText}>Empty Collection</Text>
            <Text style={styles.emptyStateSubtext}>Add activities to get started</Text>
          </View>
          
          {/* Title Overlay */}
          <View style={styles.titleOverlay}>
            <Text style={styles.titleOverlayText} numberOfLines={1}>
              {collection.title}
            </Text>
          </View>
          
          {/* Action Dropdown */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.dropdownToggle, isDropdownOpen && styles.dropdownToggleActive]}
              onPress={toggleDropdown}
            >
              <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                <Ionicons name="chevron-down" size={14} color={Colors.white} />
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
                      <Ionicons name={item.icon} size={14} color={item.color} />
                    </View>
                    <Text style={[styles.dropdownText, { color: item.color }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
          </View>
          
          {/* Activity Count Badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countText}>0</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Collection with activities
  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Image Grid */}
        <View style={styles.imageGridContainer}>
          <View style={styles.imageGrid}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const imageUri = previewImages[idx];
              return imageUri ? (
                <Image
                  key={idx}
                  source={{ uri: imageUri }}
                  style={styles.gridImage}
                />
              ) : (
                <View key={idx} style={[styles.gridImage, styles.emptyGridImage]}>
                  <Ionicons name="image-outline" size={16} color={Colors.textMuted} />
                </View>
              );
            })}
          </View>
          
          {/* Gradient Overlay for better text readability */}
          <View style={styles.imageOverlay} />
        </View>
        
        {/* Title Overlay */}
        <View style={styles.titleOverlay}>
          <Text style={styles.titleOverlayText} numberOfLines={1}>
            {collection.title}
          </Text>
          {collection.description && (
            <Text style={styles.descriptionText} numberOfLines={1}>
              {collection.description}
            </Text>
          )}
        </View>
        
        {/* Action Dropdown */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.dropdownToggle, isDropdownOpen && styles.dropdownToggleActive]}
            onPress={toggleDropdown}
          >
            <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
              <Ionicons name="chevron-down" size={14} color={Colors.white} />
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
                    <Ionicons name={item.icon} size={14} color={item.color} />
                  </View>
                  <Text style={[styles.dropdownText, { color: item.color }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </View>
        
        {/* Activity Count Badge */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{collection.activities.length}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,              // Changed from 16 to 8 to match home.tsx
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  
  // Image Grid
  imageGridContainer: {
    flex: 1,
    position: 'relative',
  },
  imageGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridImage: {
    width: '50%',
    height: '50%',
    backgroundColor: Colors.surfaceLight,
  },
  emptyGridImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
    // For React Native, we'll use a solid overlay with opacity
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  
  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Title Overlay
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 36, // Space for dropdown and count badge
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleOverlayText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  descriptionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  
  // Action Dropdown
  actionContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  dropdownToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownToggleActive: {
    backgroundColor: Colors.primary,
  },
  
  // Dropdown Menu
  dropdownMenu: {
    backgroundColor: Colors.dropdownOverlay,
    borderRadius: 8,
    marginTop: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  
  // Count Badge
  countBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  countText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CollectionCard;