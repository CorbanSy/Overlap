// ProfileScreen.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  // Dummy data for illustration purposes
  const dummyPreferences = ['Dining', 'Outdoors', 'Movies'];
  const dummyGroups = [
    { id: '1', title: 'Weekend Hikers' },
    { id: '2', title: 'Foodie Friends' },
  ];
  const dummyEvents = [{ id: '3', title: 'BBQ at Central Park' }];
  const dummyActivityHistory = [
    { id: '1', title: 'Museum Visit', image: 'https://via.placeholder.com/150' },
    { id: '2', title: 'Hiking', image: 'https://via.placeholder.com/150' },
    { id: '3', title: 'Movie Night', image: 'https://via.placeholder.com/150' },
  ];

  const renderActivityCard = ({ item }: { item: any }) => (
    <View style={styles.activityCard}>
      <Image source={{ uri: item.image }} style={styles.activityImage} />
      <Text style={styles.activityTitle}>{item.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Profile Information */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: 'https://via.placeholder.com/120' }} // Replace with the actual avatar URL
            style={styles.avatar}
          />
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.username}>@johndoe</Text>
          <Text style={styles.tagline}>"Always up for an adventure!"</Text>
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Preferences / Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Preferences / Interests</Text>
          <View style={styles.chipsContainer}>
            {dummyPreferences.map((pref, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{pref}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.updatePreferencesButton}>
            <Text style={styles.updatePreferencesButtonText}>Update Preferences</Text>
          </TouchableOpacity>
        </View>

        {/* Groups & Upcoming Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Groups & Upcoming Events</Text>
          {dummyGroups.map((group) => (
            <Text key={group.id} style={styles.listItem}>
              - Group: {group.title}
            </Text>
          ))}
          {dummyEvents.map((event) => (
            <Text key={event.id} style={styles.listItem}>
              - Event: {event.title}
            </Text>
          ))}
        </View>

        {/* Activity History / Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity History / Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Planned</Text>
            </View>
          </View>
          <Text style={styles.subSectionTitle}>Past Activities</Text>
          <FlatList
            data={dummyActivityHistory}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={renderActivityCard}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Plan New Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Invite Friends</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerButton: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  contentContainer: { padding: 16 },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#333',
  },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  username: { fontSize: 16, color: '#888', marginBottom: 10 },
  tagline: { fontSize: 16, fontStyle: 'italic', color: '#555', marginBottom: 10 },
  editProfileButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  editProfileButtonText: { color: '#fff', fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: {
    backgroundColor: '#eee',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: '#333' },
  updatePreferencesButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  updatePreferencesButtonText: { color: '#fff', fontWeight: 'bold' },
  listItem: { fontSize: 16, color: '#555', marginBottom: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: '#888' },
  subSectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#333' },
  activityCard: { width: 150, marginRight: 10 },
  activityImage: { width: '100%', height: 100, borderRadius: 8 },
  activityTitle: { marginTop: 4, fontSize: 14, textAlign: 'center', color: '#333' },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  actionButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonText: { color: '#0D1117', fontWeight: 'bold', fontSize: 16 },
});
