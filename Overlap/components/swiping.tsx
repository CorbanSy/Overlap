// components/swiping.tsx - Fixed to respect parent container bounds
import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getMeetupActivitiesFromPlacesWithCategory } from '../_utils/storage/meetupActivities';
import { recordSwipe } from '../_utils/storage/meetupSwipes';
import { getAuth } from 'firebase/auth';
import MeetupParticipants from './MeetupParticipants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Card {
  id: string;
  name: string;
  rating?: number;
  photoUrls?: string[];
  address?: string;
  category?: string;
  priceLevel?: number;
  description?: string;
}

export type SwipingHandle = {
  swipeLeft: () => void;
  swipeRight: () => void;
  openInfo: () => void;
};

interface SwipingScreenProps {
  meetupId: string;
  category?: string;
  onSwipeLeft?: (card: Card) => void;
  onSwipeRight?: (card: Card) => void;
  onCardTap?: (card: Card) => void;
  showInternalButtons?: boolean;
  turboMode?: boolean;
  forceRefresh?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;
const SCALE_FACTOR = 0.95;

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  accent: '#F5A623',
  success: '#28A745',
  danger: '#DC3545',
  border: '#30363D',
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

const SwipingScreen = forwardRef<SwipingHandle, SwipingScreenProps>(
  ({ meetupId, category, onSwipeLeft, onSwipeRight, onCardTap, showInternalButtons = false, turboMode = false, forceRefresh }, ref) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Animations
    const position = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(1)).current;
    const nextCardScale = useRef(new Animated.Value(SCALE_FACTOR)).current;
    const nextCardOpacity = useRef(new Animated.Value(0.8)).current;

