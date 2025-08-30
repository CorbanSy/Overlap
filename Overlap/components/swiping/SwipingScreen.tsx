// components/swiping/SwipingScreen.tsx - Updated with dual notification system
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import SwipingHeader from './SwipingHeader';
import SwipeDeck, { SwipeDeckHandle } from './SwipeDeck';
import ActionRow from './ActionRow';
import RecommendationNotification from './RecommendationNotification';
import GreatMatchNotification from './GreatMatchNotification';

import { getMeetupActivitiesFromPlacesWithCategory } from '../../_utils/storage/meetupActivities';
import { getMeetupParticipantsCount } from '../../_utils/storage/meetupParticipants';
import { 
  initializeMeetupMeta, 
  subscribeToMeetupSession, 
  subscribeToMeetupItems,
  finalizeRecommendation,
  resetMeetupSession,
  isSessionFinished,
  restartMeetupSession
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
  const [showSessionFinished, setShowSessionFinished] = useState(false);

  const loadCards = useCallback(async () => {
    if (!meetupId) {
      setError('No meetup ID provided');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      setShowSessionFinished(false);

      const userLat = 32.7157;
      const userLng = -117.1611;
      const targetCategory = category || 'Dining';

      const sessionFinished = await isSessionFinished(meetupId);
      if (sessionFinished) {
        setShowSessionFinished(true);
        setLoading(false);
        return;
      }

      const participantCount = await getMeetupParticipantsCount(meetupId);
      const activities = await getMeetupActivitiesFromPlacesWithCategory(meetupId, userLat, userLng, targetCategory);
      
      if (!activities || activities.length === 0) {
        setError(`No ${targetCategory.toLowerCase()} activities found for this location and preferences`);
      } else {
        const cappedActivities = await initializeMeetupMeta(meetupId, participantCount, activities);
        setCards(cappedActivities);
        setShowSessionFinished(false);
      }
    } catch (err) {
      console.error('Error loading cards:', err);
      setError('Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [meetupId, category, forceRefresh]);

  const restartSession = useCallback(async () => {
    if (!meetupId) return;
    
    try {
      setLoading(true);
      setError(null);
      setShowSessionFinished(false);

      const userLat = 32.7157;
      const userLng = -117.1611;
      const targetCategory = category || 'Dining';

      const participantCount = await getMeetupParticipantsCount(meetupId);
      const activities = await getMeetupActivitiesFromPlacesWithCategory(meetupId, userLat, userLng, targetCategory);

      if (!activities || activities.length === 0) {
        setError(`No ${targetCategory.toLowerCase()} activities found for this location and preferences`);
      } else {
        const cappedActivities = await restartMeetupSession(meetupId, activities, participantCount);
        setCards(cappedActivities);
      }
    } catch (err) {
      console.error('Error restarting session:', err);
      setError('Failed to restart session. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [meetupId, category]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  return { cards, loading, error, showSessionFinished, loadCards, restartSession };
};

const SwipingScreen = forwardRef<SwipingHandle, Props>(function SwipingScreen(
  { meetupId, category, onSwipeLeft, onSwipeRight, onCardTap, showInternalButtons = false, turboMode = false, forceRefresh },
  ref
) {
  const router = useRouter();
  const { cards, loading, error, showSessionFinished, loadCards, restartSession } = useCardData(meetupId, category, forceRefresh);

  const deckRef = useRef<SwipeDeckHandle>(null);
  
  // Live recommendation state
  const [session, setSession] = useState(null);
  const [items, setItems] = useState({});
  const [perfectMatch, setPerfectMatch] = useState(null); // unanimous/near-unanimous
  const [greatMatch, setGreatMatch] = useState(null);     // strong majority

  // Subscribe to real-time updates
  useEffect(() => {
    if (!meetupId || turboMode || showSessionFinished) return;

    const unsubscribeSession = subscribeToMeetupSession(meetupId, (sessionData) => {
      setSession(sessionData);
      
      // Split banner handling based on type
      if (sessionData?.currentBanner) {
        const banner = sessionData.currentBanner;
        
        if (banner.type === 'unanimous' || banner.type === 'near-unanimous') {
          setPerfectMatch(banner);
          setGreatMatch(null); // Clear great match when we have perfect
        } else if (banner.type === 'great-match') {
          setGreatMatch(banner);
          setPerfectMatch(null); // Clear perfect match when we have great
        } else {
          // Regular recommendation types (strong, soft) go to perfect match slot
          setPerfectMatch(banner);
          setGreatMatch(null);
        }
      }
    });

    const unsubscribeItems = subscribeToMeetupItems(meetupId, (itemsData) => {
      setItems(itemsData);
    });

    return () => {
      unsubscribeSession();
      unsubscribeItems();
    };
  }, [meetupId, turboMode, showSessionFinished]);

  const handleOpenInfo = useCallback((card: Card) => {
    onCardTap?.(card);
    router.push(`/moreInfo?placeId=${card.id}`);
  }, [onCardTap, router]);

  const handleFinalizePerfect = useCallback(async () => {
    if (perfectMatch) {
      await finalizeRecommendation(meetupId, perfectMatch.activityId);
      setPerfectMatch(null);
      setGreatMatch(null);
    }
  }, [meetupId, perfectMatch]);

  const handleGreatMatchDecision = useCallback(() => {
    if (!greatMatch) return;
    
    Alert.alert(
      'Great Match Found!',
      `"${greatMatch.activityName}" has ${greatMatch.likes}/${greatMatch.participantCount} approval (${Math.round((greatMatch.likes / greatMatch.participantCount) * 100)}%). As the host, would you like to finalize this choice?`,
      [
        {
          text: 'Keep Swiping',
          style: 'cancel',
          onPress: () => setGreatMatch(null)
        },
        {
          text: 'Choose This Place',
          style: 'default',
          onPress: async () => {
            await finalizeRecommendation(meetupId, greatMatch.activityId);
            setGreatMatch(null);
            setPerfectMatch(null);
          }
        }
      ]
    );
  }, [meetupId, greatMatch]);

  const handleDismissNotifications = useCallback(() => {
    setPerfectMatch(null);
    setGreatMatch(null);
  }, []);

  useImperativeHandle(ref, () => ({
    swipeLeft: () => deckRef.current?.swipeLeft(),
    swipeRight: () => deckRef.current?.swipeRight(),
    openInfo: () => deckRef.current?.openInfo(),
  }), []);

  // Loading state
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

  // Error state
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

  // Session finished state
  if (showSessionFinished || session?.finished || session?.finalizedActivity) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
          <Text style={styles.completedTitle}>Session Complete!</Text>
          <Text style={styles.completedText}>
            {session?.finalizedActivity 
              ? 'Your group has decided on a place!' 
              : 'You\'ve finished reviewing activities.'}
          </Text>
          
          <TouchableOpacity style={styles.restartButton} onPress={restartSession}>
            <Ionicons name="refresh" size={20} color={COLORS.background} />
            <Text style={styles.restartButtonText}>Start New Session</Text>
          </TouchableOpacity>
          
          <Text style={styles.restartHint}>
            Try different filters or categories for fresh recommendations
          </Text>
        </View>
      </View>
    );
  }

  // No cards state
  if (cards.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.centerContainer}>
          <Ionicons name="restaurant-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.completedTitle}>No Activities Found</Text>
          <Text style={styles.completedText}>
            No {category?.toLowerCase() || 'activities'} found matching your criteria.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCards}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Perfect Match Notification - Top Right */}
      <RecommendationNotification
        banner={perfectMatch}
        onFinalize={handleFinalizePerfect}
        onDismiss={handleDismissNotifications}
      />

      {/* Great Match Notification - Top Left */}
      <GreatMatchNotification
        greatMatch={greatMatch}
        onHostDecision={handleGreatMatchDecision}
        onDismiss={handleDismissNotifications}
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
  
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  restartButtonText: { 
    color: COLORS.background, 
    fontSize: 16, 
    fontWeight: '700' 
  },
  restartHint: {
    color: COLORS.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
});

export default SwipingScreen;