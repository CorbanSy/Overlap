import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { getPendingMeetupInvites } from '../utils/storage';
import { useRouter } from 'expo-router';

const JoinMeetupsScreen = () => {
  const [invites, setInvites] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const data = await getPendingMeetupInvites();
        setInvites(data);
      } catch (error) {
        console.error('Error fetching invites:', error);
      }
    };

    fetchInvites();
  }, []);

  // Filter invites based on the inviteCode input
  const filteredInvites = inviteCode
    ? invites.filter(invite =>
        invite.code.toLowerCase().includes(inviteCode.toLowerCase())
      )
    : invites;

  const renderInvite = ({ item }) => (
    <View style={styles.inviteCard}>
      <Text style={styles.inviteTitle}>{item.title || 'Meetup Invitation'}</Text>
      <Text style={styles.inviteCode}>Code: {item.code}</Text>
      <TouchableOpacity 
        style={styles.joinButton} 
        onPress={() => {
          // Add join/accept logic here.
          console.log(`Joining meetup with invite code ${item.code}`);
        }}
      >
        <Text style={styles.joinButtonText}>Join</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput 
        style={styles.codeInput}
        placeholder="______"
        placeholderTextColor="#AAAAAA"
        value={inviteCode}
        onChangeText={setInviteCode}
        maxLength={6}
        keyboardType="numeric"
      />
      {filteredInvites.length === 0 ? (
        <Text style={styles.emptyText}>No invitations found.</Text>
      ) : (
        <FlatList 
          data={filteredInvites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInvite}
        />
      )}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
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
  codeInput: {
    height: 50,
    borderColor: '#1B1F24',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    fontSize: 24,
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 20,
  },
  inviteCard: {
    backgroundColor: '#1B1F24',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  inviteTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  inviteCode: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 10,
  },
  joinButton: {
    backgroundColor: '#1B1F24',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
    alignSelf: 'center',
    backgroundColor: '#1B1F24',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
