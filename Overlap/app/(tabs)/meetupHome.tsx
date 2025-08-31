// app/(tabs)/meetupHome.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CreateMeetupScreen from '../meetupFolder/create';
import MyMeetupsScreen from '../meetupFolder/MyMeetupsScreen';
import JoinMeetupsScreen from '../meetupFolder/join';
import { getPendingMeetupInvites } from '../../_utils/storage/meetupInvites';
import { getMeetupStats } from '../../_utils/storage/meetups';
import { Colors } from '../../constants/colors'; // Import your Colors from constants

type MyTab = 'active' | 'host' | 'participant';
type InfoModalType = 'create' | 'join' | 'myMeetups' | null;

interface PendingInvite {
  id: string;
}

const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

const { width: screenWidth } = Dimensions.get('window');

const INFO_CONTENT = {
  create: {
    title: "Create Meetup",
    features: [
      "Set event name, description, and category (dining, entertainment, etc.)",
      "Configure group size and price range for planning",
      "Choose specific date and time for your event",
      "Set location - use your location or specify a place",
      "Add activity collections to share ideas with participants",
      "Invite friends directly from your friends list",
      "Generate 6-digit invite codes for easy sharing",
      "All settings can be modified after creation"
    ]
  },
  join: {
    title: "Join Meetup",
    features: [
      "View all pending meetup invitations in one place",
      "See meetup details like title, creator, date, and location",
      "Accept or decline invitations with confirmation dialogs",
      "Join meetups using 6-digit invite codes",
      "Pull to refresh for the latest invitations",
      "Get real-time updates when new invites arrive",
      "Navigate directly to active meetups after joining"
    ]
  },
  myMeetups: {
    title: "My Meetups",
    features: [
      "Organize meetups in tabs: Active, Host, Participant, and All",
      "Search through all your meetups with real-time filtering",
      "Edit meetup details, manage friends, and add collections",
      "Start or stop meetups you're hosting with one tap",
      "Launch Turbo Mode for AI-powered activity suggestions",
      "Add or remove friends and collections from existing meetups",
      "Pull to refresh for the latest meetup updates",
      "Remove meetups with confirmation dialogs for safety"
    ]
  }
};

