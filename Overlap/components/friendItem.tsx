// friendItem.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

const FriendItem = ({ friendUid, friendData, onPress, onRemove }) => {
  const firestore = getFirestore();
  const [profile, setProfile] = useState(friendData);

  useEffect(() => {
    // If friendData was not passed in, fetch it dynamically
    if (!friendData) {
      const friendRef = doc(firestore, 'users', friendUid, 'profile', 'main');
      const unsubscribe = onSnapshot(friendRef, (docSnap) => {
        if (docSnap.exists) {
          setProfile(docSnap.data());
        }
      });
      return () => unsubscribe();
    }
  }, [friendUid, firestore, friendData]);

  if (!profile) return null;

  return (
    <View style={styles.friendItem}>
      <TouchableOpacity onPress={onPress}>
        <View>
          <Text style={styles.friendName}>
            {profile.name} {profile.username ? `(@${profile.username})` : ''}
          </Text>
          {profile.email && (
            <Text style={styles.friendEmail}>{profile.email}</Text>
          )}
          {profile.bio && (
            <Text style={styles.friendBio}>{profile.bio}</Text>
          )}
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
    alignItems: 'center' 
  },
  friendName: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold'
  },
  friendEmail: {
    color: '#DDD',
    fontSize: 14,
  },
  friendBio: {
    color: '#AAA',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: { 
    color: '#FFF', 
    fontWeight: 'bold' 
  },
});

export default FriendItem;
