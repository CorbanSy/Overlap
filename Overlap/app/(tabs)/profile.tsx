import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * FullProfileInfo renders the main profile details (avatar, name, username,
 * tagline, and an Edit Profile button) along with the user's groups & upcoming events.
 */
const FullProfileInfo = ({ groups, events }) => (
  <View style={styles.fullProfileSection}>
    <View style={styles.profileHeader}>
      <Image
        source={{ uri: 'https://via.placeholder.com/120' }}
        style={styles.avatar}
      />
      <View style={styles.profileDetails}>
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.username}>@johndoe</Text>
        <Text style={styles.tagline}>"Always up for an adventure!"</Text>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => console.log('Edit Profile')}
        >
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

/**
 * TabBar renders the three tabs.
 */
const TabBar = ({ activeTab, onTabPress }) => {
  const tabs = ['Liked Activities', 'Collections', 'Friends'];
  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, activeTab === tab && styles.activeTab]}
          onPress={() => onTabPress(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/**
 * SearchBar renders a simple TextInput with a search icon.
 */
const SearchBar = ({ searchQuery, setSearchQuery }) => (
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search..."
      placeholderTextColor="#666"
      value={searchQuery}
      onChangeText={setSearchQuery}
    />
  </View>
);

/**
 * ActivityCard is used for Liked Activities.
 */
const ActivityCard = ({ item }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <TouchableOpacity
        style={styles.removeIcon}
        onPress={() => console.log('Remove', item)}
      >
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <TouchableOpacity
        style={styles.expandIcon}
        onPress={() => console.log('Expand', item)}
      >
        <Ionicons name="chevron-down" size={24} color="#666" />
      </TouchableOpacity>
    </View>
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => console.log('Add to collection', item)}
      >
        <Text style={styles.buttonText}>Add to a Collection</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * FriendCard renders each friend item.
 */
const FriendCard = ({ item }) => (
  <View style={styles.friendCard}>
    <TouchableOpacity
      style={styles.removeIcon}
      onPress={() => console.log('Remove friend', item)}
    >
      <Ionicons name="close" size={18} color="#fff" />
    </TouchableOpacity>
    <Image
      source={{ uri: 'https://via.placeholder.com/40' }}
      style={styles.friendAvatar}
    />
    <Text style={styles.friendName}>{item.name}</Text>
  </View>
);

/**
 * CollectionActivityItem renders an activity inside a collection.
 * It can be expanded to show two action buttons.
 */
const CollectionActivityItem = ({ activity }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.collectionActivityCard}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { textAlign: 'left', flex: 1 }]}>
          {activity.title}
        </Text>
        <TouchableOpacity
          style={styles.expandIcon}
          onPress={() => setExpanded(!expanded)}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>
      {expanded && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => console.log('Remove from collection', activity)}
          >
            <Text style={styles.buttonText}>Remove from Collection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => console.log('Remove totally', activity)}
          >
            <Text style={styles.buttonText}>Remove Totally</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/**
 * CollectionCard renders a collection item.
 * When expanded it shows its list of activities.
 */
const CollectionCard = ({ collection }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.removeIcon}
          onPress={() => console.log('Remove collection', collection)}
        >
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.cardTitle}>{collection.title}</Text>
        <TouchableOpacity
          style={styles.expandIcon}
          onPress={() => setExpanded(!expanded)}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>
      </View>
      {expanded && (
        <View style={styles.collectionActivitiesContainer}>
          {collection.activities.map((activity) => (
            <CollectionActivityItem key={activity.id} activity={activity} />
          ))}
        </View>
      )}
    </View>
  );
};

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Liked Activities');
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy data for the tab content
  const likedActivities = [
    { id: '1', title: 'Museum Visit' },
    { id: '2', title: 'Hiking' },
    { id: '3', title: 'Cooking' },
  ];

  const collections = [
    {
      id: '1',
      title: 'Poker Night Group',
      activities: [
        { id: '1a', title: 'Poker Tournament' },
        { id: '1b', title: 'Weekly Practice' },
      ],
    },
    {
      id: '2',
      title: 'Hiking Saturdays',
      activities: [
        { id: '2a', title: 'Mountain Hike' },
        { id: '2b', title: 'Trail Cleanup' },
      ],
    },
    {
      id: '3',
      title: 'Biology 201 Group',
      activities: [
        { id: '3a', title: 'Lab Session' },
        { id: '3b', title: 'Field Study' },
      ],
    },
  ];

  const friends = [
    { id: '1', name: 'Friend 1' },
    { id: '2', name: 'Friend 2' },
    { id: '3', name: 'Friend 3' },
    { id: '4', name: 'Friend 4' },
    { id: '5', name: 'Friend 5' },
    { id: '6', name: 'Friend 6' },
    { id: '7', name: 'Friend 7' },
  ];

  // Dummy data for Groups & Upcoming Events
  const dummyGroups = [
    { id: '1', title: 'Weekend Hikers' },
    { id: '2', title: 'Foodie Friends' },
  ];
  const dummyEvents = [{ id: '3', title: 'BBQ at Central Park' }];

  // Determine the data and renderItem function based on the active tab.
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

  // Filter the data based on the search query.
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    data = data.filter((item) => {
      if (activeTab === 'Friends') {
        return item.name.toLowerCase().includes(query);
      } else {
        return item.title.toLowerCase().includes(query);
      }
    });
  }

  // ListHeaderComponent includes the full profile info, TabBar, and SearchBar.
  const ListHeader = () => (
    <>
      <FullProfileInfo groups={dummyGroups} events={dummyEvents} />
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
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },

  // Full Profile Section
  fullProfileSection: {
    padding: 16,
    marginBottom: 24,
    backgroundColor: '#0D1117',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#F5A623',
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  username: {
    fontSize: 16,
    color: '#DDDDDD', // Brighter for better readability
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#DDDDDD', // Lighter for contrast
    marginBottom: 8,
  },
  editProfileButton: {
    backgroundColor: '#FFFFFF', // White buttons
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  editProfileButtonText: {
    color: '#0D1117', // Dark text for contrast
    fontWeight: 'bold',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: '#1B1F24',
    borderBottomWidth: 1, // Added border for depth
    borderBottomColor: '#333333',
  },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { backgroundColor: '#F5A623' },
  tabText: { fontSize: 16, color: '#DDDDDD' },
  activeTabText: { color: '#0D1117', fontWeight: 'bold' },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22272E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
    color: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#0D1117',
  },

  // List Container
  listContainer: { paddingHorizontal: 16, paddingVertical: 10 },

  // Card Styles (Used for ActivityCard, CollectionCard, etc.)
  card: {
    backgroundColor: '#1B1F24',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1, // Adds subtle contrast
    borderColor: '#2A2F36',
    shadowColor: '#000', // Adds depth
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  expandIcon: { padding: 4 },
  removeIcon: {
    backgroundColor: '#F5A623',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ✅ White Buttons for Better Visibility
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#FFFFFF', // White buttons
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#0D1117', // Dark text for contrast
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Friends List
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1B1F24',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1, // Adds contrast
    borderColor: '#2A2F36',
  },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, marginLeft: 10 },
  friendName: { fontSize: 16, color: '#FFFFFF', marginLeft: 10 },

  // Collection Activities
  collectionActivitiesContainer: {
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#AAAAAA',
  },
  collectionActivityCard: {
    backgroundColor: '#22272E',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
});


