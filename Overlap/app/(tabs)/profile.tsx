import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Share } from 'react-native';

// Import components
import FullProfileInfo from '../../components/FullProfileInfo';
import TabBar from '../../components/TabBar';
import SearchBar from '../../components/SearchBar';
import ActivityCard from '../../components/ActivityCard';
import CollectionCard from '../../components/CollectionCard';

function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Liked Activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedActivities, setLikedActivities] = useState([]);
  const [collections, setCollections] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
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
          activities: doc.data().activities?.map(activity => ({
            ...activity,
            photoReference: activity.photoReference || null,
          })) || [],
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

  //share (example code)
  const handleShare = async () => {
    try {
      const message = `Check out this activity: ${item.name}\nRating: ${item.rating}⭐\nMore details: ${item.url || 'N/A'}`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing activity:', error);
    }
  };

  // Remove activity from collection
  const removeFromCollection = async (collectionId, activityId) => {
    if (!user) return;
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const updatedActivities = selectedCollection.activities.filter((act) => act.id !== activityId);
      await updateDoc(collectionRef, { activities: updatedActivities });
      setSelectedCollection((prev) => ({
        ...prev,
        activities: updatedActivities,
      }));
    } catch (error) {
      console.error("Error removing from collection:", error);
    }
  };

  const handleAddToCollection = async (collectionId) => {
    if (!selectedActivity || !collectionId || !user) return;
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const collection = collections.find((c) => c.id === collectionId);
      // Prevent duplicates
      if (!collection.activities.some((activity) => activity.id === selectedActivity.id)) {
        const updatedActivities = [...collection.activities, selectedActivity];
        await updateDoc(collectionRef, { activities: updatedActivities });
        setCollections((prevCollections) =>
          prevCollections.map((c) =>
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

  const ListHeader = () => (
    <>
      {/* Menu Button */}
      <View style={styles.menuContainer}>
        <TouchableOpacity onPress={() => setIsDropdownVisible(!isDropdownVisible)}>
          <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Overlay */}
      {isDropdownVisible && (
        <TouchableWithoutFeedback onPress={() => setIsDropdownVisible(false)}>
          <View style={styles.dropdownOverlay}>
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => console.log('Edit Profile')}>
                <Text style={styles.dropdownText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => console.log('Manage Friends')}>
                <Text style={styles.dropdownText}>Manage Friends</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      <FullProfileInfo groups={[]} events={[]} />
      <TabBar
        activeTab={activeTab}
        onTabPress={(tab) => { 
          setSelectedCollection(null);
          setActiveTab(tab); 
        }}
      />
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      {activeTab === 'Collections' && !selectedCollection && (
        <TouchableOpacity style={styles.addCollectionButton} onPress={() => setIsModalVisible(true)}>
          <Text style={styles.addCollectionText}>+ Add Collection</Text>
        </TouchableOpacity>
      )}
      {selectedCollection && (
        <View style={styles.collectionHeader}>
          <TouchableOpacity onPress={() => setSelectedCollection(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.collectionTitle}>Activities in {selectedCollection.title}</Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        key={
          selectedCollection
            ? 'activities-list'
            : activeTab === 'Collections'
            ? 'collections-grid'
            : 'liked-activities'
        }
        data={
          activeTab === 'Collections'
            ? (selectedCollection ? selectedCollection.activities : collections)
            : likedActivities
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          activeTab === 'Collections' && !selectedCollection ? (
            <CollectionCard collection={item} onPress={() => setSelectedCollection(item)} />
          ) : (
            <ActivityCard
              item={item}
              isInCollection={!!selectedCollection}
              onRemoveFromCollection={(id) => removeFromCollection(selectedCollection?.id, id)}
              onRemoveFromLiked={(id) =>
                setLikedActivities(likedActivities.filter((activity) => activity.id !== id))
              }
              onAddToCollection={(activity) => {
                setSelectedActivity(activity);
                setIsCollectionModalVisible(true);
              }}
            />
          )
        }
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContainer}
        numColumns={activeTab === 'Liked Activities' || selectedCollection ? 1 : 2}
      />

      {/* Add New Collection Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a Collection</Text>
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

      {/* Collection Selection Modal */}
      <Modal visible={isCollectionModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Collection</Text>
            <ScrollView>
              {collections.length > 0 ? (
                collections.map((collection) => (
                  <TouchableOpacity
                    key={collection.id}
                    style={styles.collectionItem}
                    onPress={() => handleAddToCollection(collection.id)}
                  >
                    <Text style={styles.collectionText}>{collection.title}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noCollectionsText}>No collections available.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: 'gray' }]}
              onPress={() => setIsCollectionModalVisible(false)}
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
  menuContainer: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 10,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 30,
    left: 16,
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    padding: 10,
    width: 160,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'left',
  },
  addCollectionButton: { backgroundColor: '#F5A623', padding: 10, borderRadius: 10, margin: 10 },
  addCollectionText: { color: '#0D1117', fontWeight: 'bold', textAlign: 'center' },
  collectionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  backButton: { marginRight: 10 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1B1F24',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    minHeight: 200,
  },
  input: {
    width: '100%',
    backgroundColor: '#222',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  modalButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 5,
  },
  modalButtonText: { color: '#000', fontWeight: 'bold' },
});

export default ProfileScreen;
