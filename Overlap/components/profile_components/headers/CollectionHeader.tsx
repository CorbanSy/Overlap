// components/profile_components/headers/CollectionHeader.tsx - UPDATED
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollectionParticipants from '../CollectionParticipants';

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

interface CollaborativeCollection {
  id: string;
  title: string;
  activities?: any[];
  members?: { [key: string]: any };
  owner?: string;
  userRole?: string;
}

interface CollectionHeaderProps {
  selectedCollection: CollaborativeCollection;
  onBackPress: () => void;
  onMembersPress?: () => void;
}

const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  selectedCollection,
  onBackPress,
  onMembersPress,
}) => {
  const memberCount = selectedCollection.members 
    ? Object.keys(selectedCollection.members).length 
    : 0;

  return (
    <View style={styles.collectionHeader}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={Colors.primary} />
      </TouchableOpacity>
      
      <View style={styles.collectionHeaderInfo}>
        <Text style={styles.collectionTitle}>{selectedCollection.title}</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.collectionSubtitle}>
            {selectedCollection.activities?.length || 0} activities
          </Text>
          {memberCount > 1 && (
            <>
              <Text style={styles.subtitleSeparator}> • </Text>
              <Text style={styles.collectionSubtitle}>
                {memberCount} members
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Collection Participants */}
      {selectedCollection.members && Object.keys(selectedCollection.members).length > 0 && (
        <View style={styles.participantsContainer}>
          <CollectionParticipants
            members={selectedCollection.members}
            maxVisible={3}
            onPress={onMembersPress}
          />
        </View>
      )}
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
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  subtitleSeparator: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  participantsContainer: {
    marginLeft: 8,
  },
});

export default CollectionHeader;