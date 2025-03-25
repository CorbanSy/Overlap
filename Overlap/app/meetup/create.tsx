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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { createMeetup, getFriendships } from '../utils/storage';
import { doc, getDoc, getDocs, addDoc, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

// Static list of activity labels
const activityLabels = [
  "Dining", "Fitness", "Outdoors", "Movies", "Gaming",
  "Social", "Music", "Shopping", "Travel", "Art",
  "Relaxing", "Learning", "Cooking", "Nightlife",
];

const createMeetupInvite = async (friendId: string, meetupId: string) => {
  try {
    const meetupRef = doc(db, "meetups", meetupId);
    const meetupSnap = await getDoc(meetupRef);
    const meetupData = meetupSnap.exists() ? meetupSnap.data() : {};
    
    const inviteData = {
      invitedFriendId: friendId, // <-- Use this field name
      meetupId,
      status: 'pending',
      title: meetupData.eventName || 'Meetup Invitation',
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'meetupInvites'), inviteData);
  } catch (error) {
    console.error('Error creating meetup invite:', error);
  }
};


// Helper function to fetch a friend's profile
const getFriendProfile = async (friendId) => {
  try {
    const userDocRef = doc(db, 'users', friendId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Return the email as the name (or separately if needed)
      return { id: friendId, email: userData.email, name: userData.email, avatarUrl: userData.avatarUrl };
    }
    return { id: friendId, email: friendId, name: friendId };
  } catch (error) {
    console.error('Error fetching friend profile:', error);
    return { id: friendId, email: friendId, name: friendId };
  }
};

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
            <TouchableOpacity key={friend.id} onPress={() => toggleFriend(friend)}>
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

