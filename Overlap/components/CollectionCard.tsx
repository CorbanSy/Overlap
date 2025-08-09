// components/CollectionCard.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Activity {
  id: string;
  name: string;
  photos?: { photoUri: string }[];
  photoUrls?: string[];
}

interface Collection {
  id: string;
  title: string;
  description?: string;
  activities: Activity[];
}

interface CollectionCardProps {
  collection: Collection;
  onPress?: (col: Collection) => void;
  onDelete?: (col: Collection) => void;
  previewOnly?: boolean;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onPress,
  onDelete,
  previewOnly,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!collection.activities) return null;

  // Helper: pick up to 4 image URIs from your activities
  const previewImages = collection.activities.slice(0, 4).map((activity) => {
    return (
      activity.photoUrls?.[0] ||
      activity.photos?.[0]?.photoUri ||
      null
    );
  });

  // ---------- PREVIEW-ONLY RENDER ----------
  if (previewOnly) {
    // Empty-collection case
    if (collection.activities.length === 0) {
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
          <Text style={styles.emptyMessage}>
            No activities in this collection.
          </Text>
        </View>
      );
    }

    // Grid of up to 4 photos
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
          {previewImages.map((uri, idx) =>
            uri ? (
              <Image
                key={idx}
                source={{ uri }}
                style={styles.image}
              />
            ) : (
              <View key={idx} style={[styles.image, styles.emptyImage]} />
            )
          )}
          {Array.from({ length: 4 - previewImages.length }).map((_, idx) => (
            <View
              key={`empty-${idx}`}
              style={[styles.image, styles.emptyImage]}
            />
          ))}
        </View>
        <Text style={styles.title}>{collection.title}</Text>
      </View>
    );
  }

  // ---------- FULL, EXPANDABLE RENDER ----------
  if (!expanded) {
    return (
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
          {previewImages.map((uri, idx) =>
            uri ? (
              <Image
                key={idx}
                source={{ uri }}
                style={styles.image}
              />
            ) : (
              <View key={idx} style={[styles.image, styles.emptyImage]} />
            )
          )}
          {Array.from({ length: 4 - previewImages.length }).map((_, idx) => (
            <View
              key={`empty-${idx}`}
              style={[styles.image, styles.emptyImage]}
            />
          ))}
        </View>
        <Text style={styles.title}>{collection.title}</Text>
      </TouchableOpacity>
    );
  }

  // ---------- EXPANDED VIEW ----------
  return (
    <View style={styles.expandedView}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setExpanded(false)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.expandedTitle}>{collection.title}</Text>
      </View>
      <Text style={styles.description}>
        {collection.description || 'No description available.'}
      </Text>
      <View style={styles.activityList}>
        {collection.activities.length > 0 ? (
          collection.activities.map((activity) => (
            <Text key={activity.id} style={styles.activityItem}>
              {activity.name}
            </Text>
          ))
        ) : (
          <Text style={styles.noActivitiesText}>
            No activities in this collection.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',       // Two cards per row
    aspectRatio: 1,     // Square
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    position: 'relative',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIconContainer: {
    position: 'absolute',
    top: 5,
    left: 5,
    zIndex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 2,
  },
  imageGrid: {
    width: '100%',
    height: '75%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  image: {
    width: '50%',
    height: '50%',
  },
  emptyImage: {
    backgroundColor: '#333',
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  expandedView: {
    width: '100%',
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    padding: 16,
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
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  activityList: {
    width: '100%',
    alignItems: 'center',
  },
  activityItem: {
    color: '#FFF',
    fontSize: 16,
    marginVertical: 4,
  },
  noActivitiesText: {
    color: '#888',
    fontSize: 14,
    marginTop: 10,
  },
});

export default CollectionCard;
