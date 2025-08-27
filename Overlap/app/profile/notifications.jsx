// app/profile/notifications.jsx (Fixed SafeArea)
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#0D1117';
const CARD = '#1B1F24';
const BORDER = 'rgba(255,255,255,0.08)';
const INPUT_BG = '#222';
const ACCENT = '#FFA500';

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Global channels
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);

  // Behavior
  const [showPreviews, setShowPreviews] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [badgeEnabled, setBadgeEnabled] = useState(true);

  // Quiet hours (basic HH:MM)
  const [quietHours, setQuietHours] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  // Categories
  const [friendReqs, setFriendReqs] = useState(true);
  const [messages, setMessages] = useState(true);
  const [likes, setLikes] = useState(true);
  const [meetupInvites, setMeetupInvites] = useState(true);
  const [reminders, setReminders] = useState(true);

  const onSave = () => {
    // TODO: Persist to Firestore (e.g. users/{uid}/settings/notifications)
    Alert.alert('Saved', 'Your notification preferences have been updated.');
  };

  return (
    <View style={styles.safe}>
      <StatusBar backgroundColor={BG} barStyle="light-content" />
      <View style={[styles.safeAreaTop, { height: insets.top }]} />
      
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Delivery Channels */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Channels</Text>

          <Row
            title="Push Notifications"
            sub="Alerts delivered to your device."
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          <Row
            title="Email"
            sub="Receive important updates via email."
            value={emailEnabled}
            onValueChange={setEmailEnabled}
          />
          <Row
            title="SMS"
            sub="Text messages for time-sensitive items."
            value={smsEnabled}
            onValueChange={setSmsEnabled}
          />
        </View>

        {/* Behavior */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Behavior</Text>

          <Row
            title="Show Notification Previews"
            sub="Display content in notifications."
            value={showPreviews}
            onValueChange={setShowPreviews}
          />
          <Row
            title="Sound"
            sub="Play a sound for incoming notifications."
            value={soundEnabled}
            onValueChange={setSoundEnabled}
          />
          <Row
            title="App Icon Badges"
            sub="Show unread counts on the app icon."
            value={badgeEnabled}
            onValueChange={setBadgeEnabled}
          />
        </View>

        {/* Quiet Hours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quiet Hours</Text>

          <Row
            title="Enable Quiet Hours"
            sub="Mute sounds and badges during a window."
            value={quietHours}
            onValueChange={setQuietHours}
          />

          {quietHours && (
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Start (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="22:00"
                  placeholderTextColor="#888"
                  value={quietStart}
                  onChangeText={setQuietStart}
                  autoCapitalize="none"
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                  returnKeyType="done"
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>End (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="07:00"
                  placeholderTextColor="#888"
                  value={quietEnd}
                  onChangeText={setQuietEnd}
                  autoCapitalize="none"
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                  returnKeyType="done"
                />
              </View>
            </View>
          )}
        </View>

        {/* Categories */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Categories</Text>

          <Row
            title="Friend Requests"
            sub="New requests and status changes."
            value={friendReqs}
            onValueChange={setFriendReqs}
          />
          <Row
            title="Messages"
            sub="New DMs and replies."
            value={messages}
            onValueChange={setMessages}
          />
          <Row
            title="Activity Likes"
            sub="When someone likes your activity."
            value={likes}
            onValueChange={setLikes}
          />
          <Row
            title="Meetup Invites"
            sub="Invitations and updates."
            value={meetupInvites}
            onValueChange={setMeetupInvites}
          />
          <Row
            title="Reminders"
            sub="Saved reminders for events."
            value={reminders}
            onValueChange={setReminders}
          />
        </View>

        {/* Save */}
        <TouchableOpacity style={styles.primaryBtn} onPress={onSave} activeOpacity={0.88}>
          <Text style={styles.primaryBtnText}>Save Changes</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

/* Small presentational row component for labeled switch */
function Row({ title, sub, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? '#fff' : '#ccc'}
        trackColor={{ false: '#444', true: '#2b6cb0' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: BG 
  },
  safeAreaTop: {
    backgroundColor: BG,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },

  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 12 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rowSub: { color: '#b8b8b8', fontSize: 12, marginTop: 2 },

  inputRow: { flexDirection: 'row', marginTop: 8 },
  inputLabel: { color: '#b8b8b8', fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: INPUT_BG,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryBtnText: { color: '#0D1117', fontWeight: '800', fontSize: 16 },
});