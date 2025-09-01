
// components/profile_components/CollectionParticipants.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';

interface Participant {
  userId: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
}

interface CollectionParticipantsProps {
  members: { [key: string]: any };
  maxVisible?: number;
  onPress?: () => void;
}

const COLORS = {
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  border: '#30363D',
} as const;

const CollectionParticipants: React.FC<CollectionParticipantsProps> = ({ 
  members, 
  maxVisible = 3,
  onPress 
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!members || Object.keys(members).length === 0) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    const fetchParticipants = async () => {
      try {
        const memberIds = Object.keys(members);
        
        const participantPromises = memberIds.map(async (userId: string): Promise<Participant> => {
          try {
            const memberData = members[userId];
            
            // Try to get fresh user data, but fallback to stored member data
            let displayName = memberData.displayName || 'Unknown';
            let avatarUrl = memberData.avatarUrl || '';

            try {
              // 1) userDirectory - most up-to-date
              const userDirSnap = await getDoc(doc(db, 'userDirectory', userId));
              const fromDir = userDirSnap.exists() ? userDirSnap.data() : null;

              // 2) users/{uid}/profile/main
              const profSnap = await getDoc(doc(db, 'users', userId, 'profile', 'main'));
              const fromProf = profSnap.exists() ? profSnap.data() : null;

              // Use fresh data if available, otherwise use stored member data
              displayName = fromDir?.displayName || fromProf?.name || memberData.displayName || 'Unknown';
              avatarUrl = fromDir?.avatarUrl || fromProf?.avatarUrl || memberData.avatarUrl || '';
            } catch (fetchError) {
              // If we can't fetch fresh data, use what's stored in members
              console.log('Using stored member data for', userId);
            }

            return {
              userId,
              displayName,
              photoURL: avatarUrl || undefined,
              role: memberData.role
            };
          } catch (e) {
            console.error('Error processing member data for', userId, e);
            return { 
              userId, 
              displayName: 'Unknown', 
              photoURL: undefined, 
              role: members[userId]?.role 
            };
          }
        });

        const participantsData = await Promise.all(participantPromises);
        
        // Sort so owner appears first
        participantsData.sort((a, b) => {
          if (a.role === 'owner') return -1;
          if (b.role === 'owner') return 1;
          return 0;
        });
        
        setParticipants(participantsData);
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [members]);

  if (loading || participants.length === 0) return null;

  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = Math.max(0, participants.length - maxVisible);

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.avatarContainer}>
        {visibleParticipants.map((participant, index) => (
          <View
            key={participant.userId}
            style={[
              styles.avatar,
              { 
                zIndex: visibleParticipants.length - index, 
                marginLeft: index > 0 ? -6 : 0 
              },
              participant.role === 'owner' && styles.ownerBorder
            ]}
          >
            {participant.photoURL ? (
              <Image
                source={{ uri: participant.photoURL }}
                style={styles.avatarImage}
                onError={() => {
                  setParticipants(prev =>
                    prev.map(p => (p.userId === participant.userId ? { ...p, photoURL: undefined } : p))
                  );
                }}
              />
            ) : (
              <View style={[
                styles.defaultAvatar,
                participant.role === 'owner' && styles.ownerAvatar
              ]}>
                <Text style={styles.avatarInitials}>
                  {participant.displayName?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        ))}

        {remainingCount > 0 && (
          <View style={[styles.avatar, styles.countBadge, { marginLeft: -6, zIndex: 0 }]}>
            <Text style={styles.countText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { 
    alignItems: 'center', 
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  avatarContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  ownerBorder: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  avatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 10 
  },
  defaultAvatar: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: COLORS.textSecondary, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  ownerAvatar: {
    backgroundColor: COLORS.accent,
  },
  avatarInitials: { 
    color: '#000', 
    fontSize: 10, 
    fontWeight: '700' 
  },
  countBadge: { 
    backgroundColor: COLORS.surface, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderColor: COLORS.border 
  },
  countText: { 
    color: COLORS.text, 
    fontSize: 9, 
    fontWeight: '600' 
  },
});

export default CollectionParticipants;