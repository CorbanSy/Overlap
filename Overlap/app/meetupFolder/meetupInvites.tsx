// MeetupInvitesScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { getPendingMeetupInvites, acceptMeetupInvite, declineMeetupInvite, getMeetupData } from '../../_utils/storage';
import MeetupCard from '../../components/MeetupCard';
import { useRouter } from 'expo-router';

const MeetupInvitesScreen = () => {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const invitesData = await getPendingMeetupInvites();
        // For each invite, fetch the corresponding meetup details
        const invitesWithMeetupData = await Promise.all(
          invitesData.map(async (invite) => {
            const meetupData = await getMeetupData(invite.meetupId);
            return { ...invite, meetupData };
          })
        );
        setInvites(invitesWithMeetupData);
      } catch (error) {
        console.error('Error fetching meetup invites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvites();
  }, []);

  const handleAccept = async (inviteId: string, meetupId: string) => {
    try {
      await acceptMeetupInvite(inviteId, meetupId);
      setInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      await declineMeetupInvite(inviteId);
      setInvites(prev => prev.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Error declining invite:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meetup Invites</Text>
      {invites.length === 0 ? (
        <Text style={styles.noInvitesText}>No pending invites.</Text>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.inviteCard}>
              {/* Use MeetupCard to show the fetched meetup details */}
              <MeetupCard meetup={item.meetupData} />
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item.id, item.meetupId)}>
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineButton} onPress={() => handleDecline(item.id)}>
                  <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117', padding: 20, paddingTop: 40 },
  center: { flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
  noInvitesText: { fontSize: 16, color: '#AAAAAA', textAlign: 'center', marginTop: 20 },
  inviteCard: { marginBottom: 20, backgroundColor: '#1B1F24', padding: 10, borderRadius: 8 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  acceptButton: { backgroundColor: '#28a745', padding: 10, borderRadius: 30 },
  declineButton: { backgroundColor: '#dc3545', padding: 10, borderRadius: 30 },
  buttonText: { color: '#FFFFFF', fontSize: 16 },
  backButton: { backgroundColor: '#1B1F24', padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 20 },
});

export default MeetupInvitesScreen;
