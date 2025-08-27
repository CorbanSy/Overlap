// app/profile/privacy.tsx (Fixed SafeArea)
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, Switch, TouchableOpacity,
  ScrollView, TextInput, Alert, Modal, FlatList, ActivityIndicator, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPrivacySettings, setPrivacySettings } from '../../_utils/storage/userProfile';
import { 
  blockUser, 
  unblockUser, 
  getBlockedUsers, 
  searchUsers, 
  reportUser,
  BlockedUser,
  UserDetails 
} from '../../_utils/storage/social';

const BG = '#0D1117';
const CARD = '#1B1F24';
const BORDER = 'rgba(255,255,255,0.08)';
const INPUT_BG = '#222';
const ACCENT = '#FFA500';
const DANGER = '#F44336';
const SUCCESS = '#4CAF50';

interface PrivacyState {
  showProfilePublic: boolean;
  showActivityToFriends: boolean;
  allowFriendRequests: boolean;
  shareEmailWithFriends: boolean;
  blockedUsers: string[];
}

export default function Privacy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Privacy settings state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProfilePublic, setShowProfilePublic] = useState(true);
  const [showActivityToFriends, setShowActivityToFriends] = useState(true);
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [shareEmailWithFriends, setShareEmailWithFriends] = useState(false);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockInput, setBlockInput] = useState('');
  const [searchResults, setSearchResults] = useState<UserDetails[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Report user state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedUserToReport, setSelectedUserToReport] = useState<UserDetails | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Load settings and blocked users on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load privacy settings and blocked users in parallel
      const [settings, blocked] = await Promise.all([
        getPrivacySettings(),
        getBlockedUsers()
      ]);

      if (settings) {
        setShowProfilePublic(!!settings.showProfilePublic);
        setShowActivityToFriends(!!settings.showActivityToFriends);
        setAllowFriendRequests(!!settings.allowFriendRequests);
        setShareEmailWithFriends(!!settings.shareEmailWithFriends);
      }

      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Load privacy settings failed:', error);
      Alert.alert('Error', 'Failed to load privacy settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    try {
      setSaving(true);
      await setPrivacySettings({
        showProfilePublic,
        showActivityToFriends,
        allowFriendRequests,
        shareEmailWithFriends,
        blockedUsers: blockedUsers.map(u => u.uid),
      });
      Alert.alert('Saved', 'Your privacy settings have been updated.');
    } catch (error) {
      console.error('Save privacy settings failed:', error);
      Alert.alert('Error', 'Could not save your settings. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await searchUsers(searchTerm, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search users failed:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleBlockUser = async (user: UserDetails) => {
    try {
      await blockUser(user.uid);
      await loadData(); // Refresh blocked users list
      setShowSearchModal(false);
      setBlockInput('');
      setSearchResults([]);
      Alert.alert('User Blocked', `${user.displayName || user.email} has been blocked.`);
    } catch (error) {
      console.error('Block user failed:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  const handleUnblockUser = async (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.displayName || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              await unblockUser(user.uid);
              await loadData(); // Refresh blocked users list
              Alert.alert('User Unblocked', `${user.displayName || user.email} has been unblocked.`);
            } catch (error) {
              console.error('Unblock user failed:', error);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReportUser = async () => {
    if (!selectedUserToReport || !reportReason.trim()) {
      Alert.alert('Error', 'Please select a reason for reporting.');
      return;
    }

    try {
      await reportUser(selectedUserToReport.uid, reportReason, reportDescription);
      setShowReportModal(false);
      setSelectedUserToReport(null);
      setReportReason('');
      setReportDescription('');
      Alert.alert(
        'User Reported',
        'The user has been reported and blocked. Our team will review the report.'
      );
      await loadData(); // Refresh to show newly blocked user
    } catch (error) {
      console.error('Report user failed:', error);
      Alert.alert('Error', 'Failed to report user. Please try again.');
    }
  };

  const openReportModal = (user: UserDetails) => {
    setSelectedUserToReport(user);
    setShowReportModal(true);
  };

  const renderSearchResult = ({ item }: { item: UserDetails }) => (
    <View style={styles.searchResultItem}>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>
          {item.displayName || item.name || 'Unknown User'}
        </Text>
        <Text style={styles.searchResultEmail}>{item.email}</Text>
      </View>
      <View style={styles.searchResultActions}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => openReportModal(item)}
        >
          <Ionicons name="flag" size={16} color="#FFA500" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.blockButton}
          onPress={() => handleBlockUser(item)}
        >
          <Text style={styles.blockButtonText}>Block</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.blockChip}>
      <View style={styles.blockChipInfo}>
        <Text style={styles.blockChipText}>
          {item.displayName || item.email || 'Unknown User'}
        </Text>
        <Text style={styles.blockChipDate}>
          Blocked {item.blockedAt?.toLocaleDateString?.() || 'Recently'}
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => handleUnblockUser(item)} 
        style={styles.unblockButton}
      >
        <Ionicons name="close" color="#fff" size={16} />
      </TouchableOpacity>
    </View>
  );

  const reportReasons = [
    'Spam or unwanted contact',
    'Harassment or bullying',
    'Inappropriate content',
    'Fake profile',
    'Other'
  ];

  if (loading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <StatusBar backgroundColor={BG} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar backgroundColor={BG} barStyle="light-content" />
      <View style={[styles.safeAreaTop, { height: insets.top }]} />
      
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Safety</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Visibility */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Visibility</Text>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Public Profile</Text>
              <Text style={styles.rowSub}>
                Allow anyone to see your profile and send friend requests.
              </Text>
            </View>
            <Switch
              value={showProfilePublic}
              onValueChange={setShowProfilePublic}
              thumbColor={showProfilePublic ? '#fff' : '#ccc'}
              trackColor={{ false: '#444', true: '#2b6cb0' }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Show Activity to Friends</Text>
              <Text style={styles.rowSub}>
                Let friends see your liked activities and collections.
              </Text>
            </View>
            <Switch
              value={showActivityToFriends}
              onValueChange={setShowActivityToFriends}
              thumbColor={showActivityToFriends ? '#fff' : '#ccc'}
              trackColor={{ false: '#444', true: '#2b6cb0' }}
            />
          </View>
        </View>

        {/* Connection Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection Settings</Text>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Allow Friend Requests</Text>
              <Text style={styles.rowSub}>
                Let others find and send you friend requests.
              </Text>
            </View>
            <Switch
              value={allowFriendRequests}
              onValueChange={setAllowFriendRequests}
              thumbColor={allowFriendRequests ? '#fff' : '#ccc'}
              trackColor={{ false: '#444', true: '#2b6cb0' }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Share Email with Friends</Text>
              <Text style={styles.rowSub}>
                Let your friends see your email address on your profile.
              </Text>
            </View>
            <Switch
              value={shareEmailWithFriends}
              onValueChange={setShareEmailWithFriends}
              thumbColor={shareEmailWithFriends ? '#fff' : '#ccc'}
              trackColor={{ false: '#444', true: '#2b6cb0' }}
            />
          </View>
        </View>

        {/* Blocked Users Management */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Blocked Users</Text>
            <TouchableOpacity
              style={styles.addBlockButton}
              onPress={() => setShowSearchModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBlockText}>Block User</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardDescription}>
            Blocked users cannot see your profile, send friend requests, or interact with you.
          </Text>

          {blockedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark" size={48} color="#666" />
              <Text style={styles.emptyText}>No blocked users</Text>
              <Text style={styles.emptySubtext}>
                You haven't blocked anyone yet. Blocked users won't be able to contact you.
              </Text>
            </View>
          ) : (
            <FlatList
              data={blockedUsers}
              renderItem={renderBlockedUser}
              keyExtractor={(item) => item.uid}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]} 
          onPress={onSave} 
          activeOpacity={0.88} 
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0D1117" />
          ) : (
            <Text style={styles.primaryBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Search Users Modal */}
      <Modal visible={showSearchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Block User</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowSearchModal(false);
                  setBlockInput('');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by email or username"
                placeholderTextColor="#888"
                value={blockInput}
                onChangeText={(text) => {
                  setBlockInput(text);
                  handleSearchUsers(text);
                }}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searching && (
                <ActivityIndicator 
                  size="small" 
                  color={ACCENT} 
                  style={styles.searchLoader}
                />
              )}
            </View>

            <ScrollView style={styles.searchResults}>
              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResult}
                  keyExtractor={(item) => item.uid}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: BORDER }} />}
                />
              ) : blockInput.trim().length > 0 && !searching ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No users found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try searching with a different email or username
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report User Modal */}
      <Modal visible={showReportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report User</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowReportModal(false);
                  setSelectedUserToReport(null);
                  setReportReason('');
                  setReportDescription('');
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reportForm}>
              {selectedUserToReport && (
                <View style={styles.reportUserInfo}>
                  <Text style={styles.reportUserName}>
                    {selectedUserToReport.displayName || selectedUserToReport.name}
                  </Text>
                  <Text style={styles.reportUserEmail}>
                    {selectedUserToReport.email}
                  </Text>
                </View>
              )}

              <Text style={styles.reportLabel}>Reason for reporting:</Text>
              {reportReasons.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonOption,
                    reportReason === reason && styles.reasonOptionSelected
                  ]}
                  onPress={() => setReportReason(reason)}
                >
                  <View style={[
                    styles.radioButton,
                    reportReason === reason && styles.radioButtonSelected
                  ]}>
                    {reportReason === reason && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.reportLabel}>Additional details (optional):</Text>
              <TextInput
                style={styles.reportTextArea}
                placeholder="Provide more context about why you're reporting this user..."
                placeholderTextColor="#888"
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.reportSubmitButton,
                  !reportReason.trim() && styles.reportSubmitButtonDisabled
                ]}
                onPress={handleReportUser}
                disabled={!reportReason.trim()}
              >
                <Text style={styles.reportSubmitText}>Report & Block User</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: BG 
  },
  safeAreaTop: {
    backgroundColor: BG,
  },
  headerRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingTop: 8, 
    paddingBottom: 12, 
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  headerTitle: { 
    color: '#FFF', 
    fontSize: 20, 
    fontWeight: '800', 
    letterSpacing: 0.3 
  },
  scroll: { 
    paddingHorizontal: 16, 
    paddingBottom: 24 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
  },
  card: { 
    backgroundColor: CARD, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: BORDER 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { 
    color: '#fff', 
    fontWeight: '800', 
    fontSize: 16, 
    marginBottom: 12 
  },
  cardDescription: {
    color: '#b8b8b8',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    gap: 12, 
    borderTopWidth: 1, 
    borderTopColor: BORDER 
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700' 
  },
  rowSub: { 
    color: '#b8b8b8', 
    fontSize: 12, 
    marginTop: 2,
    lineHeight: 16,
  },
  addBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addBlockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  blockChip: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between', 
    backgroundColor: '#2a2f36', 
    borderRadius: 12, 
    padding: 12,
  },
  blockChipInfo: {
    flex: 1,
  },
  blockChipText: { 
    color: '#fff', 
    fontSize: 14,
    fontWeight: '600',
  },
  blockChipDate: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 2,
  },
  unblockButton: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: DANGER, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  primaryBtn: {
    backgroundColor: ACCENT, 
    borderRadius: 10, 
    paddingVertical: 14, 
    alignItems: 'center', 
    marginTop: 6,
    shadowColor: '#000', 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 4 }, 
    elevation: 5,
  },
  primaryBtnDisabled: {
    backgroundColor: '#666',
  },
  primaryBtnText: { 
    color: '#0D1117', 
    fontWeight: '800', 
    fontSize: 16 
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: INPUT_BG,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    fontSize: 16,
  },
  searchLoader: {
    position: 'absolute',
    right: 28,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  searchResultEmail: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
  searchResultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reportButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockButton: {
    backgroundColor: DANGER,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  blockButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  noResultsSubtext: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },

  // Report modal styles
  reportForm: {
    flex: 1,
    padding: 16,
  },
  reportUserInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  reportUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportUserEmail: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
  },
  reportLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  reasonOptionSelected: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: ACCENT,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  reasonText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  reportTextArea: {
    backgroundColor: INPUT_BG,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    fontSize: 14,
    minHeight: 80,
    marginBottom: 20,
  },
  reportSubmitButton: {
    backgroundColor: DANGER,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  reportSubmitButtonDisabled: {
    backgroundColor: '#666',
  },
  reportSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});