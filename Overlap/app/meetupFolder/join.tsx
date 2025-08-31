// app/meetupFolder/join.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  getPendingMeetupInvites,
  joinMeetup,
  joinMeetupByCode,
  declineMeetup,
} from '../../_utils/storage/meetupInvites';

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────
interface Invite {
  id: string;
  title?: string;
  code?: string;
  eventName?: string;
  creatorName?: string;
  date?: any;
  time?: any;
  location?: string;
  description?: string;
  category?: string;
  groupSize?: number;
  priceRange?: number;
  collections?: any[];
  friends?: any[];
}

interface Props {
  onBack?: () => void;
}

// ───────────────────────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────────────────────
const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceHover: '#21262D',
  surfaceLight: '#333333',
  primary: '#F5A623',
  primaryHover: '#E8991C',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  accent: '#F85149',
  border: '#30363D',
  success: '#10B981',
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

// ───────────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────────
const JoinMeetupsScreen: React.FC<Props> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningCode, setJoiningCode] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Animations (stable refs)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Navigation back (works with/without prop)
  const goBack = useCallback(() => {
    if (onBack) onBack();
    else router.back();
  }, [onBack, router]);

  // Helpers
  const formatDate = (date: any): string => {
    if (!date) return '';
    try {
      const dateObj =
        typeof date?.toDate === 'function' ? date.toDate() : new Date(date);
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

  const formatTime = (time: any): string => {
    if (!time) return '';
    try {
      const timeObj =
        typeof time?.toDate === 'function' ? time.toDate() : new Date(time);
      return timeObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'dining':
        return 'restaurant';
      case 'entertainment':
        return 'film';
      case 'sports':
        return 'fitness';
      case 'outdoors':
        return 'leaf';
      case 'culture':
        return 'library';
      case 'social':
        return 'people';
      case 'business':
        return 'briefcase';
      case 'education':
        return 'school';
      default:
        return 'calendar';
    }
  };

  // Price: map numeric range to $-buckets (1..4)
  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange || priceRange <= 0) return 'Free';
    const buckets = Math.max(1, Math.min(4, Math.ceil(priceRange / 25)));
    return '$'.repeat(buckets);
  };

  // Data
  const loadInvites = useCallback(async () => {
    try {
      setError(null);
      const data = await getPendingMeetupInvites();
      setInvites(data || []);

      // Animate content in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
      console.error('Error fetching invites:', err);
      setError('Failed to load invitations');
    }
  }, [fadeAnim, slideAnim]);

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

  // Actions
  const handleAcceptInvite = useCallback(
    (invite: Invite) => {
      Alert.alert(
        'Join Meetup',
        `Are you sure you want to join "${
          invite.title || invite.eventName || 'this meetup'
        }"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: async () => {
              try {
                setProcessingInvite(invite.id);
                const meetupId = await joinMeetup(invite.id);
                setInvites((prev) => prev.filter((i) => i.id !== invite.id));
                router.push({
                  pathname: '/meetupFolder/startMeetUp',
                  params: { meetupId },
                });
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
    },
    [router]
  );

  const handleDeclineInvite = useCallback(async (invite: Invite) => {
    Alert.alert(
      'Decline Invitation',
      `Are you sure you want to decline the invitation to "${
        invite.title || invite.eventName || 'this meetup'
      }"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingInvite(invite.id);
              await declineMeetup(invite.id);
              setInvites((prev) => prev.filter((i) => i.id !== invite.id));
            } catch (err) {
              console.error('Error declining invitation:', err);
              Alert.alert(
                'Error',
                'Failed to decline invitation. Please try again.'
              );
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

  // Renderers
  const renderInviteCard = ({ item }: { item: Invite }) => {
    const isProcessing = processingInvite === item.id;
    return (
      <Animated.View
        style={[
          styles.inviteCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 50],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.inviteHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.inviteTitle} numberOfLines={2}>
                {item.title || item.eventName || 'Meetup Invitation'}
              </Text>
              {item.category ? (
                <View style={styles.categoryBadge}>
                  <Ionicons
                    name={getCategoryIcon(item.category) as any}
                    size={12}
                    color={COLORS.primary}
                  />
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              ) : null}
            </View>
            {item.code ? (
              <View style={styles.codeChip}>
                <Ionicons name="key" size={12} color={COLORS.text} />
                <Text style={styles.codeChipText}>{item.code}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        {/* Details */}
        <View style={styles.inviteDetails}>
          {item.creatorName ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="person" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.detailText}>Hosted by {item.creatorName}</Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar" size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.detailText}>
              {item.date ? formatDate(item.date) : 'Date TBD'}
              {item.time ? ` • ${formatTime(item.time)}` : ''}
            </Text>
          </View>

          {item.location ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="location" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.detailText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          ) : null}

          {item.groupSize || item.priceRange !== undefined ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="information-circle"
                  size={14}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.metaInfo}>
                {item.groupSize ? (
                  <Text style={styles.metaText}>{item.groupSize} people</Text>
                ) : null}
                {item.priceRange !== undefined ? (
                  <Text style={styles.priceText}>
                    {getPriceDisplay(item.priceRange)}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        {/* Chips */}
        {((item.collections?.length ?? 0) > 0 ||
          (item.friends?.length ?? 0) > 0) && (
          <View style={styles.chipsRow}>
            {(item.collections?.length ?? 0) > 0 ? (
              <View style={styles.infoChip}>
                <Ionicons name="folder" size={12} color={COLORS.textSecondary} />
                <Text style={styles.chipText}>
                  {item.collections!.length} collection
                  {item.collections!.length !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
            {(item.friends?.length ?? 0) > 0 ? (
              <View style={styles.infoChip}>
                <Ionicons name="people" size={12} color={COLORS.textSecondary} />
                <Text style={styles.chipText}>
                  {item.friends!.length} friend
                  {item.friends!.length !== 1 ? 's' : ''} invited
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Actions */}
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
                <Ionicons name="close-circle" size={18} color={COLORS.text} />
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
                <Ionicons name="checkmark-circle" size={18} color={COLORS.text} />
                <Text style={styles.joinButtonText}>Accept & Join</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyInvites = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="mail-open-outline"
          size={64}
          color={COLORS.textTertiary}
        />
      </View>
      <Text style={styles.emptyTitle}>No Pending Invitations</Text>
      <Text style={styles.emptySubtitle}>
        When friends invite you to meetups, they&apos;ll appear here. You can
        also join using an invite code below.
      </Text>
    </Animated.View>
  );

  // Loading
  if (loadingInvites && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      </SafeAreaView>
    );
    }

  // Error
  if (error && !loadingInvites) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={COLORS.accent}
            />
          </View>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={18} color={COLORS.text} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: SPACING.md + insets.top }]}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={goBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Join Meetups</Text>
            {invites.length > 0 && (
              <View style={styles.subtitleContainer}>
                <View style={styles.liveIndicator} />
                <Text style={styles.subtitle}>
                  {invites.length} pending invitation
                  {invites.length !== 1 ? 's' : ''}
                </Text>
              </View>
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

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: SPACING.xxl + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Join */}
          <Animated.View
            style={[
              styles.section,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="key" size={20} color={COLORS.warning} />
                <Text style={styles.sectionTitle}>Quick Join</Text>
              </View>
            </View>

            <View style={styles.codeInputContainer}>
              <Text style={styles.codeLabel}>
                Enter a 6-digit invite code to join instantly
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
                  style={[
                    styles.joinCodeButton,
                    (!inviteCode.trim() || joiningCode) && styles.disabledButton,
                  ]}
                  onPress={handleJoinByCode}
                  disabled={!inviteCode.trim() || joiningCode}
                  activeOpacity={0.8}
                >
                  {joiningCode ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <>
                      <Ionicons name="enter" size={18} color={COLORS.text} />
                      <Text style={styles.joinCodeButtonText}>Join</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.helpText}>
                Get the invite code from your meetup host
              </Text>
            </View>
          </Animated.View>

          {/* Invitations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="mail" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Your Invitations</Text>
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
                keyExtractor={(item) => item.id}
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
                ItemSeparatorComponent={() => (
                  <View style={{ height: SPACING.md }} />
                )}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

// ───────────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: { flex: 1 },
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
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
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
  content: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  section: { marginBottom: SPACING.xxl },
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
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  invitesList: { paddingTop: SPACING.xs },

  inviteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { marginBottom: SPACING.md },
  inviteHeader: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flex: 1,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
    lineHeight: 24,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  codeChipText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.md,
    fontWeight: '500',
  },
  inviteDetails: { gap: SPACING.sm, marginBottom: SPACING.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  detailIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: { color: COLORS.textSecondary, fontSize: 14, flex: 1, fontWeight: '500' },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  metaText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  priceText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },

  inviteActions: { flexDirection: 'row', gap: SPACING.md },
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
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  declineButton: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  declineButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2, gap: SPACING.lg },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
    maxWidth: 280,
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
    fontWeight: '500',
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: { backgroundColor: COLORS.textTertiary, opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  joinCodeButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  helpText: { fontSize: 12, color: COLORS.textTertiary, textAlign: 'center', fontStyle: 'italic' },

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
  backButtonText: { fontSize: 16, fontWeight: '500', color: COLORS.text },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    minWidth: 160,
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  loadingText: { fontSize: 16, color: COLORS.textSecondary },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  errorTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  errorText: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
});

export default JoinMeetupsScreen;
