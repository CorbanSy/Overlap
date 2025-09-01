// app/(tabs)/profile.tsx
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
import SettingsDropdown from '../../components/profile_components/modals/SettingsDropdown';
import ActivityCard from '../../components/profile_components/ActivityCard';

import EnhancedCollectionMembersModal from '../../components/profile_components/modals/EnhancedCollectionMembersModal';
import EnhancedNewCollectionModal from '../../components/profile_components/modals/EnhancedNewCollectionModal';
import CollectionInvitationsModal from '../../components/profile_components/modals/CollectionInvitationsModal';
import CollaborativeCollectionCard from '../../components/profile_components/CollaborativeCollectionCard';
import CollectionSelectionModal from '../../components/profile_components/modals/CollectionSelectionModal'; 
import { ProfileTabInfoModal, PROFILE_TAB_INFO_CONTENT } from '../../components/profile_components/ProfileTabInfoModal';

import { unlikePlace } from '../../_utils/storage/likesCollections';
import { saveProfileData, getProfileData } from '../../_utils/storage/userProfile';
import { Colors } from '../../constants/colors';

// Collaborative collections utilities
import { 
  createCollaborativeCollection,
  subscribeToUserCollections,
  addActivityToCollaborativeCollection,
  removeActivityFromCollaborativeCollection,
  deleteCollaborativeCollection,
  leaveCollection,
  getPendingCollectionInvitations,
  COLLECTION_ROLES 
} from '../../_utils/storage/collaborativeCollections';

// Migration utilities
import { 
  migrateUserCollectionsToCollaborative, 
  checkMigrationStatus 
} from '../../_utils/storage/collectionsMigration';

// Import shared types
import { SharedActivity, SharedCollection } from '../../components/profile_components/profileTypes';

/* =========================
   Types and Interfaces
   ========================= */

interface ProfilePictureProps {
  imageUri?: string;
  onChangeImage: (uri: string) => void;
}

interface CollaborativeCollection extends SharedCollection {
  owner: string;
  userRole: string;
  members: { [key: string]: any };
  privacy: string;
  allowMembersToAdd: boolean;
  totalActivities: number;
}

/* =========================
   ProfilePicture Component
   ========================= */

const ProfilePicture: React.FC<ProfilePictureProps> = ({ imageUri, onChangeImage }) => {
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    
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

  useEffect(() => {
    loadProfileData();
  }, [user]);

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
 * Enhanced hook for managing both liked activities and collaborative collections
 */
const useCollaborativeFirestoreData = (user: User | null) => {
  const [likedActivities, setLikedActivities] = useState<SharedActivity[]>([]);
  const [collections, setCollections] = useState<CollaborativeCollection[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const firestore: Firestore = getFirestore();
  const unsubscribeLikesRef = useRef<(() => void) | null>(null);
  const unsubscribeCollectionsRef = useRef<(() => void) | null>(null);

  // Set up real-time listener for liked activities (unchanged)
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

  // Set up real-time listener for collaborative collections
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToUserCollections((collaborativeCollections) => {
      setCollections(collaborativeCollections.map(col => ({
        ...col,
        // Ensure compatibility with existing SharedCollection interface
        title: col.title,
        activities: col.activities || []
      } as CollaborativeCollection)));
    });
    
    unsubscribeCollectionsRef.current = unsubscribe;
    return () => {
      if (unsubscribeCollectionsRef.current) {
        unsubscribeCollectionsRef.current();
        unsubscribeCollectionsRef.current = null;
      }
    };
  }, [user]);

  // Load pending invitations
  useEffect(() => {
    if (!user) return;
    
    const loadInvitations = async () => {
      try {
        const pending = await getPendingCollectionInvitations();
        setPendingInvitations(pending);
      } catch (error) {
        console.error('Error loading invitations:', error);
      }
    };

    loadInvitations();
  }, [user]);

  const cleanup = () => {
    unsubscribeLikesRef.current && unsubscribeLikesRef.current();
    unsubscribeCollectionsRef.current && unsubscribeCollectionsRef.current();
  };

  return { 
    likedActivities, 
    collections, 
    pendingInvitations,
    setCollections, 
    firestore, 
    cleanup 
  };
};

