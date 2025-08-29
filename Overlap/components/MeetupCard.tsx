//components/MeetupCard.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  LayoutChangeEvent,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FriendCard from './FriendCard';
import CollectionCard from './CollectionCard';

// Types
interface Friend {
  uid: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface Collection {
  id: string;
  name?: string;
  // Add other collection properties as needed
}

interface Meetup {
  id: string;
  eventName?: string;
  description?: string;
  date?: any;
  time?: any;
  location?: string;
  code?: string;
  category?: string;
  mood?: string;
  priceRange?: number;
  groupSize?: number;
  participants?: any[];
  meetupId?: string;
  creatorId?: string;
  createdAt?: any;
  ongoing?: boolean;
  friends?: Friend[];
  collections?: Collection[];
}

interface MeetupCardProps {
  meetup: Meetup;
  onEdit?: () => void;
  onRemove?: () => void;
  onStart?: (meetupId: string) => void;
  onStop?: (meetupId: string) => void;
  onTurboMode?: (meetupId: string) => void; // New prop for turbo mode
}

// Constants
const COLORS = {
  background: '#0D1117',
  card: '#1B1F24',
  surface: '#232A33',
  surfaceHover: '#2A3441',
  primary: '#238636',
  primaryHover: '#2EA043',
  accent: '#FFC107',
  accentHover: '#FFD54F',
  danger: '#F85149',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.12)',
  turbo: '#FF6B35', // New turbo color
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

const FRIEND_PREVIEW_COUNT = 8;
const COLLECTION_PREVIEW_COUNT = 6;
const DESCRIPTION_PREVIEW_LENGTH = 120;

// Utility functions
const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (typeof value?.toDate === 'function') return value.toDate();
  return new Date(value);
};

