// app/(tabs)/meetupFolder/create.tsx
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Alert,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, addDoc } from 'firebase/firestore';

import { db } from '../../FirebaseConfig';
import { createMeetup } from '../../_utils/storage/meetups';
import { getFriendships } from '../../_utils/storage/social';

// Import meetup components
import EventDetailsCard from '../../components/meetup_components/EventDetailsCard';
import SizeAndBudgetCard from '../../components/meetup_components/SizeAndBudgetCard';
import DateTimeCard from '../../components/meetup_components/DateTimeCard';
import LocationCard from '../../components/meetup_components/LocationCard';
import CollectionsCard from '../../components/meetup_components/CollectionsCard';
import InviteFriendsCard from '../../components/meetup_components/InviteFriendsCard';
import InviteCodeCard from '../../components/meetup_components/InviteCodeCard';
import FriendSelectionModal from '../../components/meetup_components/modals/FriendSelectionModal';

// Professional color palette matching home.tsx
const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
  border: '#333333',
  success: '#10B981',
  error: '#F44336',
  white: '#FFFFFF',
  overlay: 'rgba(13, 17, 23, 0.8)',
};

// Types
type Friend = { uid: string; email?: string; name?: string; avatarUrl?: string };
type CollectionType = { id: string; title?: string; activities?: any[] };

// Helper functions
const createMeetupInvite = async (friendId: string, meetupId: string) => {
  try {
    const meetupRef = doc(db, 'meetups', meetupId);
    const meetupSnap = await getDoc(meetupRef);
    const meetupData = meetupSnap.exists() ? meetupSnap.data() : {};
    await addDoc(collection(db, 'meetupInvites'), {
      invitedFriendId: friendId,
      meetupId,
      status: 'pending',
      title: (meetupData?.eventName as string) || 'Meetup Invitation',
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error creating meetup invite:', e);
  }
};

const getFriendProfile = async (friendId: string): Promise<Friend> => {
  try {
    const dirRef = doc(db, 'userDirectory', friendId);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      const d = dirSnap.data() as any;
      return {
        uid: friendId,
        email: d.emailLower || '',
        name: d.displayName || d.usernamePublic || d.emailLower || friendId,
        avatarUrl: d.avatarUrl || '',
      };
    }
    return { uid: friendId };
  } catch (e) {
    console.error('Error fetching friend profile (directory):', e);
    return { uid: friendId };
  }
};

// Main Component
const CreateMeetupScreen = ({ onBack }: { onBack: () => void }) => {
  // Event Details State
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Dining');

  // Size & Budget State
  const [groupSize, setGroupSize] = useState(1);
  const [priceRange, setPriceRange] = useState(0);

  // Date & Time State
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  // Location State
  const [locationOption, setLocationOption] = useState<'own' | 'specific'>('own');
  const [specificLocation, setSpecificLocation] = useState('');

  // Collections State
  const [selectedCollections, setSelectedCollections] = useState<CollectionType[]>([]);
  const [collectionsList, setCollectionsList] = useState<CollectionType[]>([]);

  // Friends State
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Code State
  const [meetupCode, setMeetupCode] = useState('');

  // Auth State
  const auth = getAuth();
  const [user, setUser] = useState<any>(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, [auth]);

  // Load friends
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const friendships = await getFriendships();
        const currentId = user.uid;
        const friendIds = friendships.map((f: any) => f.users.find((id: string) => id !== currentId));
        const profiles = await Promise.all(friendIds.map((id: string) => getFriendProfile(id)));
        setFriendsList(profiles);
      } catch (e) {
        console.error('Error fetching friends:', e);
      }
    })();
  }, [user]);

  // Load collections
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const ref = collection(db, 'users', user.uid, 'collections');
        const qs = await getDocs(ref);
        const cols = qs.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          activities: d.data().activities || [],
        })) as CollectionType[];
        setCollectionsList(cols);
      } catch (e) {
        console.error('Error fetching collections:', e);
      }
    })();
  }, [user]);

  // Event Handlers
  const toggleFriend = (friend: Friend) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.uid === friend.uid) 
        ? prev.filter((f) => f.uid !== friend.uid) 
        : [...prev, friend]
    );
  };

  const toggleCollection = (collection: CollectionType) => {
    setSelectedCollections((prev) =>
      prev.some((c) => c.id === collection.id)
        ? prev.filter((c) => c.id !== collection.id)
        : [...prev, collection]
    );
  };

  const removeFriend = (friendUid: string) => {
    setSelectedFriends(prev => prev.filter(f => f.uid !== friendUid));
  };

  const removeCollection = (collectionId: string) => {
    setSelectedCollections(prev => prev.filter(c => c.id !== collectionId));
  };

  const generateCode = () => {
    setMeetupCode(Math.floor(100000 + Math.random() * 900000).toString());
  };

  const handleCreate = async () => {
    if (!eventName.trim()) {
      Alert.alert('Missing Required Field', 'Please enter an Event Name.');
      return;
    }

    const missingUid = selectedFriends.filter((f) => !f.uid);
    if (missingUid.length > 0) {
      Alert.alert('Error', 'One or more invited friends is missing required data.');
      return;
    }

    const meetupData = {
      eventName,
      category: selectedCategory,
      groupSize,
      date: date.toISOString(),
      time: time.toISOString(),
      priceRange,
      description,
      friends: selectedFriends,
      location: locationOption === 'own' ? 'my location' : specificLocation,
      collections: selectedCollections,
      code: meetupCode,
    };

    try {
      const meetupId = await createMeetup(meetupData as any);
      await Promise.all(selectedFriends.map((f) => createMeetupInvite(f.uid, meetupId)));
      Alert.alert('Success', `Meetup created successfully!`);
      onBack();
    } catch (e) {
      console.error('Error creating meetup:', e);
      Alert.alert('Error', 'There was an error creating the meetup.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Meetup</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Event Details Card */}
      <EventDetailsCard
        eventName={eventName}
        setEventName={setEventName}
        description={description}
        setDescription={setDescription}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Size and Budget Card */}
      <SizeAndBudgetCard
        groupSize={groupSize}
        setGroupSize={setGroupSize}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
      />

      {/* Date and Time Card */}
      <DateTimeCard
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
      />

      {/* Location Card */}
      <LocationCard
        locationOption={locationOption}
        setLocationOption={setLocationOption}
        specificLocation={specificLocation}
        setSpecificLocation={setSpecificLocation}
      />

      {/* Collections Card */}
      <CollectionsCard
        collectionsList={collectionsList}
        selectedCollections={selectedCollections}
        onToggleCollection={toggleCollection}
        onRemoveCollection={removeCollection}
      />

      {/* Invite Friends Card */}
      <InviteFriendsCard
        selectedFriends={selectedFriends}
        onOpenInviteModal={() => setShowInviteModal(true)}
        onRemoveFriend={removeFriend}
      />

      {/* Invite Code Card */}
      <InviteCodeCard
        meetupCode={meetupCode}
        onGenerateCode={generateCode}
      />

      {/* Create Button */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Ionicons name="add-circle" size={20} color={Colors.background} />
          <Text style={styles.createButtonText}>Create Meetup</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>Note: All fields can be changed after creation</Text>

      {/* Friend Selection Modal */}
      <FriendSelectionModal
        visible={showInviteModal}
        friendsList={friendsList}
        selectedFriends={selectedFriends}
        onToggleFriend={toggleFriend}
        onConfirm={() => setShowInviteModal(false)}
        onClose={() => setShowInviteModal(false)}
      />
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
  },
  
  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  
  // Actions
  actions: {
    marginTop: 8,
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },
  
  note: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CreateMeetupScreen;