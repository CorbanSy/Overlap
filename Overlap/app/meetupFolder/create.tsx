import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, addDoc } from 'firebase/firestore';

import { db } from '../../FirebaseConfig';
import { createMeetup, getFriendships } from '../../_utils/storage';
import CollectionCard from '../../components/CollectionCard';

type Friend = { uid: string; email?: string; name?: string; avatarUrl?: string };
type CollectionType = { id: string; title?: string; activities?: any[] };

// ------------------------------------------------------------------
// Theme
// ------------------------------------------------------------------
const BG = '#0D1117';
const CARD = '#1B1F24';
const SURFACE = '#232A33';
const TEXT = '#FFFFFF';
const SUBTLE = '#9AA0A6';
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#FFA500';

// ------------------------------------------------------------------
// Static list of activity labels
// ------------------------------------------------------------------
const activityLabels = [
  'Dining', 'Fitness', 'Outdoors', 'Movies', 'Gaming',
  'Social', 'Music', 'Shopping', 'Travel', 'Art',
  'Relaxing', 'Learning', 'Cooking', 'Nightlife',
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
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

// Read public profile from userDirectory (rules allow)
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

// ------------------------------------------------------------------
// Invite Friends Modal
// ------------------------------------------------------------------
const InviteFriendsModal = ({
  visible,
  friendsList,
  selectedFriends,
  toggleFriend,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  friendsList: Friend[];
  selectedFriends: Friend[];
  toggleFriend: (f: Friend) => void;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <View style={m.centered}>
      <View style={m.sheet}>
        <Text style={m.title}>Invite Friends</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={m.grid}
        >
          {friendsList.map((friend) => {
            const isSelected = selectedFriends.some((f) => f.uid === friend.uid);
            return (
              <TouchableOpacity key={friend.uid} onPress={() => toggleFriend(friend)} activeOpacity={0.9}>
                <View style={[m.card, isSelected && m.cardSelected]}>
                  <Image
                    source={
                      friend.avatarUrl
                        ? { uri: friend.avatarUrl }
                        : require('../../assets/images/profile.png')
                    }
                    style={m.avatar}
                  />
                  <Text style={m.name} numberOfLines={1}>
                    {friend.name || friend.email || friend.uid}
                  </Text>
                  <View style={[m.check, isSelected ? m.checkOn : m.checkOff]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#0D1117" />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={m.row}>
          <TouchableOpacity style={[m.btn, m.btnGhost]} onPress={onClose}>
            <Text style={[m.btnText, m.btnGhostText]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[m.btn, m.btnPrimary]} onPress={onConfirm}>
            <Text style={m.btnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ------------------------------------------------------------------
// Screen
// ------------------------------------------------------------------
const CreateMeetupScreen = ({ onBack }: { onBack: () => void }) => {
  // Required
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');

  // Date / time
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Other fields
  const [groupSize, setGroupSize] = useState(1);
  const [priceRange, setPriceRange] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(activityLabels[0]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Friends & collections
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<CollectionType[]>([]);
  const [collectionsList, setCollectionsList] = useState<CollectionType[]>([]);
  const [showCollectionsRow, setShowCollectionsRow] = useState(false);

  // Location
  const [locationOption, setLocationOption] = useState<'own' | 'specific'>('own');
  const [specificLocation, setSpecificLocation] = useState('');

  // Code
  const [meetupCode, setMeetupCode] = useState('');

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

  // Handlers
  const onChangeDate = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) setDate(selected);
  };
  const onChangeTime = (_: any, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) setTime(selected);
  };

  const toggleFriend = (friend: Friend) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.uid === friend.uid) ? prev.filter((f) => f.uid !== friend.uid) : [...prev, friend]
    );
  };

  const toggleCollection = (collection: CollectionType) => {
    setSelectedCollections((prev) =>
      prev.some((c) => c.id === collection.id)
        ? prev.filter((c) => c.id !== collection.id)
        : [...prev, collection]
    );
  };

  const handleGenerateCode = () => {
    setMeetupCode(Math.floor(100000 + Math.random() * 900000).toString());
  };

  const handleShareCode = async () => {
    try {
      await Share.share({ message: `Join my meetup using this code: ${meetupCode}` });
    } catch (e) {
      console.error('Error sharing code:', e);
    }
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

  // ----------------------------------------------------------------
  // UI
  // ----------------------------------------------------------------
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Create Meet Up</Text>

      {/* Details */}
      <View style={s.card}>
        <Text style={s.label}>Event Name *</Text>
        <TextInput
          style={s.input}
          placeholder="e.g., Sushi & Trivia Night"
          placeholderTextColor={SUBTLE}
          value={eventName}
          onChangeText={setEventName}
        />

        <Text style={s.label}>Category</Text>
        <View style={s.dropdownWrap}>
          <TouchableOpacity style={s.dropdownBtn} onPress={() => setShowCategoryDropdown((v) => !v)}>
            <Text style={s.dropdownText}>{selectedCategory}</Text>
            <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={TEXT} />
          </TouchableOpacity>
          {showCategoryDropdown && (
            <View style={s.dropdownMenu}>
              {activityLabels.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={s.dropdownItem}
                  onPress={() => {
                    setSelectedCategory(label);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={s.dropdownItemText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Add a short description…"
          placeholderTextColor={SUBTLE}
          multiline
          value={description}
          onChangeText={setDescription}
        />
      </View>

      {/* Size / Date / Time */}
      <View style={s.row2}>
        <View style={[s.card, s.col]}>
          <Text style={s.label}>Group Size *</Text>
          <View style={s.counterRow}>
            <TouchableOpacity style={s.counterBtn} onPress={() => setGroupSize(Math.max(1, groupSize - 1))}>
              <Ionicons name="remove" size={18} color={TEXT} />
            </TouchableOpacity>
            <Text style={s.counterValue}>{groupSize}</Text>
            <TouchableOpacity style={s.counterBtn} onPress={() => setGroupSize(groupSize + 1)}>
              <Ionicons name="add" size={18} color={TEXT} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[s.card, s.col]}>
          <Text style={s.label}>Price Range</Text>
          <Text style={s.sliderLabel}>
            {priceRange === 0 ? 'Free' : '$'.repeat(Math.ceil(priceRange / 20))}
          </Text>
          <Slider
            style={s.slider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={priceRange}
            onValueChange={setPriceRange}
            minimumTrackTintColor={TEXT}
            maximumTrackTintColor="#6B7280"
          />
        </View>
      </View>

      <View style={s.row2}>
        <View style={[s.card, s.col]}>
          <Text style={s.label}>Date *</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={s.pickText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker value={date} mode="date" display="default" onChange={onChangeDate} />
          )}
        </View>

        <View style={[s.card, s.col]}>
          <Text style={s.label}>Time *</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)}>
            <Text style={s.pickText}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker value={time} mode="time" display="default" onChange={onChangeTime} />
          )}
        </View>
      </View>

      {/* Location */}
      <View style={s.card}>
        <Text style={s.label}>Location</Text>
        <View style={s.radioRow}>
          <TouchableOpacity style={s.radioBtn} onPress={() => setLocationOption('own')}>
            <View style={locationOption === 'own' ? s.radioOn : s.radioOff} />
            <Text style={s.radioText}>Use My Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.radioBtn} onPress={() => setLocationOption('specific')}>
            <View style={locationOption === 'specific' ? s.radioOn : s.radioOff} />
            <Text style={s.radioText}>Enter Specific Location</Text>
          </TouchableOpacity>
        </View>

        {locationOption === 'specific' && (
          <TextInput
            style={s.input}
            placeholder="Address or place name"
            placeholderTextColor={SUBTLE}
            value={specificLocation}
            onChangeText={setSpecificLocation}
          />
        )}
      </View>

      {/* Collections */}
      <View style={s.card}>
        <TouchableOpacity style={s.pillBtn} onPress={() => setShowCollectionsRow(true)}>
          <Text style={s.pillText}>Select Activity Collections</Text>
        </TouchableOpacity>
        <Text style={s.hint}>Collections can be added later as well</Text>

        {showCollectionsRow && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.collectionsRow}
            >
              {collectionsList.map((c) => {
                const isPicked = selectedCollections.some((x) => x.id === c.id);
                return (
                  <TouchableOpacity key={c.id} onPress={() => toggleCollection(c)} style={s.collectionWrap}>
                    <CollectionCard collection={c as any} previewOnly />
                    {isPicked && (
                      <View style={s.badge}>
                        <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={s.smallGhostBtn} onPress={() => setShowCollectionsRow(false)}>
              <Text style={s.ghostText}>Done</Text>
            </TouchableOpacity>
          </>
        )}

        {selectedCollections.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.subheading}>Selected Collections</Text>
            <View style={s.selectedGrid}>
              {selectedCollections.map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={c as any}
                  previewOnly
                  onDelete={() =>
                    setSelectedCollections((prev) => prev.filter((x) => x.id !== c.id))
                  }
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Friends */}
      <View style={s.card}>
        <TouchableOpacity style={s.pillBtn} onPress={() => setShowInviteModal(true)}>
          <Text style={s.pillText}>Invite Friends</Text>
        </TouchableOpacity>
        <Text style={s.hint}>Friends can also be invited after creation</Text>

        {selectedFriends.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.subheading}>Invited Friends</Text>
            <View style={s.invitedGrid}>
              {selectedFriends.map((f) => (
                <View key={f.uid} style={s.friendChip}>
                  <TouchableOpacity
                    onPress={() =>
                      setSelectedFriends((prev) => prev.filter((x) => x.uid !== f.uid))
                    }
                    style={s.closeChip}
                  >
                    <Ionicons name="close" size={14} color="#FF3B30" />
                  </TouchableOpacity>
                  <Image
                    source={
                      f.avatarUrl ? { uri: f.avatarUrl } : require('../../assets/images/profile.png')
                    }
                    style={s.friendAvatar}
                  />
                  <Text numberOfLines={1} style={s.friendLabel}>
                    {f.name || f.email || f.uid}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Code */}
      <View style={s.card}>
        <Text style={s.subheading}>Invite Code</Text>
        <View style={s.codeRow}>
          <TouchableOpacity style={s.smallBtn} onPress={handleGenerateCode}>
            <Text style={s.smallBtnText}>Get Code</Text>
          </TouchableOpacity>
          {!!meetupCode && (
            <>
              <Text style={s.codeText}>{meetupCode}</Text>
              <TouchableOpacity style={s.smallGhostBtn} onPress={handleShareCode}>
                <Text style={s.ghostText}>Share</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={[s.primary, { marginRight: 10 }]} onPress={handleCreate}>
          <Text style={s.primaryText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondary} onPress={onBack}>
          <Text style={s.secondaryText}>Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.note}>Note: All fields can be changed in the future.</Text>

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

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 40, paddingTop: 28 },
  title: { fontSize: 32, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 14 },

  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },

  label: { color: TEXT, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: SURFACE,
    color: TEXT,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },

  // dropdown
  dropdownWrap: { position: 'relative' },
  dropdownBtn: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: { color: TEXT, fontSize: 16 },
  dropdownMenu: {
    position: 'absolute',
    left: 0, right: 0, top: 52,
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    zIndex: 10,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemText: { color: TEXT, fontSize: 16 },

  // size/price/date/time
  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  col: { flex: 1 },
  counterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  counterBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  counterValue: { color: TEXT, fontSize: 18, fontWeight: '700', paddingHorizontal: 10 },
  sliderLabel: { color: SUBTLE, fontSize: 12, marginTop: 2, marginBottom: 2 },
  slider: { width: '100%', height: 36 },
  pickText: { color: TEXT, fontSize: 16, paddingVertical: 4 },

  // radio/location
  radioRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 2 },
  radioBtn: { flexDirection: 'row', alignItems: 'center' },
  radioOn: { width: 18, height: 18, borderRadius: 9, backgroundColor: TEXT, marginRight: 8 },
  radioOff: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: TEXT, marginRight: 8 },
  radioText: { color: TEXT, fontSize: 14 },

  // collections
  pillBtn: {
    backgroundColor: SURFACE,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pillText: { color: TEXT, fontSize: 16, fontWeight: '800' },
  hint: { color: SUBTLE, textAlign: 'center', marginTop: 8 },
  collectionsRow: { paddingVertical: 10, gap: 10, alignItems: 'center' },
  collectionWrap: { marginRight: 6, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'transparent' },
  selectedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },

  // friends
  invitedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  friendChip: {
    width: 90, height: 110, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE,
    padding: 8, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  closeChip: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 2,
  },
  friendAvatar: { width: 46, height: 46, borderRadius: 23, marginBottom: 6 },
  friendLabel: { color: TEXT, fontSize: 10, textAlign: 'center' },

  // code
  subheading: { color: TEXT, fontSize: 14, fontWeight: '800' },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  smallBtn: {
    backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
  },
  smallBtnText: { color: '#0D1117', fontWeight: '800' },
  smallGhostBtn: {
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
  },
  ghostText: { color: TEXT, fontWeight: '700' },
  codeText: { color: TEXT, fontSize: 16, fontWeight: '700' },

  // actions
  actions: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  primary: {
    backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28,
    shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 5,
  },
  primaryText: { color: '#0D1117', fontSize: 16, fontWeight: '800' },
  secondary: {
    backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28,
    borderWidth: 1, borderColor: BORDER,
  },
  secondaryText: { color: TEXT, fontSize: 16, fontWeight: '800' },

  note: { color: SUBTLE, textAlign: 'center', marginTop: 14, fontSize: 12 },
});

// Modal styles
const m = StyleSheet.create({
  centered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet: {
    width: '88%', backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  title: { color: TEXT, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  card: {
    width: 96, paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center', borderRadius: 10,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    position: 'relative',
  },
  cardSelected: { borderColor: ACCENT },
  avatar: { width: 42, height: 42, borderRadius: 21, marginBottom: 6 },
  name: { color: TEXT, fontSize: 11, textAlign: 'center' },
  check: {
    position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: ACCENT },
  checkOff: { borderWidth: 1, borderColor: BORDER, backgroundColor: 'transparent' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end' },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimary: { backgroundColor: ACCENT },
  btnGhost: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  btnText: { fontWeight: '800', color: '#0D1117' },
  btnGhostText: { color: TEXT },
});

export default CreateMeetupScreen;
