// components/profile_components/modals/CollectionMembersModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getCollectionMembers, 
  updateCollectionMemberRole, 
  removeMemberFromCollection,
  inviteToCollection,
  COLLECTION_ROLES 
} from '../../../_utils/storage/collaborativeCollections';
import { searchUsers } from '../../../_utils/storage/social';
import FriendCard from '../FriendCard';

const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  border: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
  white: '#FFFFFF',
  overlay: 'rgba(13, 17, 23, 0.8)',
  error: '#F44336',
};

interface CollectionMembersModalProps {
  visible: boolean;
  onClose: () => void;
  collectionId: string;
  isOwner: boolean;
}

const CollectionMembersModal: React.FC<CollectionMembersModalProps> = ({
  visible,
  onClose,
  collectionId,
  isOwner,
}) => {
  const [members, setMembers] = useState([]);
  const [isInviting, setIsInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && collectionId) {
      loadMembers();
    }
  }, [visible, collectionId]);

  const loadMembers = async () => {
    try {
      const memberList = await getCollectionMembers(collectionId);
      setMembers(memberList);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const results = await searchUsers(query, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (userId: string) => {
    try {
      await inviteToCollection(collectionId, userId, COLLECTION_ROLES.COLLABORATOR);
      Alert.alert('Success', 'Invitation sent!');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await updateCollectionMemberRole(collectionId, memberId, newRole);
      await loadMembers();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberFromCollection(collectionId, memberId);
              await loadMembers();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case COLLECTION_ROLES.OWNER:
        return Colors.primary;
      case COLLECTION_ROLES.COLLABORATOR:
        return Colors.textSecondary;
      case COLLECTION_ROLES.VIEWER:
        return Colors.textMuted;
      default:
        return Colors.textMuted;
    }
  };

  const renderMember = ({ item }: { item: any }) => (
    <View style={styles.memberItem}>
      <FriendCard item={item} />
      <View style={styles.memberActions}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
            {item.role}
          </Text>
        </View>
        {isOwner && !item.isOwner && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemoveMember(item.userId)}
          >
            <Ionicons name="person-remove-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <View style={styles.searchResultItem}>
      <FriendCard item={item} />
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => handleInviteUser(item.uid)}
      >
        <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
        <Text style={styles.inviteButtonText}>Invite</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isInviting ? 'Invite Members' : 'Collection Members'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {!isInviting ? (
            // Members List View
            <View style={styles.modalContent}>
              <View style={styles.membersHeader}>
                <Text style={styles.sectionTitle}>
                  Members ({members.length})
                </Text>
                {isOwner && (
                  <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => setIsInviting(true)}
                  >
                    <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
                    <Text style={styles.inviteButtonText}>Invite</Text>
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item) => item.userId}
                style={styles.membersList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : (
            // Invite Members View
            <View style={styles.modalContent}>
              <View style={styles.inviteHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setIsInviting(false)}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users by name or email"
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    handleSearchUsers(text);
                  }}
                />
              </View>

              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.uid}
                style={styles.searchResultsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
                    <Text style={styles.emptyStateText}>
                      {searchQuery.trim() ? 'No users found' : 'Search for users to invite'}
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Members List Styles
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actionButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
  },
  
  // Invite Members Styles
  inviteHeader: {
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  inviteButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default CollectionMembersModal;