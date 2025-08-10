import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  getPendingMeetupInvites,
  joinMeetup,
  joinMeetupByCode,
  declineMeetup,
} from '../../_utils/storage';
import { useRouter } from 'expo-router';

const JoinMeetupsScreen = ({ onBack }: { onBack: () => void }) => {
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const router = useRouter();

  const loadInvites = useCallback(async () => {
    try {
      setLoadingInvites(true);
      const data = await getPendingMeetupInvites();
      setInvites(data);
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleAcceptInvite = async (invite: any) => {
    try {
      const meetupId = await joinMeetup(invite.id);
      // remove from local list
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      router.push({ pathname: '/meetupFolder/startMeetUp', params: { meetupId } });
    } catch (error) {
      console.error('Error joining meetup', error);
    }
  };

  const handleDeclineInvite = async (invite: any) => {
    try {
      await declineMeetup(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (error) {
      console.error('Error declining meetup invitation', error);
    }
  };

  const handleJoinByCode = async () => {
    try {
      if (!inviteCode.trim()) return;
      const { meetupId } = await joinMeetupByCode(inviteCode.trim()); // ← returns object
      router.push({ pathname: '/meetupFolder/startMeetUp', params: { meetupId } });
    } catch (error) {
      console.error('Error joining meetup by code', error);
    }
  };

  const renderInvite = ({ item }: any) => (
    <View style={styles.inviteCard}>
      <Text style={styles.inviteTitle}>{item.title || 'Meetup Invitation'}</Text>
      <Text style={styles.inviteCode}>
        {item.code ? `Code: ${item.code}` : 'Direct Invitation'}
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.joinButton} onPress={() => handleAcceptInvite(item)}>
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={() => handleDeclineInvite(item)}>
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* TOP HALF — Invites */}
      <View style={styles.topHalf}>
        <Text style={styles.heading}>Your Meetup Invitations</Text>

        <FlatList
          data={invites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInvite}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No invitations found.</Text>
          }
          contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              tintColor="#FFFFFF"
              refreshing={loadingInvites}
              onRefresh={loadInvites}
            />
          }
        />
      </View>

      {/* BOTTOM HALF — Join by code */}
      <View style={styles.bottomHalf}>
        <Text style={styles.codeLabel}>Or join using an invite code</Text>
        <TextInput
          style={styles.codeInput}
          placeholder="Enter Code"
          placeholderTextColor="#AAAAAA"
          value={inviteCode}
          onChangeText={setInviteCode}
          maxLength={6}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={handleJoinByCode}
        />
        <TouchableOpacity style={styles.joinCodeButton} onPress={handleJoinByCode}>
          <Text style={styles.joinButtonText}>Join Meetup</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default JoinMeetupsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    padding: 20,
    paddingTop: 40,
  },
  topHalf: { flex: 1, paddingBottom: 16 },
  bottomHalf: { flex: 1, justifyContent: 'flex-start' },

  heading: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 12,
  },
  inviteCard: {
    backgroundColor: '#1B1F24',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  inviteTitle: { fontSize: 18, color: '#FFFFFF', marginBottom: 4 },
  inviteCode: { fontSize: 14, color: '#CCCCCC', marginBottom: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  joinButton: {
    backgroundColor: '#2EA043',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  declineButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  joinButtonText: { color: '#FFFFFF', fontSize: 16 },

  codeLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  codeInput: {
    height: 52,
    borderColor: '#1B1F24',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    fontSize: 24,
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 14,
  },
  joinCodeButton: {
    backgroundColor: '#1B1F24',
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  backButton: {
    marginTop: 18,
    alignSelf: 'center',
    backgroundColor: '#1B1F24',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 30,
  },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
});
