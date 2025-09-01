// components/profile_components/EnhancedNewCollectionModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';

interface EnhancedNewCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateCollection: (collectionData: {
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const [allowMembersToAdd, setAllowMembersToAdd] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrivacy('private');
    setAllowMembersToAdd(true);
    setIsCreating(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    if (isCreating) return;

    try {
      setIsCreating(true);
      
      await onCreateCollection({
        title: title.trim(),
        description: description.trim(),
        privacy,
        allowMembersToAdd,
      });

      resetForm();
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const privacyOptions = [
    {
      value: 'private',
      label: 'Private',
      description: 'Only you and invited members can see this collection',
      icon: 'lock-closed-outline',
    },
    {
      value: 'friends',
      label: 'Friends Only',
      description: 'Your friends can see and request to join this collection',
      icon: 'people-outline',
    },
    {
      value: 'public',
      label: 'Public',
      description: 'Anyone can discover and request to join this collection',
      icon: 'globe-outline',
    },
  ];

  const renderPrivacyOption = (option: typeof privacyOptions[0]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.privacyOption,
        privacy === option.value && styles.privacyOptionSelected
      ]}
      onPress={() => setPrivacy(option.value)}
    >
      <View style={styles.privacyOptionContent}>
        <View style={styles.privacyOptionHeader}>
          <Ionicons 
            name={option.icon} 
            size={18} 
            color={privacy === option.value ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[
            styles.privacyOptionLabel,
            privacy === option.value && styles.privacyOptionLabelSelected
          ]}>
            {option.label}
          </Text>
        </View>
        <Text style={styles.privacyOptionDescription}>
          {option.description}
        </Text>
      </View>
      
      <View style={[
        styles.radioButton,
        privacy === option.value && styles.radioButtonSelected
      ]}>
        {privacy === option.value && (
          <View style={styles.radioButtonInner} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Collection</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Collection Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Collection Name *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter collection name"
                placeholderTextColor={Colors.textMuted}
                maxLength={50}
              />
              <Text style={styles.characterCount}>{title.length}/50</Text>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your collection (optional)"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{description.length}/200</Text>
            </View>

            {/* Privacy Settings */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Privacy Setting</Text>
              <View style={styles.privacyContainer}>
                {privacyOptions.map(renderPrivacyOption)}
              </View>
            </View>

            {/* Member Permissions */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Member Permissions</Text>
              <TouchableOpacity
                style={styles.switchContainer}
                onPress={() => setAllowMembersToAdd(!allowMembersToAdd)}
              >
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.switchLabel}>Allow members to add activities</Text>
                  <Text style={styles.switchDescription}>
                    Let collaborators add new places to this collection
                  </Text>
                </View>
                <View style={[styles.switch, allowMembersToAdd && styles.switchActive]}>
                  <View style={[styles.switchThumb, allowMembersToAdd && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={handleClose}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.createButton,
                (!title.trim() || isCreating) && styles.createButtonDisabled
              ]} 
              onPress={handleCreate}
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.createButtonText}>Creating...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="add" size={18} color={Colors.white} />
                  <Text style={styles.createButtonText}>Create Collection</Text>
                </>
              )}
            </TouchableOpacity>
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
    justifyContent: 'center', // instead of flex-end
  },

  modalContainer: {
    flex: 1, // take up all available vertical space
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    paddingTop: 20,
  },
  
  // Input Styles
  inputGroup: {
    marginBottom: 24,
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
  characterCount: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  
  // Privacy Options
  privacyContainer: {
    gap: 12,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacyOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  privacyOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  privacyOptionLabelSelected: {
    color: Colors.primary,
  },
  privacyOptionDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioButtonSelected: {
    borderColor: Colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  
  // Switch Styles
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginLeft: 12,
  },
  switchActive: {
    backgroundColor: Colors.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  
  // Footer Styles
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: Colors.primary,
  },
  createButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

export default EnhancedNewCollectionModal;