// components/meetup_components/SizeAndBudgetCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Professional color palette
const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
  border: '#333333',
  success: '#10B981',
  error: '#F44336',
};

interface SizeAndBudgetCardProps {
  groupSize: number;
  setGroupSize: (size: number) => void;
  priceRange: number;
  setPriceRange: (range: number) => void;
}

const TurboModeInfo = ({ groupSize }: { groupSize: number }) => {
  const getMinSwipesForGroupSize = (size: number) => {
    if (size <= 4) return 8;
    if (size <= 6) return 10;
    return 12;
  };

  const minSwipes = getMinSwipesForGroupSize(groupSize);

  return (
    <View style={styles.turboInfo}>
      <View style={styles.turboHeader}>
        <Ionicons name="flash" size={16} color={Colors.primary} />
        <Text style={styles.turboTitle}>Turbo Sprint:</Text>
      </View>
      <Text style={styles.turboDetails}>
        2:00 • Min swipes: {minSwipes} • Deathmatch after benchmark
      </Text>
    </View>
  );
};

const SizeAndBudgetCard: React.FC<SizeAndBudgetCardProps> = ({
  groupSize,
  setGroupSize,
  priceRange,
  setPriceRange,
}) => {
  const priceLabels = ['Free', '$', '$$', '$$$', '$$$$'];
  
  const getPriceBuckets = (range: number) => {
    return Math.max(1, Math.min(4, Math.ceil(range / 25)));
  };

  const getPriceLabel = (range: number) => {
    if (range <= 0) return 'Free';
    const buckets = getPriceBuckets(range);
    return '$'.repeat(buckets);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Size & Budget</Text>
      
      {/* Group Size Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Group Size</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity
            style={[
              styles.counterButton,
              groupSize <= 1 && styles.counterButtonDisabled,
            ]}
            onPress={() => setGroupSize(Math.max(1, groupSize - 1))}
            disabled={groupSize <= 1}
          >
            <Ionicons
              name="remove"
              size={20}
              color={groupSize <= 1 ? Colors.textMuted : Colors.text}
            />
          </TouchableOpacity>
          
          <View style={styles.counterDisplay}>
            <Text style={styles.counterNumber}>{groupSize}</Text>
            <Text style={styles.counterLabel}>
              {groupSize === 1 ? 'person' : 'people'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.counterButton,
              groupSize >= 20 && styles.counterButtonDisabled,
            ]}
            onPress={() => setGroupSize(Math.min(20, groupSize + 1))}
            disabled={groupSize >= 20}
          >
            <Ionicons
              name="add"
              size={20}
              color={groupSize >= 20 ? Colors.textMuted : Colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Turbo Mode Info - shown when group size > 1 */}
      {groupSize > 1 && <TurboModeInfo groupSize={groupSize} />}

      {/* Price Range Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget Per Person</Text>
        <View style={styles.priceContainer}>
          <View style={styles.priceDisplay}>
            <Text style={styles.priceLabel}>{getPriceLabel(priceRange)}</Text>
            <Text style={styles.priceValue}>
              {priceRange === 0 ? 'Free' : `~$${priceRange}`}
            </Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  { width: `${(priceRange / 100) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.sliderThumb,
                  { left: `${(priceRange / 100) * 100}%` },
                ]}
              />
            </View>
            
            {/* Slider Touch Area */}
            <View
              style={styles.sliderTouchArea}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderMove={(evt) => {
                const { locationX } = evt.nativeEvent;
                const sliderWidth = 280; // Approximate width
                const newValue = Math.round((locationX / sliderWidth) * 100);
                setPriceRange(Math.max(0, Math.min(100, newValue)));
              }}
            />
          </View>
          
          <View style={styles.priceLabelsContainer}>
            {priceLabels.map((label, index) => (
              <TouchableOpacity
                key={index}
                style={styles.priceLabelButton}
                onPress={() => setPriceRange(index * 25)}
              >
                <Text
                  style={[
                    styles.priceLabelText,
                    getPriceBuckets(priceRange) === index && styles.priceLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  
  // Counter styles
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterButtonDisabled: {
    backgroundColor: Colors.surface,
    borderColor: Colors.textMuted,
  },
  counterDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  counterNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  counterLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Turbo mode info styles
  turboInfo: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.3)',
  },
  turboHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  turboTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  turboDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  
  // Price range styles
  priceContainer: {
    gap: 16,
  },
  priceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  priceLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sliderContainer: {
    position: 'relative',
    height: 20,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderTouchArea: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    bottom: -10,
  },
  priceLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  priceLabelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  priceLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  priceLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default SizeAndBudgetCard;