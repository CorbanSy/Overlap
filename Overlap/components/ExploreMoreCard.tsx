// ExploreMoreCard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { PLACE_CATEGORIES } from '../app/utils/placeCategories';

type Props = {
  style?: any;
  onSubCategoryPress?: (subKey: string) => void;
  onBroadCategoryPress?: (catKey: string) => void;
  // New props:
  currentSubCategories: { key: string; label: string }[];
  otherBroadCategories: { key: string; label: string; image?: any }[];
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ExploreMoreCard: React.FC<Props> = ({
  style,
  onSubCategoryPress,
  onBroadCategoryPress,
  currentSubCategories,
  otherBroadCategories,
}) => {
  const [expandedCategoryKey, setExpandedCategoryKey] = useState<string | null>(null);

  function handleExpandToggle(catKey: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategoryKey((prev) => (prev === catKey ? null : catKey));
  }

  // Render narrow down (subcategories) for the current category
  const renderNarrowDown = () => {
    if (currentSubCategories.length === 0) {
      return <Text style={styles.loadingText}>No subcategories defined</Text>;
    }
    return currentSubCategories.map((sub) => (
      <TouchableOpacity
        key={sub.key}
        style={styles.subCategoryButton}
        onPress={() => onSubCategoryPress?.(sub.label)}
      >
        <Text style={styles.subCategoryButtonText}>{sub.label}</Text>
      </TouchableOpacity>
    ));
  };

  // Render expand section: all other broad categories
  const renderExpand = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {otherBroadCategories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={styles.categoryCard}
            onPress={() => onBroadCategoryPress?.(cat.key)}
          >
            <ImageBackground
              source={cat.image}
              style={styles.categoryImage}
              imageStyle={{ borderRadius: 8 }}
            >
              <View style={styles.categoryOverlay}>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Explore More</Text>
      <Text style={styles.subtitle}>
        Narrow down your search with subcategories or switch to a different category.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Narrow Down</Text>
        {renderNarrowDown()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expand Your Search</Text>
        {renderExpand()}
      </View>
    </View>
  );
};

export default ExploreMoreCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B1F24',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subCategoryButton: {
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
    marginRight: 6,
  },
  subCategoryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  categoryCard: {
    width: 140,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#333',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  categoryOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  categoryLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#ccc',
  },
});
