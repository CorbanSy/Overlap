// ExploreMoreCard.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logEvent } from '../utils/analytics';

type CategoryItem = {
  label: string;
  image: any; // local require(...) or { uri: string }
  description: string;
  keyword: string;
};

type ExploreMoreCardProps = {
  // We'll pass this down from HomeScreen so it can call fetchPlacesByKeyword
  onCategoryPress?: (keyword: string) => void;
};

export default function ExploreMoreCard({ onCategoryPress }: ExploreMoreCardProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // ~80% of screen so it looks big
  const cardHeight = height * 0.8;

  // Example data
  const narrowDownItems: CategoryItem[] = [
    {
      label: 'Dining',
      image: require('../../assets/categoryImg/dining.jpg'),
      description: 'Find local restaurants, cafes, etc.',
      keyword: 'restaurant',
    },
    {
      label: 'Movies',
      image: require('../../assets/categoryImg/movies.jpg'),
      description: 'Discover theaters near you',
      keyword: 'movie_theater',
    },
    {
      label: 'Nightlife',
      image: require('../../assets/categoryImg/nightlife.jpg'),
      description: 'Bars, clubs, and more',
      keyword: 'night_club',
    },
    {
      label: 'Art',
      image: require('../../assets/categoryImg/art.jpg'),
      description: 'Museums and galleries',
      keyword: 'art_gallery',
    },
  ];

  const exploreMoreItems: CategoryItem[] = [
    {
      label: 'Outdoors',
      image: require('../../assets/categoryImg/outdoors.jpg'),
      description: 'Parks, hiking trails, etc.',
      keyword: 'park',
    },
    {
      label: 'Shopping',
      image: require('../../assets/categoryImg/shopping.jpg'),
      description: 'Malls, outlets, local shops',
      keyword: 'shopping_mall',
    },
    {
      label: 'Fitness',
      image: require('../../assets/categoryImg/fitness.jpg'),
      description: 'Gyms, yoga studios, etc.',
      keyword: 'gym',
    },
    {
      label: 'Travel',
      image: require('../../assets/categoryImg/travel.jpg'),
      description: 'Hotels, tourist spots, etc.',
      keyword: 'lodging',
    },
  ];

  const handlePress = (item: CategoryItem) => {
    // optional analytics
    logEvent('explore_category_selected', { category: item.label });
    // call parent's function to fetch new results
    onCategoryPress?.(item.keyword);
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: cardHeight,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <Text style={styles.title}>Explore More</Text>
      <Text style={styles.subtitle}>
        Customize your feed by narrowing your search or exploring other categories.
      </Text>

      {/* Narrow Down */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Narrow Down</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {narrowDownItems.map((item, index) => (
            <TouchableOpacity
              key={`narrow-${index}`}
              style={styles.bigImageTile}
              onPress={() => handlePress(item)}
            >
              <Image source={item.image} style={styles.tileImage} />
              <View style={styles.overlay}>
                <Text style={styles.overlayLabel}>{item.label}</Text>
                <Text style={styles.overlayDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Explore More */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explore More</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {exploreMoreItems.map((item, index) => (
            <TouchableOpacity
              key={`explore-${index}`}
              style={styles.bigImageTile}
              onPress={() => handlePress(item)}
            >
              <Image source={item.image} style={styles.tileImage} />
              <View style={styles.overlay}>
                <Text style={styles.overlayLabel}>{item.label}</Text>
                <Text style={styles.overlayDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const TILE_WIDTH = 160;
const TILE_HEIGHT = 200;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B1F24',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  section: {
    marginVertical: 10,
    width: '100%',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 10,
  },
  scrollContainer: {
    flexDirection: 'row',
    paddingLeft: 10,
    paddingRight: 10,
  },

  // Big tile approach
  bigImageTile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative', // for overlay
  },
  tileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  overlayLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  overlayDescription: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
});
