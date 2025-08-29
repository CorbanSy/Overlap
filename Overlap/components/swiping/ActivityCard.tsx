import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  accent: '#F5A623',
  border: '#30363D',
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export interface Card {
  id: string;
  name: string;
  rating?: number;
  photoUrls?: string[];
  address?: string;
  category?: string;
  priceLevel?: number;
  description?: string;
}

type Props = {
  card: Card;
  isActive: boolean;
  wrapperStyle?: any;               // Animated style passed from deck
  panHandlers?: any;               // Only for active card
  currentPhotoIndex: number;
  photoTransition: Animated.Value; // For image opacity pulse on change
  onMoreInfo: () => void;
};

const renderPriceLevel = (priceLevel?: number) => {
  if (priceLevel == null || priceLevel <= 0) return null;
  return <Text style={styles.priceLevel}>{'$'.repeat(Math.min(priceLevel, 4))}</Text>;
};

const renderRating = (rating?: number) => {
  if (!rating) return null;
  return (
    <View style={styles.ratingContainer}>
      <Ionicons name="star" size={16} color="#FFD700" />
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
    </View>
  );
};

function ActivityCard({
  card,
  isActive,
  wrapperStyle,
  panHandlers,
  currentPhotoIndex,
  photoTransition,
  onMoreInfo,
}: Props) {
  const photoUrls = Array.isArray(card.photoUrls) ? card.photoUrls : [];
  const hasPhotos = photoUrls.length > 0;
  const displayPhotoIndex = currentPhotoIndex;
  const imageUri = hasPhotos ? photoUrls[displayPhotoIndex] : undefined;

  return (
    <Animated.View
      style={[styles.card, wrapperStyle]}
      {...(isActive ? panHandlers : {})}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {imageUri ? (
        <>
          <Animated.Image
            source={{ uri: imageUri }}
            style={[
              styles.cardImage,
              isActive && {
                opacity: photoTransition.interpolate({
                  inputRange: [0.8, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.55, 1]}
            style={styles.cardGradient}
          />
          {photoUrls.length > 1 && isActive && (
            <View style={styles.photoIndicators}>
              {photoUrls.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.photoIndicator,
                    { backgroundColor: idx === currentPhotoIndex ? COLORS.accent : 'rgba(255,255,255,0.3)' },
                  ]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.noImageContainer}>
          <Ionicons name="image-outline" size={64} color={COLORS.textTertiary} />
          <Text style={styles.noImageText}>No Images Available</Text>
        </View>
      )}

      {isActive && hasPhotos && photoUrls.length > 1 && (
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>Swipe to browse {photoUrls.length} photos</Text>
        </View>
      )}

      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {card.name}
          </Text>
          <View style={styles.cardMeta}>
            {renderRating(card.rating)}
            {renderPriceLevel(card.priceLevel)}
          </View>
        </View>

        {card.address && (
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.address} numberOfLines={1}>
              {card.address}
            </Text>
          </View>
        )}

        {card.category && (
          <View style={styles.categoryContainer}>
            <Text style={styles.category}>{card.category}</Text>
          </View>
        )}

        {isActive && (
          <TouchableOpacity
            style={styles.moreInfoButton}
            onPress={onMoreInfo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-circle-outline" size={18} color={COLORS.background} />
            <Text style={styles.moreInfoText}>More Info</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - SPACING.xl * 2,
    height: '85%',
    maxHeight: 500,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  cardImage: { width: '100%', height: '100%' },
  cardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },

  photoIndicators: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 3,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  swipeHint: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },

  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    gap: SPACING.md,
  },
  noImageText: { color: COLORS.textTertiary, fontSize: 16, fontWeight: '500' },

  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.xl, gap: SPACING.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.md },
  cardTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700', flex: 1, lineHeight: 30 },
  cardMeta: { alignItems: 'flex-end', gap: SPACING.xs },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  rating: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  priceLevel: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
  addressContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  address: { color: COLORS.textSecondary, fontSize: 14, flex: 1 },
  categoryContainer: { alignSelf: 'flex-start' },
  category: { color: COLORS.accent, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  moreInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  moreInfoText: { color: COLORS.background, fontSize: 14, fontWeight: '700' },
});

export default memo(ActivityCard);