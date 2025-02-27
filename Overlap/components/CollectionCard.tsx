import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CollectionCard = ({ collection, onPress }) => {
  if (!collection?.activities) return null; // Prevent errors if no activities

  // Get up to 4 activity images for the preview
  const previewImages = collection.activities.slice(0, 4).map((activity) => activity.photoReference);

  // Function to share the collection
  const handleShare = async () => {
    try {
      const message = `Check out this collection: "${collection.title}"!\n\n${
        collection.description || 'No description provided.'
      }\n\nIncludes activities like: ${collection.activities
        .map((activity) => activity.name)
        .slice(0, 3)
        .join(', ')}...`;

      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Error sharing collection:', error);
    }
  };

  return (
    <View style={styles.container}>
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

      {/* Share Button */}
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
        <Text style={styles.shareButtonText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    margin: 6,
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
    width: '50%',
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default CollectionCard;
