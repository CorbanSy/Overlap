//app/meetupFolder/MyMeetupsScreen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserMeetups, removeMeetup, updateMeetup } from '../../_utils/storage/meetups';
import { getPendingMeetupInvites } from '../../_utils/storage/meetupInvites';
import { exportMyLikesToMeetup } from '../../_utils/storage/meetupActivities';
import { initializeTurboSession } from '../../_utils/storage/turboMeetup';
import MeetupCard from '../../components/MeetupCard';
import StartMeetupScreen from './startMeetUp';
import TurboModeScreen from '../../components/turbo/TurboModeScreen';
import { useRouter } from 'expo-router';

// Types
interface Meetup {
  id: string;
  title?: string;
  ongoing: boolean;
  eventName?: string;
  participants?: any[];
  // Add other meetup properties as needed
}

interface PendingInvite {
  id: string;
  // Add other properties as needed
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
  const router = useRouter();
  
  // State management
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showTurbo, setShowTurbo] = useState(false);
  const [currentMeetupId, setCurrentMeetupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMeetups(), fetchInvites()]);
    setLoading(false);
  }, [fetchMeetups, fetchInvites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Event handlers
  const handleRemoveMeetup = useCallback(async (meetupId: string) => {
    Alert.alert(
      'Remove Meetup',
      'Are you sure you want to remove this meetup? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMeetup(meetupId);
              setMeetups(prev => prev.filter(meetup => meetup.id !== meetupId));
            } catch (err) {
              console.error('Error removing meetup:', err);
              Alert.alert('Error', 'Failed to remove meetup. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleStartMeetup = useCallback(async (meetupId: string) => {
    try {
      await updateMeetup({ id: meetupId, ongoing: true });
      await exportMyLikesToMeetup(meetupId);
      setMeetups(prev =>
        prev.map(m => (m.id === meetupId ? { ...m, ongoing: true } : m))
      );

      // Navigate to start meetup screen
      router.push({ pathname: '/meetupFolder/startMeetUp', params: { meetupId } });
    } catch (err) {
      console.error('Error starting meetup:', err);
      Alert.alert('Error', 'Failed to start meetup. Please try again.');
    }
  }, [router]);

  const handleStopMeetup = useCallback(async (meetupId: string) => {
    Alert.alert(
      'Stop Meetup',
      'Are you sure you want to stop this meetup?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateMeetup({ id: meetupId, ongoing: false });
              setMeetups(prev =>
                prev.map(m => (m.id === meetupId ? { ...m, ongoing: false } : m))
              );
            } catch (err) {
              console.error('Error stopping meetup:', err);
              Alert.alert('Error', 'Failed to stop meetup. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  // Handle Turbo Mode
  const handleTurboMode = useCallback(async (meetupId: string) => {
    try {
      const meetup = meetups.find(m => m.id === meetupId);
      const groupSize = meetup?.participants?.length || 1;
      
      // Removed participant count check - turbo works with any group size
      
      // Initialize turbo session
      await initializeTurboSession(meetupId, groupSize);
      await exportMyLikesToMeetup(meetupId);
      
      // Set current meetup and show turbo mode
      setCurrentMeetupId(meetupId);
      setShowTurbo(true);
    } catch (err) {
      console.error('Error starting turbo mode:', err);
      Alert.alert('Error', 'Failed to start Turbo Mode. Please try again.');
    }
  }, [meetups]);

  const handleRetry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Render TurboModeScreen if needed
  if (showTurbo && currentMeetupId) {
    return (
      <TurboModeScreen
        meetupId={currentMeetupId}
        onExit={() => {
          setShowTurbo(false);
          setCurrentMeetupId(null);
          onRefresh(); // Refresh data when returning
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
          onRefresh(); // Refresh data when returning
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

  const regularMeetups = meetups.filter(m => !m.ongoing);
  const ongoingMeetups = meetups.filter(m => m.ongoing);
  const totalMeetups = meetups.length;

  // Render empty state
  const renderEmptyState = (title: string, subtitle: string, icon: string) => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name={icon as any} size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
    </View>
  );

  // Render all meetups in single scrollable list
  const renderAllMeetups = () => {
    const allMeetups = [...ongoingMeetups, ...regularMeetups];

    if (allMeetups.length === 0) {
      return renderEmptyState(
        'No Meetups Yet',
        'Create your first meetup to get started connecting with others!',
        'calendar-outline'
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Live Sessions Section */}
        {ongoingMeetups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="radio" size={20} color={COLORS.success} />
                <Text style={styles.sectionTitle}>Live Sessions</Text>
              </View>
              <View style={[styles.badge, styles.liveBadge]}>
                <Text style={styles.badgeText}>{ongoingMeetups.length}</Text>
              </View>
            </View>
            
            {ongoingMeetups.map((meetup) => (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                onRemove={() => handleRemoveMeetup(meetup.id)}
                onStart={handleStartMeetup}
                onStop={handleStopMeetup}
                // No turbo mode for ongoing meetups
              />
            ))}
          </View>
        )}

        {/* Active Meetups Section */}
        {regularMeetups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Upcoming Meetups</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{regularMeetups.length}</Text>
              </View>
            </View>
            
            {regularMeetups.map((meetup) => (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                onRemove={() => handleRemoveMeetup(meetup.id)}
                onStart={handleStartMeetup}
                onStop={handleStopMeetup}
                onTurboMode={handleTurboMode} // Add turbo mode support
              />
            ))}
          </View>
        )}

        {/* Add some bottom padding for the navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backIconButton} 
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            
            <View style={styles.headerText}>
              <Text style={styles.title}>My Meetups</Text>
              {totalMeetups > 0 && (
                <Text style={styles.subtitle}>
                  {totalMeetups} meetup{totalMeetups !== 1 ? 's' : ''} total
                  {ongoingMeetups.length > 0 && (
                    <Text style={styles.liveIndicator}> • {ongoingMeetups.length} live</Text>
                  )}
                </Text>
              )}
            </View>

            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="refresh" 
                size={20} 
                color={refreshing ? COLORS.textTertiary : COLORS.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {renderAllMeetups()}
        </View>
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
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xxl,
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liveBadge: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
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
  bottomSpacer: {
    height: 100, // Extra space for bottom navigation
  },
});

export default MyMeetupsScreen;