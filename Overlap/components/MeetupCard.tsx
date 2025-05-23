// MeetupCard.tsx
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FriendCard from './FriendCard';
import CollectionCard from './CollectionCard';

interface MeetupCardProps {
  meetup: any;
  onEdit?: () => void;
  onRemove?: () => void;
  onStart?: (meetupId: string) => void;
  onStop?: (meetupId: string) => void;
}

const MeetupCard: React.FC<MeetupCardProps> = ({
  meetup,
  onEdit,
  onRemove,
  onStart,
  onStop,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    setExpanded(prev => !prev);
  };

  // Create a truncated description for the summary (if desired)
  const truncatedDescription =
    meetup.description && meetup.description.length > 100
      ? meetup.description.substring(0, 100) + '...'
      : meetup.description;

  // Format dates for display
  const formattedDate = new Date(meetup.date).toLocaleDateString();
  const formattedTime = new Date(meetup.time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedCreatedAt = meetup.createdAt
    ? new Date(meetup.createdAt).toLocaleString()
    : 'N/A';

  // Handler for the Start/Stop button.
  const handleToggleMeetup = () => {
    if (meetup.ongoing) {
      onStop && onStop(meetup.id);
    } else {
      onStart && onStart(meetup.id);
    }
  };

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={handlePress}>
      {/* Summary Info */}
      <Text style={styles.meetupName}>{meetup.eventName}</Text>
      <Text style={styles.meetupDescription}>{truncatedDescription}</Text>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>Category: {meetup.category || 'N/A'}</Text>
          {meetup.code ? (
            <Text style={styles.detailsText}>Code: {meetup.code}</Text>
          ) : null}
          <Text style={styles.detailsText}>Mood: {meetup.mood || 'N/A'}</Text>
          <Text style={styles.detailsText}>Group Size: {meetup.groupSize}</Text>
          <Text style={styles.detailsText}>Price Range: {meetup.priceRange === 0 ? 'Free' : "$".repeat(Math.ceil(meetup.priceRange / 20))} ({meetup.priceRange})</Text>
          <Text style={styles.detailsText}>Date: {formattedDate}</Text>
          <Text style={styles.detailsText}>Time: {formattedTime}</Text>
          <Text style={styles.detailsText}>Location: {meetup.location}</Text>
          <Text style={styles.detailsText}>Description: {meetup.description}</Text>
          <Text style={styles.detailsText}>Restrictions: {meetup.restrictions}</Text>
          <Text style={styles.detailsText}>Meetup ID: {meetup.meetupId}</Text>
          <Text style={styles.detailsText}>Created At: {formattedCreatedAt}</Text>
          <Text style={styles.detailsText}>Creator ID: {meetup.creatorId}</Text>
          <Text style={styles.detailsText}>
            Participants: {meetup.participants ? meetup.participants.length : 0}
          </Text>
          <Text style={styles.detailsText}>
            Invited Friends: {meetup.friends ? meetup.friends.length : 0}
          </Text>

          {/* Collections Section */}
          {meetup.collections && meetup.collections.length > 0 && (
            <View style={styles.collectionsContainer}>
              <Text style={styles.detailsSubTitle}>Collections:</Text>
              <FlatList
                data={meetup.collections}
                horizontal
                keyExtractor={(item, index) =>
                  item.id ? item.id.toString() : index.toString()
                }
                renderItem={({ item }) => (
                  <CollectionCard collection={item} previewOnly />
                )}
              />
            </View>
          )}

          {/* Friends Section */}
          {meetup.friends && meetup.friends.length > 0 ? (
            <View style={styles.friendsContainer}>
              <Text style={styles.detailsSubTitle}>Friends in this Meetup:</Text>
              <FlatList
                data={meetup.friends}
                horizontal
                keyExtractor={(item, index) =>
                  item.uid ? item.uid.toString() : index.toString()
                }
                renderItem={({ item }) => <FriendCard item={item} />}
              />
            </View>
          ) : (
            <Text style={styles.detailsText}>No friends added yet.</Text>
          )}

          <TouchableOpacity style={styles.startButton} onPress={handleToggleMeetup}>
            <Ionicons
              name="play-circle-outline"
              size={24}
              color="#FFFFFF"
              style={styles.startIcon}
            />
            <Text style={styles.startButtonText}>
              {meetup.ongoing ? 'Stop Meetup' : 'Start Meetup'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            {/* Always show edit icon */}
            <TouchableOpacity style={styles.iconButton} onPress={onEdit || (() => {})}>
              <Ionicons name="pencil-outline" size={20} color="#4DA6FF" />
            </TouchableOpacity>
            {onRemove && (
              <TouchableOpacity style={styles.iconButton} onPress={onRemove}>
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>
            )}
          </View>
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
  collectionsContainer: {
    marginBottom: 10,
  },
  friendsContainer: {
    marginBottom: 10,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#FFC107',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  startIcon: {
    marginRight: 8,
  },
  startButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  iconButton: {
    marginLeft: 10,
    padding: 6,
  },
});

export default MeetupCard;
