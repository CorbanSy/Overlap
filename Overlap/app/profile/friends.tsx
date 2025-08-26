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

// Import auth from your config instead of using getAuth
import { auth } from '../../FirebaseConfig';
import { User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';

import {
  sendFriendRequest,
  removeFriend,
  debugFirebaseSetup,
  sendFriendRequestDebug,
  acceptFriendRequestDebug
} from '../../_utils/storage/social';
import { ensureDirectoryForCurrentUser } from '../../_utils/storage/userProfile';

import FriendCard from '../../components/FriendCard';

export const options = { headerShown: false };

// Type definitions
interface FriendRequestData {
  id: string;
  from?: string;
  to?: string;
  fromEmail?: string;
  toEmail?: string;
  toDisplayName?: string;
  profilePicUrl?: string;
  status?: string;
  timestamp?: any;
  [key: string]: any;
}

interface FriendData {
  id: string;
  uid: string;
  name: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl: string;
  createdAt?: any;
}

const BG = '#0D1117';
const CARD = '#1B1F24';
const BORDER = 'rgba(255,255,255,0.08)';
const INPUT_BG = '#1f1f24';
const ACCENT = '#FFA500';
const LINK = '#4dabf7';

function FriendsScreen() {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestData[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestData[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  
  const firestore = getFirestore();
  const router = useRouter();

  // Updated useAuth hook to use the imported auth
  const useAuth = () => {
    const [user, setUser] = useState<User | null>(null); // Now properly typed

    useEffect(() => {
      const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribeAuth();
    }, []);

    return { user, auth };
  };

  const { user } = useAuth();

  // Set UID when component mounts or auth changes
  useEffect(() => {
    const u = auth.currentUser?.uid || null;
    setCurrentUid(u);
  }, [auth.currentUser]);

  // Fetch friends from user's friends subcollection
  const fetchFriends = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // Get friends from user's subcollection
      const friendsRef = collection(firestore, 'users', currentUser.uid, 'friends');
      const friendsSnapshot = await getDocs(friendsRef);
      
      if (friendsSnapshot.empty) {
        setFriends([]);
        return;
      }

      // Get friend details from userDirectory for each friend
      const friendPromises = friendsSnapshot.docs.map(async (friendDoc) => {
        const friendId = friendDoc.id;
        const friendData = friendDoc.data();

        try {
          // Get friend's directory info
          const dirRef = doc(firestore, 'userDirectory', friendId);
          const dirSnap = await getDoc(dirRef);
          
          if (dirSnap.exists()) {
            const dirData = dirSnap.data();
            return {
              id: friendId,
              uid: friendId,
              name: dirData.displayName || dirData.usernamePublic || dirData.emailLower || 'Friend',
              displayName: dirData.displayName || '',
              username: dirData.usernamePublic || '',
              email: dirData.emailLower || '',
              avatarUrl: dirData.avatarUrl || '',
              createdAt: friendData.createdAt,
            };
          } else {
            // Fallback if no directory entry
            return {
              id: friendId,
              uid: friendId,
              name: 'Friend',
              displayName: '',
              username: '',
              email: '',
              avatarUrl: '',
              createdAt: friendData.createdAt,
            };
          }
        } catch (error) {
          console.error(`Error fetching friend ${friendId}:`, error);
          return {
            id: friendId,
            uid: friendId,
            name: 'Friend',
            displayName: '',
            username: '',
            email: '',
            avatarUrl: '',
            createdAt: friendData.createdAt,
          };
        }
      });

      const friendsList = await Promise.all(friendPromises);
      setFriends(friendsList.filter(friend => friend !== null));
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
    }
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
    const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequestData));

    // Enrich with directory (email / display name)
    const enriched = await Promise.all(
      raw.map(async (r) => {
        if (!r.toEmail || !r.toDisplayName) {
          // Ensure r.to exists before using it
          if (r.to) {
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
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequestData));
    setReceivedRequests(list);
  }, [auth.currentUser, firestore]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchFriends(),
        fetchSentRequests(),
        fetchReceivedRequests(),
        ensureDirectoryForCurrentUser().catch(() => {}),
      ]);
    } catch (e) {
      console.warn('Friends load error:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchFriends, fetchSentRequests, fetchReceivedRequests]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  // Enhanced search & send request function with debugging
  const handleSearchAndSendFriendRequest = async () => {
    console.log('🔍 =================================');
    console.log('🔍 handleSearchAndSendFriendRequest started');
    console.log('🔍 =================================');
    
    if (!searchEmail.trim()) {
      Alert.alert('Please enter an email address.');
      return;
    }

    try {
      // Step 1: Debug Firebase setup first
      console.log('🔍 Step 1: Testing Firebase setup...');
      await debugFirebaseSetup();
      console.log('✅ Firebase setup OK');

      // Step 2: Check authentication
      console.log('🔍 Step 2: Checking authentication...');
      const currentUser = auth.currentUser;
      console.log('✅ Current user:', currentUser?.uid, currentUser?.email);
      
      if (!currentUser) {
        Alert.alert('Authentication Error', 'You must be signed in to send friend requests.');
        return;
      }

      // Step 3: Search for user
      console.log('🔍 Step 3: Searching for user...');
      const needle = searchEmail.trim().toLowerCase().replace(/^'+|'+$/g, '');
      console.log('✅ Search email:', needle);

      const directoryRef = collection(firestore, 'userDirectory');
      const qDir = query(directoryRef, where('emailLower', '==', needle));
      console.log('✅ Query created');
      
      const snap = await getDocs(qDir);
      console.log('✅ Query executed, results:', snap.empty ? 'empty' : `${snap.docs.length} docs`);

      if (snap.empty) {
        Alert.alert('User Not Found', 'No user found with that email address.');
        return;
      }

      const targetUserId = snap.docs[0].id;
      const targetData = snap.docs[0].data();
      console.log('✅ Target user found:', targetUserId, targetData.displayName || targetData.emailLower);
      
      if (currentUser && targetUserId === currentUser.uid) {
        Alert.alert('Invalid Request', 'You cannot add yourself as a friend.');
        return;
      }

      // Step 4: Send friend request using debug version
      console.log('🔍 Step 4: Sending friend request...');
      const requestId = await sendFriendRequestDebug(targetUserId);
      console.log('✅ Friend request sent successfully:', requestId);
      
      Alert.alert('Success!', 'Friend request sent successfully!');
      setSearchEmail('');
      fetchSentRequests();

    } catch (error: unknown) {
      console.log('🔍 =================================');
      console.error('❌ Error in handleSearchAndSendFriendRequest:');
      
      // Type guard to safely access error properties
      if (error instanceof Error) {
        console.error('❌ Error type:', error.constructor.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Full error:', error);
      }
      
      // For Firebase errors, check if it has a code property
      let userMessage = 'Error sending friend request.';
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message?: string };
        if (firebaseError.code === 'permission-denied') {
          userMessage = 'Permission denied. Please check your account settings.';
        }
        console.error('❌ Error code:', firebaseError.code);
      } else if (error instanceof Error) {
        if (error.message.includes('network')) {
          userMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('auth')) {
          userMessage = 'Authentication error. Please sign in again.';
        }
      }
      
      console.log('🔍 =================================');
      Alert.alert('Error', userMessage);
    }
  };

  const handleAccept = async (requestId: string, fromUserId: string) => {
    try {
      // Use the debug version to see where it fails
      await acceptFriendRequestDebug(requestId, fromUserId);
      Alert.alert('Friend request accepted!');
      await Promise.all([fetchReceivedRequests(), fetchFriends()]);
    } catch (error: unknown) {
      console.error('Accept error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error accepting friend request:', errorMessage);
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
      Alert.alert('Error', 'Failed to reject friend request');
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
            fetchFriends();
          } catch (error) {
            console.error('Remove error:', error);
            Alert.alert('Error removing friend.');
          }
        },
      },
    ]);
  };

  const renderFriend = ({ item }: { item: FriendData }) => {
    return (
      <View style={styles.cardRow}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/profile/friendProfile', params: { uid: item.uid } })}
          style={{ flex: 1 }}
          activeOpacity={0.85}
        >
          <FriendCard
            item={{
              name: item.name,
              profilePicUrl: item.avatarUrl,
            }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: '#F44336' }]}
          onPress={() => handleRemoveFriend(item.uid)}
          activeOpacity={0.85}
        >
          <Text style={styles.smallBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSentRequest = ({ item }: { item: FriendRequestData }) => (
    <View style={styles.cardRow}>
      <FriendCard
        item={{
          name: item.toDisplayName || item.toEmail || item.to || 'Unknown',
          profilePicUrl: item.profilePicUrl,
        }}
      />
      <View style={styles.pill}>
        <Text style={styles.pillText}>Pending</Text>
      </View>
    </View>
  );

  const renderReceivedRequest = ({ item }: { item: FriendRequestData }) => (
    <View style={styles.cardRow}>
      <FriendCard
        item={{
          name: item.fromEmail || item.from || 'Unknown',
          profilePicUrl: item.profilePicUrl,
        }}
      />
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: '#4CAF50' }]}
          onPress={() => handleAccept(item.id, item.from || '')}
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
        
        {/* Test button - remove after debugging */}
        <View style={[styles.searchRow, { marginTop: 8 }]}>
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: '#4CAF50', flex: 1 }]} 
            onPress={async () => {
              try {
                console.log('🔍 Testing Firebase setup...');
                const result = await debugFirebaseSetup();
                Alert.alert('Success', result);
              } catch (error: unknown) {
                console.error('Setup test failed:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                Alert.alert('Setup Test Failed', errorMessage);
              }
            }}
          >
            <Text style={styles.primaryBtnText}>Test Firebase Setup</Text>
          </TouchableOpacity>
        </View>
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
              {friends.length === 0 && (
                <Text style={styles.emptyText}>No friends yet.</Text>
              )}
            </>
          }
          data={friends}
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