import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  ScrollView 
} from 'react-native';
import { getUserMeetups } from './utils/storage'; // Ensure you implement getUserMeetups in storage.js

const MyMeetupsScreen = ({ onBack }: { onBack: () => void }) => {
  const [meetups, setMeetups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeetup, setSelectedMeetup] = useState<any>(null);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  // Detailed view for a selected meetup
  if (selectedMeetup) {
    return (
      <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContent}>
        <Text style={styles.detailsTitle}>{selectedMeetup.eventName}</Text>
        <Text style={styles.detailsText}>Mood: {selectedMeetup.mood || 'N/A'}</Text>
        <Text style={styles.detailsText}>Category: {selectedMeetup.category}</Text>
        <Text style={styles.detailsText}>Group Size: {selectedMeetup.groupSize}</Text>
        <Text style={styles.detailsText}>
          Date: {new Date(selectedMeetup.date).toLocaleDateString()}
        </Text>
        <Text style={styles.detailsText}>
          Time: {new Date(selectedMeetup.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.detailsText}>
          Price Range: {selectedMeetup.priceRange === 0 ? 'Free' : "$".repeat(Math.ceil(selectedMeetup.priceRange/20))} ({selectedMeetup.priceRange})
        </Text>
        <Text style={styles.detailsText}>Description: {selectedMeetup.description}</Text>
        <Text style={styles.detailsText}>Restrictions: {selectedMeetup.restrictions}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedMeetup(null)}>
          <Text style={styles.buttonText}>Back to List</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // List of meetups
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Meetups</Text>
      {meetups.length === 0 ? (
        <Text style={styles.noMeetupsText}>You have no meetups.</Text>
      ) : (
        <FlatList
          data={meetups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.meetupItem} 
              onPress={() => setSelectedMeetup(item)}
            >
              <Text style={styles.meetupName}>{item.eventName}</Text>
              <Text style={styles.meetupDescription}>
                {item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}
              </Text>
            </TouchableOpacity>
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
  meetupItem: {
    backgroundColor: '#1B1F24',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  meetupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  meetupDescription: {
    fontSize: 16,
    color: '#CCCCCC',
    marginTop: 5,
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
  detailsContainer: {
    flex: 1,
    backgroundColor: '#0D1117',
    padding: 20,
  },
  detailsContent: {
    paddingBottom: 40,
  },
  detailsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailsText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 10,
  },
});

export default MyMeetupsScreen;
