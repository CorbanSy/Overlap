// app/(tabs)/profile.tsx (Fixed SafeArea)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc,
  Firestore 
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Component imports
import ProfileListHeader from '../../components/profile_components/ProfileListHeader';
import NewCollectionModal from '../../components/profile_components/modals/NewCollectionModal';
import CollectionSelectionModal from '../../components/profile_components/modals/CollectionSelectionModal';
import SettingsDropdown from '../../components/profile_components/modals/SettingsDropdown';
import ActivityCard from '../../components/profile_components/ActivityCard';
import CollectionCard from '../../components/CollectionCard';

// Utility imports
import { unlikePlace, deleteCollection } from '../../_utils/storage/likesCollections';
import { saveProfileData, getProfileData } from '../../_utils/storage/userProfile';
import { Colors } from '../../constants/colors';

// Import shared types
import { SharedActivity, SharedCollection } from '../../components/profile_components/profileTypes';

/* =========================
   Types and Interfaces
   ========================= */

interface ProfilePictureProps {
  imageUri?: string;
  onChangeImage: (uri: string) => void;
}

/* =========================
   ProfilePicture Component
   ========================= */

const ProfilePicture: React.FC<ProfilePictureProps> = ({ imageUri, onChangeImage }) => {
  /**
   * Handles image selection from device gallery
   */
  const pickImage = async () => {
    // Request permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Permission to access camera roll is required!');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    
    // Handle result with updated API
    if (!result.canceled && result.assets && result.assets[0]) {
      onChangeImage(result.assets[0].uri);
    }
  };

  return (
    <View style={profilePictureStyles.wrapper}>
      <View style={profilePictureStyles.container}>
        <Image
          source={
            imageUri
              ? { uri: imageUri }
              : require('../../assets/images/profile.png')
          }
          style={profilePictureStyles.image}
        />
      </View>
      <TouchableOpacity style={profilePictureStyles.plusButton} onPress={pickImage}>
        <Ionicons name="add" size={20} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

/* =========================
   Custom Hooks
   ========================= */

/**
 * Hook for managing Firebase authentication state
 */
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, [auth]);

  return { user, auth };
};

/**
 * Hook for loading and managing user profile data with real-time updates
 */