export default function MeetupHome() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'create' | 'myMeetups' | 'join'>('home');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ active: 0, participant: 0, hosted: 0 });
  const [activeInfoModal, setActiveInfoModal] = useState<InfoModalType>(null);

  // Which tab MyMeetups should open on
  const [myMeetupsInitialTab, setMyMeetupsInitialTab] = useState<MyTab>('active');

  // Local "refresh" state for the header button spinner
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const meetupStats = await getMeetupStats();
      setStats(meetupStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchPendingInvites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const invites = await getPendingMeetupInvites();
      setPendingInvites(invites || []);
    } catch (err) {
      console.error('Error fetching meetup invites:', err);
      setError('Failed to load invites');
      setPendingInvites([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Single refresher used by header button & retry
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchPendingInvites(), fetchStats()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPendingInvites, fetchStats]);

  useEffect(() => {
    // initial load
    refreshAll();
  }, [refreshAll]);

  const handleNavigateBack = useCallback(() => {
    setCurrentScreen('home');
    refreshAll();
  }, [refreshAll]);

  const openCreate = useCallback(() => setCurrentScreen('create'), []);
  const openJoin = useCallback(() => setCurrentScreen('join'), []);
  const openMyMeetups = useCallback((tab: MyTab) => {
    setMyMeetupsInitialTab(tab);
    setCurrentScreen('myMeetups');
  }, []);

  const openInfoModal = useCallback((type: InfoModalType) => {
    setActiveInfoModal(type);
  }, []);

  const closeInfoModal = useCallback(() => {
    setActiveInfoModal(null);
  }, []);

  if (currentScreen === 'create') {
    return <CreateMeetupScreen onBack={handleNavigateBack} />;
  }
  if (currentScreen === 'myMeetups') {
    // key forces remount so initialTab applies cleanly each time
    return (
      <MyMeetupsScreen
        key={myMeetupsInitialTab}
        onBack={handleNavigateBack}
        initialTab={myMeetupsInitialTab}
      />
    );
  }
  if (currentScreen === 'join') {
    return <JoinMeetupsScreen onBack={handleNavigateBack} />;
  }

  const renderNotificationBadge = () => {
    if (pendingInvites.length === 0) return null;
    return (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationText}>
          {pendingInvites.length > 99 ? '99+' : pendingInvites.length}
        </Text>
      </View>
    );
  };

  const renderInfoModal = () => {
    if (!activeInfoModal) return null;
    
    const content = INFO_CONTENT[activeInfoModal];
    
    return (
      <Modal
        visible={!!activeInfoModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeInfoModal}
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
                onPress={closeInfoModal}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>Key Features:</Text>
              {content.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.gotItButton}
                onPress={closeInfoModal}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            {/* Top-right refresh button */}
            <TouchableOpacity
              accessibilityLabel="Refresh"
              style={styles.refreshBtn}
              onPress={refreshAll}
              disabled={refreshing || isLoading}
              activeOpacity={0.8}
            >
              {refreshing || isLoading ? (
                <ActivityIndicator size="small" color={Colors.textSecondary} />
              ) : (
                <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>

            <Text style={styles.title}>Meetups</Text>
            <Text style={styles.subtitle}>Connect and collaborate with others</Text>
          </View>

          {/* Stats Row — tappable to deep-link to a tab */}
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={() => openMyMeetups('active')}
            >
              <Text style={styles.statNumber}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={() => openMyMeetups('participant')}
            >
              <Text style={styles.statNumber}>{stats.participant}</Text>
              <Text style={styles.statLabel}>Participant</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={() => openMyMeetups('host')}
            >
              <Text style={styles.statNumber}>{stats.hosted}</Text>
              <Text style={styles.statLabel}>Hosted</Text>
            </TouchableOpacity>
          </View>

          {/* Main Actions */}
          <View style={styles.mainActions}>
            <TouchableOpacity style={styles.actionCard} onPress={openCreate} activeOpacity={0.8}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => openInfoModal('create')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <Text style={styles.cardTitle}>Create Meetup</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Start a new meetup and invite others to join
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.roleLabel}>HOST</Text>
                  <View style={[styles.iconContainer, styles.createIcon]}>
                    <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={openJoin} activeOpacity={0.8}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => openInfoModal('join')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <Text style={styles.cardTitle}>Join Meetup</Text>
                </View>
                <Text style={styles.cardDescription}>
                  {pendingInvites.length > 0
                    ? `${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? 's' : ''}`
                    : 'Use an invite code or link to join'}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.roleLabel}>GUEST</Text>
                  <View style={[styles.iconContainer, styles.joinIcon]}>
                    <Ionicons name="enter-outline" size={28} color={Colors.error} />
                    {renderNotificationBadge()}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Open My Meetups (defaults to Active tab) */}
          <TouchableOpacity
            style={styles.myMeetupsButton}
            onPress={() => openMyMeetups('active')}
            activeOpacity={0.85}
          >
            <View style={styles.buttonContent}>
              <View style={styles.myMeetupsLeft}>
                <TouchableOpacity
                  style={styles.myMeetupsInfoButton}
                  onPress={() => openInfoModal('myMeetups')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="information-circle-outline" size={18} color={Colors.background} />
                </TouchableOpacity>
                <Ionicons name="grid-outline" size={20} color={Colors.background} />
              </View>
              <Text style={styles.myMeetupsText}>My Meetups</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.background} />
            </View>
          </TouchableOpacity>

          {/* Loading / Error */}
          {isLoading && (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.statusText}>Loading...</Text>
            </View>
          )}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={refreshAll} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.infoText}>Create or join meetups to start collaborating</Text>
          </View>
        </View>
      </ScrollView>

      {/* Info Modal */}
      {renderInfoModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  scrollContainer: { 
    flexGrow: 1 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.xl 
  },

  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingTop: SPACING.lg,
    position: 'relative', // for absolute refresh button
  },
  // Top-right refresh icon button
  refreshBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: Colors.text, 
    marginBottom: SPACING.sm, 
    letterSpacing: -0.5 
  },
  subtitle: { 
    fontSize: 16, 
    color: Colors.textSecondary, 
    textAlign: 'center', 
    lineHeight: 22 
  },

  statsContainer: { 
    flexDirection: 'row', 
    marginBottom: SPACING.xxl, 
    gap: SPACING.md 
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.text, 
    marginBottom: 2 
  },
  statLabel: { 
    fontSize: 12, 
    color: Colors.textMuted, 
    fontWeight: '500' 
  },

  mainActions: { 
    marginBottom: SPACING.xl, 
    gap: SPACING.md 
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardContent: { 
    flex: 1 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  createIcon: { 
    backgroundColor: Colors.surfaceLight 
  },
  joinIcon: { 
    backgroundColor: Colors.surfaceLight 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: Colors.text, 
    marginBottom: SPACING.xs 
  },
  cardDescription: { 
    fontSize: 14, 
    color: Colors.textSecondary, 
    lineHeight: 20, 
    marginBottom: SPACING.md 
  },
  cardFooter: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },

  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  notificationText: { 
    color: Colors.white, 
    fontSize: 10, 
    fontWeight: '600' 
  },

  myMeetupsButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  myMeetupsText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.background,
    flex: 1,
    textAlign: 'center',
  },
  myMeetupsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  myMeetupsInfoButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  statusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginVertical: SPACING.lg 
  },
  statusText: { 
    fontSize: 14, 
    color: Colors.textSecondary, 
    marginLeft: SPACING.xs 
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: SPACING.md,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorText: { 
    fontSize: 14, 
    color: Colors.error, 
    marginRight: SPACING.sm 
  },
  retryButton: { 
    paddingHorizontal: SPACING.sm, 
    paddingVertical: 4 
  },
  retryText: { 
    fontSize: 14, 
    color: Colors.primary, 
    fontWeight: '500' 
  },

  footer: { 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    marginTop: 'auto', 
    paddingBottom: SPACING.lg 
  },
  infoText: { 
    fontSize: 14, 
    color: Colors.textMuted, 
    textAlign: 'center', 
    lineHeight: 20 
  },

  // Modal Styles
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