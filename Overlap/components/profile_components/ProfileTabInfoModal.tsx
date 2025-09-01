// components/profile_components/ProfileTabInfoModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

const { width: screenWidth } = Dimensions.get('window');

// Profile Tab Info Content for modals
export const PROFILE_TAB_INFO_CONTENT = {
  'Liked Activities': {
    title: "Liked Activities",
    features: [
      "Heart activities you discover to save them for later",
      "Build your personal activity library by liking places you visit",
      "Use liked activities to quickly populate meetup collections",
      "Share your favorite spots with friends during meetup planning",
      "Filter and search through all your saved activities",
      "Remove activities you're no longer interested in",
      "Perfect for remembering great restaurants, attractions, and experiences",
      "Sync across all your devices for easy access anywhere"
    ]
  },
  'Collections': {
    title: "Collections",
    features: [
      "Organize activities into themed collections (date nights, family fun, etc.)",
      "Create collaborative collections and invite friends to contribute",
      "Add activities from your liked list or discover new ones",
      "Use collections to pre-plan meetup activity options",
      "Set privacy levels: private, friends-only, or public",
      "Allow collection members to add their own suggestions",
      "Perfect for group trip planning and recurring meetup themes",
      "Share collections with meetup participants for easy activity selection"
    ]
  }
};

interface ProfileTabInfoModalProps {
  visible: boolean;
  tabType: string | null;
  onClose: () => void;
}

export const ProfileTabInfoModal: React.FC<ProfileTabInfoModalProps> = ({
  visible,
  tabType,
  onClose,
}) => {
  if (!tabType || !PROFILE_TAB_INFO_CONTENT[tabType]) return null;
  
  const content = PROFILE_TAB_INFO_CONTENT[tabType];
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Ionicons 
                name="information-circle" 
                size={24} 
                color={Colors.primary} 
                style={styles.modalIcon}
              />
              <Text style={styles.modalTitle}>{content.title}</Text>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <View style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>How to use {content.title.toLowerCase()}:</Text>
            {content.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
            
            {/* Additional context for meetup integration */}
            <View style={styles.meetupTip}>
              <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
              <Text style={styles.meetupTipText}>
                {tabType === 'Liked Activities' 
                  ? "Pro tip: When creating meetups, you can quickly add your liked activities to give participants great options!"
                  : "Pro tip: Collections are perfect for organizing activity themes that you can reuse across multiple meetups!"
                }
              </Text>
            </View>
          </View>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.gotItButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.gotItText}>Got it!</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: Math.min(screenWidth - SPACING.xl * 2, 400),
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    marginRight: SPACING.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginRight: SPACING.sm,
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    flex: 1,
  },
  meetupTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceLight,
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  meetupTipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
    marginLeft: SPACING.sm,
    fontStyle: 'italic',
  },
  modalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  gotItButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  gotItText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});

export default ProfileTabInfoModal;