const useProfileData = (user: User | null) => {
  const [profileData, setProfileData] = useState({
    name: '',
    tagline: '',
    profileUri: undefined as string | undefined,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadProfileData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getProfileData();
      if (data) {
        setProfileData({
          name: data.name || '',
          tagline: data.bio || '',
          profileUri: data.avatarUrl || undefined,
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load when user changes
  useEffect(() => {
    loadProfileData();
  }, [user]);

  // Set up real-time listener for profile changes
  useEffect(() => {
    if (!user) return;

    const firestore = getFirestore();
    const profileRef = doc(firestore, `users/${user.uid}/profile/main`);
    
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfileData({
            name: data.name || '',
            tagline: data.bio || '',
            profileUri: data.avatarUrl || undefined,
          });
        }
      },
      (error) => console.error("Profile listener error:", error)
    );

    return () => unsubscribe();
  }, [user]);

  const updateProfileData = (updates: Partial<typeof profileData>) => {
    setProfileData(prev => ({ ...prev, ...updates }));
  };

  // Refresh function to manually reload profile data
  const refreshProfile = () => {
    loadProfileData();
  };

  return {
    ...profileData,
    isLoading,
    updateProfileData,
    refreshProfile,
  };
};

/**
 * Hook for managing Firestore data (likes and collections)
 */
const useFirestoreData = (user: User | null) => {
  const [likedActivities, setLikedActivities] = useState<SharedActivity[]>([]);
  const [collections, setCollections] = useState<SharedCollection[]>([]);
  const firestore: Firestore = getFirestore();
  const unsubscribeLikesRef = useRef<(() => void) | null>(null);
  const unsubscribeCollectionsRef = useRef<(() => void) | null>(null);

  // Set up real-time listener for liked activities
  useEffect(() => {
    if (!user) return;
    
    const likesRef = collection(firestore, `users/${user.uid}/likes`);
    const unsubscribe = onSnapshot(
      likesRef,
      (snapshot) => {
        setLikedActivities(snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || data.title || 'Unnamed Activity',
            title: data.title,
            description: data.description,
            rating: data.rating,
            photos: data.photos,
            photoUrls: data.photoUrls,
            ...data
          } as SharedActivity;
        }));
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
  }, [user, firestore]);

  // Set up real-time listener for collections
  useEffect(() => {
    if (!user) return;
    
    const collectionsRef = collection(firestore, `users/${user.uid}/collections`);
    const unsubscribe = onSnapshot(
      collectionsRef,
      (snapshot) => {
        setCollections(
          snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || 'Untitled Collection',
              description: data.description,
              activities: (data.activities || []).map((activity: any) => ({
                id: activity.id,
                name: activity.name || activity.title || 'Unnamed Activity',
                title: activity.title,
                description: activity.description,
                rating: activity.rating,
                photos: activity.photos,
                photoUrls: activity.photoUrls,
                ...activity
              })),
              createdAt: data.createdAt?.toDate?.() || new Date(),
            } as SharedCollection;
          })
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
  }, [user, firestore]);

  // Cleanup function for unmounting
  const cleanup = () => {
    unsubscribeLikesRef.current && unsubscribeLikesRef.current();
    unsubscribeCollectionsRef.current && unsubscribeCollectionsRef.current();
  };

  return { 
    likedActivities, 
    collections, 
    setCollections, 
    firestore, 
    cleanup 
  };
};

/**
 * Hook for filtering and sorting data based on search query with relevance scoring
 */
const useSearchFilter = (data: (SharedActivity | SharedCollection)[], searchQuery: string, activeTab: string) => {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      // No search query - return original order
      return data;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    // Score and filter items based on relevance
    const scoredItems = data
      .map((item) => {
        let score = 0;
        let title = '';
        let description = '';
        
        if (activeTab === 'Collections' && 'title' in item) {
          // Collections
          title = item.title || '';
          description = item.description || '';
        } else {
          // Activities
          const activity = item as SharedActivity;
          title = activity.title || activity.name || '';
          description = activity.description || '';
        }
        
        const titleLower = title.toLowerCase();
        const descriptionLower = description.toLowerCase();
        
        // Scoring algorithm:
        // 1. Exact title match (highest priority)
        if (titleLower === query) {
          score += 1000;
        }
        // 2. Title starts with query
        else if (titleLower.startsWith(query)) {
          score += 500;
        }
        // 3. Title contains query
        else if (titleLower.includes(query)) {
          score += 200;
        }
        
        // 4. Description starts with query
        if (descriptionLower.startsWith(query)) {
          score += 100;
        }
        // 5. Description contains query
        else if (descriptionLower.includes(query)) {
          score += 50;
        }
        
        // 6. Bonus points for multiple word matches
        const queryWords = query.split(' ').filter(word => word.length > 0);
        if (queryWords.length > 1) {
          queryWords.forEach(word => {
            if (titleLower.includes(word)) score += 25;
            if (descriptionLower.includes(word)) score += 10;
          });
        }
        
        // 7. Bonus for shorter titles (more specific matches rank higher)
        if (score > 0 && title.length < 50) {
          score += 10;
        }
        
        return { item, score, title }; // Include title in return for sorting
      })
      .filter(({ score }) => score > 0) // Only include items with matches
      .sort((a, b) => {
        // Primary sort: by relevance score (descending)
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        
        // Secondary sort: by title length (shorter first)
        // Now we can safely use the title we already extracted
        return a.title.length - b.title.length;
      })
      .map(({ item }) => item);
    
    return scoredItems;
  }, [data, searchQuery, activeTab]);
};

/* =========================
   Main ProfileScreen Component
   ========================= */

