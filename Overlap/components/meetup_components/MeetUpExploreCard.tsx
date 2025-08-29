// components/MeetupExploreCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MeetupExploreCardProps {
  currentCategory: string;
  meetupId: string;
  onCategoryChange: (newCategory: string) => void;
  onClose: () => void;
}

// Available meetup categories that match your category mapping
const MEETUP_CATEGORIES = [
  { key: 'Dining', icon: 'restaurant', description: 'Restaurants, cafes, bars' },
  { key: 'Fitness', icon: 'fitness', description: 'Gyms, parks, sports' },
  { key: 'Outdoors', icon: 'leaf', description: 'Parks, attractions, nature' },
  { key: 'Movies', icon: 'film', description: 'Theaters, cinema' },
  { key: 'Gaming', icon: 'game-controller', description: 'Bowling, casinos, arcades' },
  { key: 'Social', icon: 'people', description: 'Bars, cafes, social spots' },
  { key: 'Music', icon: 'musical-notes', description: 'Venues, bars, clubs' },
  { key: 'Shopping', icon: 'storefront', description: 'Malls, stores' },
  { key: 'Travel', icon: 'airplane', description: 'Hotels, attractions, museums' },
  { key: 'Art', icon: 'color-palette', description: 'Galleries, museums' },
  { key: 'Relaxing', icon: 'flower', description: 'Spas, parks, cafes' },
  { key: 'Learning', icon: 'library', description: 'Libraries, museums, schools' },
  { key: 'Cooking', icon: 'restaurant', description: 'Restaurants, cooking classes' },
  { key: 'Nightlife', icon: 'wine', description: 'Clubs, bars, nightlife' },
];

const MeetupExploreCard: React.FC<MeetupExploreCardProps> = ({
  currentCategory,
  meetupId,
  onCategoryChange,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [isChanging, setIsChanging] = useState(false);

  const handleCategorySelect = async (categoryKey: string) => {
    if (categoryKey === currentCategory) {
      onClose();
      return;
    }

    Alert.alert(
      'Change Activity Category?',
      `Switch from "${currentCategory}" to "${categoryKey}"? This will reload activities for the new category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'default',
          onPress: async () => {
            try {
              setIsChanging(true);
              setSelectedCategory(categoryKey);
              await onCategoryChange(categoryKey);
              onClose();
            } catch (error) {
              console.error('Error changing category:', error);
              Alert.alert('Error', 'Failed to change category. Please try again.');
            } finally {
              setIsChanging(false);
            }
          },
        },
      ]
    );
  };

  const renderCategoryCard = (category: typeof MEETUP_CATEGORIES[0]) => {
    const isCurrentCategory = category.key === currentCategory;
    const isSelected = category.key === selectedCategory;

    return (
      <TouchableOpacity
        key={category.key}
        style={[
          styles.categoryCard,
          isCurrentCategory && styles.currentCategoryCard,
          isSelected && styles.selectedCategoryCard,
        ]}
        onPress={() => handleCategorySelect(category.key)}
        disabled={isChanging}
        activeOpacity={0.8}
      >
        <View style={styles.categoryHeader}>
          <View style={[styles.iconContainer, isCurrentCategory && styles.currentIconContainer]}>
            <Ionicons 
              name={category.icon as any} 
              size={20} 
              color={isCurrentCategory ? '#F5A623' : '#AAAAAA'} 
            />
          </View>
          {isCurrentCategory && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.categoryTitle, isCurrentCategory && styles.currentCategoryTitle]}>
          {category.key}
        </Text>
        
        <Text style={styles.categoryDescription}>
          {category.description}
        </Text>
        
        {isCurrentCategory ? (
          <View style={styles.currentIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#F5A623" />
            <Text style={styles.currentText}>Active</Text>
          </View>
        ) : (
          <View style={styles.changeIndicator}>
            <Text style={styles.changeText}>Tap to switch</Text>
            <Ionicons name="arrow-forward" size={14} color="#666" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="options" size={24} color="#F5A623" />
          <Text style={styles.title}>Change Activity Type</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#AAAAAA" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Currently showing "{currentCategory}" activities. Choose a different category to explore new options.
      </Text>

      {/* Categories Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.categoriesGrid}>
          {MEETUP_CATEGORIES.map(renderCategoryCard)}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#F5A623" />
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <Text style={styles.infoText}>
            • Changing categories will reload activities from the places database
          </Text>
          <Text style={styles.infoText}>
            • Your previous swipes will be preserved
          </Text>
          <Text style={styles.infoText}>
            • Activities are filtered by location and your budget preferences
          </Text>
        </View>
      </ScrollView>

      {isChanging && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <Text style={styles.loadingText}>Loading new activities...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B1F24',
    borderRadius: 16,
    maxHeight: '85%',
    marginHorizontal: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#2A2E35',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2E35',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#0D1117',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2E35',
    minHeight: 120,
  },
  currentCategoryCard: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
  },
  selectedCategoryCard: {
    borderColor: '#666',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2E35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentIconContainer: {
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
  },
  currentBadge: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  currentCategoryTitle: {
    color: '#F5A623',
  },
  categoryDescription: {
    color: '#888',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  currentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  currentText: {
    color: '#F5A623',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  changeText: {
    color: '#666',
    fontSize: 12,
  },
  infoSection: {
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2E35',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    color: '#AAAAAA',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  loadingContent: {
    backgroundColor: '#1B1F24',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2E35',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MeetupExploreCard;