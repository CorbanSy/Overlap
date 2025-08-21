// app/profile/friends.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc, // ✅ Needed for directory enrichment
} from 'firebase/firestore';

import {
  sendFriendRequest,
  removeFriend,
  acceptFriendRequest,
} from '../../_utils/storage/social';
import { ensureDirectoryForCurrentUser } from '../../_utils/storage/userProfile';

import FriendCard from '../../components/FriendCard';

export const options = { headerShown: false };

const BG = '#0D1117';
const CARD = '#1B1F24';
const BORDER = 'rgba(255,255,255,0.08)';
const INPUT_BG = '#1f1f24';
const ACCENT = '#FFA500';
const LINK = '#4dabf7';

function FriendsScreen() {
  const [friendships, setFriendships] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  
  const auth = getAuth();
  const firestore = getFirestore();
  const router = useRouter();

    // ✅ Set UID when component mounts or auth changes
  useEffect(() => {
    const u = auth.currentUser?.uid || null;
    setCurrentUid(u);
  }, [auth.currentUser]);

  // ✅ Helper to find the "other" user in a friendship
  function resolveFriendUid(item: any, me: string) {
    // Prefer userDetails keys (most reliable)
    if (item?.userDetails && typeof item.userDetails === 'object') {
      const keys = Object.keys(item.userDetails);
      const other = keys.find(k => k !== me);
      if (other) return other;
    }
    // Fallback to users array
    if (Array.isArray(item?.users)) {
      const other = item.users.find((u: string) => u !== me);
      if (other) return other;
    }
    // Nothing reliable found
    return '';
  }


  const fetchFriendships = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const friendshipsRef = collection(firestore, 'friendships');
    const qf = query(friendshipsRef, where('users', 'array-contains', currentUser.uid));
    const snap = await getDocs(qf);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setFriendships(list);
  }, [auth.currentUser, firestore]);

  const fetchSentRequests = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const requestsRef = collection(firestore, 'friendRequests');
    const qs = query(
      requestsRef,
      where('from', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(qs);
    const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Enrich with directory (email / display name)
    const enriched = await Promise.all(
      raw.map(async (r) => {
        if (!r.toEmail || !r.toDisplayName) {
          const ds = await getDoc(doc(firestore, 'userDirectory', r.to));
          if (ds.exists()) {
            const dir = ds.data() || {};
            return {
              ...r,
              toEmail: dir.emailLower || r.toEmail,
              toDisplayName: dir.displayName || r.toDisplayName,
            };
          }
        }
        return r;
      })
    );
    setSentRequests(enriched);
  }, [auth.currentUser, firestore]);

  const fetchReceivedRequests = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const requestsRef = collection(firestore, 'friendRequests');
    const qr = query(
      requestsRef,
      where('to', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(qr);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setReceivedRequests(list);
  }, [auth.currentUser, firestore]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchFriendships(),
        fetchSentRequests(),
        fetchReceivedRequests(),
        ensureDirectoryForCurrentUser().catch(() => {}),
      ]);
    } catch (e) {
      console.warn('Friends load error:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchFriendships, fetchSentRequests, fetchReceivedRequests]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  // Search & send request
  const handleSearchAndSendFriendRequest = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Please enter an email address.');
      return;
    }
    try {
      const currentUser = auth.currentUser;
      const needle = searchEmail.trim().toLowerCase().replace(/^'+|'+$/g, '');

      const directoryRef = collection(firestore, 'userDirectory');
      const qDir = query(directoryRef, where('emailLower', '==', needle));
      const snap = await getDocs(qDir);

      if (snap.empty) {
        Alert.alert('No user found with that email.');
        return;
      }

      const targetUserId = snap.docs[0].id;
      if (currentUser && targetUserId === currentUser.uid) {
        Alert.alert('You cannot add yourself as a friend.');
        return;
      }

      await sendFriendRequest(targetUserId);
      Alert.alert('Friend request sent!');
      setSearchEmail('');
      fetchSentRequests();
    } catch (error) {
      console.error('Error searching/sending:', error);
      Alert.alert('Error sending friend request.');
    }
  };

  const handleAccept = async (requestId: string, fromUserId: string) => {
    try {
      await acceptFriendRequest(requestId, fromUserId);
      Alert.alert('Friend request accepted!');
      await Promise.all([fetchReceivedRequests(), fetchFriendships()]);
    } catch (error) {
      console.error('Accept error:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const requestRef = doc(firestore, 'friendRequests', requestId);
      await updateDoc(requestRef, { status: 'rejected' });
      Alert.alert('Friend request rejected.');
      fetchReceivedRequests();
    } catch (error) {
      console.error('Reject error:', error);
    }
  };

  const handleRemoveFriend = async (friendUid: string) => {
    Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFriend(friendUid);
            Alert.alert('Friend removed.');
            fetchFriendships();
          } catch (error) {
            console.error('Remove error:', error);
            Alert.alert('Error removing friend.');
          }
        },
      },
    ]);
  };

  // UI renderers
  const renderFriend = ({ item }: any) => {
  if (!currentUid) return null;

  const friendUid = resolveFriendUid(item, currentUid);
  console.log('[Friends] row', {
    currentUid,
    users: item?.users,
    userDetailsKeys: item?.userDetails ? Object.keys(item.userDetails) : null,
    resolvedFriendUid: friendUid,
  });

  if (!friendUid) {
    // Render a disabled row so we see it's bad data
    return (
      <View style={styles.cardRow}>
        <FriendCard item={{ name: 'Unknown friend (bad doc)', profilePicUrl: undefined }} />
        <Text style={{ color: '#f88' }}>Fix friendship doc</Text>
      </View>
    );
  }

  const friendData = (item.userDetails && item.userDetails[friendUid]) || {};
  
  // Improved name resolution with better fallbacks
  const displayName = 
    friendData.name || 
    friendData.displayName || 
    friendData.username || 
    friendData.email || 
    friendData.emailLower ||
    'Friend'; // Better fallback than UID
  
  // Improved avatar URL resolution
  const avatarUrl = 
    friendData.avatarUrl || 
    friendData.profilePicUrl || 
    undefined;

  return (
    <View style={styles.cardRow}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/profile/friendProfile', params: { uid: friendUid } })}
        style={{ flex: 1 }}
        activeOpacity={0.85}
      >
        <FriendCard
          item={{
            name: displayName,
            profilePicUrl: avatarUrl,
          }}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.smallBtn, { backgroundColor: '#F44336' }]}
        onPress={() => handleRemoveFriend(friendUid)}
        activeOpacity={0.85}
      >
        <Text style={styles.smallBtnText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
};

  const renderSentRequest = ({ item }: any) => (
    <View style={styles.cardRow}>
      <FriendCard
        item={{
          name: item.toDisplayName || item.toEmail || item.to,
          profilePicUrl: item.profilePicUrl,
        }}
      />
      <View style={styles.pill}>
        <Text style={styles.pillText}>Pending</Text>
      </View>
    </View>
  );

  const renderReceivedRequest = ({ item }: any) => (
    <View style={styles.cardRow}>
      <FriendCard
        item={{
          name: item.fromEmail || item.from,
          profilePicUrl: item.profilePicUrl,
        }}
      />
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: '#4CAF50' }]}
          onPress={() => handleAccept(item.id, item.from)}
          activeOpacity={0.85}
        >
          <Text style={styles.smallBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: '#F44336' }]}
          onPress={() => handleReject(item.id)}
          activeOpacity={0.85}
        >
          <Text style={styles.smallBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Find a Friend</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor="#888"
            value={searchEmail}
            onChangeText={setSearchEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="search"
            onSubmitEditing={handleSearchAndSendFriendRequest}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSearchAndSendFriendRequest}>
            <Text style={styles.primaryBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Tip: your friends must have added their email to the directory.
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={
            <>
              {/* Accepted */}
              <Text style={styles.sectionTitle}>Your Friends</Text>
              {friendships.length === 0 && (
                <Text style={styles.emptyText}>No friends yet.</Text>
              )}
            </>
          }
          data={friendships}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={
            <>
              {/* Sent */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Pending (Sent)</Text>
              {sentRequests.length === 0 ? (
                <Text style={styles.emptyText}>No pending sent requests.</Text>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={sentRequests}
                  keyExtractor={(item) => item.id}
                  renderItem={renderSentRequest}
                  contentContainerStyle={{ paddingTop: 6 }}
                />
              )}

              {/* Received */}
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Pending (Received)</Text>
              {receivedRequests.length === 0 ? (
                <Text style={styles.emptyText}>No received friend requests.</Text>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={receivedRequests}
                  keyExtractor={(item) => item.id}
                  renderItem={renderReceivedRequest}
                  contentContainerStyle={{ paddingTop: 6 }}
                />
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: {
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
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },

  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 10 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: INPUT_BG,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#0D1117', fontWeight: '800' },
  hint: { color: '#9aa0a6', marginTop: 8, fontSize: 12 },

  sectionTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
  },
  emptyText: {
    color: '#9aa0a6',
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },

  cardRow: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },

  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default FriendsScreen;
