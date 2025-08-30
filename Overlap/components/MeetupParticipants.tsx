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
  maxVisible?: number;
}

const COLORS = {
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  border: '#30363D',
} as const;

const MeetupParticipants: React.FC<MeetupParticipantsProps> = ({ meetupId, maxVisible = 5 }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetupId) return;

    const meetupRef = doc(db, 'meetups', meetupId);

    const unsubscribe = onSnapshot(meetupRef, async (meetupDoc) => {
      try {
        if (!meetupDoc.exists()) {
          setParticipants([]);
          setLoading(false);
          return;
        }

        const meetupData = meetupDoc.data();
        const participantIds: string[] = meetupData.participants || [];

        if (participantIds.length === 0) {
          setParticipants([]);
          setLoading(false);
          return;
        }

        const participantPromises = participantIds.map(async (userId: string): Promise<Participant> => {
          try {
            // 1) userDirectory
            const userDirSnap = await getDoc(doc(db, 'userDirectory', userId));
            const fromDir = userDirSnap.exists() ? userDirSnap.data() : null;

            // 2) users/{uid}/profile/main (where you saveProfileData)
            const profSnap = await getDoc(doc(db, 'users', userId, 'profile', 'main'));
            const fromProf = profSnap.exists() ? profSnap.data() : null;

            // 3) legacy: users/{uid} root (rarely used in your app now)
            const rootSnap = await getDoc(doc(db, 'users', userId));
            const fromRoot = rootSnap.exists() ? rootSnap.data() : null;

            const displayName =
              fromDir?.displayName ||
              fromProf?.name ||
              fromProf?.username ||
              fromRoot?.displayName ||
              fromRoot?.name ||
              'Unknown';

            // Prefer the first non-empty URL: directory -> profile.main -> legacy root
            const avatarUrl =
              (fromDir?.avatarUrl && String(fromDir.avatarUrl).trim()) ||
              (fromProf?.avatarUrl && String(fromProf.avatarUrl).trim()) ||
              (fromRoot?.avatarUrl && String(fromRoot.avatarUrl).trim()) ||
              (fromRoot?.profilePicture && String(fromRoot.profilePicture).trim()) ||
              (fromRoot?.photoURL && String(fromRoot.photoURL).trim()) ||
              '';

            return {
              userId,
              displayName,
              photoURL: avatarUrl || undefined,
            };
          } catch (e) {
            console.error('Error fetching user data for', userId, e);
            return { userId, displayName: 'Unknown', photoURL: undefined };
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

  if (participants.length === 0) return null;

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
              { zIndex: visibleParticipants.length - index, marginLeft: index > 0 ? -8 : 0 },
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
  container: { alignItems: 'center', paddingVertical: 4 },
  avatarContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 14 },
  defaultAvatar: { width: '100%', height: '100%', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: '#000', fontSize: 12, fontWeight: '700' },
  countBadge: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderColor: COLORS.border },
  countText: { color: COLORS.text, fontSize: 10, fontWeight: '600' },
  participantCount: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },
});

export default MeetupParticipants;
