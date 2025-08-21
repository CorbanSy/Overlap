// components/profile_components/sections/AddCollectionSection.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Colors = {
  primary: '#F5A623',
  white: '#FFFFFF',
};

interface AddCollectionSectionProps {
  onPress: () => void;
}

const AddCollectionSection: React.FC<AddCollectionSectionProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.addCollectionButton} onPress={onPress}>
      <Ionicons name="add" size={20} color={Colors.white} />
      <Text style={styles.addCollectionText}>New Collection</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  addCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addCollectionText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddCollectionSection;