// friendItem.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

type FriendPublic = {
  name?: string;
  username?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  topCategories?: string[];
};

const FriendItem = ({
  friendUid,
  friendData,
  onPress,
  onRemove,
}: {
  friendUid: string;
  friendData?: FriendPublic | null;
  onPress: () => void;
  onRemove: () => void;
}) => {
  const firestore = getFirestore();
  const [profile, setProfile] = useState<FriendPublic | null>(friendData || null);

  useEffect(() => {
    // If parent already passed data, don't fetch.
    if (friendData) return;

    const ref = doc(firestore, 'userDirectory', friendUid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setProfile({
          name: d.displayName || d.emailLower || friendUid,
          username: d.usernamePublic || '',
          email: d.emailLower || '',
          bio: d.bioPublic || '',
          avatarUrl: d.avatarUrl || '',
          topCategories: Array.isArray(d.topCategoriesPublic) ? d.topCategoriesPublic : [],
        });
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, [friendUid, firestore, friendData]);

  if (!profile) return null;

  return (
    <View style={styles.friendItem}>
      <TouchableOpacity onPress={onPress}>
        <View>
          <Text style={styles.friendName}>
            {profile.name} {profile.username ? `(@${profile.username})` : ''}
          </Text>
          {!!profile.email && <Text style={styles.friendEmail}>{profile.email}</Text>}
          {!!profile.bio && <Text style={styles.friendBio}>{profile.bio}</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  friendItem: {
    backgroundColor: '#272B30',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  friendEmail: { color: '#DDD', fontSize: 14 },
  friendBio: { color: '#AAA', fontSize: 14 },
  removeButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: { color: '#FFF', fontWeight: 'bold' },
});

export default FriendItem;
