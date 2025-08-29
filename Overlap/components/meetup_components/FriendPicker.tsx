// components/FriendPicker.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendMeetupInvite } from '../../_utils/storage/meetupInvites';

// Types
interface Friend {
  uid: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  displayName?: string;
}

interface FriendPickerProps {
  visible: boolean;
  onClose: () => void;
  meetupId: string;
  currentFriends?: Friend[]; // Friends already invited to this meetup
  availableFriends?: Friend[]; // All user's friends from social system
  onInvitesSent?: (invitedCount: number) => void;
}

// Constants
const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceHover: '#21262D',
  primary: '#238636',
  primaryHover: '#2EA043',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  danger: '#F85149',
  border: '#30363D',
  success: '#2EA043',
  accent: '#FFC107',
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

// Mock friends data - Replace this with your actual friends fetching function
const mockFriends: Friend[] = [
  {
    uid: 'friend1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
  },
  {
    uid: 'friend2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=2',
  },
  {
    uid: 'friend3',
    name: 'Carol Davis',
    email: 'carol@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
  },
  {
    uid: 'friend4',
    name: 'David Wilson',
    email: 'david@example.com',
  },
  {
    uid: 'friend5',
    name: 'Emma Brown',
    email: 'emma@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
  },
];

const FriendPicker: React.FC<FriendPickerProps> = ({
  visible,
  onClose,
  meetupId,
  currentFriends = [],
  availableFriends = [],
  onInvitesSent,
}) => {
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Use passed friends instead of fetching
  useEffect(() => {
    if (visible) {
      setAllFriends(availableFriends);
      setSelectedFriends(new Set());
      setSearchQuery('');
      setLoading(false);
    }
  }, [visible, availableFriends]);

  // Get UIDs of already invited friends
  const invitedFriendUids = useMemo(() => 
    new Set(currentFriends.map(friend => friend.uid))
  , [currentFriends]);

  // Filter available friends (not already invited)
  const uninvitedFriends = useMemo(() => 
    allFriends.filter(friend => !invitedFriendUids.has(friend.uid))
  , [allFriends, invitedFriendUids]);

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return uninvitedFriends;
    
    const query = searchQuery.toLowerCase();
    return uninvitedFriends.filter(friend => 
      friend.name?.toLowerCase().includes(query) ||
      friend.email?.toLowerCase().includes(query) ||
      friend.displayName?.toLowerCase().includes(query)
    );
  }, [uninvitedFriends, searchQuery]);

  // Handle friend selection
  const handleToggleFriend = useCallback((friendUid: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendUid)) {
        newSet.delete(friendUid);
      } else {
        newSet.add(friendUid);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    setSelectedFriends(new Set(filteredFriends.map(friend => friend.uid)));
  }, [filteredFriends]);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedFriends(new Set());
  }, []);

  // Send invitations
  const handleSendInvites = useCallback(async () => {
    if (selectedFriends.size === 0) {
      Alert.alert('No Friends Selected', 'Please select at least one friend to invite.');
      return;
    }

    setSending(true);
    try {
      const selectedFriendsData = allFriends.filter(friend => 
        selectedFriends.has(friend.uid)
      );

      // Send invites to all selected friends
      const invitePromises = selectedFriendsData.map(friend => 
        sendMeetupInvite(meetupId, friend)
      );

      await Promise.all(invitePromises);

      const invitedCount = selectedFriends.size;
      Alert.alert(
        'Invitations Sent!', 
        `Successfully sent ${invitedCount} invitation${invitedCount !== 1 ? 's' : ''}.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              onInvitesSent?.(invitedCount);
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sending invites:', error);
      Alert.alert('Error', 'Failed to send some invitations. Please try again.');
    } finally {
      setSending(false);
    }
  }, [selectedFriends, allFriends, meetupId, onInvitesSent, onClose]);

  // Render friend item
  const renderFriendItem = useCallback(({ item }: { item: Friend }) => {
    const isSelected = selectedFriends.has(item.uid);
    const displayName = item.name || item.displayName || item.email || `Friend ${item.uid.slice(0, 8)}`;

    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.friendItemSelected]}
        onPress={() => handleToggleFriend(item.uid)}
        activeOpacity={0.7}
      >
        <View style={styles.friendInfo}>
          <Image
            source={
              item.avatarUrl
                ? { uri: item.avatarUrl }
                : require('../../assets/images/profile.png')
            }
            style={styles.friendAvatar}
            defaultSource={require('../../assets/images/profile.png')}
          />
          <View style={styles.friendDetails}>
            <Text style={styles.friendName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.email && item.email !== displayName && (
              <Text style={styles.friendEmail} numberOfLines={1}>
                {item.email}
              </Text>
            )}
          </View>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color={COLORS.text} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [selectedFriends, handleToggleFriend]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Text style={[styles.headerButtonText, sending && styles.disabledText]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Invite Friends</Text>
          
          <TouchableOpacity
            style={[styles.headerButton, styles.sendButton, sending && styles.disabledButton]}
            onPress={handleSendInvites}
            disabled={sending || selectedFriends.size === 0}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={[
                styles.headerButtonText, 
                styles.sendButtonText,
                selectedFriends.size === 0 && styles.disabledText
              ]}>
                Send ({selectedFriends.size})
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor={COLORS.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!sending}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Selection controls */}
        {filteredFriends.length > 0 && (
          <View style={styles.selectionControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleSelectAll}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Text style={styles.controlButtonText}>
                Select All ({filteredFriends.length})
              </Text>
            </TouchableOpacity>
            
            {selectedFriends.size > 0 && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleClearSelection}
                disabled={sending}
                activeOpacity={0.7}
              >
                <Text style={styles.controlButtonText}>Clear Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Friends list */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : filteredFriends.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No friends found' : 'No friends available'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : invitedFriendUids.size > 0 
                    ? 'All your friends have already been invited to this meetup'
                    : 'Add friends to your network to invite them to meetups'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              keyExtractor={(item) => item.uid}
              renderItem={renderFriendItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>

        {/* Already invited section */}
        {currentFriends.length > 0 && (
          <View style={styles.invitedSection}>
            <Text style={styles.invitedTitle}>
              Already Invited ({currentFriends.length})
            </Text>
            <View style={styles.invitedFriends}>
              {currentFriends.slice(0, 5).map((friend, index) => (
                <Image
                  key={friend.uid}
                  source={
                    friend.avatarUrl
                      ? { uri: friend.avatarUrl }
                      : require('../../assets/images/profile.png')
                  }
                  style={[styles.invitedAvatar, index > 0 && styles.overlappedAvatar]}
                  defaultSource={require('../../assets/images/profile.png')}
                />
              ))}
              {currentFriends.length > 5 && (
                <View style={[styles.invitedAvatar, styles.overlappedAvatar, styles.moreIndicator]}>
                  <Text style={styles.moreText}>+{currentFriends.length - 5}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.textTertiary,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sendButtonText: {
    color: COLORS.text,
  },
  disabledText: {
    color: COLORS.textTertiary,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: SPACING.xs,
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  controlButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  friendItemSelected: {
    backgroundColor: COLORS.surface,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.md,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  invitedSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  invitedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  invitedFriends: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  overlappedAvatar: {
    marginLeft: -8,
  },
  moreIndicator: {
    backgroundColor: COLORS.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default FriendPicker;