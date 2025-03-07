// ExploreMoreCard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

// New unified function from storage.js
import { getProfileData } from '../utils/storage';

// Broad categories for "Expand Your Search"
const EXPAND_CATEGORIES = [
  'Dining', 'Outdoors', 'Nightlife', 'Movies', 'Fitness', 'Gaming',
  'Social', 'Music', 'Shopping', 'Travel', 'Art', 'Relaxing',
  'Learning', 'Cooking',
];

type Props = {
  style?: any;
  onCategoryPress?: (keyword: string) => void;
};

const ExploreMoreCard: React.FC<Props> = ({ style, onCategoryPress }) => {
  const [topKeywords, setTopKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  async function loadProfileData() {
    try {
      setLoading(true);
      const profile = await getProfileData();
      if (!profile) {
        // doc doesn't exist => no categories => no dynamic keywords
        setTopKeywords([]);
      } else {
        const keywordsMap = profile.keywords || {};     // from Cloud Function
        const defaults = profile.topCategories || [];   // from your signup flow

        // If user has no dynamic keywords, fallback to topCategories
        if (Object.keys(keywordsMap).length === 0) {
          setTopKeywords(defaults);
        } else {
          // Convert keywords map => sorted array => take top 10
          const sorted = Object.keys(keywordsMap).sort(
            (a, b) => keywordsMap[b] - keywordsMap[a]
          );
          setTopKeywords(sorted.slice(0, 10));
        }
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setTopKeywords([]);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryPress(keyword: string) {
    onCategoryPress?.(keyword);
  }

  return (
    <View style={[styles.container, style]}>
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
          contentContainerStyle={styles.optionsContainer}
        >
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : topKeywords.length === 0 ? (
            <Text style={styles.noKeywordsText}>
              No preferences found
            </Text>
          ) : (
            topKeywords.map((kw, index) => (
              <TouchableOpacity
                key={`narrow-${index}-${kw}`}
                style={styles.optionButton}
                onPress={() => handleCategoryPress(kw)}
              >
                <Text style={styles.optionText}>{kw}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Expand Your Search */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expand Your Search</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionsContainer}
        >
          {EXPAND_CATEGORIES.map((cat, index) => (
            <TouchableOpacity
              key={`expand-${index}-${cat}`}
              style={styles.optionButton}
              onPress={() => handleCategoryPress(cat)}
            >
              <Text style={styles.optionText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  optionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  optionButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginRight: 10,
  },
  optionText: {
    color: '#0D1117',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 4,
  },
  noKeywordsText: {
    color: '#aaa',
    fontSize: 14,
    marginLeft: 4,
  },
});

