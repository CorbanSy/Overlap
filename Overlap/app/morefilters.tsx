// morefilters.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useFilters } from '../context/FiltersContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const ALL_CATEGORIES = [   'dining', 'fitness', 'outdoors', 'movies', 'gaming', 'social',
  'music', 'shopping', 'travel', 'art', 'learning', 'relaxing',
  'cooking', 'nightlife', ];

export default function MoreFiltersScreen() {
  const router = useRouter();
  const { filterState, setFilterState } = useFilters();

  // local state is initialized from filterState
  const [distance, setDistance] = useState(filterState.distance);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(filterState.categories);

  function handleToggleCategory(category: string) {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    } else {
      setSelectedCategories(prev => [...prev, category]);
    }
  }

  function handleApply() {
    // Merge local changes into the global store
    setFilterState(prev => ({
      ...prev,
      distance,
      categories: selectedCategories,
    }));
    // Go back 
    router.back();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>More Filters</Text>

        <Text style={styles.sectionLabel}>Distance (meters)</Text>
        <View style={{ alignItems: 'stretch', paddingHorizontal: 10 }}>
          <Slider
            minimumValue={1000}
            maximumValue={30000}
            step={1000}
            value={distance}
            onValueChange={setDistance}
            minimumTrackTintColor="#F5A623"
            maximumTrackTintColor="#999"
            thumbTintColor="#F5A623"
          />
          <Text style={{ color: '#fff', marginTop: 5 }}>Selected: {distance} meters</Text>
        </View>

        {/* Categories */}
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.categoryContainer}>
          {ALL_CATEGORIES.map(cat => {
            const isActive = selectedCategories.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => handleToggleCategory(cat)}
              >
                <Text style={styles.categoryText}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Apply Button */}
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    paddingTop: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipActive: {
    backgroundColor: '#F5A623',
  },
  categoryText: {
    color: '#0D1117',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  applyButton: {
    backgroundColor: '#F5A623',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#0D1117',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
