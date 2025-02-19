import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

const CollectionCard = ({ collection, onPress }) => {
  // Get up to 4 activity images for the preview
  const previewImages = collection.activities
    .slice(0, 4)
    .map((activity) => activity.photoReference);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(collection)}>
      {/* Collection Image Grid */}
      <View style={styles.imageGrid}>
        {previewImages.map((uri, index) => (
          <Image
            key={index}
            source={{
              uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${uri}&key=YOUR_GOOGLE_API_KEY`,
            }}
            style={styles.image}
          />
        ))}
        {/* Fill remaining empty slots if fewer than 4 images */}
        {Array(4 - previewImages.length)
          .fill(null)
          .map((_, index) => (
            <View key={index + previewImages.length} style={[styles.image, styles.emptyImage]} />
          ))}
      </View>

      {/* Collection Title */}
      <Text style={styles.title}>{collection.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1, // Keeps it square
    margin: 8,
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGrid: {
    width: '100%',
    height: '75%',
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  image: {
    width: '50%', // 2x2 grid
    height: '50%',
  },
  emptyImage: {
    backgroundColor: '#333', // Placeholder color
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default CollectionCard;
