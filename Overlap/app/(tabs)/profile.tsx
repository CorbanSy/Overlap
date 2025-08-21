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
  Animated,
  Dimensions,
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
import { unlikePlace, deleteCollection } from '../../_utils/storage';

const { width } = Dimensions.get('window');

/* =========================
   Enhanced Color Palette - Updated to match home.tsx
   ========================= */
const Colors = {
  primary: '#F5A623',        // Orange from home.tsx
  primaryLight: '#FCD34D',   // Lighter orange
  primaryDark: '#E09612',    // Darker orange
  secondary: '#6366F1',      // Blue as secondary
  secondaryLight: '#818CF8', // Light blue
  background: '#0D1117',     // Dark background from home.tsx
  surface: '#1B1F24',        // Card background from home.tsx
  surfaceLight: '#333333',   // Lighter surface
  card: '#1B1F24',          // Same as surface for consistency
  border: '#333333',         // Border color
  text: '#FFFFFF',          // White text from home.tsx
  textSecondary: '#AAAAAA', // Gray text from home.tsx
  textMuted: '#888888',     // Muted text
  success: '#10B981',       // Keep success green
  warning: '#F5A623',       // Same as primary
  error: '#F44336',         // Keep error red
  white: '#FFFFFF',
  overlay: 'rgba(13, 17, 23, 0.8)', // Dark overlay to match background
};

/* =========================
   Professional Modal Components
   ========================= */

// Enhanced New Collection Modal
const NewCollectionModal = ({
  visible,
  onClose,
  onAddCollection,
  newCollectionName,
  setNewCollectionName,
  newCollectionDescription,
  setNewCollectionDescription,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: slideAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Collection</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Collection Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter collection name"
                placeholderTextColor={Colors.textMuted}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a description for your collection"
                placeholderTextColor={Colors.textMuted}
                value={newCollectionDescription}
                onChangeText={setNewCollectionDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.primaryButton, !newCollectionName.trim() && styles.disabledButton]} 
              onPress={onAddCollection}
              disabled={!newCollectionName.trim()}
            >
              <Ionicons name="add" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Enhanced Collection Selection Modal
const CollectionSelectionModal = ({ visible, collections, onSelectCollection, onClose }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.selectionModalContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to Collection</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.collectionsList} showsVerticalScrollIndicator={false}>
            {collections.length > 0 ? (
              collections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.collectionItem}
                  onPress={() => onSelectCollection(collection.id)}
                >
                  <View style={styles.collectionIcon}>
                    <Ionicons name="folder-outline" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName}>{collection.title}</Text>
                    <Text style={styles.collectionCount}>
                      {collection.activities?.length || 0} activities
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyStateText}>No collections yet</Text>
                <Text style={styles.emptyStateSubtext}>Create your first collection to get started</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Professional Settings Dropdown
const SettingsDropdown = ({ visible, onSelectOption }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(-10);
    }
  }, [visible]);

  if (!visible) return null;

  const menuItems = [
    { key: 'Account', icon: 'person-outline', label: 'Account', color: Colors.text },
    { key: 'Edit Profile', icon: 'create-outline', label: 'Edit Profile', color: Colors.text },
    { key: 'Notifications', icon: 'notifications-outline', label: 'Notifications', color: Colors.text },
    { key: 'Privacy', icon: 'lock-closed-outline', label: 'Privacy', color: Colors.text },
    { key: 'Friends', icon: 'people-outline', label: 'Friends', color: Colors.text },
    { key: 'Help', icon: 'help-circle-outline', label: 'Help', color: Colors.text },
    { key: 'Logout', icon: 'log-out-outline', label: 'Logout', color: Colors.error },
  ];

  return (
    <Animated.View
      style={[
        styles.settingsDropdown,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.settingsItem,
            index === menuItems.length - 1 && styles.lastSettingsItem,
          ]}
          onPress={() => onSelectOption(item.key)}
        >
          <Ionicons name={item.icon} size={20} color={item.color} />
          <Text style={[styles.settingsText, { color: item.color }]}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

/* =========================
   Enhanced List Header Component
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
    <View style={styles.profileHeader}>
      <FullProfileInfo />
      <TouchableOpacity style={styles.settingsButton} onPress={toggleSettingsMenu}>
        <View style={styles.settingsButtonContent}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
        </View>
      </TouchableOpacity>
    </View>
    
    <View style={styles.tabSection}>
      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
    
    <View style={styles.searchSection}>
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    </View>
    
    {activeTab === 'Collections' && !selectedCollection && (
      <TouchableOpacity style={styles.addCollectionButton} onPress={() => setIsModalVisible(true)}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addCollectionText}>New Collection</Text>
      </TouchableOpacity>
    )}
    
    {selectedCollection && (
      <View style={styles.collectionHeader}>
        <TouchableOpacity onPress={onClearSelectedCollection} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.collectionHeaderInfo}>
          <Text style={styles.collectionTitle}>{selectedCollection.title}</Text>
          <Text style={styles.collectionSubtitle}>
            {selectedCollection.activities?.length || 0} activities
          </Text>
        </View>
      </View>
    )}
  </View>
);

/* =========================
   Main ProfileScreen Component
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
        createdAt: new Date(),
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

  // Delete a collection
  const handleDeleteCollection = async (collection) => {
    if (!user || !collection.id) return;
    
    try {
      await deleteCollection(collection.id);
      
      // If we're currently viewing the deleted collection, go back to collections list
      if (selectedCollection && selectedCollection.id === collection.id) {
        setSelectedCollection(null);
      }
      
      console.log('Collection deleted successfully');
    } catch (error) {
      console.error('Error deleting collection:', error);
      // You could show a user-friendly error message here
    }
  };

  // Handle selection of settings option
  const handleSettingsOptionPress = async (option) => {
    setIsSettingsMenuVisible(false);
    
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
      router.push('/profile/editProfile');
    } else if (option === 'Privacy') {
      router.push('/profile/privacy');
    } else if (option === 'Help') {
      router.push('/profile/help');
    } else if (option === 'Notifications') {
      router.push('/profile/notifications');
    }
  };

  // Clear the selected collection
  const clearSelectedCollection = () => setSelectedCollection(null);

  // Render item based on the active tab and selection state
  const renderItem = ({ item }) => {
    if (activeTab === 'Collections' && !selectedCollection) {
      return (
        <CollectionCard 
          collection={item} 
          onPress={() => setSelectedCollection(item)}
          onDelete={handleDeleteCollection}
        />
      );
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
        showsVerticalScrollIndicator={false}
      />
      
      <SettingsDropdown 
        visible={isSettingsMenuVisible} 
        onSelectOption={handleSettingsOptionPress} 
      />
      
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

/* =========================
   Professional Styles
   ========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  
  // Header Styles
  headerContainer: {
    paddingBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    marginBottom: 20,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabSection: {
    marginBottom: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  
  // Collection Header
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  collectionHeaderInfo: {
    flex: 1,
  },
  collectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  collectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  
  // Add Collection Button
  addCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,      // Now F5A623 orange
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addCollectionText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Settings Dropdown
  settingsDropdown: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 8,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastSettingsItem: {
    borderBottomWidth: 0,
  },
  settingsText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: Colors.surfaceLight,
    opacity: 0.6,
  },
  
  // Collection Selection Modal
  selectionModalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  collectionsList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  collectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  collectionCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

export default ProfileScreen;