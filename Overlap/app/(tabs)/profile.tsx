import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// Imported components
import TabBar from '../profile/TabBar';
import SearchBar from '../../components/SearchBar';
import ActivityCard from '../../components/ActivityCard';
import CollectionCard from '../../components/CollectionCard';
import FullProfileInfo from '../profile/FullProfileInfo';
import { unlikePlace } from '../../_utils/storage';

/* =========================
   Modal Components
   ========================= */

// Modal for creating a new collection
const NewCollectionModal = ({
  visible,
  onClose,
  onAddCollection,
  newCollectionName,
  setNewCollectionName,
  newCollectionDescription,
  setNewCollectionDescription,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close-circle-outline" size={30} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Create a New Collection</Text>
        <TextInput
          style={styles.input}
          placeholder="Collection Name"
          placeholderTextColor="#888"
          value={newCollectionName}
          onChangeText={setNewCollectionName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description (Optional)"
          placeholderTextColor="#888"
          value={newCollectionDescription}
          onChangeText={setNewCollectionDescription}
        />
        <TouchableOpacity style={styles.modalButton} onPress={onAddCollection}>
          <Text style={styles.modalButtonText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Modal for selecting a collection when adding an activity
const CollectionSelectionModal = ({ visible, collections, onSelectCollection, onClose }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close-circle-outline" size={30} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Select a Collection</Text>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {collections.length > 0 ? (
            collections.map((collection) => (
              <TouchableOpacity
                key={collection.id}
                style={styles.collectionCard}
                onPress={() => onSelectCollection(collection.id)}
              >
                <Text style={styles.collectionText}>{collection.title}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noCollectionsText}>No collections available.</Text>
          )}
        </ScrollView>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Dropdown for settings options
const SettingsDropdown = ({ visible, onSelectOption }) => {
  if (!visible) return null;
  return (
    <View style={styles.settingsDropdown}>
      <TouchableOpacity style={styles.settingsItem} onPress={() => onSelectOption('Account')}>
        <Text style={styles.settingsText}>Account</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsItem} onPress={() => onSelectOption('Edit Profile')}>
        <Text style={styles.settingsText}>Edit Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsItem} onPress={() => onSelectOption('Notifications')}>
        <Text style={styles.settingsText}>Notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsItem} onPress={() => onSelectOption('Privacy')}>
        <Text style={styles.settingsText}>Privacy</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsItem} onPress={() => onSelectOption('Help')}>
        <Text style={styles.settingsText}>Help</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsItem} onPress={() => onSelectOption('Friends')}>
        <Text style={styles.settingsText}>Friends</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsItem} onPress={() => onSelectOption('Logout')}>
        <Text style={[styles.settingsText, { color: '#F44336' }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

/* =========================
   List Header Component
   ========================= */

const ListHeader = ({
  activeTab,
  setActiveTab,
  selectedCollection,
  onClearSelectedCollection,
  setIsModalVisible,
  toggleSettingsMenu,
  searchQuery,
  setSearchQuery,
}) => (
  <View style={styles.headerContainer}>
    <FullProfileInfo />
    <TouchableOpacity style={styles.settingsButton} onPress={toggleSettingsMenu}>
      <Ionicons name="settings-outline" size={24} color="#FFF" />
    </TouchableOpacity>
    <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    {activeTab === 'Collections' && !selectedCollection && (
      <TouchableOpacity style={styles.addCollectionButton} onPress={() => setIsModalVisible(true)}>
        <Text style={styles.addCollectionText}>+ Add Collection</Text>
      </TouchableOpacity>
    )}
    {selectedCollection && (
      <View style={styles.collectionHeader}>
        <TouchableOpacity onPress={onClearSelectedCollection} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.collectionTitle}>Activities in {selectedCollection.title}</Text>
      </View>
    )}
  </View>
);

/* =========================
   ProfileScreen Component
   ========================= */

function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Liked Activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedActivities, setLikedActivities] = useState([]);
  const [collections, setCollections] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);
  const [user, setUser] = useState(null);

  const auth = getAuth();
  const firestore = getFirestore();
  const router = useRouter();

  // Refs for snapshot unsubscribe functions
  const unsubscribeLikesRef = useRef(null);
  const unsubscribeCollectionsRef = useRef(null);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, [auth]);

  // Clear selected collection when switching away from the Collections tab
  useEffect(() => {
    if (activeTab !== 'Collections') {
      setSelectedCollection(null);
    }
  }, [activeTab]);

  // Fetch liked activities from Firestore
  useEffect(() => {
    if (!user) return;
    const likesRef = collection(firestore, `users/${user.uid}/likes`);
    const unsubscribe = onSnapshot(
      likesRef,
      (snapshot) => {
        setLikedActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Likes listener error:", error)
    );
    unsubscribeLikesRef.current = unsubscribe;
    return () => {
      if (unsubscribeLikesRef.current) {
        unsubscribeLikesRef.current();
        unsubscribeLikesRef.current = null;
      }
    };
  }, [user]);

  // Fetch collections from Firestore
  useEffect(() => {
    if (!user) return;
    const collectionsRef = collection(firestore, `users/${user.uid}/collections`);
    const unsubscribe = onSnapshot(
      collectionsRef,
      (snapshot) => {
        setCollections(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            activities: doc.data().activities || [],
          }))
        );
      },
      (error) => console.error("Collections listener error:", error)
    );
    unsubscribeCollectionsRef.current = unsubscribe;
    return () => {
      if (unsubscribeCollectionsRef.current) {
        unsubscribeCollectionsRef.current();
        unsubscribeCollectionsRef.current = null;
      }
    };
  }, [user]);

  // Handler for adding a new collection
  const handleAddCollection = async () => {
    if (!newCollectionName.trim() || !user) return;
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
  };

  // Handler for adding an activity to a collection
  const handleAddToCollection = async (collectionId) => {
    if (!selectedActivity || !collectionId || !user) return;
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const collectionItem = collections.find((c) => c.id === collectionId);
      if (!collectionItem.activities.some((activity) => activity.id === selectedActivity.id)) {
        const updatedActivities = [...collectionItem.activities, selectedActivity];
        await updateDoc(collectionRef, { activities: updatedActivities });
        setCollections(prevCollections =>
          prevCollections.map(c =>
            c.id === collectionId ? { ...c, activities: updatedActivities } : c
          )
        );
      }
      setIsCollectionModalVisible(false);
      setSelectedActivity(null);
    } catch (error) {
      console.error('Error adding to collection:', error);
    }
  };

  // Remove an activity from a collection
  const removeFromCollection = async (collectionId, activityId) => {
    if (!user || !selectedCollection) return;
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const updatedActivities = selectedCollection.activities.filter(act => act.id !== activityId);
      await updateDoc(collectionRef, { activities: updatedActivities });
      setSelectedCollection(prev => ({ ...prev, activities: updatedActivities }));
    } catch (error) {
      console.error("Error removing from collection:", error);
    }
  };

  // Handle selection of settings option
  const handleSettingsOptionPress = async (option) => {
    if (option === 'Logout') {
      // Unsubscribe from listeners before logging out
      unsubscribeLikesRef.current && unsubscribeLikesRef.current();
      unsubscribeCollectionsRef.current && unsubscribeCollectionsRef.current();
      try {
        await signOut(auth);
        router.replace('/');
      } catch (error) {
        console.error("Error signing out:", error);
      }
    } else if (option === 'Friends') {
      router.push('/profile/friends');
    } else if (option === 'Edit Profile') {
      // Navigate to the edit profile screen
      router.push('/profile/editProfile');
    } else if (option === 'Privacy') {
      router.push('/profile/privacy');
    } else if (option === 'Help') {
      router.push('/profile/help');
    } else if (option === 'Notifications') {
      router.push('/profile/notifications');
    }
    setIsSettingsMenuVisible(false);
  };

  // Clear the selected collection (used when returning from a collection view)
  const clearSelectedCollection = () => setSelectedCollection(null);

  // Render item based on the active tab and selection state
  const renderItem = ({ item }) => {
    if (activeTab === 'Collections' && !selectedCollection) {
      return <CollectionCard collection={item} onPress={() => setSelectedCollection(item)} />;
    }
    return (
      <ActivityCard
        item={item}
        isInCollection={!!selectedCollection}
        onRemoveFromCollection={(id) => removeFromCollection(selectedCollection?.id, id)}
        onRemoveFromLiked={async (id) => {
          try {
            await unlikePlace(id);
          } catch (error) {
            console.error("Error unliking activity:", error);
          }
        }}
        onAddToCollection={(activity) => {
          setSelectedActivity(activity);
          setIsCollectionModalVisible(true);
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        key={activeTab === 'Collections' ? (selectedCollection ? 'activities' : 'collections') : 'liked'}
        keyExtractor={(item) => item.id}
        data={
          activeTab === 'Collections'
            ? selectedCollection
              ? selectedCollection.activities
              : collections
            : likedActivities
        }
        renderItem={renderItem}
        ListHeaderComponent={
          <ListHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedCollection={selectedCollection}
            onClearSelectedCollection={clearSelectedCollection}
            setIsModalVisible={setIsModalVisible}
            toggleSettingsMenu={() => setIsSettingsMenuVisible(prev => !prev)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        }
        contentContainerStyle={styles.listContainer}
        numColumns={activeTab === 'Collections' && !selectedCollection ? 2 : 1}
      />
      <SettingsDropdown visible={isSettingsMenuVisible} onSelectOption={handleSettingsOptionPress} />
      <NewCollectionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onAddCollection={handleAddCollection}
        newCollectionName={newCollectionName}
        setNewCollectionName={setNewCollectionName}
        newCollectionDescription={newCollectionDescription}
        setNewCollectionDescription={setNewCollectionDescription}
      />
      <CollectionSelectionModal
        visible={isCollectionModalVisible}
        collections={collections}
        onSelectCollection={handleAddToCollection}
        onClose={() => setIsCollectionModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  listContainer: { paddingHorizontal: 8, paddingVertical: 10 },
  headerContainer: { position: 'relative', paddingBottom: 10 },
  settingsButton: { position: 'absolute', right: 16, top: 16, zIndex: 10 },
  settingsDropdown: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#1B1F24',
    borderRadius: 6,
    paddingVertical: 6,
    width: 150,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 20,
  },
  settingsItem: { paddingVertical: 8, paddingHorizontal: 12 },
  settingsText: { color: '#FFF', fontSize: 16 },
  addCollectionButton: { backgroundColor: '#F5A623', padding: 10, borderRadius: 10, margin: 10 },
  addCollectionText: { color: '#0D1117', fontWeight: 'bold', textAlign: 'center' },
  collectionHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingHorizontal: 16 },
  backButton: { marginRight: 10 },
  collectionTitle: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    backgroundColor: '#1B1F24',
    width: '85%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  closeButton: { position: 'absolute', top: 10, right: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 15, textAlign: 'center' },
  scrollContainer: { width: '100%', alignItems: 'center', paddingVertical: 10 },
  input: { backgroundColor: '#222', color: '#fff', padding: 10, borderRadius: 6, marginBottom: 10, width: '100%' },
  modalButton: { backgroundColor: '#FFA500', paddingVertical: 10, borderRadius: 6, alignItems: 'center', width: '100%' },
  modalButtonText: { color: '#000', fontWeight: 'bold' },
  noCollectionsText: { fontSize: 16, color: '#AAA', textAlign: 'center', marginTop: 10 },
  cancelButton: { marginTop: 15, backgroundColor: '#F44336', paddingVertical: 10, paddingHorizontal: 40, borderRadius: 8 },
  cancelButtonText: { fontSize: 16, color: '#FFF', fontWeight: 'bold' },
});

export default ProfileScreen;
