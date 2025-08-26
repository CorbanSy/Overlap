// components/profile_components/headers/CollectionHeader.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SharedCollection } from '../profileTypes';

const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  border: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
};

interface CollectionHeaderProps {
  selectedCollection: SharedCollection;
  onBackPress: () => void;
}

const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  selectedCollection,
  onBackPress,
}) => {
  return (
    <View style={styles.collectionHeader}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={Colors.primary} />
      </TouchableOpacity>
      <View style={styles.collectionHeaderInfo}>
        <Text style={styles.collectionTitle}>{selectedCollection.title}</Text>
        <Text style={styles.collectionSubtitle}>
          {selectedCollection.activities?.length || 0} activities
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  collectionHeaderInfo: {
    flex: 1,
  },
  collectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  collectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default CollectionHeader;