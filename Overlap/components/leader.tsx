//components/leader.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { getMeetupActivityLeaderboard } from '../_utils/storage/meetupSwipes';

interface LeaderProps {
  meetupId: string;
}

interface ActivityLeaderEntry {
  activityId: string;
  activityName: string;
  yesCount: number;
  noCount: number;
  totalVotes: number;
  yesPercentage: number;
}

const Leader: React.FC<LeaderProps> = ({ meetupId }) => {
  console.log('Leader component mounted with meetupId:', meetupId);
  const [data, setData] = useState<ActivityLeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivityLeaderboard() {
      console.log('Loading leaderboard for meetupId:', meetupId);
      try {
        const board = await getMeetupActivityLeaderboard(meetupId);
        console.log('Leaderboard data:', board);
        // Sort by yes percentage (most liked first), then by total votes
        const sorted = board.sort((a, b) => {
          if (b.yesPercentage !== a.yesPercentage) {
            return b.yesPercentage - a.yesPercentage;
          }
          return b.totalVotes - a.totalVotes;
        });
        setData(sorted);
      } catch (err) {
        console.error('Failed to load activity leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadActivityLeaderboard();
  }, [meetupId]);

  const getRankDisplay = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  if (loading) {
    console.log('Leader component is loading...');
    return <ActivityIndicator size="large" color="#F5A623" style={styles.loader} />;
  }

  console.log('Leader component rendered with data:', data);

  return (
    <View style={{ flex: 1, backgroundColor: '#1B1F24' }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', padding: 16, textAlign: 'center' }}>
        Activity Leaderboard
      </Text>
      <FlatList
      data={data}
      keyExtractor={(item) => item.activityId}
      renderItem={({ item, index }) => (
        <View style={[styles.row, index < 3 && styles.topThree]}>
          <View style={styles.rankSection}>
            <Text style={styles.rank}>{getRankDisplay(index)}</Text>
          </View>
          
          <View style={styles.activityInfo}>
            <Text style={styles.activityName} numberOfLines={2}>
              {item.activityName}
            </Text>
            <View style={styles.statsRow}>
              <Text style={styles.percentage}>
                {item.yesPercentage.toFixed(0)}% liked
              </Text>
              <Text style={styles.totalVotes}>
                ({item.totalVotes} vote{item.totalVotes !== 1 ? 's' : ''})
              </Text>
            </View>
          </View>
          
          <View style={styles.tallies}>
            <View style={styles.tallyItem}>
              <Text style={[styles.tally, styles.yes]}>👍</Text>
              <Text style={[styles.tallyCount, styles.yes]}>{item.yesCount}</Text>
            </View>
            <View style={styles.tallyItem}>
              <Text style={[styles.tally, styles.no]}>👎</Text>
              <Text style={[styles.tallyCount, styles.no]}>{item.noCount}</Text>
            </View>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No activity votes yet.</Text>
          <Text style={styles.emptySubtext}>Start swiping to see results!</Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    />
    </View>
  );
};

export default Leader;

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
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  loader: {
    marginTop: 40,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topThree: {
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  rankSection: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  activityInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  activityName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentage: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  totalVotes: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  tallies: {
    flexDirection: 'row',
    gap: 12,
  },
  tallyItem: {
    alignItems: 'center',
    minWidth: 32,
  },
  tally: {
    fontSize: 16,
    marginBottom: 2,
  },
  tallyCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  yes: {
    color: COLORS.success,
  },
  no: {
    color: COLORS.danger,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  empty: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});