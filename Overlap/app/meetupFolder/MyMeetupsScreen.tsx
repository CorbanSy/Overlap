// app/meetupFolder/MyMeetupsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  SectionList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getUserMeetups, removeMeetup, updateMeetup } from '../../_utils/storage/meetups';
import { getPendingMeetupInvites } from '../../_utils/storage/meetupInvites';
import { exportMyLikesToMeetup } from '../../_utils/storage/meetupActivities';
import { initializeTurboSession } from '../../_utils/storage/turboMeetup';
import { getFriendships } from '../../_utils/storage/social';
import MeetupCard from '../../components/meetup_components/MeetupCard';
import FriendPicker from '../../components/meetup_components/FriendPicker';
import StartMeetupScreen from './startMeetUp';
import TurboModeScreen from '../../components/turbo/TurboModeScreen';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getUserCollections } from '../../_utils/storage/likesCollections';
import CollectionSelectionModal from '../../components/meetup_components/modals/CollectionSelectionModal';

// Types
interface Friend {
  uid: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  displayName?: string;
}

interface Collection {
  id: string;
  name?: string;
  title?: string;
  activities?: any[];
}

interface Meetup {
  id: string;
  title?: string;
  ongoing: boolean;
  eventName?: string;
  participants?: any[];
  friends?: Friend[];
  creatorId?: string;
  collections?: Collection[];
  description?: string;
}

interface PendingInvite {
  id: string;
}

interface Props {
  onBack: () => void;
}

// Constants
const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceHover: '#21262D',
  primary: '#238636',
  primaryHover: '#2EA043',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  accent: '#F85149',
  border: '#30363D',
  success: '#2EA043',
  warning: '#FB8500',
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

