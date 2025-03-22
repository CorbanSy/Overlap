// MyMeetupsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { getUserMeetups, removeMeetup } from './utils/storage';
import MeetupCard from '../components/MeetupCard';

const MyMeetupsScreen = ({ onBack }: { onBack: () => void }) => {
  const [meetups, setMeetups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    fetchMeetups();
  }, []);

  const handleRemoveMeetup = async (meetupId: string) => {
    try {
      await removeMeetup(meetupId);
      setMeetups(prev => prev.filter(meetup => meetup.id !== meetupId));
    } catch (error) {
      console.error('Error removing meetup:', error);
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
      <Text style={styles.title}>My Meetups</Text>
      {meetups.length === 0 ? (
        <Text style={styles.noMeetupsText}>You have no meetups.</Text>
      ) : (
        <FlatList
          data={meetups}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MeetupCard 
              meetup={item}
              onRemove={() => handleRemoveMeetup(item.id)}
            />
          )}
        />
      )}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
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
    marginBottom: 20,
    textAlign: 'center',
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
});

export default MyMeetupsScreen;
