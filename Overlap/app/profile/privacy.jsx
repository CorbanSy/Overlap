// app/profile/privacy.jsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BG = '#0D1117';
const CARD = '#1B1F24';
const BORDER = 'rgba(255,255,255,0.08)';
const INPUT_BG = '#222';
const ACCENT = '#FFA500';

export default function Privacy() {
  const router = useRouter();

  // Local state (persist to Firestore later)
  const [showProfilePublic, setShowProfilePublic] = useState(true);
  const [showActivityToFriends, setShowActivityToFriends] = useState(true);
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [shareEmailWithFriends, setShareEmailWithFriends] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockInput, setBlockInput] = useState('');

  const onSave = () => {
    // TODO: persist these values to Firestore
    // e.g. await setDoc(doc(db, 'users', uid, 'settings', 'privacy'), {...})
    Alert.alert('Saved', 'Your privacy settings have been updated.');
  };

  const handleBlock = () => {
    const v = blockInput.trim();
    if (!v) return;
    if (!blockedUsers.includes(v)) {
      setBlockedUsers((prev) => [...prev, v]);
      setBlockInput('');
    }
  };

  const removeBlocked = (value) => {
    setBlockedUsers((prev) => prev.filter((u) => u !== value));
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Visibility */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Visibility</Text>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Public Profile</Text>
              <Text style={styles.rowSub}>
                If off, only approved friends will see your profile details.
              </Text>
            </View>
            <Switch
              value={showProfilePublic}
              onValueChange={setShowProfilePublic}
              thumbColor={showProfilePublic ? '#fff' : '#ccc'}
              trackColor={{ false: '#444', true: '#2b6cb0' }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Show Activity to Friends</Text>
              <Text style={styles.rowSub}>
                Share liked activities and collections with friends.
              </Text>
            </View>
            <Switch
              value={showActivityToFriends}
              onValueChange={setShowActivityToFriends}
              thumbColor={showActivityToFriends ? '#fff' : '#ccc'}
              trackColor={{ false: '#444', true: '#2b6cb0' }}
            />
          </View>
        </View>

        {/* Connections */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connections</Text>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Allow Friend Requests</Text>
              <Text style={styles.rowSub}>
                Let others find and send you friend requests.
              </Text>
            </View>
            <Switch
              value={allowFriendRequests}
              onValueChange={setAllowFriendRequests}
              thumbColor={allowFriendRequests ? '#fff' : '#ccc'}
              trackColor={{ false: '#444', true: '#2b6cb0' }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Share Email with Friends</Text>
              <Text style={styles.rowSub}>
                Let your friends see the email on your profile.
              </Text>
            </View>
            <Switch
              value={shareEmailWithFriends}
              onValueChange={setShareEmailWithFriends}
              thumbColor={shareEmailWithFriends ? '#fff' : '#ccc'}
              trackColor={{ false: '#444', true: '#2b6cb0' }}
            />
          </View>
        </View>

        {/* Blocked Users */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Blocked Users</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter username or email"
              placeholderTextColor="#888"
              value={blockInput}
              onChangeText={setBlockInput}
              autoCapitalize="none"
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.blockBtn} onPress={handleBlock}>
              <Text style={styles.blockBtnText}>Block</Text>
            </TouchableOpacity>
          </View>

          {blockedUsers.length === 0 ? (
            <Text style={styles.emptyText}>No one blocked.</Text>
          ) : (
            <View style={styles.blockList}>
              {blockedUsers.map((u) => (
                <View key={u} style={styles.blockChip}>
                  <Text style={styles.blockChipText}>{u}</Text>
                  <TouchableOpacity onPress={() => removeBlocked(u)} style={styles.unblockIcon}>
                    <Ionicons name="close" color="#fff" size={14} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save */}
        <TouchableOpacity style={styles.primaryBtn} onPress={onSave} activeOpacity={0.88}>
          <Text style={styles.primaryBtnText}>Save Changes</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
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

  inputRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  input: {
    flex: 1,
    backgroundColor: INPUT_BG,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  blockBtn: {
    backgroundColor: '#F44336',
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBtnText: { color: '#fff', fontWeight: '700' },

  emptyText: { color: '#aaa', fontSize: 13, marginTop: 10 },

  blockList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  blockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2f36',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  blockChipText: { color: '#fff', fontSize: 13, marginRight: 6 },
  unblockIcon: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryBtnText: { color: '#0D1117', fontWeight: '800', fontSize: 16 },
});