const MyMeetupsScreen: React.FC<Props> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State management
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const authUid = getAuth()?.currentUser?.uid || null;
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showTurbo, setShowTurbo] = useState(false);
  const [currentMeetupId, setCurrentMeetupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Friend picker state
  const [friendPickerVisible, setFriendPickerVisible] = useState(false);
  const [currentMeetupForInvite, setCurrentMeetupForInvite] = useState<string | null>(null);
  const [userFriends, setUserFriends] = useState<Friend[]>([]);

  // Collection picker state
  const [collectionPickerVisible, setCollectionPickerVisible] = useState(false);
  const [currentMeetupForCollections, setCurrentMeetupForCollections] = useState<string | null>(null);
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);
  const [tempSelectedCollections, setTempSelectedCollections] = useState<Collection[]>([]);

  // Fetch data functions
  const fetchMeetups = useCallback(async () => {
    try {
      setError(null);
      const data = await getUserMeetups();
      setMeetups(data || []);
    } catch (err) {
      console.error('Error fetching meetups:', err);
      setError('Failed to load meetups');
    }
  }, []);

  const fetchInvites = useCallback(async () => {
    try {
      const invites = await getPendingMeetupInvites();
      setPendingInvites(invites || []);
    } catch (err) {
      console.error('Error fetching meetup invites:', err);
    }
  }, []);

  const fetchUserFriends = useCallback(async () => {
    try {
      const friendships = await getFriendships();
      const currentUserId = getAuth()?.currentUser?.uid;
      if (!currentUserId) return;

      const friends: Friend[] = [];
      friendships.forEach((friendship: any) => {
        const users = friendship.userDetails || {};
        Object.keys(users).forEach((userId) => {
          if (userId !== currentUserId) {
            const userDetail = users[userId];
            friends.push({
              uid: userId,
              name: userDetail.name || userDetail.displayName || '',
              email: userDetail.email || '',
              displayName: userDetail.displayName || '',
              avatarUrl: userDetail.avatarUrl || '',
            });
          }
        });
      });

      setUserFriends(friends);
    } catch (err) {
      console.error('Error fetching user friends:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMeetups(), fetchInvites(), fetchUserFriends()]);
    setLoading(false);
  }, [fetchMeetups, fetchInvites, fetchUserFriends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleJoinMeetup = useCallback(
    (meetupId: string) => {
      router.push({ pathname: '/meetupFolder/startMeetUp', params: { meetupId } });
    },
    [router]
  );

  // Event handlers
  const handleRemoveMeetup = useCallback(async (meetupId: string) => {
    Alert.alert('Remove Meetup', 'Are you sure you want to remove this meetup? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMeetup(meetupId);
            setMeetups((prev) => prev.filter((meetup) => meetup.id !== meetupId));
          } catch (err) {
            console.error('Error removing meetup:', err);
            Alert.alert('Error', 'Failed to remove meetup. Please try again.');
          }
        },
      },
    ]);
  }, []);

  const handleStartMeetup = useCallback(
    async (meetupId: string) => {
      try {
        await updateMeetup({ id: meetupId, ongoing: true });
        await exportMyLikesToMeetup(meetupId);
        setMeetups((prev) => prev.map((m) => (m.id === meetupId ? { ...m, ongoing: true } : m)));

        router.push({ pathname: '/meetupFolder/startMeetUp', params: { meetupId } });
      } catch (err) {
        console.error('Error starting meetup:', err);
        Alert.alert('Error', 'Failed to start meetup. Please try again.');
      }
    },
    [router]
  );

  const handleStopMeetup = useCallback(async (meetupId: string) => {
    Alert.alert('Stop Meetup', 'Are you sure you want to stop this meetup?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateMeetup({ id: meetupId, ongoing: false });
            setMeetups((prev) => prev.map((m) => (m.id === meetupId ? { ...m, ongoing: false } : m)));
          } catch (err) {
            console.error('Error stopping meetup:', err);
            Alert.alert('Error', 'Failed to stop meetup. Please try again.');
          }
        },
      },
    ]);
  }, []);

  // Handle Turbo Mode
  const handleTurboMode = useCallback(
    async (meetupId: string) => {
      try {
        const meetup = meetups.find((m) => m.id === meetupId);
        const groupSize = meetup?.participants?.length || 1;

        await initializeTurboSession(meetupId, groupSize);
        await exportMyLikesToMeetup(meetupId);

        setCurrentMeetupId(meetupId);
        setShowTurbo(true);
      } catch (err) {
        console.error('Error starting turbo mode:', err);
        Alert.alert('Error', 'Failed to start Turbo Mode. Please try again.');
      }
    },
    [meetups]
  );

  // Friend management handlers
  const handleAddFriend = useCallback(async (meetupId: string) => {
    setCurrentMeetupForInvite(meetupId);
    setFriendPickerVisible(true);
  }, []);

  const handleRemoveFriend = useCallback(
    async (meetupId: string, friendUid: string) => {
      try {
        const meetup = meetups.find((m) => m.id === meetupId);
        if (!meetup) throw new Error('Meetup not found');

        const updatedFriends = (meetup.friends || []).filter((friend: Friend) => friend.uid !== friendUid);

        await updateMeetup({ id: meetupId, friends: updatedFriends });

        setMeetups((prev) => prev.map((m) => (m.id === meetupId ? { ...m, friends: updatedFriends } : m)));
      } catch (error) {
        console.error('Error removing friend:', error);
        Alert.alert('Error', 'Failed to remove friend. Please try again.');
      }
    },
    [meetups]
  );

  // Collection management handlers
  const handleAddCollection = useCallback(
    async (meetupId: string) => {
      try {
        const all = await getUserCollections();
        const m = meetups.find((mm) => mm.id === meetupId);
        setAvailableCollections(all);

        // Use full objects for selection modal (better previews)
        const preselected: Collection[] = Array.isArray(m?.collections) ? m!.collections! : [];
        setTempSelectedCollections(preselected);

        setCurrentMeetupForCollections(meetupId);
        setCollectionPickerVisible(true);
      } catch (e) {
        console.error('Error loading collections', e);
        Alert.alert('Error', 'Unable to load your collections.');
      }
    },
    [meetups]
  );

  const toggleTempCollection = useCallback((col: Collection) => {
    setTempSelectedCollections((prev) => {
      const exists = prev.some((c) => c.id === col.id);
      if (exists) return prev.filter((c) => c.id !== col.id);
      return [...prev, col];
    });
  }, []);

  const handleCollectionsConfirm = useCallback(async () => {
    if (!currentMeetupForCollections) return;
    try {
      // Persist minimal + preview so UI can render without extra fetches
      const minimal = tempSelectedCollections.map((c) => ({
        id: c.id,
        title: c.title || c.name || 'Untitled Collection',
        activityCount: Array.isArray(c.activities) ? c.activities.length : 0,
        previewUrl: c.activities?.[0]?.image || c.activities?.[0]?.photoUrls?.[0] || null,
      }));
      await updateMeetup({ id: currentMeetupForCollections, collections: minimal });

      setMeetups(prev =>
        prev.map(m =>
          m.id === currentMeetupForCollections ? { ...m, collections: minimal } : m
        )
      );
    } catch (e) {
      console.error('Failed updating collections', e);
      Alert.alert('Error', 'Failed to update collections.');
    } finally {
      setCollectionPickerVisible(false);
      setCurrentMeetupForCollections(null);
    }
  }, [currentMeetupForCollections, tempSelectedCollections]);

  const handleRemoveCollection = useCallback(
    async (meetupId: string, collectionId: string) => {
      try {
        const m = meetups.find((mm) => mm.id === meetupId);
        const next = (m?.collections || []).filter((c: any) => c.id !== collectionId);
        await updateMeetup({ id: meetupId, collections: next });
        setMeetups((prev) => prev.map((mm) => (mm.id === meetupId ? { ...mm, collections: next } : mm)));
      } catch (e) {
        console.error('Could not remove collection', e);
        Alert.alert('Error', 'Could not remove collection.');
      }
    },
    [meetups]
  );

  // Handle when invites are sent from FriendPicker
  const handleInvitesSent = useCallback(
    (invitedCount: number) => {
      fetchData();
      console.log(`Successfully sent ${invitedCount} invitations`);
    },
    [fetchData]
  );

  // Get current friends for a specific meetup
  const getCurrentMeetupFriends = useCallback(
    (meetupId: string) => {
      const meetup = meetups.find((m) => m.id === meetupId);
      return meetup?.friends || [];
    },
    [meetups]
  );

  const handleRetry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Derived lists + sections
  const regularMeetups = useMemo(() => meetups.filter((m) => !m.ongoing), [meetups]);
  const ongoingMeetups = useMemo(() => meetups.filter((m) => m.ongoing), [meetups]);
  const totalMeetups = meetups.length;

  const sections = useMemo(() => {
    const arr: Array<{ title: string; data: Meetup[]; icon: keyof typeof Ionicons.glyphMap; badgeColor: string }> = [];
    if (ongoingMeetups.length) {
      arr.push({ title: 'Live Sessions', data: ongoingMeetups, icon: 'radio', badgeColor: COLORS.success });
    }
    if (regularMeetups.length) {
      arr.push({ title: 'Upcoming Meetups', data: regularMeetups, icon: 'calendar', badgeColor: COLORS.primary });
    }
    return arr;
  }, [ongoingMeetups, regularMeetups]);

  // Render TurboModeScreen if needed
  if (showTurbo && currentMeetupId) {
    return (
      <TurboModeScreen
        meetupId={currentMeetupId}
        onExit={() => {
          setShowTurbo(false);
          setCurrentMeetupId(null);
          onRefresh();
        }}
      />
    );
  }

  // Render StartMeetupScreen if needed
  if (showStart && currentMeetupId) {
    return (
      <StartMeetupScreen
        meetupId={currentMeetupId}
        onLeave={() => {
          setShowStart(false);
          setCurrentMeetupId(null);
          onRefresh();
        }}
      />
    );
  }

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your meetups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.accent} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render empty state
  const ListEmpty = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="calendar-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyStateTitle}>No Meetups Yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Create your first meetup to get started connecting with others!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: SPACING.md + insets.top }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backIconButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.title}>My Meetups</Text>
              {totalMeetups > 0 && (
                <Text style={styles.subtitle}>
                  {totalMeetups} meetup{totalMeetups !== 1 ? 's' : ''} total
                  {ongoingMeetups.length > 0 && <Text style={styles.liveIndicator}> • {ongoingMeetups.length} live</Text>}
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing} activeOpacity={0.7}>
              <Ionicons name="refresh" size={20} color={refreshing ? COLORS.textTertiary : COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content: SectionList for virtualization + sticky headers */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name={section.icon} size={20} color={section.badgeColor} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={[styles.badge, { borderColor: COLORS.border, backgroundColor: COLORS.surface }]}>
                <Text style={styles.badgeText}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderItem={({ item: meetup }) => {
            const isHost = authUid === meetup.creatorId;
            return (
              <MeetupCard
                meetup={meetup}
                onRemove={() => handleRemoveMeetup(meetup.id)}
                onStart={isHost ? handleStartMeetup : undefined}
                onStop={isHost ? handleStopMeetup : undefined}
                onTurboMode={isHost ? handleTurboMode : undefined}
                isHost={isHost}
                onJoin={!isHost ? handleJoinMeetup : undefined}
                onAddFriend={isHost ? handleAddFriend : undefined}
                onRemoveFriend={isHost ? handleRemoveFriend : undefined}
                onAddCollection={isHost ? handleAddCollection : undefined}
                onRemoveCollection={isHost ? handleRemoveCollection : undefined}
                currentUserId={authUid || undefined}
                currentUserEmail={getAuth()?.currentUser?.email || undefined}
              />
            );
          }}
          stickySectionHeadersEnabled
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={ListEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Friend Picker Modal */}
        <FriendPicker
          visible={friendPickerVisible}
          onClose={() => {
            setFriendPickerVisible(false);
            setCurrentMeetupForInvite(null);
          }}
          meetupId={currentMeetupForInvite || ''}
          currentFriends={currentMeetupForInvite ? getCurrentMeetupFriends(currentMeetupForInvite) : []}
          onInvitesSent={handleInvitesSent}
          availableFriends={userFriends}
        />

        {/* Collection Selection Modal */}
        <CollectionSelectionModal
          visible={collectionPickerVisible}
          collectionsList={availableCollections}
          selectedCollections={tempSelectedCollections}
          onToggleCollection={toggleTempCollection}
          onConfirm={handleCollectionsConfirm}
          onClose={() => {
            setCollectionPickerVisible(false);
            setCurrentMeetupForCollections(null);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  liveIndicator: {
    color: COLORS.success,
    fontWeight: '600',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 28,
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 160,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    minWidth: 160,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default MyMeetupsScreen;
