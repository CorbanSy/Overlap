//app/(tabs)/meetupHome.tsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CreateMeetupScreen from '../meetupFolder/create';
import MyMeetupsScreen from '../meetupFolder/MyMeetupsScreen';
import JoinMeetupsScreen from '../meetupFolder/join';
import { getPendingMeetupInvites } from '../../_utils/storage/meetupInvites';
import { getMeetupStats } from '../../_utils/storage/meetups';

// Types
interface PendingInvite {
  id: string;
  // Add other properties as needed
}

// Constants - Aligned with home/profile screens
const COLORS = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceElevated: '#21262D',
  primary: '#238636',
  secondary: '#F85149',
  accent: '#FFC107',
  success: '#32D74B',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  border: 'rgba(240,246,252,0.1)',
  cardBorder: 'rgba(240,246,252,0.08)',
  overlay: 'rgba(13,17,23,0.4)',
} as const;

const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export default function MeetupHome() {
  // State management
  const [currentScreen, setCurrentScreen] = useState<'home' | 'create' | 'myMeetups' | 'join'>('home');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ active: 0, participant: 0, hosted: 0 });

  // Add the fetchStats function back
  const fetchStats = useCallback(async () => {
    try {
      const meetupStats = await getMeetupStats();
      setStats(meetupStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch pending invites
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

  // Update the useEffect to call both functions
  useEffect(() => {
    fetchPendingInvites();
    fetchStats(); // Add this line
  }, [fetchPendingInvites, fetchStats]);

  // Navigation handlers
  const handleNavigateBack = useCallback(() => {
    setCurrentScreen('home');
    fetchPendingInvites();
    fetchStats(); // Add this line
  }, [fetchPendingInvites, fetchStats]);

  const handleNavigateToCreate = useCallback(() => setCurrentScreen('create'), []);
  const handleNavigateToMyMeetups = useCallback(() => setCurrentScreen('myMeetups'), []);
  const handleNavigateToJoin = useCallback(() => setCurrentScreen('join'), []);

  // Render different screens
  if (currentScreen === 'create') {
    return <CreateMeetupScreen onBack={handleNavigateBack} />;
  }

  if (currentScreen === 'myMeetups') {
    return <MyMeetupsScreen onBack={handleNavigateBack} />;
  }

  if (currentScreen === 'join') {
    return <JoinMeetupsScreen onBack={handleNavigateBack} />;
  }

  // Render notification badge - simplified
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

  // Main home screen render
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Clean Header - matches profile screen style */}
          <View style={styles.header}>
            <Text style={styles.title}>Meetups</Text>
            <Text style={styles.subtitle}>Connect and collaborate with others</Text>
          </View>

          {/* Stats Row - minimal like home screen */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.participant}</Text>
              <Text style={styles.statLabel}>Participant</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.hosted}</Text>
              <Text style={styles.statLabel}>Hosted</Text>
            </View>
          </View>

          {/* Main Actions - clean card style like home/profile */}
          <View style={styles.mainActions}>
            {/* Create Meetup Card */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleNavigateToCreate}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, styles.createIcon]}>
                    <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                </View>
                <Text style={styles.cardTitle}>Create Meetup</Text>
                <Text style={styles.cardDescription}>
                  Start a new meetup and invite others to join
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.roleLabel}>HOST</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Join Meetup Card */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleNavigateToJoin}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, styles.joinIcon]}>
                    <Ionicons name="enter-outline" size={28} color={COLORS.secondary} />
                    {renderNotificationBadge()}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                </View>
                <Text style={styles.cardTitle}>Join Meetup</Text>
                <Text style={styles.cardDescription}>
                  {pendingInvites.length > 0 
                    ? `${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? 's' : ''}`
                    : 'Use an invite code or link to join'
                  }
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.roleLabel}>GUEST</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* My Meetups Button - cleaner style */}
          <TouchableOpacity
            style={styles.myMeetupsButton}
            onPress={handleNavigateToMyMeetups}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="grid-outline" size={20} color={COLORS.background} />
              <Text style={styles.myMeetupsText}>My Meetups</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.background} />
            </View>
          </TouchableOpacity>

          {/* Loading/Error States */}
          {isLoading && (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.statusText}>Loading...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchPendingInvites} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.infoText}>
              Create or join meetups to start collaborating
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  
  // Header - matches profile screen style
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingTop: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Stats - minimal like home screen
  statsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },

  // Action cards - clean like home/profile
  mainActions: {
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
    backgroundColor: 'rgba(35, 134, 54, 0.1)',
  },
  joinIcon: {
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Notification badge - simplified
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  notificationText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
  },

  // My Meetups button - cleaner
  myMeetupsButton: {
    backgroundColor: COLORS.primary,
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
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  myMeetupsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
    flex: 1,
    textAlign: 'center',
  },

  // Status containers
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.md,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.secondary,
    marginRight: SPACING.sm,
  },
  retryButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginTop: 'auto',
    paddingBottom: SPACING.lg,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});