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
  activities?: any[];
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
// UI constants - Cleaner color palette
// ───────────────────────────────────────────────────────────────────────────────
const COLORS = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  surface: '#262626',
  surfaceHover: '#2D2D2D',
  primary: '#00D9FF',
  primaryHover: '#00B8D4',
  accent: '#FFB800',
  danger: '#FF453A',
  success: '#32D74B',
  text: '#FFFFFF',
  textSecondary: '#A1A1A6',
  textTertiary: '#6D6D70',
  border: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.05)',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

const FRIEND_PREVIEW_COUNT = 6;
const COLLECTION_PREVIEW_COUNT = 4;
const DESCRIPTION_PREVIEW_LENGTH = 100;
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
        `Remove "${name || 'this collection'}" from this meetup?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => onRemoveCollection?.(meetup.id, collectionId) },
        ]
      );
    },
    [meetup?.id, onRemoveCollection]
  );

  // Render helpers
  const renderCollectionItem = useCallback(
    ({ item }: { item: Collection }) => {
      const label = item.title || item.name || 'Untitled';
      const count = item.activityCount ?? (Array.isArray(item.activities) ? item.activities.length : 0);
      const preview = item.previewUrl || item.activities?.[0]?.image || item.activities?.[0]?.photoUrls?.[0] || null;

      return (
        <View style={styles.collectionWrap} key={item.id}>
          <View style={styles.collectionCard}>
            <View style={styles.collectionPreview}>
              {preview ? (
                <Image source={{ uri: preview }} style={styles.collectionPreviewImage} />
              ) : (
                <View style={styles.collectionPreviewPlaceholder}>
                  <Ionicons name="folder-outline" size={20} color={COLORS.accent} />
                </View>
              )}
            </View>

            <View style={styles.collectionInfo}>
              <Text style={styles.collectionTitle} numberOfLines={1}>{label}</Text>
              <Text style={styles.collectionCount}>
                {count} {count === 1 ? 'activity' : 'activities'}
              </Text>
            </View>
          </View>

          {isHost && onRemoveCollection && (
            <TouchableOpacity
              style={styles.removeButton}
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
          {isHost && onRemoveFriend && (
            <TouchableOpacity
              style={styles.removeButton}
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
      {/* Live indicator */}
      {meetup.ongoing && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={2}>
            {meetup.eventName || 'Untitled Meetup'}
          </Text>
          
          {/* Key info badges */}
          <View style={styles.badgeRow}>
            {meetup.date && (
              <View style={styles.badge}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.primary} />
                <Text style={styles.badgeText}>{formatDate(meetup.date)}</Text>
              </View>
            )}
            {meetup.time && (
              <View style={styles.badge}>
                <Ionicons name="time-outline" size={12} color={COLORS.primary} />
                <Text style={styles.badgeText}>{formatTime(meetup.time)}</Text>
              </View>
            )}
            {meetup.location && (
              <View style={[styles.badge, { maxWidth: 120 }]}>
                <Ionicons name="location-outline" size={12} color={COLORS.primary} />
                <Text numberOfLines={1} style={styles.badgeText}>{meetup.location}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          {isHost ? (
            <View style={styles.hostActions}>
              <TouchableOpacity
                style={[styles.primaryButton, meetup.ongoing && styles.primaryButtonStop]}
                onPress={handleToggleMeetup}
                activeOpacity={0.8}
                accessibilityLabel={meetup.ongoing ? 'Stop meetup' : 'Start meetup'}
              >
                <Ionicons 
                  name={meetup.ongoing ? 'stop' : 'play'} 
                  size={16} 
                  color={COLORS.background} 
                />
                <Text style={styles.primaryButtonText}>
                  {meetup.ongoing ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>
              
              {!meetup.ongoing && onTurboMode && (
                <TouchableOpacity
                  style={styles.turboButton}
                  onPress={handleTurboMode}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={14} color={COLORS.accent} />
                  <Text style={styles.turboButtonText}>Turbo</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.expandButton}
                onPress={handleToggleExpanded}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={expanded ? 'chevron-up' : 'chevron-down'} 
                  size={18} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.guestActions}>
              {meetup.ongoing && onJoin && (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={handleJoin}
                  activeOpacity={0.8}
                >
                  <Ionicons name="enter-outline" size={16} color={COLORS.background} />
                  <Text style={styles.joinButtonText}>Join Live</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.expandButton}
                onPress={handleToggleExpanded}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={expanded ? 'chevron-up' : 'chevron-down'} 
                  size={18} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.statText}>{participantCount}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="folder-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.statText}>{collections.length}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="person-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.statText}>{filteredFriends.length}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.priceText}>{getPriceBadge(meetup.priceRange)}</Text>
        </View>
      </View>

      {/* Description preview */}
      {!expanded && !!truncatedDescription && (
        <Text style={styles.previewDescription}>{truncatedDescription}</Text>
      )}

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Description */}
          {meetup.description && (
            <View style={styles.section}>
              <Text style={styles.description}>{meetup.description}</Text>
            </View>
          )}

          {/* Collections */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Collections</Text>
              <View style={styles.sectionActions}>
                {collections.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{collections.length}</Text>
                  </View>
                )}
                {isHost && onAddCollection && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddCollection}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primary} />
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
              <Text style={styles.emptyText}>No collections yet</Text>
            )}

            {collections.length > COLLECTION_PREVIEW_COUNT && (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={handleToggleCollections}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleButtonText}>
                  {showAllCollections ? 'Show less' : `Show all ${collections.length}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Friends */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friends</Text>
              <View style={styles.sectionActions}>
                {filteredFriends.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{filteredFriends.length}</Text>
                  </View>
                )}
                {isHost && onAddFriend && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddFriend}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {friendsToShow.length > 0 ? (
              <View style={styles.friendsGrid}>
                {friendsToShow.map(renderFriendCard)}
              </View>
            ) : (
              <Text style={styles.emptyText}>No friends invited yet</Text>
            )}

            {filteredFriends.length > FRIEND_PREVIEW_COUNT && (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={handleToggleFriends}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleButtonText}>
                  {showAllFriends ? 'Show less' : `Show all ${filteredFriends.length}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Details grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Host</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{hostDisplay}</Text>
              </View>
              {meetup.category && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{meetup.category}</Text>
                </View>
              )}
              {meetup.mood && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Mood</Text>
                  <Text style={styles.detailValue}>{meetup.mood}</Text>
                </View>
              )}
              {meetup.groupSize && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Group Size</Text>
                  <Text style={styles.detailValue}>{meetup.groupSize}</Text>
                </View>
              )}
              {meetup.code && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Code</Text>
                  <Text style={styles.detailValue}>{meetup.code}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Admin actions */}
          {(onEdit || onRemove) && (
            <View style={styles.adminActions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={onEdit}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
              {onRemove && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleRemove}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.deleteButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
    borderRadius: 20,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    shadowColor: COLORS.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
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

  liveIndicator: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.background,
  },

  liveText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },

  titleSection: {
    flex: 1,
    marginRight: SPACING.lg,
  },

  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: SPACING.sm,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  badgeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },

  headerActions: {
    alignItems: 'flex-end',
  },

  hostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  guestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    gap: 6,
  },

  primaryButtonStop: {
    backgroundColor: COLORS.danger,
  },

  primaryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '700',
  },

  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    gap: 6,
  },

  joinButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '700',
  },

  turboButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    gap: 4,
  },

  turboButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  expandButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm,
  },

  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },

  priceText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },

  previewDescription: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },

  expandedContent: {
    gap: SPACING.xl,
  },

  section: {
    gap: SPACING.md,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },

  countBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  countBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  addButton: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: SPACING.sm,
  },

  description: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },

  horizontalList: {
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },

  collectionWrap: {
    position: 'relative',
  },

  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    zIndex: 1,
  },

  collectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    width: 140,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  collectionPreview: {
    height: 80,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },

  collectionPreviewImage: {
    width: '100%',
    height: '100%',
  },

  collectionPreviewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  collectionInfo: {
    gap: 4,
  },

  collectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },

  collectionCount: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },

  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },

  friendCard: {
    width: 90,
    height: 100,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },

  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: SPACING.xs,
  },

  friendName: {
    color: COLORS.text,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },

  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },

  toggleButton: {
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  toggleButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  detailsGrid: {
    gap: SPACING.sm,
  },

  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  detailLabel: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },

  adminActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: 6,
  },

  editButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    gap: 6,
  },

  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MeetupCard;