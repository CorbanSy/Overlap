// components/MeetupParticipants.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
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

    // Listen to the meetup document to get participants
    const meetupRef = doc(db, 'meetups', meetupId);
    
    const unsubscribe = onSnapshot(meetupRef, async (meetupDoc) => {
      try {
        if (!meetupDoc.exists()) {
          setLoading(false);
          return;
        }
        
        const meetupData = meetupDoc.data();
        const participantIds = meetupData.participants || [];

        if (participantIds.length === 0) {
          setParticipants([]);
          setLoading(false);
          return;
        }

        // Fetch user details for each participant
        const participantPromises = participantIds.map(async (userId: string): Promise<Participant> => {
          try {
            // Try userDirectory first (public profiles)
            const userDirDoc = await getDoc(doc(db, 'userDirectory', userId));
            if (userDirDoc.exists()) {
              const userData = userDirDoc.data();
              return {
                userId,
                displayName: userData.displayName || userData.usernamePublic || 'Unknown',
                photoURL: userData.avatarUrl && userData.avatarUrl.trim() !== '' 
                  ? userData.avatarUrl 
                  : undefined,
              };
            }
            
            // Fallback to users collection if userDirectory doesn't exist
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                userId,
                displayName: userData.displayName || userData.name || 'Unknown',
                photoURL: userData.photoURL || userData.profilePicture || undefined,
              };
            }
            
            return {
              userId,
              displayName: 'Unknown',
              photoURL: undefined,
            };
          } catch (error) {
            console.error('Error fetching user data for', userId, error);
            return {
              userId,
              displayName: 'Unknown',
              photoURL: undefined,
            };
          }
        });

        const participantsData = await Promise.all(participantPromises);
        setParticipants(participantsData); // All results are guaranteed to be Participant objects
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
                marginLeft: index > 0 ? -8 : 0, // Reduced overlap for better visibility
              }
            ]}
          >
            {participant.photoURL ? (
              <Image
                source={{ uri: participant.photoURL }}
                style={styles.avatarImage}
                onError={() => {
                  // Handle image load errors by setting photoURL to undefined
                  setParticipants(prev => 
                    prev.map(p => 
                      p.userId === participant.userId 
                        ? { ...p, photoURL: undefined }
                        : p
                    )
                  );
                }}
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
          <View style={[styles.avatar, styles.countBadge, { marginLeft: -8, zIndex: 0 }]}>
            <Text style={styles.countText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.participantCount}>
        {participants.length} participant{participants.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4, // Reduced padding
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2, // Reduced margin
  },
  avatar: {
    width: 32, // Slightly smaller avatars
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
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
    fontSize: 12, // Smaller font for smaller avatars
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
    fontSize: 10, // Smaller font
    fontWeight: '600',
  },
  participantCount: {
    color: COLORS.textSecondary,
    fontSize: 11, // Smaller font
    fontWeight: '500',
  },
});

export default MeetupParticipants;