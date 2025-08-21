// components/meetup_components/SizeAndBudgetCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

// Professional color palette matching home.tsx
const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
  border: '#333333',
  white: '#FFFFFF',
};

interface SizeAndBudgetCardProps {
  groupSize: number;
  setGroupSize: (size: number) => void;
  priceRange: number;
  setPriceRange: (range: number) => void;
}

const SizeAndBudgetCard: React.FC<SizeAndBudgetCardProps> = ({
  groupSize,
  setGroupSize,
  priceRange,
  setPriceRange,
}) => {
  const formatPriceRange = (value: number) => {
    if (value === 0) return 'Free';
    if (value <= 25) return '$';
    if (value <= 50) return '$$';
    if (value <= 75) return '$$$';
    return '$$$$';
  };

  const incrementGroupSize = () => {
    setGroupSize(groupSize + 1);
  };

  const decrementGroupSize = () => {
    setGroupSize(Math.max(1, groupSize - 1));
  };

  return (
    <View style={styles.container}>
      {/* Group Size Card */}
      <View style={[styles.card, styles.halfCard]}>
        <Text style={styles.sectionTitle}>Group Size *</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={decrementGroupSize}
            disabled={groupSize <= 1}
          >
            <Ionicons 
              name="remove" 
              size={20} 
              color={groupSize <= 1 ? Colors.textMuted : Colors.text} 
            />
          </TouchableOpacity>
          <Text style={styles.counterValue}>{groupSize}</Text>
          <TouchableOpacity 
            style={styles.counterButton} 
            onPress={incrementGroupSize}
          >
            <Ionicons name="add" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.counterLabel}>
          {groupSize === 1 ? 'person' : 'people'}
        </Text>
      </View>

      {/* Budget Card */}
      <View style={[styles.card, styles.halfCard]}>
        <Text style={styles.sectionTitle}>Budget</Text>
        <Text style={styles.budgetLabel}>{formatPriceRange(priceRange)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          step={5}
          value={priceRange}
          onValueChange={setPriceRange}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.surfaceLight}
          thumbTintColor={Colors.primary}
        />
        <View style={styles.budgetLabels}>
          <Text style={styles.budgetSubLabel}>Free</Text>
          <Text style={styles.budgetSubLabel}>$$$$</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  halfCard: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  
  // Counter styles
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  counterLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  
  // Budget styles
  budgetLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 12,
    minHeight: 30,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  budgetLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetSubLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});

export default SizeAndBudgetCard;