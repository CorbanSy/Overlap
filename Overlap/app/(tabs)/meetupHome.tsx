import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import CreateMeetupScreen from '../meetupFolder/create';
import MyMeetupsScreen from '../meetupFolder/MyMeetupsScreen';
import JoinMeetupsScreen from '../meetupFolder/join';
import { getPendingMeetupInvites } from '../../_utils/storage';

// Types
interface PendingInvite {
  id: string;
  // Add other properties as needed
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
  accent: '#F85149',
  border: '#30363D',
} as const;

const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export default function MeetupHome(): JSX.Element {
  // State management
  const [currentScreen, setCurrentScreen] = useState<'home' | 'create' | 'myMeetups' | 'join'>('home');
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchPendingInvites();
  }, [fetchPendingInvites]);

  // Navigation handlers
  const handleNavigateBack = useCallback(() => {
    setCurrentScreen('home');
    // Refresh invites when returning to home
    fetchPendingInvites();
  }, [fetchPendingInvites]);

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

  // Render notification badge
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Meetups</Text>
            <Text style={styles.subtitle}>Connect, collaborate, and grow together</Text>
          </View>

          {/* Main Action Cards */}
          <View style={styles.mainActions}>
            {/* Create Meetup Card */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleNavigateToCreate}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={require('../../assets/icons/single_meetup.png')}
                  style={styles.actionIcon}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Create Meetup</Text>
                <Text style={styles.cardDescription}>Start a new meetup and invite others</Text>
              </View>
            </TouchableOpacity>

            {/* Join Meetup Card */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleNavigateToJoin}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={require('../../assets/icons/multiple_meetup.png')}
                  style={styles.actionIcon}
                />
                {renderNotificationBadge()}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Join Meetup</Text>
                <Text style={styles.cardDescription}>
                  {pendingInvites.length > 0 
                    ? `${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? 's' : ''}`
                    : 'Use an invite code to join'
                  }
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* My Meetups Button */}
          <TouchableOpacity
            style={styles.myMeetupsButton}
            onPress={handleNavigateToMyMeetups}
            activeOpacity={0.8}
          >
            <Image
              source={require('../../assets/icons/my_meetups.png')}
              style={styles.myMeetupsIcon}
            />
            <Text style={styles.myMeetupsText}>My Meetups</Text>
          </TouchableOpacity>

          {/* Loading/Error State */}
          {isLoading && (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.statusText}>Loading invites...</Text>
            </View>
          )}

          {error && (
            <View style={styles.statusContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchPendingInvites} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.infoText}>
              Get started by creating a meetup or joining an existing one with an invite code
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingTop: SPACING.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  mainActions: {
    marginBottom: SPACING.xl,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  notificationText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  myMeetupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  myMeetupsIcon: {
    width: 24,
    height: 24,
    marginRight: SPACING.sm,
    resizeMode: 'contain',
  },
  myMeetupsText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.accent,
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
  footer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginTop: 'auto',
    paddingBottom: SPACING.lg,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});