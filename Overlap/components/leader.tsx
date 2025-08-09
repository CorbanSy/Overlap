import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { getMeetupLeaderboard } from '../_utils/storage';

interface LeaderProps {
  meetupId: string;
}

interface LeaderEntry {
  name: string;
  yesCount: number;
  noCount: number;
}

const Leader: React.FC<LeaderProps> = ({ meetupId }) => {
  const [data, setData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const board = await getMeetupLeaderboard(meetupId);
        setData(board);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [meetupId]);

  if (loading) {
    return <ActivityIndicator size="large" color="#F5A623" style={styles.loader} />;
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.name}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.tallies}>
            <Text style={[styles.tally, styles.yes]}>✅ {item.yesCount}</Text>
            <Text style={[styles.tally, styles.no]}>❌ {item.noCount}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No actions yet.</Text>}
    />
  );
};

export default Leader;

const styles = StyleSheet.create({
  loader: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
  },
  tallies: {
    flexDirection: 'row',
  },
  tally: {
    fontSize: 16,
    marginLeft: 12,
  },
  yes: {
    color: '#28A745',
  },
  no: {
    color: '#DC3545',
  },
  empty: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
});