const useSearchFilter = (data: (SharedActivity | CollaborativeCollection)[], searchQuery: string, activeTab: string) => {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    const scoredItems = data
      .map((item) => {
        let score = 0;
        let title = '';
        let description = '';
        
        if (activeTab === 'Collections' && 'title' in item) {
          title = item.title || '';
          description = item.description || '';
        } else {
          const activity = item as SharedActivity;
          title = activity.title || activity.name || '';
          description = activity.description || '';
        }
        
        const titleLower = title.toLowerCase();
        const descriptionLower = description.toLowerCase();
        
        if (titleLower === query) {
          score += 1000;
        } else if (titleLower.startsWith(query)) {
          score += 500;
        } else if (titleLower.includes(query)) {
          score += 200;
        }
        
        if (descriptionLower.startsWith(query)) {
          score += 100;
        } else if (descriptionLower.includes(query)) {
          score += 50;
        }
        
        const queryWords = query.split(' ').filter(word => word.length > 0);
        if (queryWords.length > 1) {
          queryWords.forEach(word => {
            if (titleLower.includes(word)) score += 25;
            if (descriptionLower.includes(word)) score += 10;
          });
        }
        
        if (score > 0 && title.length < 50) {
          score += 10;
        }
        
        return { item, score, title };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
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
  
  // UI state
  const [activeTab, setActiveTab] = useState('Liked Activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<CollaborativeCollection | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<SharedActivity | null>(null);
  
  // Modal visibility states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isCollectionMembersModalVisible, setIsCollectionMembersModalVisible] = useState(false);
  const [isInvitationsModalVisible, setIsInvitationsModalVisible] = useState(false);
  
  // Collection management state
  const [selectedCollectionForMembers, setSelectedCollectionForMembers] = useState<CollaborativeCollection | null>(null);

  const { user, auth } = useAuth();
  const { name, tagline, profileUri, isLoading: profileLoading, updateProfileData, refreshProfile } = useProfileData(user);
  const { 
    likedActivities, 
    collections, 
    pendingInvitations,
    setCollections, 
    firestore, 
    cleanup 
  } = useCollaborativeFirestoreData(user);
  
  const router = useRouter();

  // Migration effect
  useEffect(() => {
    const runMigrationIfNeeded = async () => {
      if (!user) return;
      
      try {
        const migrationStatus = await checkMigrationStatus();
        
        if (migrationStatus.needsMigration) {
          console.log('Running collections migration...');
          const migratedCount = await migrateUserCollectionsToCollaborative();
          console.log(`Migrated ${migratedCount} collections`);
          
          if (migratedCount > 0) {
            Alert.alert(
              'Collections Updated!', 
              `Your ${migratedCount} collections have been updated with new collaborative features.`
            );
          }
        }
      } catch (error) {
        console.error('Migration error:', error);
      }
    };

    runMigrationIfNeeded();
  }, [user]);

  const getBaseData = (): (SharedActivity | CollaborativeCollection)[] => {
    if (activeTab === 'Collections') {
      return selectedCollection ? selectedCollection.activities : collections;
    }
    return likedActivities;
  };

  const filteredData = useSearchFilter(
    getBaseData(), 
    searchQuery, 
    activeTab === 'Collections' && !selectedCollection ? 'Collections' : 'Activities'
  );

  const isSearchActive = searchQuery.trim().length > 0;

  useEffect(() => {
    if (activeTab !== 'Collections') {
      setSelectedCollection(null);
    }
  }, [activeTab]);

  /* =========================
     Event Handlers - Updated for Collaborative Collections
     ========================= */

  const handleAddCollaborativeCollection = async (collectionData: {
    title: string;
    description: string;
    privacy: string;
    allowMembersToAdd: boolean;
  }) => {
    if (!user) return;
    
    try {
      await createCollaborativeCollection(collectionData);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection. Please try again.');
    }
  };

  const handleAddToCollaborativeCollection = async (collectionId: string) => {
    if (!selectedActivity || !collectionId || !user) return;
    
    try {
      await addActivityToCollaborativeCollection(collectionId, selectedActivity);
      setIsCollectionModalVisible(false);
      setSelectedActivity(null);
    } catch (error) {
      console.error('Error adding to collection:', error);
      Alert.alert('Error', error.message || 'Failed to add activity to collection.');
    }
  };

  const removeFromCollaborativeCollection = async (collectionId: string, activityId: string) => {
    if (!user || !selectedCollection) return;
    
    try {
      await removeActivityFromCollaborativeCollection(collectionId, activityId);
    } catch (error) {
      console.error("Error removing from collection:", error);
      Alert.alert('Error', error.message || 'Failed to remove activity from collection.');
    }
  };

  const [activeTabInfoModal, setActiveTabInfoModal] = useState<string | null>(null);
  const handleTabInfoPress = (tabType: string) => {
    setActiveTabInfoModal(tabType);
  };

  const handleDeleteCollaborativeCollection = async (collection: CollaborativeCollection) => {
    if (!user || !collection.id) return;
    
    const isOwner = collection.userRole === COLLECTION_ROLES.OWNER;
    const actionText = isOwner ? 'delete' : 'leave';
    const actionTitle = isOwner ? 'Delete Collection' : 'Leave Collection';
    
    Alert.alert(
      actionTitle,
      `Are you sure you want to ${actionText} this collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isOwner ? 'Delete' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isOwner) {
                await deleteCollaborativeCollection(collection.id);
              } else {
                await leaveCollection(collection.id);
              }
              
              if (selectedCollection && selectedCollection.id === collection.id) {
                setSelectedCollection(null);
              }
            } catch (error) {
              console.error(`Error ${actionText}ing collection:`, error);
              Alert.alert('Error', `Failed to ${actionText} collection. Please try again.`);
            }
          },
        },
      ]
    );
  };

  const handleManageCollectionMembers = (collection: CollaborativeCollection) => {
    setSelectedCollectionForMembers(collection);
    setIsCollectionMembersModalVisible(true);
  };

  const handleSettingsOptionPress = async (option: string) => {
    setIsSettingsMenuVisible(false);
    
    switch (option) {
      case 'Collection Invitations':
        setIsInvitationsModalVisible(true);
        break;
      case 'Logout':
        cleanup();
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

  const handleUnlikeActivity = async (id: string) => {
    try {
      await unlikePlace(id);
    } catch (error) {
      console.error("Error unliking activity:", error);
    }
  };

  const handleAddActivityToCollection = (activity: SharedActivity) => {
    setSelectedActivity(activity);
    setIsCollectionModalVisible(true);
  };

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
      refreshProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert('Error', 'Failed to save profile changes. Please try again.');
    }
  };

  /* =========================
     Render Functions
     ========================= */

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
        
        <TouchableOpacity 
          style={profileInfoStyles.settingsButton} 
          onPress={() => setIsSettingsMenuVisible(prev => !prev)}
        >
          <View style={profileInfoStyles.settingsButtonContent}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
            {pendingInvitations.length > 0 && (
              <View style={profileInfoStyles.notificationBadge}>
                <Text style={profileInfoStyles.notificationCount}>
                  {pendingInvitations.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

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

  const renderItem = ({ item }: { item: SharedActivity | CollaborativeCollection }) => {
    if (activeTab === 'Collections' && !selectedCollection) {
      return (
        <CollaborativeCollectionCard 
          collection={item as CollaborativeCollection}
          onPress={() => setSelectedCollection(item as CollaborativeCollection)}
          onDelete={handleDeleteCollaborativeCollection}
          onLeave={handleDeleteCollaborativeCollection}
          onManageMembers={handleManageCollectionMembers}
        />
      );
    }
    
    return (
      <ActivityCard
        item={item as SharedActivity}
        isInCollection={!!selectedCollection}
        onRemoveFromCollection={(id: string) => removeFromCollaborativeCollection(selectedCollection?.id!, id)}
        onRemoveFromLiked={handleUnlikeActivity}
        onAddToCollection={handleAddActivityToCollection}
      />
    );
  };

  const getListKey = () => {
    return activeTab === 'Collections' 
      ? (selectedCollection ? 'activities' : 'collections') 
      : 'liked';
  };

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
            {renderProfileInfo()}
            
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
              likedActivities={likedActivities}
              collections={collections}
              onMembersPress={(collection) => {
                setSelectedCollectionForMembers(collection);
                setIsCollectionMembersModalVisible(true);
              }}
              onTabInfoPress={handleTabInfoPress}
            />
            
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
        pendingInvitationsCount={pendingInvitations.length}
      />
      
      {/* Enhanced Collection Creation Modal */}
      <EnhancedNewCollectionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreateCollection={handleAddCollaborativeCollection}
      />
      
      {/* Collection Selection Modal */}
      <CollectionSelectionModal
        visible={isCollectionModalVisible}
        collections={collections}
        onSelectCollection={handleAddToCollaborativeCollection}
        onClose={() => setIsCollectionModalVisible(false)}
      />
      
      {/* Profile Tab Info Modal */}
      <ProfileTabInfoModal
        visible={!!activeTabInfoModal}
        tabType={activeTabInfoModal}
        onClose={() => setActiveTabInfoModal(null)}
      />
      
      {/* Collection Members Management Modal */}
      <EnhancedCollectionMembersModal
        visible={isCollectionMembersModalVisible}
        onClose={() => setIsCollectionMembersModalVisible(false)}
        collection={selectedCollectionForMembers}
        isOwner={selectedCollectionForMembers?.userRole === COLLECTION_ROLES.OWNER}
        onCollectionUpdated={() => {
          // This could trigger a refresh if needed
        }}
      />

      {/* Collection Invitations Modal */}
      <CollectionInvitationsModal
        visible={isInvitationsModalVisible}
        onClose={() => setIsInvitationsModalVisible(false)}
        onInvitationHandled={() => {
          // Refresh invitations list
          if (user) {
            getPendingCollectionInvitations().then(setPendingInvitations).catch(console.error);
          }
        }}
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
    position: 'relative',
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
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  notificationCount: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
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