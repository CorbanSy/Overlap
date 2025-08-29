// components/ExploreMoreCard.tsx
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SubCategory {
  key: string;
  label: string;
}

interface BroadCategory {
  key: string;
  label: string;
  image?: any;
  description?: string;
}

interface ExploreMoreCardProps {
  style?: any;
  onSubCategoryPress?: (subKey: string) => void;
  onBroadCategoryPress?: (catKey: string) => void;
  currentSubCategories: SubCategory[];
  otherBroadCategories: BroadCategory[];
  currentCategoryLabel?: string;
}

const ExploreMoreCard: React.FC<ExploreMoreCardProps> = ({
  style,
  onSubCategoryPress,
  onBroadCategoryPress,
  currentSubCategories,
  otherBroadCategories,
  currentCategoryLabel,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = Math.min(150, (screenWidth - 64) / 2.5);

  // Memoize subcategories for better performance
  const renderSubCategories = useMemo(() => {
    if (currentSubCategories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="options-outline" size={24} color="#666" />
          <Text style={styles.emptyStateText}>
            No subcategories available for this category
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.subCategoriesGrid}>
        {currentSubCategories.map((sub) => (
          <TouchableOpacity
            key={sub.key}
            style={styles.subCategoryButton}
            onPress={() => onSubCategoryPress?.(sub.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.subCategoryButtonText}>{sub.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [currentSubCategories, onSubCategoryPress]);

  // Memoize category card renderer
  const renderCategoryCard = useCallback((category: BroadCategory) => (
    <TouchableOpacity
      key={category.key}
      style={[styles.categoryCard, { width: cardWidth }]}
      onPress={() => onBroadCategoryPress?.(category.key)}
      activeOpacity={0.8}
    >
      {category.image ? (
        <ImageBackground
          source={category.image}
          style={styles.categoryImage}
          imageStyle={styles.categoryImageStyle}
          resizeMode="cover"
        >
          <View style={styles.categoryOverlay}>
            <Text style={styles.categoryLabel} numberOfLines={2}>
              {category.label}
            </Text>
            {category.description && (
              <Text style={styles.categoryDescription} numberOfLines={1}>
                {category.description}
              </Text>
            )}
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.categoryImage, styles.categoryImageFallback]}>
          <Ionicons name="location-outline" size={32} color="#666" />
          <View style={styles.categoryOverlay}>
            <Text style={styles.categoryLabel} numberOfLines={2}>
              {category.label}
            </Text>
            {category.description && (
              <Text style={styles.categoryDescription} numberOfLines={1}>
                {category.description}
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  ), [cardWidth, onBroadCategoryPress]);

  const renderBroadCategories = useMemo(() => {
    if (otherBroadCategories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="grid-outline" size={24} color="#666" />
          <Text style={styles.emptyStateText}>
            No other categories available
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        decelerationRate="fast"
        snapToInterval={cardWidth + 12}
        snapToAlignment="start"
      >
        {otherBroadCategories.map(renderCategoryCard)}
      </ScrollView>
    );
  }, [otherBroadCategories, renderCategoryCard, cardWidth]);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="compass" size={24} color="#F5A623" />
          <Text style={styles.title}>Explore More</Text>
        </View>
        <Text style={styles.subtitle}>
          Refine your search or discover new categories
        </Text>
      </View>

      {/* Narrow Down Section */}
      {currentSubCategories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="filter" size={18} color="#F5A623" />
            <Text style={styles.sectionTitle}>
              Refine {currentCategoryLabel ? `"${currentCategoryLabel}"` : 'Search'}
            </Text>
          </View>
          {renderSubCategories}
        </View>
      )}

      {/* Expand Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="grid" size={18} color="#F5A623" />
          <Text style={styles.sectionTitle}>Browse Categories</Text>
        </View>
        {renderBroadCategories}
      </View>
    </View>
  );
};

export default ExploreMoreCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B1F24',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2E35',
  },
  header: {
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  subCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subCategoryButton: {
    backgroundColor: '#2A2E35',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A3E45',
    marginBottom: 4,
  },
  subCategoryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingHorizontal: 4,
    paddingRight: 16,
  },
  categoryCard: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#2A2E35',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  categoryImageStyle: {
    borderRadius: 12,
  },
  categoryImageFallback: {
    backgroundColor: '#2A2E35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  categoryLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  categoryDescription: {
    color: '#CCCCCC',
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});