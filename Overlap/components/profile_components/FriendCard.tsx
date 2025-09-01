//components/FriendCard.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface FriendCardProps {
  item: {
    uid?: string;
    userId?: string;
    name?: string;
    displayName?: string;
    email?: string;
    profilePicUrl?: string;
    avatarUrl?: string;
    photoURL?: string;
  };
}

const FriendCard: React.FC<FriendCardProps> = ({ item }) => {
  // Handle multiple possible avatar field names
  const avatarUri = item.profilePicUrl || item.avatarUrl || item.photoURL;
  
  // Handle multiple possible name field names
  const displayName = item.name || item.displayName || item.username || item.email?.split('@')[0] || 'Friend';
  
  return (
    <View style={styles.friendCard}>
      <Image 
        source={
          avatarUri 
            ? { uri: avatarUri }
            : require('../../assets/images/profile.png')
        }
        style={styles.friendAvatar} 
        defaultSource={require('../../assets/images/profile.png')}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName} numberOfLines={1}>
          {displayName}
        </Text>
        {item.email && (
          <Text style={styles.friendEmail} numberOfLines={1}>
            {item.email}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  friendCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
  },
  friendAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12,
    backgroundColor: '#2A2A2A',
  },
  friendInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  friendName: { 
    fontSize: 16, 
    color: '#FFFFFF',
    fontWeight: '600',
  },
  friendEmail: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});

export default FriendCard;