// components/ActivityCard.tsx

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface ActivityCardProps {
  item: {
    id: string;
    name: string;
    rating?: number;
    photos?: { photoUri: string }[];    // from HomeScreen / storage
    photoUrls?: string[];               // from fetchPlacePhotos
  };
  onRemoveFromCollection?: (id: string) => void;
  onRemoveFromLiked?: (id: string) => void;
  onAddToCollection?: (item: any) => void;
  isInCollection?: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  item,
  onRemoveFromCollection,
  onRemoveFromLiked,
  onAddToCollection,
  isInCollection,
}) => {
  const router = useRouter();

  // Pick the first available image URI
  const imageUri =
    item.photoUrls?.[0] ||
    item.photos?.[0]?.photoUri ||
    null;

  // Share Activity
  const handleShare = async () => {
    try {
      const message = `Check out this activity: ${item.name}${
        item.rating ? `\nRating: ${item.rating} ⭐` : ''
      }\nMore details in the app!`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing activity:', error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/moreInfo?placeId=${item.id}`)}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.noImage}>
          <Text style={styles.noImageText}>No Photo</Text>
        </View>
      )}

      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.buttonRow}>
          {(onRemoveFromLiked || onRemoveFromCollection) && (
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                isInCollection
                  ? onRemoveFromCollection?.(item.id)
                  : onRemoveFromLiked?.(item.id)
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
              onPress={() => onAddToCollection(item)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#4DA6FF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {item.rating != null && (
        <Text style={styles.subtitle}>{item.rating.toFixed(1)} ⭐</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 150,
  },
  noImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#ccc',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  subtitle: {
    color: '#AAA',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginLeft: 10,
    padding: 6,
  },
});

export default ActivityCard;
