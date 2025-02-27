import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CollectionCard = ({ collection, onPress, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

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
      {/* Collection Card */}
      {!expanded ? (
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            setExpanded(true);
            onPress(collection);
          }}
        >
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

          {/* Dropdown Menu Button */}
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => setIsMenuVisible(!isMenuVisible)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      ) : (
        /* Expanded View - List of Activities */
        <View style={styles.expandedView}>
          {/* Back Button & Title */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setExpanded(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.expandedTitle}>{collection.title}</Text>
          </View>

          {/* Collection Description */}
          {collection.description ? (
            <Text style={styles.description}>{collection.description}</Text>
          ) : (
            <Text style={styles.description}>No description available.</Text>
          )}

          {/* Placeholder for Activity List (Replace with actual activity rendering) */}
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
      )}

      {/* Dropdown Menu (Appears when menu button is clicked) */}
      {isMenuVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity style={styles.dropdownItem} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            <Text style={styles.dropdownText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={() => onDelete(collection.id)}>
            <Ionicons name="trash-outline" size={18} color="#FF5555" />
            <Text style={[styles.dropdownText, { color: '#FF5555' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
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
  menuButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    right: 10,
    top: 35,
    backgroundColor: '#1B1F24',
    borderRadius: 6,
    paddingVertical: 6,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 6,
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
