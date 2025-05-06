import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  Image,
  Share,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { createMeetup, getFriendships } from '../_utils/storage';
import { doc, getDoc, getDocs, addDoc, collection } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../FirebaseConfig';
import CollectionCard from '../../components/CollectionCard';

// Static list of activity labels
const activityLabels = [
  'Dining', 'Fitness', 'Outdoors', 'Movies', 'Gaming',
  'Social', 'Music', 'Shopping', 'Travel', 'Art',
  'Relaxing', 'Learning', 'Cooking', 'Nightlife',
];

// Modal Component for inviting friends
const InviteFriendsModal = ({
  visible,
  friendsList,
  selectedFriends,
  toggleFriend,
  onConfirm,
  onClose,
}) => (
  <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <View style={modalStyles.centeredView}>
      <View style={modalStyles.modalView}>
        <ScrollView contentContainerStyle={modalStyles.cardsContainer}>
          {friendsList.map(friend => (
            <TouchableOpacity key={friend.uid} onPress={() => toggleFriend(friend)}>
              <View style={modalStyles.friendCard}>
                <Image
                  source={
                    friend.avatarUrl
                      ? { uri: friend.avatarUrl }
                      : require('../../assets/images/profile.png')
                  }
                  style={modalStyles.friendAvatar}
                />
                <Text style={modalStyles.friendEmail}>{friend.email}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={modalStyles.confirmButton} onPress={onConfirm}>
          <Text style={modalStyles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const createMeetupInvite = async (friendId, meetupId) => {
  try {
    const meetupRef = doc(db, 'meetups', meetupId);
    const meetupSnap = await getDoc(meetupRef);
    const meetupData = meetupSnap.exists() ? meetupSnap.data() : {};
    const inviteData = {
      invitedFriendId: friendId,
      meetupId: meetupId,
      status: 'pending',
      title: meetupData.eventName || 'Meetup Invitation',
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'meetupInvites'), inviteData);
  } catch (error) {
    console.error('Error creating meetup invite:', error);
  }
};

const CreateMeetupScreen = ({ onBack }) => {
  // Required field states
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');

  // Date & time states
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Group size & price range states
  const [groupSize, setGroupSize] = useState(1);
  const [priceRange, setPriceRange] = useState(0);

  // Category state and dropdown visibility
  const [selectedCategory, setSelectedCategory] = useState(activityLabels[0]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Friend invites state variables
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friendsList, setFriendsList] = useState([]);

  // Location field state variables
  const [locationOption, setLocationOption] = useState('own'); // 'own' or 'specific'
  const [specificLocation, setSpecificLocation] = useState('');

  // Activity Collections state variables
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [collectionsList, setCollectionsList] = useState([]);
  const [showCollectionsRow, setShowCollectionsRow] = useState(false);

  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [meetupCode, setMeetupCode] = useState('');

  // Generate a 6-digit code and set it in state
  const handleGenerateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setMeetupCode(code);
  };

  // Share the generated code using the native share dialog
  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my meetup using this code: ${meetupCode}`,
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const getFriendProfile = async (friendId) => {
    try {
      const userDocRef = doc(db, 'users', friendId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          uid: friendId,
          email: userData.email,
          name: userData.email,
          avatarUrl: userData.avatarUrl,
        };
      }
      return { uid: friendId, email: friendId, name: friendId };
    } catch (error) {
      console.error('Error fetching friend profile:', error);
      return { uid: friendId, email: friendId, name: friendId };
    }
  };
  
  // Listen for auth state changes so we can get the current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, [auth]);

  // Fetch friends on mount (or when user changes)
  useEffect(() => {
    if (!user) return;
    const fetchFriends = async () => {
      try {
        const friendships = await getFriendships();
        const currentUserId = user.uid;
        const friendIds = friendships.map(f =>
          f.users.find(id => id !== currentUserId)
        );
        const friendProfiles = await Promise.all(friendIds.map(friendId => getFriendProfile(friendId)));
        setFriendsList(friendProfiles);
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };
    fetchFriends();
  }, [user]);

  // Fetch collections on mount (or when user changes)
  useEffect(() => {
    if (!user) return;
    const fetchCollections = async () => {
      try {
        const collectionsRef = collection(db, 'users', user.uid, 'collections');
        const querySnapshot = await getDocs(collectionsRef);
        const userCollections = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          activities: docSnap.data().activities || [],
        }));
        setCollectionsList(userCollections);
      } catch (error) {
        console.error('Error fetching user collections:', error);
      }
    };
    fetchCollections();
  }, [user]);

  // Handlers for date and time pickers
  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) setTime(selectedTime);
  };

  // Toggle friend selection
  const toggleFriend = (friend) => {
    if (selectedFriends.some(f => f.uid === friend.uid)) {
      setSelectedFriends(selectedFriends.filter(f => f.uid !== friend.uid));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  // Toggle collection selection
  const toggleCollection = (collection) => {
    if (selectedCollections.some(c => c.id === collection.id)) {
      setSelectedCollections(selectedCollections.filter(c => c.id !== collection.id));
    } else {
      setSelectedCollections([...selectedCollections, collection]);
    }
  };

  // Handle meetup creation
  const handleCreate = async () => {
    if (!eventName.trim()) {
      Alert.alert('Missing Required Field', 'Please enter an Event Name.');
      return;
    }

    // Verify every friend in selectedFriends has a uid
    const missingUid = selectedFriends.filter(friend => !friend.uid);
    if (missingUid.length > 0) {
      console.error('One or more selected friends are missing uid:', missingUid);
      Alert.alert('Error', 'One or more invited friends is missing required data.');
      return;
    }

    const meetupData = {
      eventName: eventName,
      category: selectedCategory,
      groupSize: groupSize,
      date: date.toISOString(),
      time: time.toISOString(),
      priceRange: priceRange,
      description: description,
      friends: selectedFriends,
      location: locationOption === 'own' ? 'my location' : specificLocation,
      collections: selectedCollections,
      code: meetupCode,
    };

    console.log('Meetup data before creation:', meetupData);

    try {
      const meetupId = await createMeetup(meetupData);
      console.log('Meetup created successfully with id:', meetupId);
      await Promise.all(
        selectedFriends.map(friend => createMeetupInvite(friend.uid, meetupId))
      );
      Alert.alert('Success', `Meetup created successfully! (ID: ${meetupId})`);
      onBack();
    } catch (error) {
      console.error('Error creating meetup:', error);
      Alert.alert('Error', 'There was an error creating the meetup.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Meet Up</Text>

      {/* Event Name */}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Event Name *"
          placeholderTextColor="#888"
          value={eventName}
          onChangeText={setEventName}
        />
      </View>

      {/* Category */}
      <View style={styles.row}>
        <View style={[styles.inputHalf, styles.dropdownContainer]}>
          <TouchableOpacity
            style={styles.pickerContainer}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <Text style={styles.pickerText}>{selectedCategory}</Text>
          </TouchableOpacity>
          {showCategoryDropdown && (
            <View style={styles.dropdown}>
              {activityLabels.map(label => (
                <TouchableOpacity
                  key={label}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCategory(label);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Group Size */}
      <View style={styles.row}>
        <View style={[styles.counterWrapper, { flex: 1 }]}>
          <Text style={styles.label}>Group Size *</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setGroupSize(Math.max(1, groupSize - 1))}
            >
              <Text style={styles.counterText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{groupSize}</Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setGroupSize(groupSize + 1)}
            >
              <Text style={styles.counterText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date & Time */}
      <View style={styles.row}>
        <View style={[styles.inputHalf, styles.dateTimeBox]}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}
        </View>
        <View style={[styles.inputHalf, styles.dateTimeBox]}>
          <Text style={styles.label}>Time *</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)}>
            <Text style={styles.dateText}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={onChangeTime}
            />
          )}
        </View>
      </View>

      {/* Price Range */}
      <View style={styles.priceRangeContainer}>
        <Text style={styles.sliderLabel}>
          Price Range: {priceRange}{' '}
          {priceRange === 0 ? '- Free' : `- ${'$'.repeat(Math.ceil(priceRange / 20))}`}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          step={5}
          value={priceRange}
          onValueChange={setPriceRange}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="#888888"
        />
      </View>

      {/* Description */}
      <TextInput
        style={styles.input}
        placeholder="Description"
        placeholderTextColor="#888"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* Location Selection */}
      <View style={styles.row}>
        <Text style={styles.label}>Location</Text>
      </View>
      <View style={styles.radioContainer}>
        <TouchableOpacity style={styles.radioButton} onPress={() => setLocationOption('own')}>
          <View style={locationOption === 'own' ? styles.radioSelected : styles.radioUnselected} />
          <Text style={styles.radioLabel}>Use My Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.radioButton} onPress={() => setLocationOption('specific')}>
          <View style={locationOption === 'specific' ? styles.radioSelected : styles.radioUnselected} />
          <Text style={styles.radioLabel}>Enter Specific Location</Text>
        </TouchableOpacity>
      </View>
      {locationOption === 'specific' && (
        <TextInput
          style={styles.input}
          placeholder="Enter location"
          placeholderTextColor="#888"
          value={specificLocation}
          onChangeText={setSpecificLocation}
        />
      )}

      {/* Collections Selection */}
      <TouchableOpacity style={styles.inviteButton} onPress={() => setShowCollectionsRow(true)}>
        <Text style={styles.buttonText}>Select Activity Collections</Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>Collections can be added later as well</Text>

      {/* Collections Row */}
      {showCollectionsRow && (
        <View style={styles.collectionsRowContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.collectionsScrollContainer}
          >
            {collectionsList.map(collection => (
              <TouchableOpacity
                key={collection.id}
                onPress={() => toggleCollection(collection)}
                style={styles.collectionCardWrapper}
              >
                <CollectionCard collection={collection} previewOnly />
                {selectedCollections.some(c => c.id === collection.id) && (
                  <View style={styles.selectedOverlay}>
                    <Ionicons name="checkmark-circle" size={24} color="#00FF00" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.doneButton} onPress={() => setShowCollectionsRow(false)}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selected Collections Preview */}
      {selectedCollections.length > 0 && (
        <View style={styles.selectedCollectionsContainer}>
          <Text style={styles.selectedCollectionsTitle}>Selected Activity Collections:</Text>
          <View style={styles.selectedCollectionsCardsContainer}>
            {selectedCollections.map(collection => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                previewOnly
                onDelete={() =>
                  setSelectedCollections(selectedCollections.filter(c => c.id !== collection.id))
                }
              />
            ))}
          </View>
        </View>
      )}

      {/* Invite Friends */}
      <TouchableOpacity style={styles.inviteButton} onPress={() => setShowInviteModal(true)}>
        <Text style={styles.buttonText}>Invite Friends</Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>Friends can also be invited after creation</Text>

      {/* Selected Friends as Cards */}
      {selectedFriends.length > 0 && (
        <View style={styles.selectedFriendsContainer}>
          <Text style={styles.selectedFriendsTitle}>Invited Friends:</Text>
          <View style={styles.selectedFriendsCardsContainer}>
            {selectedFriends.map(friend => (
              <View key={friend.uid} style={styles.invitedFriendCard}>
                <TouchableOpacity
                  style={styles.removeIconContainer}
                  onPress={() => setSelectedFriends(selectedFriends.filter(f => f.uid !== friend.uid))}
                >
                  <Ionicons name="close" size={16} color="#FF0000" />
                </TouchableOpacity>
                <Image
                  source={
                    friend.avatarUrl
                      ? { uri: friend.avatarUrl }
                      : require('../../assets/images/profile.png')
                  }
                  style={styles.invitedFriendAvatar}
                />
                <Text style={styles.invitedFriendEmail}>{friend.email}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Code Generation Section */}
      <View style={styles.codeSection}>
        <TouchableOpacity style={styles.getCodeButton} onPress={handleGenerateCode}>
          <Text style={styles.buttonText}>Get Code</Text>
        </TouchableOpacity>
        {meetupCode !== '' && (
          <>
            <Text style={styles.codeDisplay}>Your Meetup Code: {meetupCode}</Text>
            <TouchableOpacity style={styles.shareCodeButton} onPress={handleShareCode}>
              <Text style={styles.shareCodeText}>Share Code</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Create & Back Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={[styles.button, { marginRight: 10 }]} onPress={handleCreate}>
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.note}>Note: All fields can be changed in the future.</Text>

      {/* Modals */}
      <InviteFriendsModal
        visible={showInviteModal}
        friendsList={friendsList}
        selectedFriends={selectedFriends}
        toggleFriend={toggleFriend}
        onConfirm={() => setShowInviteModal(false)}
        onClose={() => setShowInviteModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  content: { padding: 20, paddingBottom: 40, paddingTop: 50 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', marginBottom: 15 },
  input: {
    backgroundColor: '#1B1F24',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  inputHalf: { flex: 1, marginHorizontal: 5 },
  dropdownContainer: { position: 'relative', flex: 1 },
  pickerContainer: { backgroundColor: '#1B1F24', borderRadius: 8, justifyContent: 'center', padding: 10 },
  pickerText: { color: '#FFFFFF', fontSize: 16 },
  dropdown: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    zIndex: 1000,
    elevation: 10,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 15 },
  dropdownItemText: { color: '#FFFFFF', fontSize: 16 },
  counterWrapper: { backgroundColor: '#1B1F24', borderRadius: 8, padding: 10, justifyContent: 'center' },
  label: { color: '#FFFFFF', fontSize: 16, marginBottom: 5 },
  counterRow: { flexDirection: 'row', alignItems: 'center' },
  counterButton: {
    backgroundColor: '#24292F',
    borderRadius: 25,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  counterValue: { color: '#FFFFFF', fontSize: 18, marginHorizontal: 10 },
  dateTimeBox: { backgroundColor: '#1B1F24', borderRadius: 8, padding: 10, justifyContent: 'center', flex: 1, marginHorizontal: 5 },
  dateText: { color: '#FFFFFF', fontSize: 16 },
  priceRangeContainer: { marginBottom: 15 },
  sliderLabel: { color: '#FFFFFF', fontSize: 16, marginBottom: 5 },
  slider: { width: '100%', height: 40 },
  radioContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  radioButton: { flexDirection: 'row', alignItems: 'center' },
  radioSelected: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#1B1F24', borderWidth: 2, borderColor: '#FFFFFF', marginRight: 8 },
  radioUnselected: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF', marginRight: 8 },
  radioLabel: { color: '#FFFFFF', fontSize: 16 },
  inviteButton: { width: '100%', height: 60, backgroundColor: '#1B1F24', justifyContent: 'center', alignItems: 'center', borderRadius: 30, marginVertical: 10 },
  buttonText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  infoText: { fontSize: 16, color: '#AAAAAA', textAlign: 'center', marginTop: 10 },
  note: { fontSize: 14, color: '#AAAAAA', textAlign: 'center', marginTop: 20 },
  bottomButtons: { flexDirection: 'row', marginTop: 30, justifyContent: 'center' },
  button: { width: 140, height: 60, backgroundColor: '#1B1F24', justifyContent: 'center', alignItems: 'center', borderRadius: 30 },
  selectedFriendsContainer: { marginVertical: 10, padding: 10, backgroundColor: '#1B1F24', borderRadius: 8 },
  selectedFriendsTitle: { color: '#FFFFFF', fontSize: 16, marginBottom: 5 },
  selectedFriendsCardsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  selectedCollectionsContainer: { marginVertical: 10, padding: 10, backgroundColor: '#1B1F24', borderRadius: 8 },
  selectedCollectionsTitle: { color: '#FFFFFF', fontSize: 16, marginBottom: 5 },
  selectedCollectionsCardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  invitedFriendCard: { width: 80, height: 100, borderWidth: 1, borderColor: '#FFFFFF', borderStyle: 'dashed', borderRadius: 8, padding: 5, margin: 5, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  removeIconContainer: { position: 'absolute', top: -5, left: -5, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 2, zIndex: 1 },
  invitedFriendAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 5 },
  invitedFriendEmail: { color: '#FFFFFF', fontSize: 10, textAlign: 'center' },
  collectionsRowContainer: { marginVertical: 10 },
  collectionsScrollContainer: { paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center' },
  collectionCardWrapper: { marginHorizontal: 0, position: 'relative' },
  selectedOverlay: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,255,0,0.7)', borderRadius: 12, padding: 2 },
  doneButton: { marginTop: 10, alignSelf: 'center', backgroundColor: '#1B1F24', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  doneButtonText: { color: '#FFFFFF', fontSize: 16 },
  codeSection: { marginVertical: 10, alignItems: 'center' },
  getCodeButton: { backgroundColor: '#1B1F24', padding: 10, borderRadius: 30, marginVertical: 5 },
  codeDisplay: { color: '#FFFFFF', fontSize: 18, marginVertical: 5 },
  shareCodeButton: { backgroundColor: '#333', padding: 10, borderRadius: 30, marginTop: 5 },
  shareCodeText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

const modalStyles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '80%', backgroundColor: '#0D1117', borderRadius: 8, padding: 20, alignItems: 'center' },
  cardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  friendCard: { width: 80, height: 100, borderWidth: 1, borderColor: '#FFFFFF', borderStyle: 'dashed', borderRadius: 8, padding: 5, margin: 5, alignItems: 'center', justifyContent: 'center' },
  friendAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 5 },
  friendEmail: { color: '#FFFFFF', fontSize: 10, textAlign: 'center' },
  friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  uncheckedCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', marginRight: 10 },
  checkedCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1B1F24', marginRight: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  friendName: { color: '#FFFFFF', fontSize: 16 },
  confirmButton: { marginTop: 20, backgroundColor: '#1B1F24', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16 },
  cancelButton: { backgroundColor: '#3A3A3A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  cancelButtonText: { color: '#FFFFFF', fontSize: 16 },
  selectedOverlay: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,255,0,0.7)', borderRadius: 12, padding: 2 },
  codeSection: { marginVertical: 10, alignItems: 'center' },
  getCodeButton: { backgroundColor: '#1B1F24', padding: 10, borderRadius: 30, marginVertical: 5 },
  codeDisplay: { color: '#FFFFFF', fontSize: 18, marginVertical: 5 },
});

export default CreateMeetupScreen;
