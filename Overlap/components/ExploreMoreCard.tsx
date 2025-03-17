import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { getProfileData } from '../app/utils/storage';

const EXPAND_CATEGORIES = [
  'Dining', 'Outdoors', 'Nightlife', 'Movies', 'Fitness', 'Gaming',
  'Social', 'Music', 'Shopping', 'Travel', 'Art', 'Relaxing',
  'Learning', 'Cooking',
];

// We remove punctuation from dynamic keywords (like "." or ",").
function cleanKeyword(kw: string) {
  // remove any punctuation except letters/numbers/spaces
  return kw.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
}

// Additional blocked words
const BLOCKED_WORDS = new Set([
  'covid', 'trash', 'awful', 'terrible', 
  'bad', 'unfriendly', '2 ladies', 'mr', 'ms', '',
  // ... add more as needed
]);

type Props = {
  style?: any;
  onCategoryPress?: (keyword: string) => void;
};

const ExploreMoreCard: React.FC<Props> = ({ style, onCategoryPress }) => {
  const [loading, setLoading] = useState(true);
  const [combinedKeywords, setCombinedKeywords] = useState<string[]>([]);

  useEffect(() => {
    loadProfileData();
  }, []);

  async function loadProfileData() {
    setLoading(true);
    try {
      const profile = await getProfileData();
      if (!profile) {
        setCombinedKeywords([]);
      } else {
        const defaults = profile.topCategories || [];
        const keywordsMap = profile.keywords || {};

        // Filter dynamic keywords:
        // 1) remove punctuation
        // 2) remove blocked words
        // 3) ensure it was used >1 time to avoid single weird hits
        const dynamic = Object.keys(keywordsMap).map(k => cleanKeyword(k));
        const filteredDynamic = dynamic.filter((kw) => {
          if (!kw || BLOCKED_WORDS.has(kw.toLowerCase())) return false;
          // check frequency
          if (keywordsMap[kw] < 2) return false;
          return true;
        });

        // Merge approach – for example, keep the user’s default categories plus some dynamic ones
        // If the user has <5 total likes, we rely more on defaults, else we show more dynamic ones
        const userLikeCount = Object.values(keywordsMap).reduce((sum, val) => sum + (val as number), 0);

        let finalKeywords: string[] = [];
        if (userLikeCount < 5) {
          finalKeywords = [...defaults, ...filteredDynamic.slice(0, 2)];
        } else {
          finalKeywords = [...defaults.slice(0, 3), ...filteredDynamic.slice(0, 5)];
        }

        // remove duplicates & remove any empty
        const unique = Array.from(new Set(finalKeywords)).filter(Boolean);
        setCombinedKeywords(unique);
      }
    } catch (error) {
      console.error('Failed to load profile data in ExploreMore:', error);
      setCombinedKeywords([]);
    } finally {
      setLoading(false);
    }
  }

  function handlePress(kw: string) {
    onCategoryPress?.(kw);
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
          ) : combinedKeywords.length === 0 ? (
            <Text style={styles.noKeywordsText}>No suggestions found</Text>
          ) : (
            combinedKeywords.map((kw, i) => (
              <TouchableOpacity
                key={`narrow-${i}-${kw}`}
                style={styles.optionButton}
                onPress={() => handlePress(kw)}
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
          {EXPAND_CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={`expand-${i}-${cat}`}
              style={styles.optionButton}
              onPress={() => handlePress(cat)}
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
