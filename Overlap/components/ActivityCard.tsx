import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ActivityCard = ({ 
  item, 
  onRemoveFromCollection, 
  onRemoveFromLiked, 
  onAddToCollection, 
  isInCollection 
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleShare = async () => {
    try {
      const message = `Check out this activity: ${item.name}\nRating: ${item.rating}⭐\nMore details: ${item.url || 'N/A'}`;
      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Error sharing activity:', error);
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

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Remove from Liked */}
              <TouchableOpacity style={[styles.iconButton, styles.removeButton]} onPress={() => onRemoveFromLiked(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Add to Collection (only if in Liked Activities tab) */}
              {!isInCollection && (
                <TouchableOpacity style={[styles.iconButton, styles.addButton]} onPress={() => onAddToCollection(item)}>
                  <Ionicons name="add-outline" size={20} color="#000" />
                </TouchableOpacity>
              )}

              {/* Share Activity */}
              <TouchableOpacity style={[styles.iconButton, styles.shareButton]} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Expand Button */}
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandButton}>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
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

  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 8 
  },

  // Icon Button
  iconButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },

  // Button Styles
  removeButton: { backgroundColor: '#FF5555' },
  addButton: { backgroundColor: '#FFA500' },
  shareButton: { backgroundColor: '#1E90FF' },
});

export default ActivityCard;
