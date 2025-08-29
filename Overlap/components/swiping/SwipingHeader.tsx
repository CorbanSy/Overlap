//components/swiping/SwipingHeader.tsx
import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MeetupParticipants from '../MeetupParticipants';
import { getMeetupParticipants } from '../../_utils/storage/meetupParticipants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  border: '#30363D',
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

type Participant = {
  id: string;
  name: string;
  profilePicture?: string | null;
  email?: string | null;
  joinedAt?: any;
  role?: string;
};

type Props = {
  currentIndex: number;
  total: number;
  meetupId: string;
};

function SwipingHeader({ currentIndex, total, meetupId }: Props) {
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  // Load participants when modal is opened
  useEffect(() => {
    if (showParticipantsModal && participants.length === 0) {
      loadParticipants();
    }
  }, [showParticipantsModal]);

  const loadParticipants = async () => {
    if (loadingParticipants) return;
    
    console.log('Loading participants for meetup:', meetupId);
    setLoadingParticipants(true);
    try {
      const participantData = await getMeetupParticipants(meetupId);
      console.log('Loaded participants:', participantData);
      setParticipants(participantData);
    } catch (error) {
      console.error('Error loading participants:', error);
      // Set empty array on error so modal still shows
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const renderParticipantItem = ({ item }: { item: Participant }) => {
    console.log('Rendering participant item:', item.name, item.email);
    return (
      <View style={styles.participantItem}>
        <View style={styles.participantAvatar}>
          {item.profilePicture ? (
            <Image 
              source={{ uri: item.profilePicture }} 
              style={styles.avatarImage}
              onError={(error) => console.log('Image load error:', error.nativeEvent.error)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {item.name && item.name.length > 0 ? item.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{item.name || 'Unknown User'}</Text>
          {item.email && (
            <Text style={styles.participantEmail}>{item.email}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <View style={styles.headerArea}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {Math.min(currentIndex + 1, total)} / {total}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.participantsContainer}
          onPress={() => setShowParticipantsModal(true)}
          activeOpacity={0.7}
        >
          <MeetupParticipants meetupId={meetupId} maxVisible={5} />
          <Text style={styles.participantsHint}>Tap to see all participants</Text>
        </TouchableOpacity>
      </View>

      {/* Participants Modal */}
      <Modal
        visible={showParticipantsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowParticipantsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Participants ({participants.length})
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowParticipantsModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {loadingParticipants ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Loading participants...</Text>
              </View>
            ) : participants.length > 0 ? (
              <FlatList
                data={participants}
                keyExtractor={(item) => item.id}
                renderItem={renderParticipantItem}
                style={styles.participantsList}
                contentContainerStyle={styles.participantsListContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No participants found</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  participantsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  participantsHint: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: SPACING.xs,
    opacity: 0.8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%', // Changed from maxHeight to height
    paddingTop: SPACING.md,
    flex: 0, // Prevent flex issues
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  participantsList: {
    flex: 1,
    minHeight: 200, // Ensure minimum height
  },
  participantsListContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexGrow: 1, // Ensure content grows to fill space
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  participantAvatar: {
    marginRight: SPACING.md,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  participantEmail: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },

  // Loading and empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default memo(SwipingHeader);