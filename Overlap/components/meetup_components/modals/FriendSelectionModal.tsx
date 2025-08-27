// components/meetup_components/modals/FriendSelectionModal.tsx
import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Animated,
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
  overlay: 'rgba(13, 17, 23, 0.8)',
};

type Friend = { 
  uid: string; 
  email?: string; 
  name?: string; 
  avatarUrl?: string; 
};

interface FriendSelectionModalProps {
  visible: boolean;
  friendsList: Friend[];
  selectedFriends: Friend[];
  onToggleFriend: (friend: Friend) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const FriendSelectionModal: React.FC<FriendSelectionModalProps> = ({
  visible,
  friendsList,
  selectedFriends,
  onToggleFriend,
  onConfirm,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Helper function to check if avatar URL is valid
  const hasValidAvatar = (avatarUrl?: string) => {
    return avatarUrl && avatarUrl.trim() !== '';
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: slideAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite Friends</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Friends List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.friendsGrid}
          >
            {friendsList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyStateText}>No friends found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add friends to invite them to meetups
                </Text>
              </View>
            ) : (
              friendsList.map((friend) => {
                const isSelected = selectedFriends.some((f) => f.uid === friend.uid);
                
                return (
                  <TouchableOpacity 
                    key={friend.uid} 
                    onPress={() => onToggleFriend(friend)} 
                    activeOpacity={0.8}
                    style={styles.friendCardWrapper}
                  >
                    <View style={[styles.friendCard, isSelected && styles.friendCardSelected]}>
                      {/* Avatar - Fixed to properly handle empty avatarUrl */}
                      {hasValidAvatar(friend.avatarUrl) ? (
                        <Image 
                          source={{ uri: friend.avatarUrl }} 
                          style={styles.avatar}
                          onError={(e) => console.log('Avatar load failed:', e.nativeEvent.error)}
                        />
                      ) : (
                        <Image
                          source={require('../../../assets/images/profile.png')}
                          style={styles.avatar}
                        />
                      )}
                      
                      {/* Friend Name */}
                      <Text style={styles.friendName} numberOfLines={1}>
                        {friend.name || friend.email || friend.uid}
                      </Text>
                      
                      {/* Selection Checkbox */}
                      <View style={[
                        styles.checkbox, 
                        isSelected ? styles.checkboxSelected : styles.checkboxEmpty
                      ]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color={Colors.background} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Selected Count */}
          {selectedFriends.length > 0 && (
            <View style={styles.selectedCount}>
              <Text style={styles.selectedCountText}>
                {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
              <Ionicons name="checkmark" size={20} color={Colors.background} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>
                Done {selectedFriends.length > 0 && `(${selectedFriends.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: Colors.surface,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
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
  
  // Friends Grid
  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 200,
  },
  friendCardWrapper: {
    width: 90,
  },
  friendCard: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  friendCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  friendName: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
  },
  checkboxEmpty: {
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  
  // Selected Count
  selectedCount: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  selectedCountText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // Actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FriendSelectionModal;