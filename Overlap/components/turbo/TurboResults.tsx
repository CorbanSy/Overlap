// components/turbo/TurboResults.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  success: '#28A745',
  danger: '#DC3545', // Added missing danger color
} as const;

interface TurboResultsProps {
  turboData: any;
  onExit: () => void;
}

const TurboResults: React.FC<TurboResultsProps> = ({ turboData, onExit }) => {
  const { result, deathmatch } = turboData;
  const winningActivity = result?.winningActivity;
  const { votesA = 0, votesB = 0 } = deathmatch || {};

  return (
    <View style={styles.container}>
      {/* Success Header */}
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Ionicons name="trophy" size={48} color={COLORS.accent} />
        </View>
        <Text style={styles.title}>Winner!</Text>
        <Text style={styles.subtitle}>Decision locked in 2:41. Let's go!</Text>
      </View>

      {/* Winner Card */}
      <View style={styles.winnerCard}>
        {winningActivity?.photoUrls?.[0] && (
          <Image
            source={{ uri: winningActivity.photoUrls[0] }}
            style={styles.winnerImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.winnerInfo}>
          <Text style={styles.winnerName}>
            {winningActivity?.name || 'Selected Option'}
          </Text>
          
          {winningActivity?.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.rating}>
                {winningActivity.rating.toFixed(1)}
              </Text>
            </View>
          )}

          <View style={styles.winnerStats}>
            <Text style={styles.winnerStatsText}>
              Won with {result?.winner === 'A' ? votesA : votesB} votes
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="map" size={20} color={COLORS.text} />
          <Text style={styles.actionButtonText}>Open in Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="call" size={20} color={COLORS.text} />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="calendar" size={20} color={COLORS.text} />
          <Text style={styles.actionButtonText}>Book</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share" size={20} color={COLORS.text} />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Exit Button */}
      <TouchableOpacity style={styles.exitButton} onPress={onExit}>
        <Text style={styles.exitButtonText}>Back to Meetup</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  winnerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  winnerImage: {
    width: '100%',
    height: 200,
  },
  winnerInfo: {
    padding: 20,
  },
  winnerName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  winnerStats: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  winnerStatsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  exitButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
});

export default TurboResults;