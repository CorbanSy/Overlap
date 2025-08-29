// components/meetup_components/MeetupCard.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import CollectionCard from '../CollectionCard';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────
interface Friend {
  uid: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  displayName?: string;
}

interface Collection {
  id: string;
  title?: string;
  name?: string;
  activityCount?: number;
  previewUrl?: string | null;
  activities?: any[]; // optional, if present
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
  onTurboMode?: (meetupId: string) => void;
  isHost?: boolean;
  onJoin?: (meetupId: string) => void;
  onAddFriend?: (meetupId: string) => void;
  onRemoveFriend?: (meetupId: string, friendUid: string) => void;
  currentUserId?: string;
  currentUserEmail?: string;
  onAddCollection?: (meetupId: string) => void;
  onRemoveCollection?: (meetupId: string, collectionId: string) => void;
}

// ───────────────────────────────────────────────────────────────────────────────
// UI constants
// ───────────────────────────────────────────────────────────────────────────────
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
  turbo: '#FF6B35',
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
const WIDE_LAYOUT_BREAKPOINT = 560;

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────
const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
};

const formatDate = (value: any): string => {
  try {
    const date = toDate(value);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
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
    const date = toDate(value);
    if (isNaN(date.getTime())) return 'Invalid Time';
    return date.toLocaleTimeString('en-US', {
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
    const date = toDate(value);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', {
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

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ───────────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────────
const MeetupCard: React.FC<MeetupCardProps> = ({
  meetup,
  onEdit,
  onRemove,
  onStart,
  onStop,
  onTurboMode,
  isHost = false,
  onJoin,
  onAddFriend,
  onRemoveFriend,
  currentUserId,
  currentUserEmail,
  onAddCollection,
  onRemoveCollection,
}) => {
  // UI state
  const [expanded, setExpanded] = useState(false);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);

  // Auth state with better typing
  const [authUser, setAuthUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
  }>({
    uid: '',
    email: '',
    displayName: '',
    photoURL: null,
  });

  // Auth effect with proper cleanup and error handling
  useEffect(() => {
    if (currentUserId && currentUserEmail) return;

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setAuthUser({
        uid: user?.uid ?? '',
        email: (user?.email ?? '').toLowerCase(),
        displayName: user?.displayName ?? '',
        photoURL: user?.photoURL ?? null,
      });
    });

    return unsubscribe;
  }, [currentUserId, currentUserEmail]);

  // Memoized current user info
  const currentUser = useMemo(
    () => ({
      uid: (currentUserId ?? authUser.uid ?? '').trim(),
      email: (currentUserEmail ?? authUser.email ?? '').toLowerCase(),
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
    }),
    [currentUserId, currentUserEmail, authUser]
  );

  // Layout calculations
  const isWideLayout = useMemo(() => cardWidth >= WIDE_LAYOUT_BREAKPOINT, [cardWidth]);

  // Data processing with better validation
  const friendsRaw: Friend[] = useMemo(
    () => (Array.isArray(meetup?.friends) ? meetup.friends : []),
    [meetup?.friends]
  );

  const filteredFriends: Friend[] = useMemo(() => {
    return friendsRaw.filter((friend) => {
      if (!friend) return false;

      const friendUid = (friend.uid ?? '').trim();
      const friendEmail = (friend.email ?? '').toLowerCase();

      // Filter out current user by uid or email
      if (currentUser.uid && friendUid && friendUid === currentUser.uid) return false;
      if (currentUser.email && friendEmail && friendEmail === currentUser.email) return false;

      return true;
    });
  }, [friendsRaw, currentUser.uid, currentUser.email]);

  const collections: Collection[] = useMemo(
    () => (Array.isArray(meetup?.collections) ? meetup.collections : []),
    [meetup?.collections]
  );

  const participantCount = useMemo(
    () => (Array.isArray(meetup?.participants) ? meetup.participants.length : 1),
    [meetup?.participants]
  );

  // Host display logic with better fallbacks
  const hostDisplay: string = useMemo(() => {
    const hostId = (meetup?.creatorId ?? '').trim();
    if (!hostId) return 'Unknown';

    // Current user is host
    if (hostId === currentUser.uid) {
      return currentUser.displayName ? `You (${currentUser.displayName})` : 'You';
    }

    // Look for host in friends list first
    const hostFriend = friendsRaw.find((friend) => friend?.uid === hostId);
    if (hostFriend?.email) return hostFriend.email;
    if (hostFriend?.name) return hostFriend.name;

    // Look in participants
    const participants = Array.isArray(meetup?.participants) ? meetup.participants : [];
    const hostParticipant = participants.find((p: any) => {
      if (typeof p === 'string') return p === hostId;
      return (p?.uid ?? p?.id) === hostId;
    });

    if (typeof hostParticipant === 'object' && hostParticipant) {
      const email = hostParticipant.email ?? hostParticipant.emailLower;
      if (email) return email.toLowerCase();
    }

    // Fallback to shortened ID
    return `User ${hostId.slice(0, 8)}`;
  }, [meetup?.creatorId, meetup?.participants, friendsRaw, currentUser]);

  // Truncated description
  const truncatedDescription = useMemo(() => {
    const description = meetup?.description ?? '';
    if (description.length <= DESCRIPTION_PREVIEW_LENGTH) return description;
    return `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH)}…`;
  }, [meetup?.description]);

  // Display arrays
  const friendsToShow = useMemo(
    () => (showAllFriends ? filteredFriends : filteredFriends.slice(0, FRIEND_PREVIEW_COUNT)),
    [showAllFriends, filteredFriends]
  );

  const collectionsToShow = useMemo(
    () => (showAllCollections ? collections : collections.slice(0, COLLECTION_PREVIEW_COUNT)),
    [showAllCollections, collections]
  );

  // Event handlers
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setCardWidth(event.nativeEvent.layout.width);
  }, []);

  const handleToggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleJoin = useCallback(() => {
    if (!meetup?.id) {
      console.warn('Cannot join meetup: missing meetup ID');
      return;
    }
    onJoin?.(meetup.id);
  }, [meetup?.id, onJoin]);

  const handleToggleMeetup = useCallback(() => {
    if (!meetup?.id) {
      console.warn('Cannot toggle meetup: missing meetup ID');
      return;
    }

    const title = meetup.ongoing ? 'Stop Meetup' : 'Start Meetup';
    const message = meetup.ongoing
      ? 'Are you sure you want to stop this meetup?'
      : 'Are you sure you want to start this meetup?';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: meetup.ongoing ? 'Stop' : 'Start',
        style: meetup.ongoing ? 'destructive' : 'default',
        onPress: () => {
          if (meetup.ongoing) {
            onStop?.(meetup.id);
          } else {
            onStart?.(meetup.id);
          }
        },
      },
    ]);
  }, [meetup?.id, meetup?.ongoing, onStart, onStop]);

  const handleTurboMode = useCallback(() => {
    if (!meetup?.id) {
      console.warn('Cannot start turbo mode: missing meetup ID');
      return;
    }

    Alert.alert('Start Turbo Mode', 'Ready for a 2-minute rapid-fire decision session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Turbo', style: 'default', onPress: () => onTurboMode?.(meetup.id) },
    ]);
  }, [meetup?.id, onTurboMode]);

  const handleRemove = useCallback(() => {
    Alert.alert('Remove Meetup', 'Are you sure you want to remove this meetup? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onRemove },
    ]);
  }, [onRemove]);

  const handleToggleFriends = useCallback(() => {
    setShowAllFriends((prev) => !prev);
  }, []);

  const handleToggleCollections = useCallback(() => {
    setShowAllCollections((prev) => !prev);
  }, []);

  const handleAddFriend = useCallback(() => {
    if (!meetup?.id) {
      console.warn('Cannot add friend: missing meetup ID');
      return;
    }
    onAddFriend?.(meetup.id);
  }, [meetup?.id, onAddFriend]);

  const handleRemoveFriend = useCallback(
    (friendUid: string, friendName?: string) => {
      if (!meetup?.id) {
        console.warn('Cannot remove friend: missing meetup ID');
        return;
      }

      const displayName = friendName || friendUid.slice(0, 8);
      Alert.alert('Remove Friend', `Are you sure you want to remove ${displayName} from this meetup?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemoveFriend?.(meetup.id, friendUid) },
      ]);
    },
    [meetup?.id, onRemoveFriend]
  );

  const handleAddCollection = useCallback(() => {
    if (!meetup?.id) {
      console.warn('Cannot add collection: missing meetup ID');
      return;
    }
    onAddCollection?.(meetup.id);
  }, [meetup?.id, onAddCollection]);

  const handleRemoveCollection = useCallback(
    (collectionId: string, name?: string) => {
      if (!meetup?.id) {
        console.warn('Cannot remove collection: missing meetup ID');
        return;
      }
      Alert.alert(
        'Remove Collection',
        `Remove “${name || 'this collection'}” from this meetup?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => onRemoveCollection?.(meetup.id, collectionId) },
        ]
      );
    },
    [meetup?.id, onRemoveCollection]
  );

  // Render helpers with better key generation
  const renderChip = useCallback(
    (icon: string, text: string, key: string) => (
      <View key={key} style={styles.chip}>
        <Ionicons name={icon as any} size={14} color={COLORS.textSecondary} />
        <Text style={styles.chipText} numberOfLines={1}>
          {text}
        </Text>
      </View>
    ),
    []
  );

  const renderMetaRow = useCallback(
    (label: string, value?: string | number) => (
      <View key={label} style={styles.metaRow}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {value ?? 'N/A'}
        </Text>
      </View>
    ),
    []
  );

  const renderCollectionItem = useCallback(
    ({ item }: { item: Collection }) => {
      const label = item.title || item.name || 'Untitled';
      const count = item.activityCount ?? (Array.isArray(item.activities) ? item.activities.length : 0);
      const preview = item.previewUrl || item.activities?.[0]?.image || item.activities?.[0]?.photoUrls?.[0] || null;

      return (
        <View style={styles.collectionWrap} key={item.id}>
          <View style={styles.meetupCollectionCard}>
            <View style={styles.cardPreviewSection}>
              {preview ? (
                <Image source={{ uri: preview }} style={styles.cardPreviewImageFull} />
              ) : (
                <View style={styles.cardDefaultPreview}>
                  <Ionicons name="folder-outline" size={24} color={COLORS.accent} />
                </View>
              )}
            </View>

            <View style={styles.collectionHeader}>
              <Ionicons name="folder" size={14} color={COLORS.accent} />
              <Text style={styles.collectionTitle} numberOfLines={1}>{label}</Text>
            </View>
            <Text style={styles.activityCountText}>
              {count} {count === 1 ? 'activity' : 'activities'}
            </Text>
          </View>

          {isHost && onRemoveCollection && (
            <TouchableOpacity
              style={styles.removeCollectionButton}
              onPress={() => handleRemoveCollection(item.id, label)}
              activeOpacity={0.7}
              accessibilityLabel={`Remove collection ${label}`}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={12} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [isHost, onRemoveCollection, handleRemoveCollection]
  );

  const renderFriendCard = useCallback(
    (friend: Friend, index: number) => {
      const displayName =
        friend?.name || friend?.displayName || friend?.email || `User ${friend.uid?.slice(0, 8) || index + 1}`;

      return (
        <View key={`friend-${friend.uid}-${index}`} style={styles.friendCard}>
          {/* Remove button for hosts */}
          {isHost && onRemoveFriend && (
            <TouchableOpacity
              style={styles.removeFriendButton}
              onPress={() => handleRemoveFriend(friend.uid, friend.name || friend.email)}
              activeOpacity={0.7}
              accessibilityLabel={`Remove ${friend.name || friend.email || 'friend'}`}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={12} color={COLORS.danger} />
            </TouchableOpacity>
          )}

          <Image
            source={
              friend?.avatarUrl ? { uri: friend.avatarUrl } : require('../../assets/images/profile.png')
            }
            style={styles.friendAvatar}
            defaultSource={require('../../assets/images/profile.png')}
          />
          <Text numberOfLines={2} style={styles.friendName}>
            {displayName}
          </Text>
        </View>
      );
    },
    [isHost, onRemoveFriend, handleRemoveFriend]
  );

  // Validation
  if (!meetup) {
    return (
      <View style={[styles.cardContainer, styles.errorContainer]}>
        <Text style={styles.errorText}>Invalid meetup data</Text>
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.cardContainer} onLayout={handleLayout}>
      {/* Status indicator */}
      {meetup.ongoing && <View style={styles.statusIndicator} />}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {meetup.eventName || 'Untitled Meetup'}
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
            accessibilityRole="button"
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.actionButtonsContainer}>
            {isHost ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, meetup.ongoing ? styles.stopButton : styles.startButton]}
                  onPress={handleToggleMeetup}
                  activeOpacity={0.8}
                  accessibilityLabel={meetup.ongoing ? 'Stop meetup' : 'Start meetup'}
                  accessibilityRole="button"
                >
                  <Ionicons name={meetup.ongoing ? 'stop' : 'play'} size={16} color={COLORS.background} />
                  <Text style={styles.actionButtonText}>{meetup.ongoing ? 'Stop' : 'Start'}</Text>
                </TouchableOpacity>

                {!meetup.ongoing && onTurboMode && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.turboButton]}
                    onPress={handleTurboMode}
                    activeOpacity={0.8}
                    accessibilityLabel="Start Turbo Mode"
                    accessibilityRole="button"
                  >
                    <Ionicons name="flash" size={14} color={COLORS.background} />
                    <Text style={styles.turboButtonText}>Turbo</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              meetup.ongoing &&
              onJoin && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={handleJoin}
                  activeOpacity={0.8}
                  accessibilityLabel="Join live meetup"
                  accessibilityRole="button"
                >
                  <Ionicons name="enter" size={16} color={COLORS.background} />
                  <Text style={styles.actionButtonText}>Join</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </View>

      {/* Chips */}
      <View style={styles.chipsContainer}>
        {meetup.date && renderChip('calendar-outline', formatDate(meetup.date), 'date')}
        {meetup.time && renderChip('time-outline', formatTime(meetup.time), 'time')}
        {meetup.location && renderChip('location-outline', meetup.location, 'location')}
        {meetup.code && renderChip('key-outline', `Code: ${meetup.code}`, 'code')}
      </View>

      {/* Description preview */}
      {!expanded && truncatedDescription && <Text style={styles.previewDescription}>{truncatedDescription}</Text>}

      {/* Expanded content */}
      {expanded && (
        <View style={[styles.expandedContent, !isWideLayout && styles.expandedContentStacked]}>
          {/* Main content */}
          <View style={styles.mainContent}>
            <Text style={styles.description}>{meetup.description || 'No description provided.'}</Text>

            {/* Collections section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Collections</Text>
                <View style={styles.sectionHeaderActions}>
                  {collections.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{collections.length}</Text>
                    </View>
                  )}
                  {isHost && onAddCollection && (
                    <TouchableOpacity
                      style={styles.addFriendButton}
                      onPress={handleAddCollection}
                      activeOpacity={0.7}
                      accessibilityLabel="Add collections to meetup"
                      accessibilityRole="button"
                    >
                      <Ionicons name="folder-open" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {collectionsToShow.length > 0 ? (
                <FlatList
                  horizontal
                  data={collectionsToShow}
                  keyExtractor={(item) => item?.id || `collection-${Math.random()}`}
                  renderItem={renderCollectionItem}
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
                  accessibilityRole="button"
                >
                  <Text style={styles.toggleButtonText}>
                    {showAllCollections ? 'Show fewer' : `Show all ${collections.length} collections`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Friends section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invited Friends</Text>
                <View style={styles.sectionHeaderActions}>
                  {filteredFriends.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{filteredFriends.length}</Text>
                    </View>
                  )}
                  {isHost && onAddFriend && (
                    <TouchableOpacity
                      style={styles.addFriendButton}
                      onPress={handleAddFriend}
                      activeOpacity={0.7}
                      accessibilityLabel="Add friend to meetup"
                      accessibilityRole="button"
                    >
                      <Ionicons name="person-add" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {friendsToShow.length > 0 ? (
                <View style={styles.friendsGrid}>{friendsToShow.map(renderFriendCard)}</View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyText}>No friends invited yet.</Text>
                  {isHost && onAddFriend && (
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={handleAddFriend}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      <Ionicons name="person-add" size={16} color={COLORS.primary} />
                      <Text style={styles.emptyStateButtonText}>Invite Friends</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {filteredFriends.length > FRIEND_PREVIEW_COUNT && (
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={handleToggleFriends}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.toggleButtonText}>
                    {showAllFriends ? 'Show fewer' : `Show all ${filteredFriends.length} friends`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sidebar */}
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Details</Text>

            <View style={styles.metaContainer}>
              {renderMetaRow('Host', hostDisplay)}
              {renderMetaRow('Category', meetup.category)}
              {renderMetaRow('Mood', meetup.mood)}
              {renderMetaRow('Price', `${getPriceBadge(meetup.priceRange)} (${meetup.priceRange ?? 0})`)}
              {renderMetaRow('Group Size', meetup.groupSize?.toString())}
              {renderMetaRow('Participants', participantCount.toString())}
              {renderMetaRow('Created', formatDateTime(meetup.createdAt))}
              {renderMetaRow('Meetup ID', meetup.meetupId || meetup.id)}
            </View>

            <View style={styles.sidebarActions}>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.iconButton, styles.editButton]}
                  onPress={onEdit}
                  activeOpacity={0.7}
                  accessibilityLabel="Edit meetup"
                  accessibilityRole="button"
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
                  accessibilityRole="button"
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

// ───────────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────────
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
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '500',
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
    paddingHorizontal: SPACING.sm,
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
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  collectionWrap: {
    position: 'relative',
  },
  removeCollectionButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    zIndex: 1,
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
    position: 'relative',
  },
  removeFriendButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    zIndex: 1,
  },
  addFriendButton: {
    backgroundColor: 'rgba(35, 134, 54, 0.1)',
    borderRadius: 8,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
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
  emptyStateContainer: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(35, 134, 54, 0.1)',
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
  },
  emptyStateButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
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
  meetupCollectionCard: {
  backgroundColor: COLORS.surface,
  borderRadius: 8,
  padding: SPACING.md,
  borderWidth: 1,
  borderColor: COLORS.border,
  width: 140,
},
cardPreviewSection: {
  height: 60,
  borderRadius: 8,
  marginBottom: SPACING.sm,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: COLORS.border,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#20262d',
},
cardPreviewImageFull: { width: '100%', height: '100%' },
collectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
collectionTitle: { color: COLORS.text, marginLeft: 6, fontWeight: '600', fontSize: 13, flex: 1 },
activityCountText: { color: COLORS.textTertiary, fontSize: 11, fontWeight: '500' },
});

export default MeetupCard;
