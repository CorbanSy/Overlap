import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const FriendCard = ({ item }) => (
  <View style={styles.friendCard}>
    <Image source={{ uri: 'https://via.placeholder.com/40' }} style={styles.friendAvatar} />
    <Text style={styles.friendName}>{item.name}</Text>
  </View>
);

const styles = StyleSheet.create({
  friendCard: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#1B1F24', borderRadius: 8, marginBottom: 8 },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  friendName: { fontSize: 16, color: '#FFFFFF' },
});

export default FriendCard;
