import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CollectionCard = ({ collection, onPress, onDelete, previewOnly }) => {
  const [expanded, setExpanded] = useState(false);

  if (!collection?.activities) return null; // Prevent errors if no activities

  // Get up to 4 activity images for the preview
  const previewImages = collection.activities.slice(0, 4).map(activity => activity.photoReference);

  // Function to share the collection
  const handleShare = async () => {
    try {
      const message = `Check out this collection: "${collection.title}"!\n\n${
        collection.description || 'No description provided.'
      }\n\nIncludes activities like: ${collection.activities
        .map(activity => activity.name)
        .slice(0, 3)
        .join(', ')}...`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing collection:', error);
    }
  };

  // Render the preview-only (compact) card if previewOnly is true
  if (previewOnly) {
    return (
      <View style={styles.card}>
        {onDelete && (
          <TouchableOpacity
            style={styles.removeIconContainer}
            onPress={() => onDelete(collection)}
          >
            <Ionicons name="close" size={16} color="#FF0000" />
          </TouchableOpacity>
        )}
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
          {Array.from({ length: 4 - previewImages.length }).map((_, index) => (
            <View key={index + previewImages.length} style={[styles.image, styles.emptyImage]} />
          ))}
        </View>
        <Text style={styles.title}>{collection.title}</Text>
      </View>
    );
  }

  // Render the full tappable and expandable version
  return (
    !expanded ? (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setExpanded(true);
          onPress && onPress(collection);
        }}
      >
        {onDelete && (
          <TouchableOpacity
            style={styles.removeIconContainer}
            onPress={() => onDelete(collection)}
          >
            <Ionicons name="close" size={16} color="#FF0000" />
          </TouchableOpacity>
        )}
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
          {Array.from({ length: 4 - previewImages.length }).map((_, index) => (
            <View key={index + previewImages.length} style={[styles.image, styles.emptyImage]} />
          ))}
        </View>
        <Text style={styles.title}>{collection.title}</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.expandedView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setExpanded(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.expandedTitle}>{collection.title}</Text>
        </View>
        {collection.description ? (
          <Text style={styles.description}>{collection.description}</Text>
        ) : (
          <Text style={styles.description}>No description available.</Text>
        )}
        <View style={styles.activityList}>
          {collection.activities.length > 0 ? (
            collection.activities.map((activity, index) => (
              <Text key={index} style={styles.activityItem}>
                {activity.name}
              </Text>
            ))
          ) : (
            <Text style={styles.noActivitiesText}>No activities in this collection.</Text>
          )}
        </View>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%', // Allows 2 cards per row when used in a grid
    aspectRatio: 1,
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
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
  removeIconContainer: {
    position: 'absolute',
    top: 5,
    left: 5,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
  },
  expandedView: {
    width: '100%',
    backgroundColor: '#1B1F24',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  backButton: {
    marginRight: 10,
  },
  expandedTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  activityList: {
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  activityItem: {
    color: '#FFFFFF',
    fontSize: 16,
    marginVertical: 4,
  },
  noActivitiesText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 10,
  },
});

export default CollectionCard;
