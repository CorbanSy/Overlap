import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ActivityCard = ({ 
  item, 
  onRemoveFromCollection, 
  onRemoveFromLiked, 
  onAddToCollection, 
  isInCollection 
}) => {
  const [expanded, setExpanded] = useState(false);

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

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {/* Remove from Collection (only if inside a collection) */}
              {isInCollection && (
                <TouchableOpacity style={styles.removeButton} onPress={() => onRemoveFromCollection(item.id)}>
                  <Text style={styles.removeButtonText}>Remove from Collection</Text>
                </TouchableOpacity>
              )}

              {/* Remove from Liked */}
              <TouchableOpacity style={styles.removeButton} onPress={() => onRemoveFromLiked(item.id)}>
                <Text style={styles.removeButtonText}>Remove from Liked</Text>
              </TouchableOpacity>

              {/* Add to Collection (only if in Liked Activities tab) */}
              {!isInCollection && (
                <TouchableOpacity style={styles.addButton} onPress={() => {
                  console.log("Add to Collection Pressed:", item);  // ✅ Debugging log
                  onAddToCollection(item);
                }}>
                  <Text style={styles.addButtonText}>Add to Collection</Text>
                </TouchableOpacity>
                
              )}
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
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  removeButton: { backgroundColor: '#FF5555', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  removeButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  addButton: { backgroundColor: '#FFA500', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  addButtonText: { color: '#000', fontWeight: 'bold' },
});

export default ActivityCard;