    const loadCards = useCallback(async () => {
      if (!meetupId) {
        setError('No meetup ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setError(null);
        setLoading(true);
        
        const userLat = 32.7157;
        const userLng = -117.1611;
        const targetCategory = category || 'Dining';
        
        console.log(`[SwipingScreen] Loading activities for category: ${targetCategory}`);
        
        const activities = await getMeetupActivitiesFromPlacesWithCategory(
          meetupId, userLat, userLng, targetCategory
        );
        
        if (!activities || activities.length === 0) {
          setError(`No ${targetCategory.toLowerCase()} activities found for this location and preferences`);
        } else {
          console.log(`[SwipingScreen] Loaded ${activities.length} activities for category ${targetCategory}`);
          setCards(activities);
          setCurrentCardIndex(0);
        }
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load activities. Please try again.');
      } finally {
        setLoading(false);
      }
    }, [meetupId, category, forceRefresh]);

    useEffect(() => {
      loadCards();
    }, [loadCards]);

    const handleSwipe = useCallback(
      async (direction: 'left' | 'right') => {
        const card = cards[currentCardIndex];
        if (!card || isAnimating) return;

        setIsAnimating(true);
        
        if (direction === 'left' && onSwipeLeft) {
          onSwipeLeft(card);
        } else if (direction === 'right' && onSwipeRight) {
          onSwipeRight(card);
        }

        try {
          const user = getAuth().currentUser;
          if (user && !turboMode) {
            await recordSwipe(meetupId, user.uid, card.id, direction, card.name);
          }

          Animated.parallel([
            Animated.timing(nextCardScale, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(nextCardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();

          setTimeout(() => {
            position.setValue({ x: 0, y: 0 });
            scale.setValue(1);
            nextCardScale.setValue(SCALE_FACTOR);
            nextCardOpacity.setValue(0.8);
            setCurrentCardIndex((p) => p + 1);
            setIsAnimating(false);
          }, 200);
        } catch (err) {
          console.error('Error recording swipe:', err);
          Alert.alert('Error', 'Failed to record your choice. Please try again.');
          setIsAnimating(false);
        }
      },
      [cards, currentCardIndex, isAnimating, meetupId, onSwipeLeft, onSwipeRight, turboMode, position, scale, nextCardScale, nextCardOpacity]
    );

    const handleCardTap = useCallback(() => {
      const card = cards[currentCardIndex];
      if (!card) return;
      onCardTap?.(card);
      router.push(`/moreInfo?placeId=${card.id}`);
    }, [cards, currentCardIndex, onCardTap, router]);

    const swipeLeft = useCallback(() => {
      if (isAnimating) return;
      Animated.timing(position, {
        toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
        duration: 250,
        useNativeDriver: true,
      }).start(() => handleSwipe('left'));
    }, [handleSwipe, isAnimating, position]);

    const swipeRight = useCallback(() => {
      if (isAnimating) return;
      Animated.timing(position, {
        toValue: { x: SCREEN_WIDTH + 100, y: 0 },
        duration: 250,
        useNativeDriver: true,
      }).start(() => handleSwipe('right'));
    }, [handleSwipe, isAnimating, position]);

    useImperativeHandle(ref, () => ({ swipeLeft, swipeRight, openInfo: handleCardTap }), [
      swipeLeft,
      swipeRight,
      handleCardTap,
    ]);

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => !isAnimating,
          onMoveShouldSetPanResponder: () => !isAnimating,

          onPanResponderGrant: () => {
            Animated.timing(scale, { toValue: 0.98, duration: 100, useNativeDriver: true }).start();
          },

          onPanResponderMove: (_, g) => {
            if (isAnimating) return;
            position.setValue({ x: g.dx, y: g.dy });
          },

          onPanResponderRelease: (_, g) => {
            if (isAnimating) return;

            Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();

            // Remove tap-to-open functionality - only allow swiping
            const config = { duration: 250, useNativeDriver: true } as const;

            if (g.dx > SWIPE_THRESHOLD) {
              Animated.timing(position, { toValue: { x: SCREEN_WIDTH + 100, y: g.dy }, ...config }).start(
                () => handleSwipe('right')
              );
            } else if (g.dx < -SWIPE_THRESHOLD) {
              Animated.timing(position, { toValue: { x: -SCREEN_WIDTH - 100, y: g.dy }, ...config }).start(
                () => handleSwipe('left')
              );
            } else {
              Animated.spring(position, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }
          },
        }),
      [isAnimating, position, scale, handleCardTap, handleSwipe]
    );

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

    const renderCard = (card: Card, index: number, isNext = false) => {
      const imageUrl =
        Array.isArray(card.photoUrls) && card.photoUrls.length > 0 ? card.photoUrls[0] : null;

      const cardStyle = isNext
        ? [
            styles.card,
            styles.nextCard,
            { transform: [{ scale: nextCardScale }], opacity: nextCardOpacity, zIndex: 1 },
          ]
        : [
            styles.card,
            {
              zIndex: 2,
              transform: [
                ...position.getTranslateTransform(),
                {
                  rotate: position.x.interpolate({
                    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
                    outputRange: ['-30deg', '0deg', '30deg'],
                    extrapolate: 'clamp',
                  }),
                },
                { scale },
              ],
            },
          ];

      return (
        <Animated.View
          key={`${card.id}-${index}`}
          style={cardStyle}
          {...(!isNext ? panResponder.panHandlers : {})}
        >
          {imageUrl ? (
            <>
              <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.55, 1]}
                style={styles.cardGradient}
              />
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.noImageText}>No Image Available</Text>
            </View>
          )}

          {!isNext && (
            <>
              <Animated.View
                style={[
                  styles.swipeIndicator,
                  styles.likeIndicator,
                  {
                    opacity: position.x.interpolate({
                      inputRange: [0, SWIPE_THRESHOLD],
                      outputRange: [0, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              >
                <Text style={styles.indicatorText}>LIKE</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.swipeIndicator,
                  styles.passIndicator,
                  {
                    opacity: position.x.interpolate({
                      inputRange: [-SWIPE_THRESHOLD, 0],
                      outputRange: [1, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              >
                <Text style={styles.indicatorText}>PASS</Text>
              </Animated.View>
            </>
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

            {!isNext && (
              <TouchableOpacity
                style={styles.moreInfoButton}
                onPress={handleCardTap}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={18} color={COLORS.background} />
                <Text style={styles.moreInfoText}>More Info</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      );
    };

    if (loading) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading {category?.toLowerCase() || 'activities'}...</Text>
          </View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadCards}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (currentCardIndex >= cards.length) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
            <Text style={styles.completedTitle}>All Done!</Text>
            <Text style={styles.completedText}>
              You've reviewed all {category?.toLowerCase()} activities. Check the leaderboard to see the results!
            </Text>
          </View>
        </View>
      );
    }

    const currentCard = cards[currentCardIndex];
    const nextCard = cards[currentCardIndex + 1];

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        
        {/* Header Area - Compact for parent container */}
        <View style={styles.headerArea}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentCardIndex + 1) / cards.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentCardIndex + 1} / {cards.length}
            </Text>
          </View>

          {/* Participants */}
          <View style={styles.participantsContainer}>
            <MeetupParticipants meetupId={meetupId} maxVisible={5} />
          </View>
        </View>

        {/* Card Area - Properly contained */}
        <View style={styles.cardContainer}>
          {nextCard && renderCard(nextCard, currentCardIndex + 1, true)}
          {currentCard && renderCard(currentCard, currentCardIndex)}
        </View>

        {/* Only show internal buttons if requested */}
        {showInternalButtons && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={swipeLeft}
              disabled={isAnimating}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.infoButton]}
              onPress={handleCardTap}
              disabled={isAnimating}
              activeOpacity={0.8}
            >
              <Ionicons name="information" size={20} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={swipeRight}
              disabled={isAnimating}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  
  // Compact header area
  headerArea: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm, // Reduced padding
    zIndex: 10,
  },
  
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xs, // Reduced margin
  },
  progressBar: { 
    flex: 1, 
    height: 4, 
    backgroundColor: COLORS.border, 
    borderRadius: 2, 
    overflow: 'hidden' 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: COLORS.accent, 
    borderRadius: 2 
  },
  progressText: { 
    color: COLORS.textSecondary, 
    fontSize: 12, 
    fontWeight: '600', 
    minWidth: 50, 
    textAlign: 'right' 
  },
  
  participantsContainer: {
    alignItems: 'center',
  },
  
  // Card area that fills remaining space
  cardContainer: { 
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },

  // Card styles with proper sizing
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - SPACING.xl * 2,
    height: '85%', // Use percentage instead of fixed height
    maxHeight: 500, // Prevent cards from being too tall
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  nextCard: {},
  cardImage: { width: '100%', height: '100%' },
  cardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },

  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    gap: SPACING.md,
  },
  noImageText: { color: COLORS.textTertiary, fontSize: 16, fontWeight: '500' },

  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 5,
  },
  likeIndicator: { right: SPACING.xl, borderColor: COLORS.success, backgroundColor: 'rgba(40, 167, 69, 0.2)' },
  passIndicator: { left: SPACING.xl, borderColor: COLORS.danger, backgroundColor: 'rgba(220, 53, 69, 0.2)' },
  indicatorText: { color: COLORS.text, fontSize: 18, fontWeight: '800', letterSpacing: 2 },

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

  // Internal action buttons (only shown when showInternalButtons = true)
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    gap: SPACING.xl,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  passButton: { backgroundColor: COLORS.danger },
  likeButton: { backgroundColor: COLORS.success },
  infoButton: { backgroundColor: COLORS.accent, width: 48, height: 48, borderRadius: 24 },

  loadingText: { color: COLORS.textSecondary, fontSize: 16 },
  errorTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  errorText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  retryButton: { backgroundColor: COLORS.accent, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: 12 },
  retryButtonText: { color: COLORS.background, fontSize: 16, fontWeight: '700' },
  completedTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  completedText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 22 },
});

export default SwipingScreen;