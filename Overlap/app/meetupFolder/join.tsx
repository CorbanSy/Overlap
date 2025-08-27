//app/meetupFolder/join.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getPendingMeetupInvites,
  joinMeetup,
  joinMeetupByCode,
  declineMeetup,
} from '../../_utils/storage/meetupInvites';
import { useRouter } from 'expo-router';

// Types
interface Invite {
  id: string;
  title?: string;
  code?: string;
  eventName?: string;
  creatorName?: string;
  date?: any;
  location?: string;
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
  inputBackground: '#0D1117',
} as const;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

const JoinMeetupsScreen: React.FC<Props> = ({ onBack }) => {
  const router = useRouter();

  // State management
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningCode, setJoiningCode] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Format date helper
  const formatDate = (date: any): string => {
    if (!date) return '';
    try {
      const dateObj = typeof date?.toDate === 'function' ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Data fetching
  const loadInvites = useCallback(async () => {
    try {
      setError(null);
      const data = await getPendingMeetupInvites();
      setInvites(data || []);
    } catch (err) {
      console.error('Error fetching invites:', err);
      setError('Failed to load invitations');
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoadingInvites(true);
    await loadInvites();
    setLoadingInvites(false);
  }, [loadInvites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvites();
    setRefreshing(false);
  }, [loadInvites]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Event handlers
  const handleAcceptInvite = useCallback(async (invite: Invite) => {
    Alert.alert(
      'Join Meetup',
      `Are you sure you want to join "${invite.title || invite.eventName || 'this meetup'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            try {
              setProcessingInvite(invite.id);
              const meetupId = await joinMeetup(invite.id);
              setInvites(prev => prev.filter(i => i.id !== invite.id));
              router.push({ pathname: '/meetupFolder/startMeetUp', params: { meetupId } });
            } catch (err) {
              console.error('Error joining meetup:', err);
              Alert.alert('Error', 'Failed to join meetup. Please try again.');
            } finally {
              setProcessingInvite(null);
            }
          },
        },
      ]
    );
  }, [router]);

  const handleDeclineInvite = useCallback(async (invite: Invite) => {
    Alert.alert(
      'Decline Invitation',
      `Are you sure you want to decline the invitation to "${invite.title || invite.eventName || 'this meetup'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingInvite(invite.id);
              await declineMeetup(invite.id);
              setInvites(prev => prev.filter(i => i.id !== invite.id));
            } catch (err) {
              console.error('Error declining invitation:', err);
              Alert.alert('Error', 'Failed to decline invitation. Please try again.');
            } finally {
              setProcessingInvite(null);
            }
          },
        },
      ]
    );
  }, []);

  const handleJoinByCode = useCallback(async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Invalid Code', 'Please enter a valid invite code.');
      return;
    }

    try {
      setJoiningCode(true);
      Keyboard.dismiss();
      
      const meetupId = await joinMeetupByCode(inviteCode.trim());
      // Since joinMeetupByCode returns a string (meetupId), no need to check for object
      
      setInviteCode('');
      router.push({ pathname: '/meetupFolder/startMeetUp', params: { meetupId } });
    } catch (err) {
      console.error('Error joining meetup by code:', err);
      Alert.alert(
        'Failed to Join',
        'Invalid invite code or meetup no longer available. Please check the code and try again.'
      );
    } finally {
      setJoiningCode(false);
    }
  }, [inviteCode, router]);

  const handleRetry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Render components
  const renderInviteCard = ({ item }: { item: Invite }) => {
    const isProcessing = processingInvite === item.id;
    
    return (
      <View style={styles.inviteCard}>
        <View style={styles.inviteHeader}>
          <Text style={styles.inviteTitle} numberOfLines={2}>
            {item.title || item.eventName || 'Meetup Invitation'}
          </Text>
          {item.code && (
            <View style={styles.codeChip}>
              <Text style={styles.codeChipText}>{item.code}</Text>
            </View>
          )}
        </View>

        <View style={styles.inviteDetails}>
          {item.creatorName && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>By {item.creatorName}</Text>
            </View>
          )}
          {item.date && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{formatDate(item.date)}</Text>
            </View>
          )}
          {item.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.inviteActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleDeclineInvite(item)}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <>
                <Ionicons name="close" size={16} color={COLORS.text} />
                <Text style={styles.declineButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton]}
            onPress={() => handleAcceptInvite(item)}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color={COLORS.text} />
                <Text style={styles.joinButtonText}>Join</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyInvites = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No Invitations</Text>
      <Text style={styles.emptySubtitle}>
        You don't have any pending meetup invitations at the moment.
      </Text>
    </View>
  );

  // Loading state
  if (loadingInvites && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !loadingInvites) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backIconButton} 
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.title}>Join Meetups</Text>
            {invites.length > 0 && (
              <Text style={styles.subtitle}>
                {invites.length} pending invitation{invites.length !== 1 ? 's' : ''}
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

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Invitations Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="mail" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Pending Invitations</Text>
              </View>
              {invites.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{invites.length}</Text>
                </View>
              )}
            </View>

            {invites.length === 0 ? (
              renderEmptyInvites()
            ) : (
              <FlatList
                data={invites}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderInviteCard}
                scrollEnabled={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                contentContainerStyle={styles.invitesList}
              />
            )}
          </View>

          {/* Join by Code Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="key" size={20} color={COLORS.warning} />
                <Text style={styles.sectionTitle}>Join with Code</Text>
              </View>
            </View>

            <View style={styles.codeInputContainer}>
              <Text style={styles.codeLabel}>
                Enter the 6-digit invite code to join a meetup
              </Text>
              
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="123456"
                  placeholderTextColor={COLORS.textTertiary}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  maxLength={6}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleJoinByCode}
                  editable={!joiningCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.joinCodeButton, (!inviteCode.trim() || joiningCode) && styles.disabledButton]}
                  onPress={handleJoinByCode}
                  disabled={!inviteCode.trim() || joiningCode}
                  activeOpacity={0.8}
                >
                  {joiningCode ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
                      <Text style={styles.joinCodeButtonText}>Join</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.helpText}>
                Ask the meetup creator for the invite code
              </Text>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
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
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  invitesList: {
    gap: SPACING.md,
  },
  inviteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
    lineHeight: 24,
  },
  codeChip: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  codeChipText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  inviteDetails: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  joinButton: {
    backgroundColor: COLORS.success,
  },
  declineButton: {
    backgroundColor: COLORS.accent,
  },
  joinButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  declineButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    gap: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.lg,
  },
  codeInputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeLabel: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  inputWrapper: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  codeInput: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
  },
  joinCodeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  disabledButton: {
    backgroundColor: COLORS.textTertiary,
    opacity: 0.5,
  },
  joinCodeButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
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

export default JoinMeetupsScreen;