// components/meetup_components/InviteFriendsCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
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
  success: '#10B981',
  white: '#FFFFFF',
};

type Friend = { 
  uid: string; 
  email?: string; 
  name?: string; 
  avatarUrl?: string; 
};

interface InviteFriendsCardProps {
  selectedFriends: Friend[];
  onOpenInviteModal: () => void;
  onRemoveFriend: (friendUid: string) => void;
}

const InviteFriendsCard: React.FC<InviteFriendsCardProps> = ({
  selectedFriends,
  onOpenInviteModal,
  onRemoveFriend,
}) => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Invite Friends</Text>
          <Text style={styles.subtitle}>
            {selectedFriends.length > 0 
              ? `${selectedFriends.length} selected`
              : 'Optional'
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.inviteButton} 
          onPress={onOpenInviteModal}
        >
          <Ionicons name="person-add" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.hint}>
        Friends can be invited later as well
      </Text>

      {/* Selected Friends Display */}
      {selectedFriends.length > 0 ? (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedTitle}>
            Invited Friends ({selectedFriends.length})
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendsRow}
          >
            {selectedFriends.map((friend) => (
              <View key={friend.uid} style={styles.friendItem}>
                <View style={styles.friendInfo}>
                  {friend.avatarUrl ? (
                    <Image 
                      source={{ uri: friend.avatarUrl }} 
                      style={styles.friendAvatar}
                    />
                  ) : (
                    <View style={styles.defaultAvatar}>
                      <Ionicons name="person" size={18} color={Colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.friendName} numberOfLines={1}>
                    {friend.name || friend.email || friend.uid}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveFriend(friend.uid)}
                >
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyStateText}>No friends invited yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap the + button to invite friends
          </Text>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  inviteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  
  // Selected Section
  selectedSection: {
    marginTop: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  friendsRow: {
    paddingVertical: 8,
    gap: 12,
  },
  friendItem: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 120,
    maxWidth: 140,
  },
  friendInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  friendName: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
});

export default InviteFriendsCard;