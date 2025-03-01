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
  ScrollView
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

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
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null); // **Restored**

  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  // Fetch liked activities from Firestore
  useEffect(() => {
    if (!user) return;
    
    const likesRef = collection(firestore, `users/${user.uid}/likes`);
    const unsubscribe = onSnapshot(likesRef, (snapshot) => {
      setLikedActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => unsubscribe();
  }, [user]);

  // Fetch collections from Firestore
  useEffect(() => {
    if (!user) return;

    const collectionsRef = collection(firestore, `users/${user.uid}/collections`);
    const unsubscribe = onSnapshot(collectionsRef, (snapshot) => {
      setCollections(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        activities: doc.data().activities || []
      })));
    });

    return () => unsubscribe();
  }, [user]);

  // Add activity to a collection
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

  // Remove activity from collection
  const removeFromCollection = async (collectionId, activityId) => {
    if (!user) return;
    
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const updatedActivities = selectedCollection.activities.filter(act => act.id !== activityId);
      await updateDoc(collectionRef, { activities: updatedActivities });
      setSelectedCollection(prev => ({ ...prev, activities: updatedActivities }));
    } catch (error) {
      console.error("Error removing from collection:", error);
    }
  };

  const ListHeader = () => (
    <>
      <FullProfileInfo />
      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
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
        key={activeTab === 'Collections' ? (selectedCollection ? 'activities' : 'collections') : 'liked'}
        keyExtractor={(item) => item.id}
        data={
          activeTab === 'Collections'
            ? selectedCollection ? selectedCollection.activities : collections
            : likedActivities
        }
        renderItem={({ item }) =>
          activeTab === 'Collections' && !selectedCollection ? (
            <CollectionCard collection={item} onPress={() => setSelectedCollection(item)} />
          ) : (
            <ActivityCard
              item={item}
              isInCollection={!!selectedCollection}
              onRemoveFromCollection={(id) => removeFromCollection(selectedCollection?.id, id)}
              onRemoveFromLiked={(id) =>
                setLikedActivities(likedActivities.filter(activity => activity.id !== id))
              }
              onAddToCollection={(activity) => { 
                setSelectedActivity(activity);
                setIsCollectionModalVisible(true); // Opens the modal
              }} // **Fixed - Restored the + button**
            />
          )
        }
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContainer}
        numColumns={activeTab === 'Collections' && !selectedCollection ? 2 : 1} 
      />

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
  addCollectionButton: { backgroundColor: '#F5A623', padding: 10, borderRadius: 10, margin: 10 },
  addCollectionText: { color: '#0D1117', fontWeight: 'bold', textAlign: 'center' },
  collectionTitle: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' },
  collectionHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingHorizontal: 16 },
  backButton: { marginRight: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#1B1F24', padding: 20, borderRadius: 10, width: '80%' },
  input: { backgroundColor: '#222', color: '#fff', padding: 10, borderRadius: 6, marginBottom: 10 },
  modalButton: { backgroundColor: '#FFA500', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  modalButtonText: { color: '#000', fontWeight: 'bold' },
});

export default ProfileScreen;
