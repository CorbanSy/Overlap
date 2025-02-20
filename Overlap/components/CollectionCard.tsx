import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

const CollectionCard = ({ collection, onPress }) => {
  if (!collection?.activities) return null; // Prevent errors if no activities

  // Get up to 4 activity images for the preview
  const previewImages = collection.activities.slice(0, 4).map((activity) => activity.photoReference);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(collection)}>
      {/* Collection Image Grid */}
      <View style={styles.imageGrid}>
        {previewImages.map((uri, index) => (
          <Image
            key={index}
            source={{
              uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${uri}&key=AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY`,
            }}
            style={styles.image}
          />
        ))}
        {/* Fill remaining empty slots if fewer than 4 images */}
        {Array.from({ length: 4 - previewImages.length }).map((_, index) => (
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
    width: '48%',  // ✅ Makes sure two cards fit in a row
    aspectRatio: 1,  // ✅ Ensures square aspect ratio
    margin: 6,  // ✅ Adds uniform spacing
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
    width: '50%', // ✅ Forces a 2x2 grid
    height: '50%',
  },
  emptyImage: {
    backgroundColor: '#333',
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
