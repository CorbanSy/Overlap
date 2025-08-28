// components/turbo/TurboModeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  subscribeTurboSession,
  joinTurboSession,
  startTurboBriefing,
  recordTurboSwipe,
  voteTurboDeathmatch,
  endTurboDeathmatch,
} from '../../_utils/storage/turboMeetup';
import { getMeetupLikes } from '../../_utils/storage/meetupActivities';
import SwipingScreen, { SwipingHandle } from '../swiping';
import TurboLobby from './TurboLobby';
import TurboBriefing from './TurboBriefing';
import TurboSprint from './TurboSprint';
import TurboDeathmatch from './TurboDeathmatch';
import TurboResults from './TurboResults';
import { getAuth } from 'firebase/auth';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  success: '#28A745',
  danger: '#DC3545',
} as const;

interface TurboModeScreenProps {
  meetupId: string;
  onExit: () => void;
}

// Define proper types
interface TurboData {
  state: 'lobby' | 'briefing' | 'sprint' | 'deathmatch' | 'results';
  members?: { [userId: string]: { swipes?: number; active?: boolean } };
  // Add other properties as needed
}

interface Card {
  id: string;
  name: string;
  // Add other card properties as needed
}

const TurboModeScreen: React.FC<TurboModeScreenProps> = ({ meetupId, onExit }) => {
  const router = useRouter();
  const auth = getAuth(); // Initialize auth here
  const swipingRef = useRef<SwipingHandle | null>(null); // Fix ref typing
  
  const [turboData, setTurboData] = useState<TurboData | null>(null); // Proper typing instead of any
  const [cards, setCards] = useState<Card[]>([]); // Proper typing instead of any[]
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ swipes: 0, active: false });

  // Subscribe to turbo session updates
  useEffect(() => {
    if (!meetupId) return;

    const unsubscribe = subscribeTurboSession(meetupId, (data: TurboData) => { // Type the callback parameter
      setTurboData(data);
      
      // Update user stats with null checks
      const currentUserId = auth.currentUser?.uid;
      if (currentUserId && data.members?.[currentUserId]) {
        const currentUser = data.members[currentUserId];
        setUserStats({
          swipes: currentUser.swipes || 0,
          active: currentUser.active || false,
        });
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [meetupId]);

  // Load cards for swiping
  useEffect(() => {
    if (!meetupId) return;
    
    const loadCards = async () => {
      try {
        const activities = await getMeetupLikes(meetupId);
        setCards(activities);
      } catch (error) {
        console.error('Error loading cards:', error);
      }
    };

    loadCards();
  }, [meetupId]);

  // Handle swipe during sprint
  const handleSwipe = async (card: Card, direction: 'left' | 'right') => {
    if (!turboData || turboData.state !== 'sprint') return;

    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    try {
      await recordTurboSwipe(meetupId, currentUserId, card.id, direction, card.name);
    } catch (error) {
      console.error('Error recording swipe:', error);
      Alert.alert('Error', 'Failed to record swipe');
    }
  };

  const handleJoinSession = async () => {
    try {
      await joinTurboSession(meetupId);
    } catch (error) {
      console.error('Error joining session:', error);
      Alert.alert('Error', 'Failed to join session');
    }
  };

  const handleStartBriefing = async () => {
    try {
      await startTurboBriefing(meetupId);
    } catch (error) {
      console.error('Error starting briefing:', error);
      Alert.alert('Error', 'Failed to start briefing');
    }
  };

  const handleDeathmatchVote = async (choice: 'A' | 'B') => {
    try {
      await voteTurboDeathmatch(meetupId, choice);
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', 'Failed to record vote');
    }
  };

  const handleForceEnd = async (hostChoice?: 'A' | 'B') => {
    try {
      await endTurboDeathmatch(meetupId, hostChoice || undefined); // Handle the null/undefined issue
    } catch (error) {
      console.error('Error ending deathmatch:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Turbo Mode...</Text>
      </View>
    );
  }

  if (!turboData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load Turbo session</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onExit}>
          <Text style={styles.retryButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render based on current state
  switch (turboData.state) {
    case 'lobby':
      return (
        <TurboLobby
          turboData={turboData}
          onJoin={handleJoinSession}
          onStart={handleStartBriefing}
          onExit={onExit}
        />
      );

    case 'briefing':
      return (
        <TurboBriefing
          turboData={turboData}
          onExit={onExit}
        />
      );

    case 'sprint':
      return (
        <TurboSprint
          turboData={turboData}
          userStats={userStats}
          cards={cards}
          onSwipe={handleSwipe}
          onExit={onExit}
          swipingRef={swipingRef}
          meetupId={meetupId}
        />
      );

    case 'deathmatch':
      return (
        <TurboDeathmatch
          turboData={turboData}
          onVote={handleDeathmatchVote}
          onForceEnd={handleForceEnd}
          onExit={onExit}
        />
      );

    case 'results':
      return (
        <TurboResults
          turboData={turboData}
          onExit={onExit}
        />
      );

    default:
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unknown state: {turboData.state}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onExit}>
            <Text style={styles.retryButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TurboModeScreen;