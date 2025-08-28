// components/turbo/TurboDeathmatch.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

interface TurboDeathmatchProps {
  turboData: any;
  onVote: (choice: 'A' | 'B') => void;
  onForceEnd: (hostChoice?: 'A' | 'B') => void;
  onExit: () => void;
}

const TurboDeathmatch: React.FC<TurboDeathmatchProps> = ({
  turboData,
  onVote,
  onForceEnd,
  onExit,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [userVote, setUserVote] = useState<'A' | 'B' | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  
  const pulseAnimA = useRef(new Animated.Value(1)).current;
  const pulseAnimB = useRef(new Animated.Value(1)).current;
  const winnerAnim = useRef(new Animated.Value(0)).current;
  const auth = getAuth();

  // Timer effect
  useEffect(() => {
    if (!turboData.deathmatch) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deathmatchStart = turboData.deathmatch.startedAt?.toDate?.()?.getTime() || 
                             new Date(turboData.deathmatch.startedAt).getTime();
      const elapsed = Math.floor((now - deathmatchStart) / 1000);
      const remaining = Math.max(0, turboData.deathmatchDuration - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onForceEnd(); // Auto-end when timer expires
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [turboData.deathmatch, turboData.deathmatchDuration, onForceEnd]);

  // User vote tracking
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (currentUserId && turboData.deathmatch?.voters?.[currentUserId]) {
      setUserVote(turboData.deathmatch.voters[currentUserId]);
    }
  }, [turboData.deathmatch]);

  // Winner detection and animation
  useEffect(() => {
    const activeMembers = Object.values(turboData.members || {}).filter((m: any) => m.active);
    const majorityNeeded = Math.floor(activeMembers.length / 2) + 1;
    const { votesA = 0, votesB = 0 } = turboData.deathmatch || {};

    let currentWinner: 'A' | 'B' | null = null;
    if (votesA >= majorityNeeded) {
      currentWinner = 'A';
    } else if (votesB >= majorityNeeded) {
      currentWinner = 'B';
    }

    if (currentWinner && currentWinner !== winner) {
      setWinner(currentWinner);
      setShowWinnerAnimation(true);
      
      // Winner animation
      Animated.sequence([
        Animated.timing(winnerAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(winnerAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowWinnerAnimation(false);
      });
    }
  }, [turboData.deathmatch, turboData.members, winner]);

  // Vote animations
  useEffect(() => {
    const { votesA = 0, votesB = 0 } = turboData.deathmatch || {};
    
    // Pulse animation for new votes
    if (votesA > 0) {
      Animated.sequence([
        Animated.timing(pulseAnimA, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimA, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (votesB > 0) {
      Animated.sequence([
        Animated.timing(pulseAnimB, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimB, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [turboData.deathmatch?.votesA, turboData.deathmatch?.votesB]);

  const handleVote = (choice: 'A' | 'B') => {
    if (userVote) return; // Already voted
    setUserVote(choice);
    onVote(choice);
  };

  const activeMembers = Object.values(turboData.members || {}).filter((m: any) => m.active);
  const majorityNeeded = Math.floor(activeMembers.length / 2) + 1;
  const { votesA = 0, votesB = 0 } = turboData.deathmatch || {};
  const [optionA, optionB] = turboData.top2 || [];

  const getTimerColor = () => {
    if (timeRemaining > 20) return COLORS.accent;
    if (timeRemaining > 10) return '#FFB000';
    return COLORS.danger;
  };

  const isWinningA = votesA > votesB;
  const isWinningB = votesB > votesA;
  const hasWinner = votesA >= majorityNeeded || votesB >= majorityNeeded;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>

        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { color: getTimerColor() }]}>
            :{timeRemaining.toString().padStart(2, '0')}
          </Text>
          <Text style={styles.timerLabel}>left</Text>
        </View>

        <View style={styles.votesNeeded}>
          <Text style={styles.votesNeededText}>
            Need {majorityNeeded} votes
          </Text>
          <Text style={styles.votesNeededSubtext}>
            to win
          </Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Final Decision</Text>
        <Text style={styles.subtitle}>Tap your favorite • First to {majorityNeeded} wins</Text>
      </View>

      {/* Vote Progress */}
      <View style={styles.voteProgress}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFillA, 
              { width: `${activeMembers.length > 0 ? (votesA / activeMembers.length) * 100 : 0}%` }
            ]} 
          />
          <View 
            style={[
              styles.progressFillB, 
              { 
                width: `${activeMembers.length > 0 ? (votesB / activeMembers.length) * 100 : 0}%`,
                right: 0,
                position: 'absolute',
              }
            ]} 
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, isWinningA && styles.winningLabel]}>
            A: {votesA}
          </Text>
          <Text style={[styles.progressLabel, isWinningB && styles.winningLabel]}>
            B: {votesB}
          </Text>
        </View>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {/* Option A */}
        <Animated.View style={{ transform: [{ scale: pulseAnimA }] }}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              userVote === 'A' && styles.selectedCard,
              votesA >= majorityNeeded && styles.winnerCard,
              isWinningA && !hasWinner && styles.leadingCard,
            ]}
            onPress={() => handleVote('A')}
            disabled={!!userVote || hasWinner}
            activeOpacity={userVote ? 1 : 0.8}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionLabelContainer}>
                <Text style={styles.optionLabel}>A</Text>
                {votesA >= majorityNeeded && (
                  <View style={styles.winnerBadge}>
                    <Ionicons name="trophy" size={16} color={COLORS.accent} />
                  </View>
                )}
              </View>
              <View style={[
                styles.voteCount,
                votesA >= majorityNeeded && styles.winnerVoteCount,
                isWinningA && !hasWinner && styles.leadingVoteCount,
              ]}>
                <Text style={styles.voteCountText}>{votesA}</Text>
              </View>
            </View>
            
            {optionA?.photoUrls?.[0] && (
              <Image
                source={{ uri: optionA.photoUrls[0] }}
                style={styles.optionImage}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.optionInfo}>
              <Text style={styles.optionName} numberOfLines={2}>
                {optionA?.name || 'Option A'}
              </Text>
              {optionA?.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.rating}>{optionA.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {userVote === 'A' && (
              <View style={styles.votedOverlay}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                <Text style={styles.votedText}>Voted</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* VS Divider */}
        <View style={styles.vsContainer}>
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
        </View>

        {/* Option B */}
        <Animated.View style={{ transform: [{ scale: pulseAnimB }] }}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              userVote === 'B' && styles.selectedCard,
              votesB >= majorityNeeded && styles.winnerCard,
              isWinningB && !hasWinner && styles.leadingCard,
            ]}
            onPress={() => handleVote('B')}
            disabled={!!userVote || hasWinner}
            activeOpacity={userVote ? 1 : 0.8}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionLabelContainer}>
                <Text style={styles.optionLabel}>B</Text>
                {votesB >= majorityNeeded && (
                  <View style={styles.winnerBadge}>
                    <Ionicons name="trophy" size={16} color={COLORS.accent} />
                  </View>
                )}
              </View>
              <View style={[
                styles.voteCount,
                votesB >= majorityNeeded && styles.winnerVoteCount,
                isWinningB && !hasWinner && styles.leadingVoteCount,
              ]}>
                <Text style={styles.voteCountText}>{votesB}</Text>
              </View>
            </View>
            
            {optionB?.photoUrls?.[0] && (
              <Image
                source={{ uri: optionB.photoUrls[0] }}
                style={styles.optionImage}
                resizeMode="cover"
              />
            )}
            
            <View style={styles.optionInfo}>
              <Text style={styles.optionName} numberOfLines={2}>
                {optionB?.name || 'Option B'}
              </Text>
              {optionB?.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.rating}>{optionB.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {userVote === 'B' && (
              <View style={styles.votedOverlay}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                <Text style={styles.votedText}>Voted</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        {hasWinner ? (
          <Text style={styles.statusText}>
            🏆 Winner decided! Advancing to results...
          </Text>
        ) : userVote ? (
          <Text style={styles.statusText}>
            Vote recorded! Waiting for others... ({votesA + votesB}/{activeMembers.length} votes)
          </Text>
        ) : (
          <Text style={styles.statusText}>
            Tap to vote • {majorityNeeded - Math.max(votesA, votesB)} more votes needed to win
          </Text>
        )}
      </View>

      {/* Winner Animation Overlay */}
      {showWinnerAnimation && (
        <Animated.View 
          style={[
            styles.winnerOverlay,
            {
              opacity: winnerAnim,
              transform: [{
                scale: winnerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              }],
            }
          ]}
        >
          <View style={styles.winnerContent}>
            <Ionicons name="trophy" size={64} color={COLORS.accent} />
            <Text style={styles.winnerTitle}>
              Option {winner} Wins!
            </Text>
            <Text style={styles.winnerSubtitle}>
              {winner === 'A' ? optionA?.name : optionB?.name}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  votesNeeded: {
    alignItems: 'flex-end',
  },
  votesNeededText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  votesNeededSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  titleContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  voteProgress: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  progressFillA: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  progressFillB: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
    position: 'absolute',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  winningLabel: {
    color: COLORS.text,
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 16,
  },
  optionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  selectedCard: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
  },
  winnerCard: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  leadingCard: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.accent,
  },
  winnerBadge: {
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  voteCount: {
    backgroundColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  winnerVoteCount: {
    backgroundColor: COLORS.success,
  },
  leadingVoteCount: {
    backgroundColor: COLORS.accent,
  },
  voteCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionInfo: {
    gap: 6,
  },
  optionName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  votedOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(40, 167, 69, 0.9)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    gap: 4,
  },
  votedText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '700',
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  vsCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  winnerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  winnerContent: {
    alignItems: 'center',
    gap: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 40,
    borderWidth: 3,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  winnerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  winnerSubtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default TurboDeathmatch;