import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ActivityCard = ({ item, onRemoveFromCollection, onRemoveFromLiked, onAddToCollection, isInCollection }) => {
  const router = useRouter(); // Initialize router for navigation

  // Share Activity
  const handleShare = async () => {
    try {
      const message = `Check out this activity: ${item.name}\nRating: ${item.rating} ⭐\nMore details: https://www.google.com/maps/place/?q=place_id:${item.id}`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing activity:', error);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/moreInfo?placeId=${item.id}`)} // Navigate to moreInfo.tsx
    >
      {/* Activity Image */}
      {item.photoReference && (
        <Image
          source={{
            uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${item.photoReference}&key=AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY`,
          }}
          style={styles.image}
        />
      )}

      {/* Title & Buttons in a Row */}
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
        <View style={styles.buttonRow}>
          {(onRemoveFromLiked || onRemoveFromCollection) && (
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                isInCollection ? onRemoveFromCollection(item.id) : onRemoveFromLiked(item.id)
              }              
            >
              <Ionicons name="trash-outline" size={20} color="red" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.button} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#F5A623" />
          </TouchableOpacity>
          {onAddToCollection && (
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => {
                console.log("Adding activity to local collection:", item);
                onAddToCollection(item);
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#4DA6FF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rating & Other Info */}
      <Text style={styles.subtitle}>{item.rating} ⭐</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1B1F24',
    padding: 10,
    marginVertical: 8,
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  titleRow: {
    flexDirection: 'row', // Align title and buttons horizontally
    justifyContent: 'space-between', // Push buttons to the right
    alignItems: 'center', // Keep them vertically aligned
    paddingHorizontal: 10,
    marginTop: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1, // Ensures title takes up remaining space
    marginRight: 10, // Adds spacing before buttons
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginLeft: 10, // Spacing between buttons
    padding: 6,
  },
});

export default ActivityCard;