function ProfileScreen() {
  const insets = useSafeAreaInsets();
  
  /* =========================
     State Management
     ========================= */
  
  // UI state
  const [activeTab, setActiveTab] = useState('Liked Activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<SharedCollection | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<SharedActivity | null>(null);
  
  // Modal visibility states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Collection creation state
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');

  /* =========================
     Hooks and Data
     ========================= */
  
  const { user, auth } = useAuth();
  const { name, tagline, profileUri, isLoading: profileLoading, updateProfileData, refreshProfile } = useProfileData(user);
  const { 
    likedActivities, 
    collections, 
    setCollections, 
    firestore, 
    cleanup 
  } = useFirestoreData(user);
  
  const router = useRouter();

  /* =========================
     Data Processing
     ========================= */
  
  /**
   * Get the base data for the current tab
   */
  const getBaseData = (): (SharedActivity | SharedCollection)[] => {
    if (activeTab === 'Collections') {
      return selectedCollection ? selectedCollection.activities : collections;
    }
    return likedActivities;
  };

  // Apply search filter to the data
  const filteredData = useSearchFilter(
    getBaseData(), 
    searchQuery, 
    activeTab === 'Collections' && !selectedCollection ? 'Collections' : 'Activities'
  );

  // Check if search is active
  const isSearchActive = searchQuery.trim().length > 0;

  /* =========================
     Side Effects
     ========================= */
  
  // Clear selected collection when switching away from Collections tab
  useEffect(() => {
    if (activeTab !== 'Collections') {
      setSelectedCollection(null);
    }
  }, [activeTab]);

  /* =========================
     Event Handlers
     ========================= */

  /**
   * Handle creating a new collection
   */
  const handleAddCollection = async () => {
    if (!newCollectionName.trim() || !user) return;
    
    try {
      await addDoc(collection(firestore, `users/${user.uid}/collections`), {
        title: newCollectionName,
        description: newCollectionDescription,
        activities: [],
        createdAt: new Date(),
      });
      
      // Reset form and close modal
      setNewCollectionName('');
      setNewCollectionDescription('');
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error adding collection:', error);
    }
  };

  /**
   * Handle adding an activity to a collection
   */
  const handleAddToCollection = async (collectionId: string) => {
    if (!selectedActivity || !collectionId || !user) return;
    
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const collectionItem = collections.find((c) => c.id === collectionId);
      
      // Check if activity is already in collection
      if (!collectionItem?.activities.some((activity) => activity.id === selectedActivity.id)) {
        const updatedActivities = [...(collectionItem?.activities || []), selectedActivity];
        await updateDoc(collectionRef, { activities: updatedActivities });
        
        // Update local state
        setCollections(prevCollections =>
          prevCollections.map(c =>
            c.id === collectionId ? { ...c, activities: updatedActivities } : c
          )
        );
      }
      
      // Close modal and reset selection
      setIsCollectionModalVisible(false);
      setSelectedActivity(null);
    } catch (error) {
      console.error('Error adding to collection:', error);
    }
  };

  /**
   * Handle removing an activity from a collection
   */
  const removeFromCollection = async (collectionId: string, activityId: string) => {
    if (!user || !selectedCollection) return;
    
    try {
      const collectionRef = doc(firestore, `users/${user.uid}/collections`, collectionId);
      const updatedActivities = selectedCollection.activities.filter(act => act.id !== activityId);
      
      await updateDoc(collectionRef, { activities: updatedActivities });
      setSelectedCollection(prev => prev ? { ...prev, activities: updatedActivities } : null);
    } catch (error) {
      console.error("Error removing from collection:", error);
    }
  };

  /**
   * Handle deleting a collection
   */
  const handleDeleteCollection = async (collection: SharedCollection) => {
    if (!user || !collection.id) return;
    
    try {
      await deleteCollection(collection.id);
      
      // If currently viewing the deleted collection, go back to collections list
      if (selectedCollection && selectedCollection.id === collection.id) {
        setSelectedCollection(null);
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  /**
   * Handle settings menu option selection
   */
  const handleSettingsOptionPress = async (option: string) => {
    setIsSettingsMenuVisible(false);
    
    switch (option) {
      case 'Logout':
        cleanup(); // Clean up listeners before logout
        try {
          await signOut(auth);
          router.replace('/');
        } catch (error) {
          console.error("Error signing out:", error);
        }
        break;
      case 'Friends':
        router.push('/profile/friends');
        break;
      case 'Edit Profile':
        router.push('/profile/editProfile');
        break;
      case 'Privacy':
        router.push('/profile/privacy');
        break;
      case 'Help':
        router.push('/profile/help');
        break;
      case 'Notifications':
        router.push('/profile/notifications');
        break;
    }
  };

  /**
   * Handle unliking an activity
   */
  const handleUnlikeActivity = async (id: string) => {
    try {
      await unlikePlace(id);
    } catch (error) {
      console.error("Error unliking activity:", error);
    }
  };

  /**
   * Handle opening collection selection modal for an activity
   */
  const handleAddActivityToCollection = (activity: SharedActivity) => {
    setSelectedActivity(activity);
    setIsCollectionModalVisible(true);
  };

  
  /**
   * Handle saving profile edits
   */
  const handleSaveProfileEdits = async () => {
    try {
      await saveProfileData({
        name: name || 'Anonymous',
        bio: tagline || '',
        avatarUrl: profileUri || null,
        topCategories: [],
        email: user?.email || '',
        username: user?.email || ''
      });
      
      setIsEditingProfile(false);
      
      // Force refresh profile data after saving
      refreshProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert('Error', 'Failed to save profile changes. Please try again.');
    }
  };

  /* =========================
     Render Functions
     ========================= */

  /**
   * Render profile information section
   */
  const renderProfileInfo = () => {
    const userEmail = user?.email || '@unknown';
    const displayName = name || 'Anonymous';
    const displayTagline = tagline || 'No bio yet';

    return (
      <View style={profileInfoStyles.fullProfileSection}>
        <View style={profileInfoStyles.profileHeader}>
          <ProfilePicture 
            imageUri={profileUri} 
            onChangeImage={(uri) => updateProfileData({ profileUri: uri })} 
          />
          <View style={profileInfoStyles.profileDetails}>
            <View style={profileInfoStyles.nameRow}>
              <Text style={profileInfoStyles.name}>{displayName}</Text>
              <TouchableOpacity onPress={() => setIsEditingProfile(true)}>
                <Ionicons name="pencil-outline" size={18} color={Colors.text} style={profileInfoStyles.pencilIcon} />
              </TouchableOpacity>
            </View>
            <Text style={profileInfoStyles.username}>{userEmail}</Text>
            <Text style={profileInfoStyles.tagline}>{displayTagline}</Text>
          </View>
        </View>
        
        {/* Settings Button */}
        <TouchableOpacity 
          style={profileInfoStyles.settingsButton} 
          onPress={() => setIsSettingsMenuVisible(prev => !prev)}
        >
          <View style={profileInfoStyles.settingsButtonContent}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render search results header
   */
  const renderSearchHeader = () => {
    if (!isSearchActive) return null;
    
    return (
      <View style={searchHeaderStyles.container}>
        <Text style={searchHeaderStyles.text}>
          {filteredData.length === 0 
            ? `No ${activeTab.toLowerCase()} match "${searchQuery}"`
            : `Showing ${filteredData.length} ${activeTab.toLowerCase()} for "${searchQuery}"`
          }
        </Text>
      </View>
    );
  };

  /**
   * Render individual list items (activities or collections)
   */
  const renderItem = ({ item }: { item: SharedActivity | SharedCollection }) => {
    if (activeTab === 'Collections' && !selectedCollection) {
      return (
        <CollectionCard 
          collection={item as SharedCollection} 
          onPress={() => setSelectedCollection(item as SharedCollection)}
          onDelete={handleDeleteCollection}
        />
      );
    }
    
    return (
      <ActivityCard
        item={item as SharedActivity}
        isInCollection={!!selectedCollection}
        onRemoveFromCollection={(id: string) => removeFromCollection(selectedCollection?.id!, id)}
        onRemoveFromLiked={handleUnlikeActivity}
        onAddToCollection={handleAddActivityToCollection}
      />
    );
  };

  /**
   * Get unique key for FlatList re-rendering
   */
  const getListKey = () => {
    return activeTab === 'Collections' 
      ? (selectedCollection ? 'activities' : 'collections') 
      : 'liked';
  };

  /* =========================
     Main Render
     ========================= */

  // Show loading state if user is not authenticated or profile is loading
  if (!user || profileLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar backgroundColor={Colors.background} barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="light-content" />
      <View style={[styles.safeAreaTop, { height: insets.top }]} />
      
      <FlatList
        key={getListKey()}
        keyExtractor={(item) => item.id}
        data={filteredData}
        renderItem={renderItem}
        ListHeaderComponent={
          <View>
            {/* Profile Information Section */}
            {renderProfileInfo()}
            
            {/* Navigation and Controls */}
            <ProfileListHeader
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedCollection={selectedCollection}
              onClearSelectedCollection={() => setSelectedCollection(null)}
              setIsModalVisible={setIsModalVisible}
              toggleSettingsMenu={() => setIsSettingsMenuVisible(prev => !prev)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              resultCount={filteredData.length}
            />
            
            {/* Search Results Header */}
            {renderSearchHeader()}
          </View>
        }
        contentContainerStyle={styles.listContainer}
        numColumns={activeTab === 'Collections' && !selectedCollection ? 2 : 1}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isSearchActive 
                ? `No ${activeTab.toLowerCase()} match "${searchQuery}"`
                : `No ${activeTab.toLowerCase()} found`
              }
            </Text>
          </View>
        )}
      />
      
      {/* Settings Dropdown Menu */}
      <SettingsDropdown 
        visible={isSettingsMenuVisible} 
        onSelectOption={handleSettingsOptionPress} 
      />
      
      {/* New Collection Modal */}
      <NewCollectionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onAddCollection={handleAddCollection}
        newCollectionName={newCollectionName}
        setNewCollectionName={setNewCollectionName}
        newCollectionDescription={newCollectionDescription}
        setNewCollectionDescription={setNewCollectionDescription}
      />
      
      {/* Collection Selection Modal */}
      <CollectionSelectionModal
        visible={isCollectionModalVisible}
        collections={collections}
        onSelectCollection={handleAddToCollection}
        onClose={() => setIsCollectionModalVisible(false)}
      />

      {/* Profile Edit Modal */}
      <Modal visible={isEditingProfile} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Edit Profile</Text>
              <TouchableOpacity 
                style={modalStyles.closeButton} 
                onPress={() => setIsEditingProfile(false)}
              >
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={modalStyles.content}>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>Name</Text>
                <TextInput
                  style={modalStyles.input}
                  value={name}
                  onChangeText={(text) => updateProfileData({ name: text })}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>Bio</Text>
                <TextInput
                  style={modalStyles.input}
                  value={tagline}
                  onChangeText={(text) => updateProfileData({ tagline: text })}
                  placeholder="Enter your bio"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
            
            <View style={modalStyles.buttonRow}>
              <TouchableOpacity 
                style={[modalStyles.button, modalStyles.cancelButton]} 
                onPress={() => setIsEditingProfile(false)}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.button} onPress={handleSaveProfileEdits}>
                <Text style={modalStyles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================
   Styles
   ========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeAreaTop: {
    backgroundColor: Colors.background,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});

const profilePictureStyles = StyleSheet.create({
  wrapper: {
    width: 120,
    height: 120,
  },
  container: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  plusButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    zIndex: 10,
  },
});

const profileInfoStyles = StyleSheet.create({
  fullProfileSection: {
    backgroundColor: Colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  pencilIcon: {
    marginLeft: 8,
  },
  username: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    marginBottom: 8,
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
});

const searchHeaderStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    marginBottom: 16,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
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
  content: {
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProfileScreen;