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
  FlatList,
  TextInput,
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
import EditMeetupScreen from './edit';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getUserCollections } from '../../_utils/storage/likesCollections';
import CollectionSelectionModal from '../../components/meetup_components/modals/CollectionSelectionModal';
import { Colors } from '../../constants/colors'; // Import your Colors from constants

type TabKey = 'active' | 'host' | 'participant' | 'all';

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
  /** Which tab to open on mount; passed by meetupHome stat cards */
  initialTab?: TabKey;
}

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

const MyMeetupsScreen: React.FC<Props> = ({ onBack, initialTab = 'active' }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // --- State ---
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const authUid = getAuth()?.currentUser?.uid || null;
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showTurbo, setShowTurbo] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [currentMeetupId, setCurrentMeetupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  useEffect(() => setActiveTab(initialTab), [initialTab]);

  // Friend picker
  const [friendPickerVisible, setFriendPickerVisible] = useState(false);
  const [currentMeetupForInvite, setCurrentMeetupForInvite] = useState<string | null>(null);
  const [userFriends, setUserFriends] = useState<Friend[]>([]);

  // Collection picker
  const [collectionPickerVisible, setCollectionPickerVisible] = useState(false);
  const [currentMeetupForCollections, setCurrentMeetupForCollections] = useState<string | null>(null);
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);
  const [tempSelectedCollections, setTempSelectedCollections] = useState<Collection[]>([]);

  // --- Data fetch ---
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMeetups(), fetchInvites(), fetchUserFriends()]);
    setLoading(false);
  }, [fetchMeetups, fetchInvites, fetchUserFriends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Callbacks / actions ---
  const handleEditMeetup = useCallback((meetupId: string) => {
    setCurrentMeetupId(meetupId);
    setShowEdit(true);
  }, []);

  const handleJoinMeetup = useCallback(
    (meetupId: string) => {
      router.push({ pathname: '/meetupFolder/startMeetUp', params: { meetupId } });
    },
    [router]
  );

  // --- Search filtering ---
  const filteredMeetups = useMemo(() => {
    if (!searchQuery.trim()) return meetups;
    const q = searchQuery.toLowerCase();
    return meetups.filter(
      (m) => (m.eventName || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
    );
  }, [meetups, searchQuery]);

  const isHost = useCallback((m: Meetup) => !!authUid && m.creatorId === authUid, [authUid]);

  // Build groups for tabs
  const hostMeetups = useMemo(() => filteredMeetups.filter((m) => isHost(m)), [filteredMeetups, isHost]);
  const participantMeetups = useMemo(
    () => filteredMeetups.filter((m) => !isHost(m)),
    [filteredMeetups, isHost]
  );
  const activeMeetups = useMemo(() => filteredMeetups.filter((m) => m.ongoing), [filteredMeetups]);

  const counts = {
    active: activeMeetups.length,
    host: hostMeetups.length,
    participant: participantMeetups.length,
    all: filteredMeetups.length,
    total: meetups.length,
  };

  const dataForTab = useMemo(() => {
    switch (activeTab) {
      case 'host':
        return hostMeetups;
      case 'participant':
        return participantMeetups;
      case 'all':
        return filteredMeetups;
      default:
        return activeMeetups; // 'active'
    }
  }, [activeTab, hostMeetups, participantMeetups, activeMeetups, filteredMeetups]);

  // --- Search handlers ---
  const handleSearchPress = useCallback(() => setShowSearchBar(true), []);
  const handleSearchClose = useCallback(() => {
    setShowSearchBar(false);
    setSearchQuery('');
  }, []);
  const handleClearSearch = useCallback(() => setSearchQuery(''), []);

  // --- Mutations / actions ---
  const handleRemoveMeetup = useCallback(async (meetupId: string) => {
    Alert.alert('Remove Meetup', 'Are you sure you want to remove this meetup? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMeetup(meetupId);
            setMeetups((prev) => prev.filter((m) => m.id !== meetupId));
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

  const handleAddFriend = useCallback((meetupId: string) => {
    setCurrentMeetupForInvite(meetupId);
    setFriendPickerVisible(true);
  }, []);

  const handleRemoveFriend = useCallback(
    async (meetupId: string, friendUid: string) => {
      try {
        const meetup = meetups.find((m) => m.id === meetupId);
        if (!meetup) throw new Error('Meetup not found');
        const updatedFriends = (meetup.friends || []).filter((f: Friend) => f.uid !== friendUid);
        await updateMeetup({ id: meetupId, friends: updatedFriends });
        setMeetups((prev) => prev.map((m) => (m.id === meetupId ? { ...m, friends: updatedFriends } : m)));
      } catch (err) {
        console.error('Error removing friend:', err);
        Alert.alert('Error', 'Failed to remove friend. Please try again.');
      }
    },
    [meetups]
  );

  const handleAddCollection = useCallback(
    async (meetupId: string) => {
      try {
        const all = await getUserCollections();
        const m = meetups.find((mm) => mm.id === meetupId);
        setAvailableCollections(all);
        const preselected: Collection[] = Array.isArray(m?.collections) ? (m!.collections as Collection[]) : [];
        setTempSelectedCollections(preselected);
        setCurrentMeetupForCollections(meetupId);
        setCollectionPickerVisible(true);
      } catch (err) {
        console.error('Error loading collections', err);
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
      const minimal = tempSelectedCollections.map((c) => ({
        id: c.id,
        title: c.title || c.name || 'Untitled Collection',
        activityCount: Array.isArray(c.activities) ? c.activities.length : 0,
        previewUrl: c.activities?.[0]?.image || c.activities?.[0]?.photoUrls?.[0] || null,
      }));
      await updateMeetup({ id: currentMeetupForCollections, collections: minimal });
      setMeetups((prev) =>
        prev.map((m) => (m.id === currentMeetupForCollections ? { ...m, collections: minimal } : m))
      );
    } catch (err) {
      console.error('Failed updating collections', err);
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
      } catch (err) {
        console.error('Could not remove collection', err);
        Alert.alert('Error', 'Could not remove collection.');
      }
    },
    [meetups]
  );

  const handleInvitesSent = useCallback(
    (invitedCount: number) => {
      fetchAll();
      console.log(`Successfully sent ${invitedCount} invitations`);
    },
    [fetchAll]
  );

  const getCurrentMeetupFriends = useCallback(
    (meetupId: string) => {
      const m = meetups.find((x) => x.id === meetupId);
      return m?.friends || [];
    },
    [meetups]
  );

  const handleRetry = useCallback(() => fetchAll(), [fetchAll]);

  // ────────────────────────────────────────────────────────────────────
  // IMPORTANT: Early returns for full-screen subflows MUST come
  // AFTER all hooks so the hook order is stable across renders.
  // ────────────────────────────────────────────────────────────────────

  // Loading / Error (also safe early returns - still after all hooks)
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your meetups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
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

  // Alternate full-screen flows (moved here)
  if (showEdit && currentMeetupId) {
    return (
      <EditMeetupScreen
        meetupId={currentMeetupId}
        onBack={() => {
          setShowEdit(false);
          setCurrentMeetupId(null);
        }}
        onSaved={onRefresh}
      />
    );
  }

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

  // --- Empty state for current tab ---
  const EmptyForTab = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyStateTitle}>
        {searchQuery
          ? 'No matching meetups'
          : activeTab === 'active'
          ? 'No Active Meetups'
          : activeTab === 'host'
          ? 'No Hosted Meetups'
          : activeTab === 'participant'
          ? 'No Participant Meetups'
          : 'No Meetups Yet'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchQuery
          ? `No meetups match "${searchQuery}"`
          : activeTab === 'active'
          ? 'Start or join a session to see it here.'
          : activeTab === 'host'
          ? 'Create a meetup to host your friends.'
          : activeTab === 'participant'
          ? 'Join a meetup to participate.'
          : 'Create or join your first meetup.'}
      </Text>
      {searchQuery && (
        <TouchableOpacity style={styles.clearSearchButton} onPress={handleClearSearch}>
          <Text style={styles.clearSearchText}>Clear search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // --- Main UI ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: SPACING.md + insets.top }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backIconButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color={Colors.text} />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.title}>My Meetups</Text>
              {!showSearchBar && (
                <Text style={styles.subtitle}>
                  {counts.total} meetup{counts.total !== 1 ? 's' : ''} total
                  {counts.active > 0 && <Text style={styles.liveIndicator}> • {counts.active} active</Text>}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {!showSearchBar && (
                <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress} activeOpacity={0.7}>
                  <Ionicons name="search" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onRefresh}
                disabled={refreshing}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={20} color={refreshing ? Colors.textMuted : Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        {showSearchBar && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search meetups..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={handleSearchClose} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs (variable width, fill across) */}
        <View style={styles.tabsContainer}>
          {(['active', 'host', 'participant', 'all'] as TabKey[]).map((key) => {
            const label =
              key === 'active' ? 'Active' : key === 'host' ? 'Host' : key === 'participant' ? 'Participant' : 'All';
            const count =
              key === 'active' ? counts.active : key === 'host' ? counts.host : key === 'participant' ? counts.participant : counts.all;

            const selected = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.9}
                style={[styles.tabPill, selected && styles.tabPillSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
                <View style={[styles.tabBadge, selected && styles.tabBadgeSelected]}>
                  <Text style={[styles.tabBadgeText, selected && styles.tabBadgeTextSelected]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Results Info */}
        {searchQuery.length > 0 && (
          <View style={styles.searchResultsInfo}>
            <Text style={styles.searchResultsText}>
              {dataForTab.length === 0
                ? `No results for "${searchQuery}"`
                : `${dataForTab.length} result${dataForTab.length !== 1 ? 's' : ''} for "${searchQuery}"`}
            </Text>
          </View>
        )}

        {/* Main List (per tab) */}
        <FlatList
          data={dataForTab}
          keyExtractor={(item) => item.id}
          renderItem={({ item: meetup }) => {
            const amHost = !!authUid && meetup.creatorId === authUid;
            return (
              <MeetupCard
                meetup={meetup}
                onEdit={amHost ? () => handleEditMeetup(meetup.id) : undefined}
                onRemove={() => handleRemoveMeetup(meetup.id)}
                onStart={amHost ? handleStartMeetup : undefined}
                onStop={amHost ? handleStopMeetup : undefined}
                onTurboMode={amHost ? handleTurboMode : undefined}
                isHost={amHost}
                onJoin={!amHost ? handleJoinMeetup : undefined}
                onAddFriend={amHost ? handleAddFriend : undefined}
                onRemoveFriend={amHost ? handleRemoveFriend : undefined}
                onAddCollection={amHost ? handleAddCollection : undefined}
                onRemoveCollection={amHost ? handleRemoveCollection : undefined}
                currentUserId={authUid || undefined}
                currentUserEmail={getAuth()?.currentUser?.email || undefined}
              />
            );
          }}
          contentContainerStyle={{
            paddingHorizontal: SPACING.lg,
            paddingBottom: insets.bottom + 100,
            paddingTop: SPACING.lg,
          }}
          ListEmptyComponent={EmptyForTab}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Friend Picker */}
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

        {/* Collection Picker */}
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
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },

  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.lg },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 2, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  liveIndicator: { color: Colors.success, fontWeight: '600' },

  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: SPACING.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '400' },
  cancelButton: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  cancelButtonText: { color: Colors.primary, fontSize: 16, fontWeight: '500' },

  // Tabs (variable width, fill across the row)
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexWrap: 'nowrap',
  },
  tabPill: {
    // no flex: 1 -> allow variable width
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: 'transparent',
  },
  tabText: { color: Colors.textSecondary, fontWeight: '600' },
  tabTextSelected: { color: Colors.background },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  tabBadgeSelected: { backgroundColor: 'rgba(0,0,0,0.2)' },
  tabBadgeText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  tabBadgeTextSelected: { color: Colors.background },

  searchResultsInfo: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: Colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultsText: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic' },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  emptyStateTitle: { fontSize: 20, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  emptyStateSubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  clearSearchButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearSearchText: { color: Colors.primary, fontSize: 14, fontWeight: '500' },

  backButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 160,
    alignItems: 'center',
  },
  backButtonText: { fontSize: 16, fontWeight: '500', color: Colors.text },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    minWidth: 160,
    alignItems: 'center',
  },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
  errorText: { fontSize: 16, color: Colors.error, textAlign: 'center', lineHeight: 22 },
});

export default MyMeetupsScreen;