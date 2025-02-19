import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { unlikePlace } from '../app/utils/storage';

const ActivityCard = ({ item, onRemove }) => {
  const [expanded, setExpanded] = useState(false);

  const handleRemove = async () => {
    try {
      await unlikePlace(item.id);
      onRemove(item.id); // Remove the item from the state in ProfileScreen
    } catch (error) {
      console.error('Failed to remove liked activity:', error);
    }
  };

  return (
    <View style={styles.card}>
      {/* Show image if available */}
      {item.photoReference && (
        <Image
          source={{
            uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${item.photoReference}&key=AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY`
          }}
          style={styles.cardImage}
        />
      )}

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>

        {/* Expandable Details */}
        {expanded && (
          <View>
            <Text style={styles.cardSubtitle}>
              {item.rating} ⭐ ({item.userRatingsTotal}+ ratings)
            </Text>

            {/* Remove Liked Activity Button (Only when expanded) */}
            <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
              <Text style={styles.removeButtonText}>Remove from Liked</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Expand Button */}
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={styles.expandButton}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1B1F24', padding: 12, borderRadius: 8, marginBottom: 12 },
  cardImage: { width: '100%', height: 120, borderRadius: 6 },
  cardContent: { padding: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  cardSubtitle: { fontSize: 14, color: '#AAAAAA', marginTop: 4 },
  expandButton: { alignSelf: 'flex-end', marginTop: 5 },
  removeButton: {
    backgroundColor: '#FF5555',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  removeButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
});

export default ActivityCard;
