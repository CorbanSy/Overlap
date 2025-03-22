// MeetupCard.tsx
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

interface MeetupCardProps {
  meetup: any;
  onEdit?: () => void;
  onRemove?: () => void;
}

const MeetupCard: React.FC<MeetupCardProps> = ({ meetup, onEdit, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const handlePress = () => {
    setExpanded(prev => !prev);
  };

  const truncatedDescription =
    meetup.description.length > 100
      ? meetup.description.substring(0, 100) + '...'
      : meetup.description;

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={handlePress}>
      {/* Summary Info */}
      <Text style={styles.meetupName}>{meetup.eventName}</Text>
      <Text style={styles.meetupDescription}>{truncatedDescription}</Text>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>Mood: {meetup.mood || 'N/A'}</Text>
          <Text style={styles.detailsText}>Category: {meetup.category}</Text>
          <Text style={styles.detailsText}>Group Size: {meetup.groupSize}</Text>
          <Text style={styles.detailsText}>
            Date: {new Date(meetup.date).toLocaleDateString()}
          </Text>
          <Text style={styles.detailsText}>
            Time: {new Date(meetup.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.detailsText}>
            Price Range: {meetup.priceRange === 0 ? 'Free' : "$".repeat(Math.ceil(meetup.priceRange / 20))} ({meetup.priceRange})
          </Text>
          <Text style={styles.detailsText}>Description: {meetup.description}</Text>
          <Text style={styles.detailsText}>Restrictions: {meetup.restrictions}</Text>
          
          <Text style={styles.detailsSubTitle}>Friends in this Meetup:</Text>
          {meetup.friends && meetup.friends.length > 0 ? (
            meetup.friends.map((friend: any) => (
              <Text key={friend.id} style={styles.friendText}>{friend.name}</Text>
            ))
          ) : (
            <Text style={styles.detailsText}>No friends added yet.</Text>
          )}

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/startMeetUp')}
          >
            <Text style={styles.buttonText}>Start Meetup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Text style={styles.buttonText}>Edit Meetup</Text>
          </TouchableOpacity>
          {onRemove && (
            <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
              <Text style={styles.buttonText}>Remove Meetup</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
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
  detailsContainer: {
    marginTop: 10,
    backgroundColor: '#0D1117',
    padding: 10,
    borderRadius: 8,
  },
  detailsText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  detailsSubTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 5,
  },
  friendText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginLeft: 10,
    marginBottom: 5,
  },
  startButton: {
    backgroundColor: '#FFC107',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#2D7DD2',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  removeButton: {
    backgroundColor: '#DC3545',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default MeetupCard;
