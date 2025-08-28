// components/turbo/TurboSprint.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipingScreen, { SwipingHandle } from '../swiping';
import MeetupParticipants from '../MeetupParticipants';
import { getAuth } from 'firebase/auth';

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

interface TurboSprintProps {
  turboData: any;
  userStats: { swipes: number; active: boolean };
  cards: any[];
  onSwipe: (card: any, direction: 'left' | 'right') => void;
  onExit: () => void;
  swipingRef: React.RefObject<SwipingHandle>;
  meetupId: string;
}

const TurboSprint: React.FC<TurboSprintProps> = ({
  turboData,
  userStats,
  cards,
  onSwipe,
  onExit,
  swipingRef,
  meetupId,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [remainingSwipesForDeathmatch, setRemainingSwipesForDeathmatch] = useState(0);
  const [showBenchmarkHit, setShowBenchmarkHit] = useState(false);
  
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const benchmarkHitAnim = useRef(new Animated.Value(0)).current;
  const auth = getAuth();

  // Timer effect
  useEffect(() => {
    if (!turboData.sprint) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const sprintStart = turboData.sprint.startedAt?.toDate?.()?.getTime() || 
                         new Date(turboData.sprint.startedAt).getTime();
      const elapsed = Math.floor((now - sprintStart) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [turboData.sprint]);

  // Benchmark calculation effect
  useEffect(() => {
    const members = Object.values(turboData.members || {});
    const activeMembers = members.filter((m: any) => m.active);
    const totalSwipes = activeMembers.reduce((sum: number, m: any) => sum + (m.swipes || 0), 0);
    const benchmarkTarget = Math.ceil(0.8 * activeMembers.length * turboData.minSwipesPerPerson);
    
    const progress = benchmarkTarget > 0 ? Math.min(1, totalSwipes / benchmarkTarget) : 0;
    setBenchmarkProgress(progress);
    
    const remaining = Math.max(0, benchmarkTarget - totalSwipes);
    setRemainingSwipesForDeathmatch(remaining);

    // Animate progress bar
    Animated.timing(progressBarAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Check for benchmark hit
    if (progress >= 1 && !showBenchmarkHit) {
      setShowBenchmarkHit(true);
      Animated.sequence([
        Animated.timing(benchmarkHitAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(benchmarkHitAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowBenchmarkHit(false);
      });
    }
  }, [turboData.members, turboData.minSwipesPerPerson, showBenchmarkHit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUserProgress = () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !turboData.members?.[currentUser.uid]) {
      return { swipes: 0, minSwipes: turboData.minSwipesPerPerson };
    }
    
    return {
      swipes: turboData.members[currentUser.uid].swipes || 0,
      minSwipes: turboData.minSwipesPerPerson,
    };
  };

  const getTimerColor = () => {
    if (timeRemaining > 60) return COLORS.accent;
    if (timeRemaining > 30) return '#FFB000';
    return COLORS.danger;
  };

  const getProgressColor = () => {
    const { swipes, minSwipes } = getUserProgress();
    if (swipes >= minSwipes) return COLORS.success;
    if (swipes >= minSwipes * 0.7) return COLORS.accent;
    return COLORS.textSecondary;
  };

  const handleCardSwipe = useCallback((card: any, direction: 'left' | 'right') => {
    onSwipe(card, direction);
  }, [onSwipe]);

  const { swipes: userSwipes, minSwipes } = getUserProgress();
  const userProgressPercent = Math.min(100, (userSwipes / minSwipes) * 100);
  const isUserOnTrack = userSwipes >= minSwipes;

  return (
    <View style={styles.container}>
      {/* Sprint Header */}
      <View style={styles.sprintHeader}>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>

        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>
            {formatTime(timeRemaining)}
          </Text>
          <Text style={styles.timerLabel}>left</Text>
        </View>

        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: getProgressColor() }]}>
            {userSwipes}/{minSwipes}
          </Text>
          <Text style={styles.progressLabel}>swipes</Text>
        </View>
      </View>

      {/* Benchmark Progress Bar */}
      <View style={styles.benchmarkContainer}>
        <View style={styles.benchmarkBar}>
          <Animated.View 
            style={[
              styles.benchmarkFill, 
              { 
                width: progressBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} 
          />
        </View>
        <Text style={styles.benchmarkText}>
          {remainingSwipesForDeathmatch > 0 
            ? `Deathmatch in ${remainingSwipesForDeathmatch} swipes`
            : 'Ready for deathmatch!'
          }
        </Text>
      </View>

      {/* Participants Counter */}
      <View style={styles.participantsContainer}>
        <MeetupParticipants meetupId={meetupId} maxVisible={6} />
      </View>

      {/* User Progress Indicator */}
      <View style={styles.userProgressContainer}>
        <View style={styles.userProgressBar}>
          <View 
            style={[
              styles.userProgressFill, 
              { 
                width: `${userProgressPercent}%`,
                backgroundColor: getProgressColor(),
              }
            ]} 
          />
        </View>
        <View style={styles.userProgressInfo}>
          {isUserOnTrack ? (
            <View style={styles.onTrackIndicator}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.onTrackText}>You're on track!</Text>
            </View>
          ) : (
            <Text style={styles.progressHint}>
              {minSwipes - userSwipes} more swipes to be active
            </Text>
          )}
        </View>
      </View>

      {/* Benchmark Hit Notification */}
      {showBenchmarkHit && (
        <Animated.View 
          style={[
            styles.benchmarkHitOverlay,
            {
              opacity: benchmarkHitAnim,
              transform: [{
                scale: benchmarkHitAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              }],
            }
          ]}
        >
          <View style={styles.benchmarkHitContent}>
            <Ionicons name="flash" size={48} color={COLORS.accent} />
            <Text style={styles.benchmarkHitTitle}>Nice!</Text>
            <Text style={styles.benchmarkHitSubtitle}>Enough swipes! Deathmatch starting...</Text>
          </View>
        </Animated.View>
      )}

      {/* Swiping Area */}
      <View style={styles.swipingContainer}>
        <SwipingScreen
          ref={swipingRef}
          meetupId={meetupId}
          onSwipeLeft={(card) => handleCardSwipe(card, 'left')}
          onSwipeRight={(card) => handleCardSwipe(card, 'right')}
          showInternalButtons={false}
          turboMode={true}
        />
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.passButton]}
          onPress={() => swipingRef.current?.swipeLeft()}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.infoButton]}
          onPress={() => swipingRef.current?.openInfo()}
          activeOpacity={0.8}
        >
          <Ionicons name="information" size={20} color={COLORS.background} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.likeButton]}
          onPress={() => swipingRef.current?.swipeRight()}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sprint Tips */}
      <View style={styles.sprintTips}>
        <Text style={styles.tipsText}>
          Swipe fast • Trust your gut • {timeRemaining < 30 ? 'Time running out!' : 'Keep going!'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  sprintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  exitText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  benchmarkContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  benchmarkBar: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  benchmarkFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  benchmarkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  participantsContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(245, 166, 35, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userProgressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  userProgressBar: {
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  userProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  userProgressInfo: {
    alignItems: 'center',
  },
  onTrackIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onTrackText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  progressHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  benchmarkHitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  benchmarkHitContent: {
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  benchmarkHitTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  benchmarkHitSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  swipingContainer: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  passButton: {
    backgroundColor: COLORS.danger,
  },
  likeButton: {
    backgroundColor: COLORS.success,
  },
  infoButton: {
    backgroundColor: COLORS.accent,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sprintTips: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  tipsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

export default TurboSprint;