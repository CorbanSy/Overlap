import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useSearchParams } from 'expo-router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FriendProfile = () => {
  // Retrieve friend UID from the route parameters (e.g., /friend-profile/[uid])
  const { uid } = useSearchParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const firestore = getFirestore();
  const auth = getAuth();

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
        {/* Optionally, you might include an email field if it's stored */}
        {profileData.email && (
          <Text style={styles.email}>{profileData.email}</Text>
        )}
        <Text style={styles.tagline}>{profileData.bio || 'No Bio'}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0D1117', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileContainer: { 
    alignItems: 'center', 
    padding: 20 
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    marginBottom: 20 
  },
  name: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFF', 
    marginBottom: 8 
  },
  email: { 
    fontSize: 16, 
    color: '#DDD', 
    marginBottom: 8 
  },
  tagline: { 
    fontSize: 16, 
    color: '#AAA' 
  },
  errorText: { 
    fontSize: 18, 
    color: '#F44336' 
  },
});

export default FriendProfile;
