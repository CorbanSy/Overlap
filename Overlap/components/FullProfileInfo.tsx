import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const FullProfileInfo = () => (
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

const styles = StyleSheet.create({
  fullProfileSection: { padding: 16, backgroundColor: '#0D1117' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#F5A623' },
  profileDetails: { marginLeft: 16, flex: 1 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  username: { fontSize: 16, color: '#DDDDDD', marginBottom: 8 },
  tagline: { fontSize: 16, fontStyle: 'italic', color: '#DDDDDD', marginBottom: 8 },
  editProfileButton: { backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  editProfileButtonText: { color: '#0D1117', fontWeight: 'bold' },
});

export default FullProfileInfo;
