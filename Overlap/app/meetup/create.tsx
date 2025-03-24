import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { 
  createMeetup, 
  getFriendships 
} from '../utils/storage';
import { 
  collection, getDocs 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../FirebaseConfig';

const activityLabels = [
  "Dining", "Fitness", "Outdoors", "Movies", "Gaming",
  "Social", "Music", "Shopping", "Travel", "Art",
  "Relaxing", "Learning", "Cooking", "Nightlife",
];

// Helper to fetch a friend's profile data
const getFriendProfile = async (friendId) => {
  try {
    const profileRef = collection(db, 'users', friendId, 'profile');
    // The user’s main profile doc might be 'main' if that’s how you structure it:
    // doc(db, 'users', friendId, 'profile', 'main');
    // Adjust if needed.
    const mainDoc = await getDocs(profileRef);
    // If you specifically store profile in doc named "main":
    // const snap = await getDoc(doc(db, 'users', friendId, 'profile', 'main'));
    // ...
    // For simplicity, assume we can’t find the name, fallback to friendId.
    // For demonstration, we’ll just return the friendId.  
    return { id: friendId, name: friendId };
  } catch (error) {
    console.error('Error fetching friend profile:', error);
    return { id: friendId, name: friendId };
  }
};

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

  // Activity Collections state variables (fetched from a subcollection)
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [collectionsList, setCollectionsList] = useState([]);

  // Fetch user's friends from Firestore on mount
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

  // Fetch user's activity collections from subcollection /users/{uid}/collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        // Reference to the subcollection: /users/{uid}/collections
        const collectionsRef = collection(db, 'users', user.uid, 'collections');
        const querySnapshot = await getDocs(collectionsRef);

        // Each doc in the subcollection is treated as one collection
        const userCollections = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            // If you store the collection name in a field "name":
            name: data.name ?? docSnap.id,
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

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) setTime(selectedTime);
  };

  // Toggle friend selection in the "Invite Friends" modal
  const toggleFriend = (friend) => {
    if (selectedFriends.some(f => f.id === friend.id)) {
      setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  const confirmInvites = () => {
    setShowInviteModal(false);
  };

  // Toggle collection selection in the "Select Activity Collections" modal
  const toggleCollection = (collection) => {
    if (selectedCollections.some(c => c.id === collection.id)) {
      setSelectedCollections(selectedCollections.filter(c => c.id !== collection.id));
    } else {
      setSelectedCollections([...selectedCollections, collection]);
    }
  };

  const confirmCollections = () => {
    setShowCollectionsModal(false);
  };

  // Create meetup action
  const handleCreate = async () => {
    if (!eventName.trim()) {
      Alert.alert('Missing Required Field', 'Please enter an Event Name.');
      return;
    }

    // Build the meetup data object
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
      invitedFriends: selectedFriends,
      location: locationOption === 'own' ? 'my location' : specificLocation,
      collections: selectedCollections,
    };

    try {
      const meetupId = await createMeetup(meetupData);
      Alert.alert('Success', `Meetup created successfully! (ID: ${meetupId})`);
      onBack();
    } catch (error) {
      Alert.alert('Error', 'There was an error creating the meetup.');
    }
  };

  return (
    <ScrollView style={styles.createContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.createTitle}>Create Meet Up</Text>
      {/* ROW 1: Event Name & Mood */}
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Event Name *"
          placeholderTextColor="#888"
          value={eventName}
          onChangeText={setEventName}
        />
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Mood"
          placeholderTextColor="#888"
          value={mood}
          onChangeText={setMood}
        />
      </View>
      {/* ROW 2: Category & Group Size */}
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

      {/* ROW 3: Date & Time */}
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
      {/* ROW 4: Price Range */}
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
          onValueChange={(value) => setPriceRange(value)}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="#888888"
        />
      </View>
      {/* DESCRIPTION */}
      <TextInput
        style={styles.input}
        placeholder="Description"
        placeholderTextColor="#888"
        multiline
        value={description}
        onChangeText={setDescription}
      />
      {/* RESTRICTIONS */}
      <TextInput
        style={styles.input}
        placeholder="Restrictions (allergies, disabilities)"
        placeholderTextColor="#888"
        multiline
        value={restrictions}
        onChangeText={setRestrictions}
      />
      {/* LOCATION SELECTION */}
      <View style={styles.row}>
        <Text style={styles.label}>Location</Text>
      </View>
      <Picker
        selectedValue={locationOption}
        style={[styles.picker, { backgroundColor: '#1B1F24', marginBottom: 15 }]}
        dropdownIconColor="#FFFFFF"
        onValueChange={(itemValue) => setLocationOption(itemValue)}
      >
        <Picker.Item label="Use My Location" value="own" color="#FFFFFF" />
        <Picker.Item label="Enter Specific Location" value="specific" color="#FFFFFF" />
      </Picker>
      {locationOption === 'specific' && (
        <TextInput
          style={styles.input}
          placeholder="Enter location"
          placeholderTextColor="#888"
          value={specificLocation}
          onChangeText={setSpecificLocation}
        />
      )}
      {/* COLLECTIONS SELECTION */}
      <TouchableOpacity style={styles.inviteButton} onPress={() => setShowCollectionsModal(true)}>
        <Text style={styles.buttonText}>Select Activity Collections</Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>Collections can be added later as well</Text>
      {selectedCollections.length > 0 && (
        <View style={styles.selectedFriendsContainer}>
          <Text style={styles.selectedFriendsTitle}>Selected Collections:</Text>
          {selectedCollections.map(collection => (
            <Text key={collection.id} style={styles.selectedFriendName}>{collection.name}</Text>
          ))}
        </View>
      )}
      {/* INVITE FRIENDS BUTTON */}
      <TouchableOpacity style={styles.inviteButton} onPress={() => setShowInviteModal(true)}>
        <Text style={styles.buttonText}>Invite Friends</Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>Friends can also be invited after creation</Text>
      {/* Display selected friends */}
      {selectedFriends.length > 0 && (
        <View style={styles.selectedFriendsContainer}>
          <Text style={styles.selectedFriendsTitle}>Invited Friends:</Text>
          {selectedFriends.map(friend => (
            <Text key={friend.id} style={styles.selectedFriendName}>{friend.name}</Text>
          ))}
        </View>
      )}
      {/* CREATE / BACK BUTTONS */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, { marginRight: 10, width: 120 }]}
          onPress={handleCreate}
        >
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { width: 120 }]} onPress={onBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.note}>Note: All fields can be changed in the future.</Text>

      {/* INVITE FRIENDS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showInviteModal}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <ScrollView style={{ maxHeight: 300 }}>
              {friendsList.map(friend => (
                <TouchableOpacity key={friend.id} onPress={() => toggleFriend(friend)}>
                  <View style={modalStyles.friendItem}>
                    <View style={
                      selectedFriends.some(f => f.id === friend.id)
                        ? modalStyles.checkedCircle
                        : modalStyles.uncheckedCircle
                    } />
                    <Text style={modalStyles.friendName}>{friend.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={modalStyles.confirmButton} onPress={confirmInvites}>
              <Text style={modalStyles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* COLLECTIONS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCollectionsModal}
        onRequestClose={() => setShowCollectionsModal(false)}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <ScrollView style={{ maxHeight: 300 }}>
              {collectionsList.map(collection => (
                <TouchableOpacity key={collection.id} onPress={() => toggleCollection(collection)}>
                  <View style={modalStyles.friendItem}>
                    <View style={
                      selectedCollections.some(c => c.id === collection.id)
                        ? modalStyles.checkedCircle
                        : modalStyles.uncheckedCircle
                    } />
                    <Text style={modalStyles.friendName}>{collection.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={modalStyles.confirmButton} onPress={confirmCollections}>
              <Text style={modalStyles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: 55, // Adjust as needed based on the button's height
    left: 0,
    right: 0,
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    zIndex: 1000, // Ensures the dropdown overlaps other components
    elevation: 10, // For Android shadow
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },  
  createContainer: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: 50,
  },
  createTitle: {
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
  inputHalf: {
    flex: 1,
    marginHorizontal: 5,
  },
  input: {
    backgroundColor: '#1B1F24',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
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
  picker: {
    height: 40,
    width: '100%',
    color: '#FFFFFF',
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
  dateTimeBox: {
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
  },
  dateText: {
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
});

export default CreateMeetupScreen;
