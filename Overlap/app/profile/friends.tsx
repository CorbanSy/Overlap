import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  FlatList, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  View, 
  TextInput,
  Alert 
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { sendFriendRequest, removeFriend, acceptFriendRequest } from '../utils/storage';
import FriendCard from '../../components/FriendCard';

function FriendsScreen() {
  const [friendships, setFriendships] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const auth = getAuth();
  const firestore = getFirestore();
  const router = useRouter();

  // Search for a user by email and send a friend request
  const handleSearchAndSendFriendRequest = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Please enter an email address.');
      return;
    }
    try {
      const currentUser = auth.currentUser;
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', searchEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        Alert.alert('No user found with that email.');
        return;
      }
      const userDoc = querySnapshot.docs[0];
      const targetUserId = userDoc.id;
  
      // Prevent user from adding themselves
      if (targetUserId === currentUser.uid) {
        Alert.alert('You cannot add yourself as a friend.');
        return;
      }
  
      await sendFriendRequest(targetUserId);
      Alert.alert('Friend request sent successfully!');
      setSearchEmail('');
      fetchSentRequests();
    } catch (error) {
      console.error('Error searching for user and sending friend request:', error);
      Alert.alert('Error sending friend request.');
    }
  };
  

  // Fetch accepted friendships
  const fetchFriendships = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const friendshipsRef = collection(firestore, 'friendships');
      const q = query(friendshipsRef, where('users', 'array-contains', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const friendsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFriendships(friendsList);
    } catch (error) {
      console.error("Error fetching friendships:", error);
    }
  };

  // Fetch pending friend requests sent by the current user
  const fetchSentRequests = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const requestsRef = collection(firestore, 'friendRequests');
      const q = query(
        requestsRef,
        where('from', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      const requestsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSentRequests(requestsList);
    } catch (error) {
      console.error("Error fetching sent friend requests:", error);
    }
  };

  // Fetch incoming friend requests (received requests)
  const fetchReceivedRequests = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const requestsRef = collection(firestore, 'friendRequests');
      const q = query(
        requestsRef,
        where('to', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      const requestsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReceivedRequests(requestsList);
    } catch (error) {
      console.error("Error fetching received friend requests:", error);
    }
  };

  useEffect(() => {
    fetchFriendships();
    fetchSentRequests();
    fetchReceivedRequests();
  }, []);

  // Accept a friend request using the storage function
  const handleAccept = async (requestId, fromUserId) => {
    try {
      await acceptFriendRequest(requestId, fromUserId);
      Alert.alert('Friend request accepted!');
      fetchReceivedRequests();
      fetchFriendships();
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  // Reject a received friend request
  const handleReject = async (requestId) => {
    try {
      const requestRef = doc(firestore, 'friendRequests', requestId);
      await updateDoc(requestRef, { status: 'rejected' });
      Alert.alert('Friend request rejected.');
      fetchReceivedRequests();
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  // Remove a friend
  const handleRemoveFriend = async (friendUid) => {
    try {
      Alert.alert(
        'Remove Friend',
        'Are you sure you want to remove this friend?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeFriend(friendUid);
              Alert.alert('Friend removed successfully.');
              fetchFriendships();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error removing friend:', error);
      Alert.alert('Error removing friend.');
    }
  };

  // Render accepted friend item using FriendCard.
  const renderFriend = ({ item }) => {
    const currentUser = auth.currentUser;
    const friendUid = item.users.find(uid => uid !== currentUser.uid);
    // Get friend details from the friendship document's userDetails object.
    const friendData = (item.userDetails && item.userDetails[friendUid]) || {};
    return (
      <View style={styles.friendItem}>
        <TouchableOpacity
          onPress={() => 
            router.push({ 
              pathname: '/profile/friendProfile', 
              params: { uid: friendUid } 
            })
          }
          style={{ flex: 1 }}
        >
          <FriendCard
            item={{
              name: friendData.name || friendUid,
              profilePicUrl: friendData.avatarUrl || friendData.profilePicUrl
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={() => handleRemoveFriend(friendUid)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render a pending sent friend request using FriendCard.
  const renderSentRequest = ({ item }) => (
    <View style={styles.requestItem}>
      <FriendCard
        item={{
          name: item.toEmail || item.to,
          profilePicUrl: item.profilePicUrl
        }}
      />
      <Text style={styles.requestStatusText}>Pending request</Text>
    </View>
  );

  // Render a received friend request with FriendCard and accept/reject buttons.
  // For received requests, show the sender's info.
  const renderReceivedRequest = ({ item }) => (
    <View style={styles.requestItem}>
      <FriendCard
        item={{
          name: item.fromEmail || item.from,
          profilePicUrl: item.profilePicUrl
        }}
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.id, item.from)}
        >
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id)}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search and Send Friend Request */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter email address"
          placeholderTextColor="#888"
          value={searchEmail}
          onChangeText={setSearchEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearchAndSendFriendRequest}
        >
          <Text style={styles.searchButtonText}>Send Friend Request</Text>
        </TouchableOpacity>
      </View>
  
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Friends</Text>
      </View>
  
      {/* Accepted Friendships */}
      <FlatList
        data={friendships}
        keyExtractor={(item) => item.id}
        renderItem={renderFriend}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No friends yet.</Text>}
      />
  
      {/* Pending Sent Friend Requests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Pending Sent Requests</Text>
      </View>
      <FlatList
        data={sentRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderSentRequest}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No pending sent requests.</Text>}
      />
  
      {/* Received Friend Requests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Received Friend Requests</Text>
      </View>
      <FlatList
        data={receivedRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderReceivedRequest}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No received friend requests.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  searchContainer: { 
    flexDirection: 'row', 
    padding: 16, 
    alignItems: 'center', 
    backgroundColor: '#1B1F24' 
  },
  input: { 
    flex: 1, 
    backgroundColor: '#272B30', 
    color: '#FFF', 
    padding: 10, 
    borderRadius: 6, 
    marginRight: 10 
  },
  searchButton: { 
    backgroundColor: '#FFA500', 
    padding: 10, 
    borderRadius: 6 
  },
  searchButtonText: { 
    color: '#000', 
    fontWeight: 'bold' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#1B1F24' 
  },
  backButton: { marginRight: 16 },
  backButtonText: { color: '#FFF', fontSize: 16 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  listContainer: { padding: 16 },
  friendItem: { 
    backgroundColor: '#272B30', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  removeButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10
  },
  removeButtonText: { color: '#FFF', fontWeight: 'bold' },
  emptyText: { color: '#AAA', fontSize: 16, textAlign: 'center', marginTop: 20 },
  sectionHeader: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    backgroundColor: '#1B1F24' 
  },
  sectionHeaderText: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  requestItem: {
    backgroundColor: '#333', 
    padding: 10, 
    borderRadius: 6, 
    marginHorizontal: 16, 
    marginBottom: 8,
    alignItems: 'center'
  },
  requestStatusText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center'
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  acceptButton: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 6 },
  rejectButton: { backgroundColor: '#F44336', padding: 10, borderRadius: 6 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
});

export default FriendsScreen;
