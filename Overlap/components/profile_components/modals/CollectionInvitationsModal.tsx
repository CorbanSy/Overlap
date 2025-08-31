// components/profile_components/modals/CollectionInvitationsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getPendingCollectionInvitations,
  acceptCollectionInvitation,
  rejectCollectionInvitation 
} from '../../../_utils/storage/collaborativeCollections';

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
  success: '#10B981',
  error: '#F44336',
};

interface CollectionInvitationsModalProps {
  visible: boolean;
  onClose: () => void;
  onInvitationHandled?: () => void;
}

const CollectionInvitationsModal: React.FC<CollectionInvitationsModalProps> = ({
  visible,
  onClose,
  onInvitationHandled,
}) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInvitations();
    }
  }, [visible]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const pendingInvitations = await getPendingCollectionInvitations();
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      await acceptCollectionInvitation(invitationId);
      await loadInvitations();
      onInvitationHandled?.();
      Alert.alert('Success', 'You joined the collection!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleReject = async (invitationId: string) => {
    try {
      await rejectCollectionInvitation(invitationId);
      await loadInvitations();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderInvitation = ({ item }: { item: any }) => (
    <View style={styles.invitationItem}>
      <View style={styles.invitationContent}>
        <View style={styles.invitationHeader}>
          <Text style={styles.collectionTitle}>{item.collectionTitle}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
        
        <Text style={styles.inviterText}>
          Invited by {item.fromDisplayName}
        </Text>
        
        <Text style={styles.invitationDate}>
          {new Date(item.createdAt.toDate()).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.invitationActions}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id)}
        >
          <Ionicons name="close" size={18} color={Colors.error} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.id)}
        >
          <Ionicons name="checkmark" size={18} color={Colors.success} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Collection Invitations</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <FlatList
              data={invitations}
              renderItem={renderInvitation}
              keyExtractor={(item) => item.id}
              style={styles.invitationsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="mail-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyStateText}>No pending invitations</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Collection invitations will appear here
                  </Text>
                </View>
              }
            />
          </View>
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
    maxHeight: '70%',
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
  invitationsList: {
    flex: 1,
    paddingTop: 16,
  },
  invitationItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  invitationContent: {
    flex: 1,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  roleBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  inviterText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  invitationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
});

export default CollectionInvitationsModal;