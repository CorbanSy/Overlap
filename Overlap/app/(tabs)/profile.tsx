import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// Import components
import FullProfileInfo from '../../components/FullProfileInfo';
import TabBar from '../../components/TabBar';
import SearchBar from '../../components/SearchBar';
import ActivityCard from '../../components/ActivityCard';
import CollectionCard from '../../components/CollectionCard';
import FriendCard from '../../components/FriendCard';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Liked Activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedActivities, setLikedActivities] = useState([]);

  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  // Fetch liked activities from Firestore
  useEffect(() => {
    if (user) {
      const likesRef = collection(firestore, `users/${user.uid}/likes`);
      const unsubscribe = onSnapshot(likesRef, (snapshot) => {
        const likedPlaces = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(), // Now contains name, rating, photoReference, etc.
        }));
        setLikedActivities(likedPlaces);
      });
  
      return () => unsubscribe();
    }
  }, [user]);
  

  // Dummy data for Collections & Friends (replace later if needed)
  const collections = [
    {
      id: '1',
      title: 'Poker Night Group',
      activities: [
        { id: '1a', title: 'Poker Tournament' },
        { id: '1b', title: 'Weekly Practice' },
      ],
    },
  ];

  const friends = [
    { id: '1', name: 'Friend 1' },
    { id: '2', name: 'Friend 2' },
  ];

  // Determine the data to display based on the active tab
  let data = [];
  let renderItem;
  switch (activeTab) {
    case 'Collections':
      data = collections;
      renderItem = ({ item }) => <CollectionCard collection={item} />;
      break;
    case 'Friends':
      data = friends;
      renderItem = ({ item }) => <FriendCard item={item} />;
      break;
    case 'Liked Activities':
    default:
      data = likedActivities;
      renderItem = ({ item }) => <ActivityCard item={item} />;
      break;
  }

  // Filter search results
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    data = data.filter((item) =>
      item.title.toLowerCase().includes(query)
    );
  }

  // Display a message if no liked activities exist
  const renderEmptyMessage = () => {
    if (activeTab === 'Liked Activities' && likedActivities.length === 0) {
      return (
        <View style={styles.emptyMessageContainer}>
          <Ionicons name="heart-dislike-outline" size={40} color="#aaa" />
          <Text style={styles.emptyMessageText}>
            No liked activities yet. Start exploring!
          </Text>
        </View>
      );
    }
    return null;
  };

  // List header includes the profile section, tab bar, and search bar
  const ListHeader = () => (
    <>
      <FullProfileInfo groups={[]} events={[]} />
      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyMessage}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  listContainer: { paddingHorizontal: 16, paddingVertical: 10 },

  emptyMessageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  emptyMessageText: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 10,
    textAlign: 'center',
  },
});
