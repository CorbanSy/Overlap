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
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

type CategoryItem = {
  label: string;
  image: any; // local require(...) or { uri: string }
  description: string;
  keyword: string;
};

type ExploreMoreCardProps = {
  onCategoryPress?: (keyword: string) => void;
};

export default function ExploreMoreCard({ onCategoryPress }: ExploreMoreCardProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const cardHeight = height * 0.8;

  const exploreMoreItems: CategoryItem[] = [
    { label: 'Outdoors', image: require('../../assets/categoryImg/outdoors.jpg'), description: 'Parks, hiking trails, etc.', keyword: 'park' },
    { label: 'Shopping', image: require('../../assets/categoryImg/shopping.jpg'), description: 'Malls, outlets, local shops', keyword: 'shopping_mall' },
    { label: 'Fitness', image: require('../../assets/categoryImg/fitness.jpg'), description: 'Gyms, yoga studios, etc.', keyword: 'gym' },
    { label: 'Travel', image: require('../../assets/categoryImg/travel.jpg'), description: 'Hotels, tourist spots, etc.', keyword: 'lodging' },
  ];

  const handlePress = (item: CategoryItem) => {
    logEvent('explore_category_selected', { category: item.label });
    onCategoryPress?.(item.keyword);
  };

  const handleNarrowDown = () => {
    logEvent('explore_more_narrow', {});
  };

  const handleExploreOther = () => {
    logEvent('explore_more_other', {});
  };

  return (
    <View style={[styles.container, { height: cardHeight, paddingBottom: insets.bottom + 20 }]}>
      <Text style={styles.title}>Explore More</Text>
      <Text style={styles.subtitle}>
        Customize your feed by narrowing your search or exploring other categories.
      </Text>

      <View style={styles.section}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          {exploreMoreItems.map((item, index) => (
            <TouchableOpacity key={`explore-${index}`} style={styles.bigImageTile} onPress={() => handlePress(item)}>
              <Image source={item.image} style={styles.tileImage} />
              <View style={styles.overlay}>
                <Text style={styles.overlayLabel}>{item.label}</Text>
                <Text style={styles.overlayDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add "Narrow Down" and "Explore Other" buttons from `main` */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleNarrowDown}>
          <Text style={styles.buttonText}>Narrow Down</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleExploreOther}>
          <Text style={styles.buttonText}>Explore Other</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#1B1F24', borderRadius: 10, marginHorizontal: 16, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#ccc', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  section: { marginVertical: 10, width: '100%' },
  scrollContainer: { flexDirection: 'row', paddingLeft: 10, paddingRight: 10 },
  bigImageTile: { width: 160, height: 200, borderRadius: 12, marginRight: 12, overflow: 'hidden', position: 'relative' },
  tileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 6 },
  overlayLabel: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  overlayDescription: { color: '#ccc', fontSize: 12, marginTop: 2 },
  buttonRow: { flexDirection: 'row', marginTop: 20 },
  button: { backgroundColor: '#F5A623', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
