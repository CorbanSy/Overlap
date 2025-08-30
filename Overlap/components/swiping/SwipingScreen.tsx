// components/swiping/SwipingScreen.tsx - Updated with compact notifications
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import SwipingHeader from './SwipingHeader';
import SwipeDeck, { SwipeDeckHandle } from './SwipeDeck';
import ActionRow from './ActionRow';
import RecommendationNotification from './RecommendationNotification'; // New compact component

import { getMeetupActivitiesFromPlacesWithCategory } from '../../_utils/storage/meetupActivities';
import { getMeetupParticipantsCount } from '../../_utils/storage/meetupParticipants';
import { 
  initializeMeetupMeta, 
  subscribeToMeetupSession, 
  subscribeToMeetupItems,
  finalizeRecommendation 
} from '../../_utils/storage/liveRecommendations';

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  success: '#28A745',
  danger: '#DC3545',
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

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

export type SwipingHandle = {
  swipeLeft: () => void;
  swipeRight: () => void;
  openInfo: () => void;
};

type Props = {
  meetupId: string;
  category?: string;
  onSwipeLeft?: (card: Card) => void;
  onSwipeRight?: (card: Card) => void;
  onCardTap?: (card: Card) => void;
  showInternalButtons?: boolean;
  turboMode?: boolean;
  forceRefresh?: number;
};

const useCardData = (meetupId: string, category?: string, forceRefresh?: number) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Get participant count for session initialization
      const participantCount = await getMeetupParticipantsCount(meetupId);

      const activities = await getMeetupActivitiesFromPlacesWithCategory(meetupId, userLat, userLng, targetCategory);
      
      if (!activities || activities.length === 0) {
        setError(`No ${targetCategory.toLowerCase()} activities found for this location and preferences`);
      } else {
        // Initialize live recommendation session
        const cappedActivities = await initializeMeetupMeta(meetupId, participantCount, activities);
        setCards(cappedActivities);
      }
    } catch (err) {
      console.error('Error loading cards:', err);
      setError('Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [meetupId, category, forceRefresh]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  return { cards, loading, error, loadCards };
};

const SwipingScreen = forwardRef<SwipingHandle, Props>(function SwipingScreen(
  { meetupId, category, onSwipeLeft, onSwipeRight, onCardTap, showInternalButtons = false, turboMode = false, forceRefresh },
  ref
) {
  const router = useRouter();
  const { cards, loading, error, loadCards } = useCardData(meetupId, category, forceRefresh);

  const deckRef = useRef<SwipeDeckHandle>(null);
  
  // Live recommendation state
  const [session, setSession] = useState(null);
  const [items, setItems] = useState({});
  const [currentBanner, setCurrentBanner] = useState(null);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!meetupId || turboMode) return;

    const unsubscribeSession = subscribeToMeetupSession(meetupId, (sessionData) => {
      setSession(sessionData);
      
      // Set banner from session data
      if (sessionData?.currentBanner) {
        setCurrentBanner(sessionData.currentBanner);
      }
    });

    const unsubscribeItems = subscribeToMeetupItems(meetupId, (itemsData) => {
      setItems(itemsData);
    });

    return () => {
      unsubscribeSession();
      unsubscribeItems();
    };
  }, [meetupId, turboMode]);

  const handleOpenInfo = useCallback((card: Card) => {
    onCardTap?.(card);
    router.push(`/moreInfo?placeId=${card.id}`);
  }, [onCardTap, router]);

  const handleFinalize = useCallback(async () => {
    if (currentBanner) {
      await finalizeRecommendation(meetupId, currentBanner.activityId);
      setCurrentBanner(null);
    }
  }, [meetupId, currentBanner]);

  const handleDismissNotification = useCallback(() => {
    setCurrentBanner(null);
  }, []);

  useImperativeHandle(ref, () => ({
    swipeLeft: () => deckRef.current?.swipeLeft(),
    swipeRight: () => deckRef.current?.swipeRight(),
    openInfo: () => deckRef.current?.openInfo(),
  }), []);

  // Loading / Error states
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

  // Session completed
  if (session?.finished || (cards.length === 0 || (session && session.currentIndex >= session.totalActivities))) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
          <Text style={styles.completedTitle}>Session Complete!</Text>
          <Text style={styles.completedText}>
            {session?.finalizedActivity 
              ? 'Great choice! Your group has decided on a place.' 
              : 'All done reviewing activities. Check the results!'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Compact Recommendation Notification */}
      <RecommendationNotification
        banner={currentBanner}
        onFinalize={handleFinalize}
        onDismiss={handleDismissNotification}
      />

      <SwipingHeader 
        currentIndex={session?.currentIndex || 0} 
        total={session?.totalActivities || cards.length} 
        meetupId={meetupId} 
      />

      <View style={styles.cardContainer}>
        <SwipeDeck
          ref={deckRef}
          cards={cards}
          meetupId={meetupId}
          turboMode={turboMode}
          // Remove currentIndex prop - let deck manage its own progression
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          onCardTap={handleOpenInfo}
        />
      </View>

      {showInternalButtons && (
        <ActionRow
          disabled={false}
          onPass={() => deckRef.current?.swipeLeft()}
          onInfo={() => deckRef.current?.openInfo()}
          onLike={() => deckRef.current?.swipeRight()}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },

  loadingText: { color: COLORS.textSecondary, fontSize: 16 },
  errorTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  errorText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
  },
  retryButtonText: { color: COLORS.background, fontSize: 16, fontWeight: '700' },
  completedTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  completedText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 22 },
});

export default SwipingScreen;