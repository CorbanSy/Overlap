// components/home_components/FilterModals.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

interface FilterState {
  sort?: string;
  openNow?: boolean;
  maxDistance?: number;
  minRating?: number;
  selectedTypes?: string[];
  priceRange?: string;
}

// Distance Filter Modal
interface DistanceFilterProps {
  visible: boolean;
  onClose: () => void;
  currentDistance?: number;
  onApply: (distance: number) => void;
}

export function DistanceFilterModal({
  visible,
  onClose,
  currentDistance = 25,
  onApply,
}: DistanceFilterProps) {
  const [distance, setDistance] = useState(currentDistance);

  const handleApply = useCallback(() => {
    onApply(distance);
    onClose();
  }, [distance, onApply, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Distance</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Within {distance} km
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={50}
              value={distance}
              onValueChange={setDistance}
              step={1}
              minimumTrackTintColor="#F5A623"
              maximumTrackTintColor="#333"
              thumbTintColor="#F5A623"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>1 km</Text>
              <Text style={styles.sliderLabelText}>50 km</Text>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Rating Filter Modal
interface RatingFilterProps {
  visible: boolean;
  onClose: () => void;
  currentRating?: number;
  onApply: (rating: number) => void;
}

export function RatingFilterModal({
  visible,
  onClose,
  currentRating = 0,
  onApply,
}: RatingFilterProps) {
  const [rating, setRating] = useState(currentRating);

  const ratings = [
    { value: 0, label: 'Any Rating' },
    { value: 3, label: '3.0+ Stars' },
    { value: 3.5, label: '3.5+ Stars' },
    { value: 4, label: '4.0+ Stars' },
    { value: 4.5, label: '4.5+ Stars' },
  ];

  const handleApply = useCallback(() => {
    onApply(rating);
    onClose();
  }, [rating, onApply, onClose]);

  const renderStars = (value: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={16}
          color="#F5A623"
        />
      );
    }
    return stars;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Minimum Rating</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsContainer}>
            {ratings.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.ratingOption,
                  rating === item.value && styles.selectedOption,
                ]}
                onPress={() => setRating(item.value)}
              >
                <View style={styles.ratingContent}>
                  <Text style={styles.ratingLabel}>{item.label}</Text>
                  {item.value > 0 && (
                    <View style={styles.starsContainer}>
                      {renderStars(item.value)}
                    </View>
                  )}
                </View>
                <Ionicons
                  name={rating === item.value ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={rating === item.value ? '#F5A623' : '#666'}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Place Types Filter Modal
interface TypesFilterProps {
  visible: boolean;
  onClose: () => void;
  currentTypes?: string[];
  onApply: (types: string[]) => void;
}

export function TypesFilterModal({
  visible,
  onClose,
  currentTypes = [],
  onApply,
}: TypesFilterProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(currentTypes);

  const placeTypes = [
    { value: 'restaurant', label: 'Restaurants', icon: 'restaurant' },
    { value: 'cafe', label: 'Cafes', icon: 'cafe' },
    { value: 'bar', label: 'Bars & Pubs', icon: 'wine' },
    { value: 'tourist_attraction', label: 'Attractions', icon: 'camera' },
    { value: 'museum', label: 'Museums', icon: 'library' },
    { value: 'park', label: 'Parks', icon: 'leaf' },
    { value: 'shopping_mall', label: 'Shopping', icon: 'storefront' },
    { value: 'hotel', label: 'Hotels', icon: 'bed' },
    { value: 'gym', label: 'Fitness', icon: 'fitness' },
    { value: 'movie_theater', label: 'Entertainment', icon: 'film' },
    { value: 'hospital', label: 'Healthcare', icon: 'medical' },
    { value: 'bank', label: 'Banking', icon: 'card' },
    { value: 'gas_station', label: 'Gas Stations', icon: 'car' },
    { value: 'pharmacy', label: 'Pharmacy', icon: 'medical' },
  ];

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  const handleApply = useCallback(() => {
    onApply(selectedTypes);
    onClose();
  }, [selectedTypes, onApply, onClose]);

  const clearAll = useCallback(() => {
    setSelectedTypes([]);
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Place Types</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.typesContainer}>
            {placeTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeOption,
                  selectedTypes.includes(type.value) && styles.selectedTypeOption,
                ]}
                onPress={() => toggleType(type.value)}
              >
                <View style={styles.typeContent}>
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={selectedTypes.includes(type.value) ? '#F5A623' : '#666'}
                  />
                  <Text style={[
                    styles.typeLabel,
                    selectedTypes.includes(type.value) && styles.selectedTypeLabel,
                  ]}>
                    {type.label}
                  </Text>
                </View>
                <Ionicons
                  name={selectedTypes.includes(type.value) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selectedTypes.includes(type.value) ? '#F5A623' : '#666'}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedTypes.length > 0 && (
            <View style={styles.selectedCount}>
              <Text style={styles.selectedCountText}>
                {selectedTypes.length} type{selectedTypes.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Price Filter Modal
interface PriceFilterProps {
  visible: boolean;
  onClose: () => void;
  currentPriceRange?: string;
  onApply: (priceRange: string) => void;
}

export function PriceFilterModal({
  visible,
  onClose,
  currentPriceRange = '',
  onApply,
}: PriceFilterProps) {
  const [priceRange, setPriceRange] = useState(currentPriceRange);

  const priceOptions = [
    { value: '', label: 'Any Price', description: 'All price ranges' },
    { value: '$', label: '$', description: 'Budget-friendly' },
    { value: '$$', label: '$$', description: 'Moderate' },
    { value: '$$$', label: '$$$', description: 'Expensive' },
    { value: '$$$$', label: '$$$$', description: 'Very Expensive' },
  ];

  const handleApply = useCallback(() => {
    onApply(priceRange);
    onClose();
  }, [priceRange, onApply, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Price Range</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsContainer}>
            {priceOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.priceOption,
                  priceRange === option.value && styles.selectedOption,
                ]}
                onPress={() => setPriceRange(option.value)}
              >
                <View style={styles.priceContent}>
                  <Text style={styles.priceLabel}>{option.label}</Text>
                  <Text style={styles.priceDescription}>{option.description}</Text>
                </View>
                <Ionicons
                  name={priceRange === option.value ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={priceRange === option.value ? '#F5A623' : '#666'}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1B1F24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderContainer: {
    padding: 20,
  },
  sliderLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabelText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  optionsContainer: {
    maxHeight: 400,
  },
  ratingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2E35',
  },
  selectedOption: {
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
  },
  ratingContent: {
    flex: 1,
  },
  ratingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  typesContainer: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  typeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2A2E35',
  },
  selectedTypeOption: {
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  typeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  typeLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  selectedTypeLabel: {
    color: '#F5A623',
    fontWeight: '600',
  },
  selectedCount: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  selectedCountText: {
    color: '#F5A623',
    fontSize: 14,
    textAlign: 'center',
  },
  priceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2E35',
  },
  priceContent: {
    flex: 1,
  },
  priceLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceDescription: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F5A623',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});