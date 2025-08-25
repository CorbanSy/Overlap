// components/MeetupParticipants.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../FirebaseConfig';

interface Participant {
  userId: string;
  displayName?: string;
  photoURL?: string;
}

interface MeetupParticipantsProps {
  meetupId: string;
  maxVisible?: number; // Max avatars to show before showing "+X"
}

const COLORS = {
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  border: '#30363D',
} as const;

const MeetupParticipants: React.FC<MeetupParticipantsProps> = ({ 
  meetupId, 
  maxVisible = 5 
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetupId) return;

    // Listen to swipes collection to detect active participants
    const swipesRef = collection(db, 'meetups', meetupId, 'swipes');
    
    const unsubscribe = onSnapshot(swipesRef, async (snapshot) => {
      try {
        // Get unique user IDs from swipes
        const userIds = new Set<string>();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId) {
            userIds.add(data.userId);
          }
        });

        // Fetch user details for each unique user ID
        const participantPromises = Array.from(userIds).map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                userId,
                displayName: userData.displayName || userData.name || 'Unknown',
                photoURL: userData.photoURL || userData.profilePicture,
              };
            }
            return {
              userId,
              displayName: 'Unknown',
              photoURL: null,
            };
          } catch (error) {
            console.error('Error fetching user data for', userId, error);
            return {
              userId,
              displayName: 'Unknown', 
              photoURL: null,
            };
          }
        });

        const participantsData = await Promise.all(participantPromises);
        setParticipants(participantsData);
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [meetupId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.accent} />
      </View>
    );
  }

  if (participants.length === 0) {
    return null; // Don't show anything if no participants
  }

  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = Math.max(0, participants.length - maxVisible);

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {visibleParticipants.map((participant, index) => (
          <View
            key={participant.userId}
            style={[
              styles.avatar,
              { 
                zIndex: visibleParticipants.length - index,
                marginLeft: index > 0 ? -12 : 0, // Overlap by 12px
              }
            ]}
          >
            {participant.photoURL ? (
              <Image
                source={{ uri: participant.photoURL }}
                style={styles.avatarImage}
                defaultSource={require('../assets/images/profile.png')} // Add a default avatar
              />
            ) : (
              <View style={styles.defaultAvatar}>
                <Text style={styles.avatarInitials}>
                  {participant.displayName?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        ))}
        
        {remainingCount > 0 && (
          <View style={[styles.avatar, styles.countBadge, { marginLeft: -12, zIndex: 0 }]}>
            <Text style={styles.countText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.participantCount}>
        {participants.length} participant{participants.length !== 1 ? 's' : ''} active
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.accent,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: COLORS.border,
  },
  countText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  participantCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MeetupParticipants;