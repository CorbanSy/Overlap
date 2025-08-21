// components/meetup_components/EventDetailsCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

// Activity categories
const activityLabels = [
  'Dining', 'Fitness', 'Outdoors', 'Movies', 'Gaming',
  'Social', 'Music', 'Shopping', 'Travel', 'Art',
  'Relaxing', 'Learning', 'Cooking', 'Nightlife',
];

interface EventDetailsCardProps {
  eventName: string;
  setEventName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const EventDetailsCard: React.FC<EventDetailsCardProps> = ({
  eventName,
  setEventName,
  description,
  setDescription,
  selectedCategory,
  setSelectedCategory,
}) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Event Details</Text>
      
      {/* Event Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Sushi & Trivia Night"
          placeholderTextColor={Colors.textMuted}
          value={eventName}
          onChangeText={setEventName}
        />
      </View>

      {/* Category Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={styles.dropdown} 
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <Text style={styles.dropdownText}>{selectedCategory}</Text>
            <Ionicons 
              name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {showCategoryDropdown && (
            <View style={styles.dropdownMenu}>
              {activityLabels.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCategory(label);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{label}</Text>
                  {selectedCategory === label && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add a short description..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
  },
  dropdown: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.text,
  },
});

export default EventDetailsCard;