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

  const handleJoinByCode = () => {
    // Implement the logic for joining a meetup by code here.
    // For example, you might check if the code matches any existing meetup or send a join request.
    console.log(`Requesting to join meetup with code: ${inviteCode}`);
  };

  const renderInvite = ({ item }) => (
    <View style={styles.inviteCard}>
      <Text style={styles.inviteTitle}>{item.title || 'Meetup Invitation'}</Text>
      {item.code ? (
        <Text style={styles.inviteCode}>Code: {item.code}</Text>
      ) : (
        <Text style={styles.inviteCode}>Direct Invitation</Text>
      )}
      <TouchableOpacity 
        style={styles.joinButton} 
        onPress={() => {
          // Add join/accept logic here.
          console.log(`Joining meetup with invite ${item.code ? "code " + item.code : "direct invitation"}`);
        }}
      >
        <Text style={styles.joinButtonText}>Join</Text>
      </TouchableOpacity>
    </View>
  );
  

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Meetup Invitations</Text>
      {invites.length === 0 ? (
        <Text style={styles.emptyText}>No invitations found.</Text>
      ) : (
        <FlatList 
          data={invites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInvite}
        />
      )}

      <View style={styles.codeJoinSection}>
        <Text style={styles.codeLabel}>Or join using an invite code:</Text>
        <TextInput 
          style={styles.codeInput}
          placeholder="Enter Code"
          placeholderTextColor="#AAAAAA"
          value={inviteCode}
          onChangeText={setInviteCode}
          maxLength={6}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.joinCodeButton} onPress={handleJoinByCode}>
          <Text style={styles.joinButtonText}>Join Meetup</Text>
        </TouchableOpacity>
      </View>

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
  heading: {
    fontSize: 24,
    color: '#FFFFFF',
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
  codeJoinSection: {
    marginTop: 30,
  },
  codeLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
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
  joinCodeButton: {
    backgroundColor: '#1B1F24',
    paddingVertical: 10,
    borderRadius: 30,
    alignItems: 'center',
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
