// ExploreMoreCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logEvent } from '../utils/analytics';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const ExploreMoreCard = () => {
  const handleNarrowDown = () => {
    logEvent('explore_more_narrow', {});
    // Navigate to filter page or update filter state here.
  };

  const handleExploreOther = () => {
    logEvent('explore_more_other', {});
    // Update query parameters to show other categories here.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore More</Text>
      <Text style={styles.subtitle}>
        Not finding what you like? Try narrowing your search or exploring other categories.
      </Text>
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
};

export default ExploreMoreCard;

const styles = StyleSheet.create({
  container: {
    width: width, // Make sure the card uses the full screen width
    height: height,
    backgroundColor: '#1B1F24',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  buttonRow: {
    flexDirection: 'row',
  },
  button: {
    backgroundColor: '#F5A623',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});