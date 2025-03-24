// friendProfile.jsx (unchanged, now correctly displays username & email)
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useSearchParams } from 'expo-router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FriendProfile = () => {
  const { uid } = useSearchParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const firestore = getFirestore();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileRef = doc(firestore, 'users', uid, 'profile', 'main');
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          setProfileData(snap.data());
        } else {
          console.error("No profile data found for this user.");
        }
      } catch (error) {
        console.error("Error fetching friend's profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (uid) {
      fetchProfile();
    }
  }, [uid, firestore]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FFA500" />
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Profile not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileContainer}>
        {profileData.avatarUrl ? (
          <Image source={{ uri: profileData.avatarUrl }} style={styles.avatar} />
        ) : (
          <Image source={require('../../assets/images/profile.png')} style={styles.avatar} />
        )}
        <Text style={styles.name}>{profileData.name || 'No Name'}</Text>
        {profileData.username && (
          <Text style={styles.username}>@{profileData.username}</Text>
        )}
        {profileData.email && (
          <Text style={styles.email}>{profileData.email}</Text>
        )}
        <Text style={styles.tagline}>{profileData.bio || 'No Bio available'}</Text>
        {profileData.topCategories && profileData.topCategories.length > 0 && (
          <View style={styles.categoriesContainer}>
            <Text style={styles.categoriesTitle}>Interests:</Text>
            {profileData.topCategories.map((cat, index) => (
              <Text key={index} style={styles.category}>{cat}</Text>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' },
  profileContainer: { alignItems: 'center', padding: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  username: { fontSize: 18, color: '#AAA', marginBottom: 8 },
  email: { fontSize: 16, color: '#DDD', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#AAA' },
  categoriesContainer: { marginTop: 15, alignItems: 'center' },
  categoriesTitle: { fontSize: 18, color: '#FFF', fontWeight: 'bold', marginBottom: 5 },
  category: { fontSize: 16, color: '#CCC' },
  errorText: { fontSize: 18, color: '#F44336' },
});

export default FriendProfile;
