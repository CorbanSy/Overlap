import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// Import components
import FullProfileInfo from '../../components/FullProfileInfo';
import TabBar from '../../components/TabBar';
import SearchBar from '../../components/SearchBar';
import ActivityCard from '../../components/ActivityCard';
import CollectionCard from '../../components/CollectionCard';
import FriendCard from '../../components/FriendCard';

function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Liked Activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedActivities, setLikedActivities] = useState([]);
  const [collections, setCollections] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');

  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  // Fetch liked activities from Firestore
  useEffect(() => {
    if (user) {
      const likesRef = collection(firestore, `users/${user.uid}/likes`);
      const unsubscribe = onSnapshot(likesRef, (snapshot) => {
        const likedPlaces = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLikedActivities(likedPlaces);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Fetch collections from Firestore
  useEffect(() => {
    if (user) {
      const collectionsRef = collection(firestore, `users/${user.uid}/collections`);
      const unsubscribe = onSnapshot(collectionsRef, (snapshot) => {
        const userCollections = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCollections(userCollections);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Add a new collection
  const addCollection = async () => {
    if (!newCollectionName.trim()) return;

    if (user) {
      try {
        await addDoc(collection(firestore, `users/${user.uid}/collections`), {
          title: newCollectionName,
          description: newCollectionDescription,
          activities: [],
        });
        setNewCollectionName('');
        setNewCollectionDescription('');
        setIsModalVisible(false);
      } catch (error) {
        console.error('Error adding collection:', error);
      }
    }
  };

  // Determine the data to display based on the active tab
  let data = [];
  let renderItem;
  switch (activeTab) {
    case 'Collections':
      data = collections;
      renderItem = ({ item }) => (
        <CollectionCard collection={item} onPress={() => console.log('Open collection:', item)} />
      );
      break;
    case 'Friends':
      data = []; // Replace with friends list
      renderItem = ({ item }) => <FriendCard item={item} />;
      break;
    case 'Liked Activities':
      default:
        data = likedActivities;
        renderItem = ({ item }) => (
          <ActivityCard 
            item={item} 
            onRemove={(id) => setLikedActivities(likedActivities.filter(activity => activity.id !== id))}
          />
        );
        break;
  }

  // Filter search results
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    data = data.filter((item) =>
      item.name?.toLowerCase().includes(query) || item.title?.toLowerCase().includes(query)
    );
  }

  // Display a message if no liked activities exist
  const renderEmptyMessage = () => {
    if (activeTab === 'Liked Activities' && likedActivities.length === 0) {
      return (
        <View style={styles.emptyMessageContainer}>
          <Ionicons name="heart-dislike-outline" size={40} color="#aaa" />
          <Text style={styles.emptyMessageText}>
            No liked activities yet. Start exploring!
          </Text>
        </View>
      );
    }

    if (activeTab === 'Collections' && collections.length === 0) {
      return (
        <View style={styles.emptyMessageContainer}>
          <Ionicons name="albums-outline" size={40} color="#aaa" />
          <Text style={styles.emptyMessageText}>
            No collections created yet. Add one now!
          </Text>
        </View>
      );
    }

    return null;
  };

  // Header section with profile, manage friends button, and menu
  const ListHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <FullProfileInfo groups={[]} events={[]} />

        {/* Manage Friends Button */}
        <TouchableOpacity style={styles.manageFriendsButton}>
          <Text style={styles.manageFriendsText}>Manage Friends</Text>
        </TouchableOpacity>

        {/* 3-dot menu for editing profile */}
        <TouchableOpacity style={styles.menuButton} onPress={() => console.log('Edit Profile')}>
          <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* Show "Add Collection" button when in Collections tab */}
      {activeTab === 'Collections' && (
        <TouchableOpacity style={styles.addCollectionButton} onPress={() => setIsModalVisible(true)}>
          <Text style={styles.addCollectionText}>+ Add Collection</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyMessage}
        contentContainerStyle={styles.listContainer}
        numColumns={activeTab === 'Collections' ? 2 : 1}
        key={activeTab === 'Collections' ? 'collections-grid' : 'single-column'}
      />

      {/* Add Collection Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a Collection</Text>
            <TextInput
              style={styles.input}
              placeholder="Collection Name"
              value={newCollectionName}
              onChangeText={setNewCollectionName}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={newCollectionDescription}
              onChangeText={setNewCollectionDescription}
            />
            <TouchableOpacity style={styles.modalButton} onPress={addCollection}>
              <Text style={styles.modalButtonText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: 'gray' }]}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  listContainer: { paddingHorizontal: 8, paddingVertical: 10 },

  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuButton: { position: 'absolute', right: 16, top: 10 },

  manageFriendsButton: { backgroundColor: '#F5A623', padding: 6, borderRadius: 10 },
  manageFriendsText: { color: '#0D1117', fontWeight: 'bold' },

  addCollectionButton: { backgroundColor: '#F5A623', padding: 10, borderRadius: 10, margin: 10 },
  addCollectionText: { color: '#0D1117', fontWeight: 'bold', textAlign: 'center' },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: { borderBottomWidth: 1, padding: 8, marginBottom: 10 },
  modalButton: { backgroundColor: '#F5A623', padding: 10, borderRadius: 5, marginTop: 5 },
  modalButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});

export default ProfileScreen;
