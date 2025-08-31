// components/profile_components/modals/EnhancedNewCollectionModal.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLLECTION_PRIVACY } from '../../../_utils/storage/collaborativeCollections';

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
};

interface EnhancedNewCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateCollection: (data: {
    title: string;
    description: string;
    privacy: string;
    allowMembersToAdd: boolean;
  }) => void;
}

const EnhancedNewCollectionModal: React.FC<EnhancedNewCollectionModalProps> = ({
  visible,
  onClose,
  onCreateCollection,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState(COLLECTION_PRIVACY.PRIVATE);
  const [allowMembersToAdd, setAllowMembersToAdd] = useState(true);

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
      // Reset form when modal closes
      setTitle('');
      setDescription('');
      setPrivacy(COLLECTION_PRIVACY.PRIVATE);
      setAllowMembersToAdd(true);
      
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

  const handleCreate = () => {
    if (!title.trim()) return;
    
    onCreateCollection({
      title: title.trim(),
      description: description.trim(),
      privacy,
      allowMembersToAdd
    });
    
    onClose();
  };

  const getPrivacyLabel = (privacyLevel: string) => {
    switch (privacyLevel) {
      case COLLECTION_PRIVACY.PUBLIC:
        return 'Public - Anyone can find and join';
      case COLLECTION_PRIVACY.FRIENDS:
        return 'Friends Only - Only friends can join';
      case COLLECTION_PRIVACY.PRIVATE:
        return 'Private - Invite only';
      default:
        return 'Private';
    }
  };

  const getPrivacyIcon = (privacyLevel: string) => {
    switch (privacyLevel) {
      case COLLECTION_PRIVACY.PUBLIC:
        return 'globe-outline';
      case COLLECTION_PRIVACY.FRIENDS:
        return 'people-outline';
      case COLLECTION_PRIVACY.PRIVATE:
        return 'lock-closed-outline';
      default:
        return 'lock-closed-outline';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: slideAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Collection</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Collection Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter collection name"
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a description for your collection"
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Privacy</Text>
              <View style={styles.privacyContainer}>
                {Object.values(COLLECTION_PRIVACY).map((privacyLevel) => (
                  <TouchableOpacity
                    key={privacyLevel}
                    style={[
                      styles.privacyOption,
                      privacy === privacyLevel && styles.privacyOptionSelected
                    ]}
                    onPress={() => setPrivacy(privacyLevel)}
                  >
                    <Ionicons 
                      name={getPrivacyIcon(privacyLevel)} 
                      size={20} 
                      color={privacy === privacyLevel ? Colors.primary : Colors.textMuted} 
                    />
                    <View style={styles.privacyTextContainer}>
                      <Text style={[
                        styles.privacyText,
                        privacy === privacyLevel && styles.privacyTextSelected
                      ]}>
                        {privacyLevel.charAt(0).toUpperCase() + privacyLevel.slice(1)}
                      </Text>
                      <Text style={styles.privacyDescription}>
                        {getPrivacyLabel(privacyLevel).split(' - ')[1]}
                      </Text>
                    </View>
                    {privacy === privacyLevel && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchContainer}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.inputLabel}>Allow members to add activities</Text>
                  <Text style={styles.switchDescription}>
                    Let collaborators add new places to this collection
                  </Text>
                </View>
                <Switch
                  value={allowMembersToAdd}
                  onValueChange={setAllowMembersToAdd}
                  trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                  thumbColor={allowMembersToAdd ? Colors.primary : Colors.textMuted}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.primaryButton, !title.trim() && styles.disabledButton]} 
              onPress={handleCreate}
              disabled={!title.trim()}
            >
              <Ionicons name="add" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 30,
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
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
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
  privacyContainer: {
    gap: 8,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  privacyOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  privacyTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  privacyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  privacyTextSelected: {
    color: Colors.primary,
  },
  privacyDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalActions: {
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
    color: Colors.white,
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
  disabledButton: {
    backgroundColor: Colors.surfaceLight,
    opacity: 0.6,
  },
});

export default EnhancedNewCollectionModal;