const formatDate = (value: any): string => {
  try {
    return toDate(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

const formatTime = (value: any): string => {
  try {
    return toDate(value).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid Time';
  }
};

const formatDateTime = (value: any): string => {
  try {
    return toDate(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid Date';
  }
};

const getPriceBadge = (priceRange?: number): string => {
  if (!priceRange || priceRange <= 0) return 'Free';
  const buckets = Math.max(1, Math.min(4, Math.ceil(priceRange / 25)));
  return '$'.repeat(buckets);
};

// Configure layout animations
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MeetupCard: React.FC<MeetupCardProps> = ({
  meetup,
  onEdit,
  onRemove,
  onStart,
  onStop,
  onTurboMode, // New prop
}) => {
  // State
  const [expanded, setExpanded] = useState(false);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);

  // Computed values
  const isWideLayout = cardWidth >= 560;
  const friends = Array.isArray(meetup?.friends) ? meetup.friends : [];
  const collections = Array.isArray(meetup?.collections) ? meetup.collections : [];
  const participantCount = meetup?.participants?.length || 1;
  
  const truncatedDescription = useMemo(() => {
    const description = meetup?.description || '';
    if (description.length <= DESCRIPTION_PREVIEW_LENGTH) return description;
    return description.slice(0, DESCRIPTION_PREVIEW_LENGTH) + '…';
  }, [meetup?.description]);

  const friendsToShow = showAllFriends ? friends : friends.slice(0, FRIEND_PREVIEW_COUNT);
  const collectionsToShow = showAllCollections 
    ? collections 
    : collections.slice(0, COLLECTION_PREVIEW_COUNT);

  // Event handlers
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setCardWidth(event.nativeEvent.layout.width);
  }, []);

  const handleToggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  const handleToggleMeetup = useCallback(() => {
    if (!meetup?.id) return;
    
    if (meetup.ongoing) {
      Alert.alert(
        'Stop Meetup',
        'Are you sure you want to stop this meetup?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop', style: 'destructive', onPress: () => onStop?.(meetup.id) },
        ]
      );
    } else {
      onStart?.(meetup.id);
    }
  }, [meetup?.id, meetup?.ongoing, onStart, onStop]);

  const handleTurboMode = useCallback(() => {
    if (!meetup?.id) return;
    
    // Removed the participant count check - turbo works with any number of participants
    Alert.alert(
      'Start Turbo Mode',
      'Ready for a 2-minute rapid-fire decision session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Turbo', style: 'default', onPress: () => onTurboMode?.(meetup.id) },
      ]
    );
  }, [meetup?.id, onTurboMode]);

  const handleRemove = useCallback(() => {
    Alert.alert(
      'Remove Meetup',
      'Are you sure you want to remove this meetup? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]
    );
  }, [onRemove]);

  const handleToggleFriends = useCallback(() => {
    setShowAllFriends(prev => !prev);
  }, []);

  const handleToggleCollections = useCallback(() => {
    setShowAllCollections(prev => !prev);
  }, []);

  // Render helpers
  const renderChip = (icon: string, text: string, key: string) => (
    <View key={key} style={styles.chip}>
      <Ionicons name={icon as any} size={14} color={COLORS.textSecondary} />
      <Text style={styles.chipText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );

  const renderMetaRow = (label: string, value?: string | number) => (
    <View key={label} style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value ?? 'N/A'}
      </Text>
    </View>
  );

  const renderFriendCard = ({ item, index }: { item: Friend; index: number }) => (
    <View style={styles.friendCard}>
      <Image
        source={
          item?.avatarUrl
            ? { uri: item.avatarUrl }
            : require('../assets/images/profile.png')
        }
        style={styles.friendAvatar}
      />
      <Text numberOfLines={2} style={styles.friendName}>
        {item?.name || item?.email || `Friend ${index + 1}`}
      </Text>
    </View>
  );

  const renderCollectionCard = ({ item }: { item: Collection }) => (
    <CollectionCard collection={item} previewOnly />
  );

  return (
    <View style={styles.cardContainer} onLayout={handleLayout}>
      {/* Status indicator */}
      {meetup.ongoing && <View style={styles.statusIndicator} />}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {meetup?.eventName || 'Untitled Meetup'}
          </Text>
          {meetup.ongoing && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={handleToggleExpanded}
            activeOpacity={0.7}
            accessibilityLabel={expanded ? 'Collapse details' : 'Expand details'}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          {/* Action buttons container */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                meetup.ongoing ? styles.stopButton : styles.startButton,
              ]}
              onPress={handleToggleMeetup}
              activeOpacity={0.8}
              accessibilityLabel={meetup.ongoing ? 'Stop meetup' : 'Start meetup'}
            >
              <Ionicons
                name={meetup.ongoing ? 'stop' : 'play'}
                size={16}
                color={COLORS.background}
              />
              <Text style={styles.actionButtonText}>
                {meetup.ongoing ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>

            {/* Turbo Mode button - show for all non-ongoing meetups */}
            {!meetup.ongoing && onTurboMode && (
              <TouchableOpacity
                style={[styles.actionButton, styles.turboButton]}
                onPress={handleTurboMode}
                activeOpacity={0.8}
                accessibilityLabel="Start Turbo Mode"
              >
                <Ionicons name="flash" size={14} color={COLORS.background} />
                <Text style={styles.turboButtonText}>Turbo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Chips row */}
      <View style={styles.chipsContainer}>
        {meetup.date && renderChip('calendar-outline', formatDate(meetup.date), 'date')}
        {meetup.time && renderChip('time-outline', formatTime(meetup.time), 'time')}
        {meetup.location && renderChip('location-outline', meetup.location, 'location')}
        {meetup.code && renderChip('key-outline', `Code: ${meetup.code}`, 'code')}
      </View>

      {/* Preview description */}
      {!expanded && truncatedDescription && (
        <Text style={styles.previewDescription}>{truncatedDescription}</Text>
      )}

      {/* Expanded content */}
      {expanded && (
        <View style={[styles.expandedContent, !isWideLayout && styles.expandedContentStacked]}>
          {/* Main content */}
          <View style={styles.mainContent}>
            {/* Full description */}
            <Text style={styles.description}>
              {meetup?.description || 'No description provided.'}
            </Text>

            {/* Collections section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Collections</Text>
                {collections.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{collections.length}</Text>
                  </View>
                )}
              </View>

              {collectionsToShow.length > 0 ? (
                <FlatList
                  horizontal
                  data={collectionsToShow}
                  keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
                  renderItem={renderCollectionCard}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              ) : (
                <Text style={styles.emptyText}>No collections added yet.</Text>
              )}

              {collections.length > COLLECTION_PREVIEW_COUNT && (
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={handleToggleCollections}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleButtonText}>
                    {showAllCollections
                      ? 'Show fewer'
                      : `Show all ${collections.length} collections`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Friends section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invited Friends</Text>
                {friends.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{friends.length}</Text>
                  </View>
                )}
              </View>

              {friendsToShow.length > 0 ? (
                <View style={styles.friendsGrid}>
                  {friendsToShow.map((friend, index) => (
                    <View key={friend?.uid || index} style={styles.friendCard}>
                      <Image
                        source={
                          friend?.avatarUrl
                            ? { uri: friend.avatarUrl }
                            : require('../assets/images/profile.png')
                        }
                        style={styles.friendAvatar}
                      />
                      <Text numberOfLines={2} style={styles.friendName}>
                        {friend?.name || friend?.email || `Friend ${index + 1}`}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No friends invited yet.</Text>
              )}

              {friends.length > FRIEND_PREVIEW_COUNT && (
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={handleToggleFriends}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleButtonText}>
                    {showAllFriends
                      ? 'Show fewer'
                      : `Show all ${friends.length} friends`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sidebar with details */}
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Details</Text>
            
            <View style={styles.metaContainer}>
              {renderMetaRow('Category', meetup?.category)}
              {renderMetaRow('Mood', meetup?.mood)}
              {renderMetaRow('Price', `${getPriceBadge(meetup?.priceRange)} (${meetup?.priceRange ?? 0})`)}
              {renderMetaRow('Group Size', meetup?.groupSize)}
              {renderMetaRow('Participants', participantCount)}
              {renderMetaRow('Created', formatDateTime(meetup?.createdAt))}
              {renderMetaRow('Meetup ID', meetup?.meetupId || meetup?.id)}
            </View>

            {/* Action buttons */}
            <View style={styles.sidebarActions}>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.iconButton, styles.editButton]}
                  onPress={onEdit}
                  activeOpacity={0.7}
                  accessibilityLabel="Edit meetup"
                >
                  <Ionicons name="pencil" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {onRemove && (
                <TouchableOpacity
                  style={[styles.iconButton, styles.removeButton]}
                  onPress={handleRemove}
                  activeOpacity={0.7}
                  accessibilityLabel="Remove meetup"
                >
                  <Ionicons name="trash" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: SPACING.xs,
  },
  liveBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  liveBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  expandButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  startButton: {
    backgroundColor: COLORS.accent,
  },
  stopButton: {
    backgroundColor: COLORS.accentHover,
  },
  turboButton: {
    backgroundColor: COLORS.turbo,
    paddingHorizontal: SPACING.sm, // Slightly smaller padding
  },
  turboButtonDisabled: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '700',
  },
  turboButtonText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
  },
  turboButtonTextDisabled: {
    color: COLORS.textTertiary,
  },
  participantIndicator: {
    marginBottom: SPACING.sm,
  },
  participantIndicatorText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  participantIndicatorWarning: {
    color: COLORS.turbo,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  previewDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  expandedContent: {
    flexDirection: 'row',
    gap: SPACING.xl,
  },
  expandedContentStacked: {
    flexDirection: 'column',
  },
  mainContent: {
    flex: 1,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  horizontalList: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  friendCard: {
    width: 80,
    height: 100,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: SPACING.xs,
  },
  friendName: {
    color: COLORS.text,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  toggleButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  sidebar: {
    minWidth: 200,
    maxWidth: 280,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sidebarTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  metaContainer: {
    marginBottom: SPACING.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metaLabel: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.sm,
  },
  sidebarActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: 'rgba(35, 134, 54, 0.1)',
    borderColor: COLORS.primary,
  },
  removeButton: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
    borderColor: COLORS.danger,
  },
});

export default MeetupCard;