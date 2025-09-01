// components/profile_components/modals/EnhancedCollectionMembersModal.tsx
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
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getCollectionMembers, 
  updateCollectionMemberRole, 
  removeMemberFromCollection,
  inviteToCollection,
  updateCollectionSettings,
  COLLECTION_ROLES 
} from '../../../_utils/storage/collaborativeCollections';
import { searchUsers, getUserFriends } from '../../../_utils/storage/social';
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
  success: '#10B981',
};

interface EnhancedCollectionMembersModalProps {
  visible: boolean;
  onClose: () => void;
  collection: any;
  isOwner: boolean;
  onCollectionUpdated?: () => void;
}

const EnhancedCollectionMembersModal: React.FC<EnhancedCollectionMembersModalProps> = ({
  visible,
  onClose,
  collection,
  isOwner,
  onCollectionUpdated,
}) => {
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isManagingSettings, setIsManagingSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteMode, setInviteMode] = useState<'friends' | 'search'>('friends');

  // Collection settings state
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [allowMembersToAdd, setAllowMembersToAdd] = useState(true);

  useEffect(() => {
    if (visible && collection?.id) {
      loadMembers();
      loadFriends();
      // Initialize settings
      setCollectionTitle(collection.title || '');
      setCollectionDescription(collection.description || '');
      setAllowMembersToAdd(collection.allowMembersToAdd ?? true);
    }
  }, [visible, collection]);

  const loadMembers = async () => {
    try {
      const memberList = await getCollectionMembers(collection.id);
      setMembers(memberList);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadFriends = async () => {
    try {
      setLoading(true);
      const friendsList = await getUserFriends();
      
      // Filter out friends who are already members
      const existingMemberIds = new Set(members.map(m => m.userId));
      const availableFriends = friendsList.filter(friend => 
        !existingMemberIds.has(friend.uid || friend.userId)
      );
      
      setFriends(availableFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update friends list when members change
  useEffect(() => {
    if (isInviting && friends.length > 0) {
      const existingMemberIds = new Set(members.map(m => m.userId));
      const availableFriends = friends.filter(friend => 
        !existingMemberIds.has(friend.uid || friend.userId)
      );
      setFriends(availableFriends);
    }
  }, [members, isInviting]);

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const results = await searchUsers(query, 10);
      // Filter out users who are already members
      const existingMemberIds = members.map(m => m.userId);
      const filteredResults = results.filter(user => !existingMemberIds.includes(user.uid));
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (userId: string, userName: string) => {
    try {
      await inviteToCollection(collection.id, userId, COLLECTION_ROLES.COLLABORATOR);
      Alert.alert('Success', `Invitation sent to ${userName}!`);
      
      // Remove from friends list since they're now invited
      setFriends(prev => prev.filter(friend => (friend.uid || friend.userId) !== userId));
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleChangeRole = async (memberId: string, memberName: string, currentRole: string) => {
    if (!isOwner) return;

    const roleOptions = [
      { label: 'Owner', value: COLLECTION_ROLES.OWNER },
      { label: 'Collaborator', value: COLLECTION_ROLES.COLLABORATOR },
      { label: 'Viewer', value: COLLECTION_ROLES.VIEWER },
    ].filter(option => option.value !== currentRole);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...roleOptions.map(r => r.label)],
          cancelButtonIndex: 0,
          title: `Change ${memberName}'s role`,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedRole = roleOptions[buttonIndex - 1].value;
            updateMemberRole(memberId, selectedRole);
          }
        }
      );
    } else {
      Alert.alert(
        `Change ${memberName}'s role`,
        'Select new role:',
        [
          { text: 'Cancel', style: 'cancel' },
          ...roleOptions.map(option => ({
            text: option.label,
            onPress: () => updateMemberRole(memberId, option.value)
          }))
        ]
      );
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      await updateCollectionMemberRole(collection.id, memberId, newRole);
      await loadMembers();
      Alert.alert('Success', 'Member role updated!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberFromCollection(collection.id, memberId);
              await loadMembers();
              Alert.alert('Success', 'Member removed!');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    try {
      const updates = {
        title: collectionTitle.trim(),
        description: collectionDescription.trim(),
        allowMembersToAdd: allowMembersToAdd,
      };

      await updateCollectionSettings(collection.id, updates);
      Alert.alert('Success', 'Collection settings updated!');
      onCollectionUpdated?.();
      setIsManagingSettings(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case COLLECTION_ROLES.OWNER:
        return Colors.primary;
      case COLLECTION_ROLES.COLLABORATOR:
        return Colors.success;
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
        <TouchableOpacity
          style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}
          onPress={() => isOwner && !item.isOwner ? 
            handleChangeRole(item.userId, item.displayName, item.role) : null}
          disabled={!isOwner || item.isOwner}
        >
          <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
            {item.role}
          </Text>
          {isOwner && !item.isOwner && (
            <Ionicons name="chevron-down" size={12} color={getRoleColor(item.role)} style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
        
        {isOwner && !item.isOwner && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemoveMember(item.userId, item.displayName)}
          >
            <Ionicons name="person-remove-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFriend = ({ item }: { item: any }) => (
    <View style={styles.friendItem}>
      <FriendCard item={item} />
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => handleInviteUser(item.uid || item.userId, item.displayName || item.name)}
      >
        <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
        <Text style={styles.inviteButtonText}>Invite</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <View style={styles.searchResultItem}>
      <FriendCard item={item} />
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => handleInviteUser(item.uid, item.displayName || item.name)}
      >
        <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
        <Text style={styles.inviteButtonText}>Invite</Text>
      </TouchableOpacity>
    </View>
  );

  const getModalTitle = () => {
    if (isManagingSettings) return 'Collection Settings';
    if (isInviting) return 'Invite to Collection';
    return 'Collection Members';
  };

  const resetInviteState = () => {
    setIsInviting(false);
    setInviteMode('friends');
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!collection || !collection.id) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {isManagingSettings ? (
            // Settings View
            <View style={styles.modalContent}>
              <View style={styles.settingsHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setIsManagingSettings(false)}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Collection Name</Text>
                <TextInput
                  style={styles.input}
                  value={collectionTitle}
                  onChangeText={setCollectionTitle}
                  placeholder="Collection name"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={collectionDescription}
                  onChangeText={setCollectionDescription}
                  placeholder="Collection description"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.switchContainer}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.inputLabel}>Allow members to add activities</Text>
                  <Text style={styles.switchDescription}>
                    Let collaborators add new places to this collection
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.switch, allowMembersToAdd && styles.switchActive]}
                  onPress={() => setAllowMembersToAdd(!allowMembersToAdd)}
                >
                  <View style={[styles.switchThumb, allowMembersToAdd && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          ) : !isInviting ? (
            // Members List View
            <View style={styles.modalContent}>
              <View style={styles.membersHeader}>
                <Text style={styles.sectionTitle}>
                  Members ({members.length})
                </Text>
                <View style={styles.headerActions}>
                  {isOwner && (
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={() => setIsManagingSettings(true)}
                    >
                      <Ionicons name="settings-outline" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  {(isOwner || collection?.userRole === COLLECTION_ROLES.COLLABORATOR) && (
                    <TouchableOpacity
                      style={styles.inviteButton}
                      onPress={() => {
                        setIsInviting(true);
                        loadFriends(); // Refresh friends list when opening invite view
                      }}
                    >
                      <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
                      <Text style={styles.inviteButtonText}>Invite</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item) => item.userId}
                style={styles.membersList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
                    <Text style={styles.emptyStateText}>No members yet</Text>
                  </View>
                }
              />
            </View>
          ) : (
            // Invite Members View - Enhanced with Friends List
            <View style={styles.modalContent}>
              <View style={styles.inviteHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={resetInviteState}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>

              {/* Toggle between Friends and Search */}
              <View style={styles.inviteModeToggle}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    inviteMode === 'friends' && styles.modeButtonActive
                  ]}
                  onPress={() => setInviteMode('friends')}
                >
                  <Ionicons 
                    name="people-outline" 
                    size={16} 
                    color={inviteMode === 'friends' ? Colors.white : Colors.textMuted} 
                  />
                  <Text style={[
                    styles.modeButtonText,
                    inviteMode === 'friends' && styles.modeButtonTextActive
                  ]}>
                    Friends ({friends.length})
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    inviteMode === 'search' && styles.modeButtonActive
                  ]}
                  onPress={() => setInviteMode('search')}
                >
                  <Ionicons 
                    name="search-outline" 
                    size={16} 
                    color={inviteMode === 'search' ? Colors.white : Colors.textMuted} 
                  />
                  <Text style={[
                    styles.modeButtonText,
                    inviteMode === 'search' && styles.modeButtonTextActive
                  ]}>
                    Search
                  </Text>
                </TouchableOpacity>
              </View>

              {inviteMode === 'friends' ? (
                // Friends List View
                <View style={styles.friendsContainer}>
                  <Text style={styles.sectionSubtitle}>
                    Invite your friends to join this collection
                  </Text>
                  
                  <FlatList
                    data={friends}
                    renderItem={renderFriend}
                    keyExtractor={(item) => item.uid || item.userId}
                    style={styles.friendsList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
                        <Text style={styles.emptyStateText}>
                          {loading ? 'Loading friends...' : 'No friends available to invite'}
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                          {loading ? '' : 'All your friends are already members or have been invited'}
                        </Text>
                      </View>
                    }
                  />
                </View>
              ) : (
                // Search View
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
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
    justifyContent: 'center', // instead of flex-end
  },

  modalContainer: {
    flex: 1, // fill entire height
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
    minHeight: 200,
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
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
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
    flexDirection: 'row',
    alignItems: 'center',
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

  // Invite Mode Toggle
  inviteModeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  modeButtonTextActive: {
    color: Colors.white,
  },

  // Friends List Styles
  friendsContainer: {
    flex: 1,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  
  // Search Styles
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
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
  
  // Shared Invite Button
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
  
  // Settings Styles
  settingsHeader: {
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: Colors.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Shared Styles
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
  emptyStateSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default EnhancedCollectionMembersModal;