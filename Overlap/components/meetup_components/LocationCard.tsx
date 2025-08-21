// components/meetup_components/LocationCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
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

interface LocationCardProps {
  locationOption: 'own' | 'specific';
  setLocationOption: (option: 'own' | 'specific') => void;
  specificLocation: string;
  setSpecificLocation: (location: string) => void;
}

const LocationCard: React.FC<LocationCardProps> = ({
  locationOption,
  setLocationOption,
  specificLocation,
  setSpecificLocation,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Location</Text>
      
      {/* Radio Options */}
      <View style={styles.radioContainer}>
        <TouchableOpacity 
          style={styles.radioOption} 
          onPress={() => setLocationOption('own')}
          activeOpacity={0.7}
        >
          <View style={styles.radioRow}>
            <View style={[styles.radioButton, locationOption === 'own' && styles.radioButtonSelected]}>
              {locationOption === 'own' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.radioContent}>
              <View style={styles.radioTextContainer}>
                <Ionicons name="location-outline" size={20} color={Colors.primary} />
                <Text style={styles.radioText}>Use My Location</Text>
              </View>
              <Text style={styles.radioSubtext}>Automatically use your current location</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.radioOption} 
          onPress={() => setLocationOption('specific')}
          activeOpacity={0.7}
        >
          <View style={styles.radioRow}>
            <View style={[styles.radioButton, locationOption === 'specific' && styles.radioButtonSelected]}>
              {locationOption === 'specific' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.radioContent}>
              <View style={styles.radioTextContainer}>
                <Ionicons name="map-outline" size={20} color={Colors.primary} />
                <Text style={styles.radioText}>Enter Specific Location</Text>
              </View>
              <Text style={styles.radioSubtext}>Choose a custom location for the meetup</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Specific Location Input */}
      {locationOption === 'specific' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Location Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter address, venue, or landmark"
            placeholderTextColor={Colors.textMuted}
            value={specificLocation}
            onChangeText={setSpecificLocation}
            multiline={false}
            autoCapitalize="words"
          />
          <View style={styles.inputHint}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.hintText}>
              Be specific to help friends find the location easily
            </Text>
          </View>
        </View>
      )}
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
  
  // Radio Options
  radioContainer: {
    gap: 12,
  },
  radioOption: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioContent: {
    flex: 1,
  },
  radioTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radioText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 8,
  },
  radioSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  
  // Input Section
  inputContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputLabel: {
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
    marginBottom: 8,
  },
  inputHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 6,
    flex: 1,
  },
});

export default LocationCard;