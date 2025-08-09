import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { getUserMeetups, removeMeetup, updateMeetup, getPendingMeetupInvites } from '../../_utils/storage';
import MeetupCard from '../../components/MeetupCard';
import StartMeetupScreen from './startMeetUp'; // ✅ Use your new component!

const MyMeetupsScreen = ({ onBack }: { onBack: () => void }) => {
  const [meetups, setMeetups] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false); // ✅ Show the swiping screen
  const [currentMeetupId, setCurrentMeetupId] = useState<string | null>(null); // ✅ Track the selected meetup

  useEffect(() => {
    const fetchMeetups = async () => {
      try {
        const data = await getUserMeetups();
        setMeetups(data);
      } catch (error) {
        console.error('Error fetching meetups:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchInvites = async () => {
      try {
        const invites = await getPendingMeetupInvites();
        setPendingInvites(invites);
      } catch (error) {
        console.error('Error fetching meetup invites:', error);
      }
    };

    fetchMeetups();
    fetchInvites();
  }, []);

  const handleRemoveMeetup = async (meetupId: string) => {
    try {
      await removeMeetup(meetupId);
      setMeetups(prev => prev.filter(meetup => meetup.id !== meetupId));
    } catch (error) {
      console.error('Error removing meetup:', error);
    }
  };

  const handleStartMeetup = async (meetupId: string) => {
    try {
      await updateMeetup({ id: meetupId, ongoing: true });
      setMeetups(prev =>
        prev.map(m => (m.id === meetupId ? { ...m, ongoing: true } : m))
      );
      setCurrentMeetupId(meetupId); // ✅ Set the ID
      setShowStart(true); // ✅ Show the swiping screen
    } catch (error) {
      console.error('Error starting meetup:', error);
    }
  };

  const handleStopMeetup = async (meetupId: string) => {
    try {
      await updateMeetup({ id: meetupId, ongoing: false });
      setMeetups(prev =>
        prev.map(m => (m.id === meetupId ? { ...m, ongoing: false } : m))
      );
    } catch (error) {
      console.error('Error stopping meetup:', error);
    }
  };

  // ✅ Show the StartMeetupScreen instead if triggered
  if (showStart && currentMeetupId) {
    return (
      <StartMeetupScreen
        meetupId={currentMeetupId}
        onBack={() => {
          setShowStart(false);
          setCurrentMeetupId(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  const regularMeetups = meetups.filter(m => !m.ongoing);
  const ongoingMeetups = meetups.filter(m => m.ongoing);

  return (
    <View style={styles.container}>
      {/* Top Half: My Meetups */}
      <View style={styles.topHalf}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Meetups</Text>
        </View>
        {regularMeetups.length === 0 ? (
          <Text style={styles.noMeetupsText}>You have no meetups.</Text>
        ) : (
          <FlatList
            data={regularMeetups}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <MeetupCard 
                meetup={item}
                onRemove={() => handleRemoveMeetup(item.id)}
                onStart={handleStartMeetup}
                onStop={handleStopMeetup}
              />
            )}
          />
        )}
      </View>

      {/* Bottom Half: Ongoing Meetup Group */}
      <View style={styles.bottomHalf}>
        <Text style={styles.ongoingGroupTitle}>Ongoing Meetup Group</Text>
        {ongoingMeetups.length === 0 ? (
          <Text style={styles.ongoingGroupPlaceholder}>No ongoing meetups.</Text>
        ) : (
          <FlatList
            data={ongoingMeetups}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <MeetupCard 
                meetup={item}
                onRemove={() => handleRemoveMeetup(item.id)}
                onStart={handleStartMeetup}
                onStop={handleStopMeetup}
              />
            )}
          />
        )}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    padding: 20,
    paddingTop: 40,
  },
  topHalf: {
    flex: 1,
    paddingTop: 20,
  },
  bottomHalf: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  center: {
    flex: 1,
    backgroundColor: '#0D1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noMeetupsText: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#1B1F24',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  ongoingGroupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  ongoingGroupPlaceholder: {
    fontSize: 16,
    color: '#CCCCCC',
  },
});

export default MyMeetupsScreen;