// Modal Component for selecting collections
const CollectionsModal = ({ visible, collectionsList, selectedCollections, toggleCollection, onConfirm, onClose }) => (
  <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <View style={modalStyles.centeredView}>
      <View style={modalStyles.modalView}>
        <ScrollView style={{ maxHeight: 300 }}>
          {collectionsList.map((collection) => (
            <TouchableOpacity key={collection.id} onPress={() => toggleCollection(collection)}>
              <View style={modalStyles.friendItem}>
                <View style={
                  selectedCollections.some(c => c.id === collection.id)
                    ? modalStyles.checkedCircle
                    : modalStyles.uncheckedCircle
                } />
                <Text style={modalStyles.friendName}>{collection.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={modalStyles.modalButtons}>
          <TouchableOpacity style={modalStyles.confirmButton} onPress={onConfirm}>
            <Text style={modalStyles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const CreateMeetupScreen = ({ onBack }) => {
  // Required field states
  const [eventName, setEventName] = useState('');
  const [mood, setMood] = useState('');
  const [description, setDescription] = useState('');
  const [restrictions, setRestrictions] = useState('');

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
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [collectionsList, setCollectionsList] = useState([]);

  // Fetch friends on mount
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const friendships = await getFriendships();
        const auth = getAuth();
        const currentUserId = auth.currentUser.uid;
        const friendIds = friendships.map(f =>
          f.users.find(id => id !== currentUserId)
        );
        const friendProfiles = await Promise.all(friendIds.map(getFriendProfile));
        setFriendsList(friendProfiles);
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };
    fetchFriends();
  }, []);

  // Fetch collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const collectionsRef = collection(db, 'users', user.uid, 'collections');
        const querySnapshot = await getDocs(collectionsRef);
        const userCollections = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title ?? docSnap.id,
            ...data
          };
        });
        setCollectionsList(userCollections);
      } catch (error) {
        console.error('Error fetching user collections:', error);
      }
    };
    fetchCollections();
  }, []);

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
    if (selectedFriends.some(f => f.id === friend.id)) {
      setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id));
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
    const meetupData = {
      eventName,
      mood,
      category: selectedCategory,
      groupSize,
      date: date.toISOString(),
      time: time.toISOString(),
      priceRange,
      description,
      restrictions,
      invitedFriends: selectedFriends, // This still stores the list in your meetup
      location: locationOption === 'own' ? 'my location' : specificLocation,
      collections: selectedCollections,
    };
    try {
      const meetupId = await createMeetup(meetupData);
      // Loop over each selected friend to create an invite
      await Promise.all(
        selectedFriends.map(friend => createMeetupInvite(friend.id, meetupId))
      );
      Alert.alert('Success', `Meetup created successfully! (ID: ${meetupId})`);
      onBack();
    } catch (error) {
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

      {/* Mood & Category */}
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Mood"
          placeholderTextColor="#888"
          value={mood}
          onChangeText={setMood}
        />
        <View style={[styles.inputHalf, styles.dropdownContainer]}>
          <TouchableOpacity
            style={styles.pickerContainer}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <Text style={styles.pickerText}>{selectedCategory}</Text>
          </TouchableOpacity>
          {showCategoryDropdown && (
            <View style={styles.dropdown}>
              {activityLabels.map((label) => (
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
          Price Range: {priceRange} {priceRange === 0 ? '- Free' : `- ${"$".repeat(Math.ceil(priceRange / 20))}`}
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
        blurOnSubmit
        value={description}
        onChangeText={setDescription}
      />

      {/* Restrictions */}
      <TextInput
        style={styles.input}
        placeholder="Restrictions (allergies, disabilities)"
        placeholderTextColor="#888"
        multiline
        blurOnSubmit
        value={restrictions}
        onChangeText={setRestrictions}
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
      <TouchableOpacity style={styles.inviteButton} onPress={() => setShowCollectionsModal(true)}>
        <Text style={styles.buttonText}>Select Activity Collections</Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>Collections can be added later as well</Text>
      {selectedCollections.length > 0 && (
        <View style={styles.selectedFriendsContainer}>
          <Text style={styles.selectedFriendsTitle}>Selected Collections:</Text>
          {selectedCollections.map(collection => (
            <Text key={collection.id} style={styles.selectedFriendName}>{collection.title}</Text>
          ))}
        </View>
      )}

      {/* Invite Friends */}
      <TouchableOpacity style={styles.inviteButton} onPress={() => setShowInviteModal(true)}>
        <Text style={styles.buttonText}>Invite Friends</Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>Friends can also be invited after creation</Text>

      {/* Selected (Invited) Friends as Cards */}
      {selectedFriends.length > 0 && (
      <View style={styles.selectedFriendsContainer}>
        <Text style={styles.selectedFriendsTitle}>Invited Friends:</Text>
        <View style={styles.selectedFriendsCardsContainer}>
          {selectedFriends.map(friend => (
            <View key={friend.id} style={styles.invitedFriendCard}>
              <TouchableOpacity 
                style={styles.removeIconContainer}
                onPress={() => setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id))}
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
      <CollectionsModal
        visible={showCollectionsModal}
        collectionsList={collectionsList}
        selectedCollections={selectedCollections}
        toggleCollection={toggleCollection}
        onConfirm={() => setShowCollectionsModal(false)}
        onClose={() => setShowCollectionsModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#1B1F24',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 5,
  },
  dropdownContainer: {
    position: 'relative',
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    justifyContent: 'center',
    padding: 10,
  },
  pickerText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
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
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  counterWrapper: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 5,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    backgroundColor: '#24292F',
    borderRadius: 25,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  counterValue: {
    color: '#FFFFFF',
    fontSize: 18,
    marginHorizontal: 10,
  },
  dateTimeBox: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  priceRangeContainer: {
    marginBottom: 15,
  },
  sliderLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1B1F24',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginRight: 8,
  },
  radioUnselected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginRight: 8,
  },
  radioLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  inviteButton: {
    width: '100%',
    height: 60,
    backgroundColor: '#1B1F24',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    marginVertical: 10,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 10,
  },
  note: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    marginTop: 30,
    justifyContent: 'center',
  },
  button: {
    width: 140,
    height: 60,
    backgroundColor: '#1B1F24',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  selectedFriendsContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#1B1F24',
    borderRadius: 8,
  },
  selectedFriendsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 5,
  },
  selectedFriendName: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  /* A small wrapper to display friend cards in a row/column layout */
  selectedFriendsCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  invitedFriendCard: {
    width: 80,
    height: 100,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 5,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative', // so the remove icon can be absolutely positioned
  },
  removeIconContainer: {
    position: 'absolute',
    top: -5,
    left: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
    zIndex: 1,
  },
  invitedFriendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
  invitedFriendEmail: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '80%',
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  friendCard: {
    width: 80,
    height: 100,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 5,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
  friendEmail: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  uncheckedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginRight: 10,
  },
  checkedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1B1F24',
    marginRight: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  friendName: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  confirmButton: {
    marginTop: 20,
    backgroundColor: '#1B1F24',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#3A3A3A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default CreateMeetupScreen;
