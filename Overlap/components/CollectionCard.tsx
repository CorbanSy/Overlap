import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CollectionCard = ({ collection }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{collection.title}</Text>
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="#666" />
        </TouchableOpacity>
      </View>
      {expanded &&
        collection.activities.map((activity) => (
          <Text key={activity.id} style={styles.activityText}>{activity.title}</Text>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1B1F24', padding: 12, borderRadius: 8, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  activityText: { color: '#DDD', marginLeft: 10 },
});

export default CollectionCard;
