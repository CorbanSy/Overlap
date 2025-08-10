// friendProfile.jsx
import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export const options = {
  headerShown: false,
};

const FriendProfile = () => {
  const { uid } = useLocalSearchParams();
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const firestore = getFirestore();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch the friend's profile from 'users/{uid}/profile/main'
        const profileRef = doc(firestore, 'userDirectory', String(uid));
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const d = snap.data();
          setProfileData({
            name: d.displayName || d.emailLower || '',
            username: d.usernamePublic || '',
            email: d.emailLower || '',
            bio: d.bioPublic || '',
            avatarUrl: d.avatarUrl || '',
            topCategories: d.topCategoriesPublic || [],
          });
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            {profileData.avatarUrl ? (
              <Image source={{ uri: profileData.avatarUrl }} style={styles.avatar} />
            ) : (
              <Image source={require('../../assets/images/profile.png')} style={styles.avatar} />
            )}
          </View>
          <Text style={styles.name}>{profileData.name || 'No Name'}</Text>
          {profileData.username && (
            <Text style={styles.username}>@{profileData.username}</Text>
          )}
          {profileData.email && (
            <Text style={styles.email}>{profileData.email}</Text>
          )}
          <Text style={styles.bio}>{profileData.bio || 'No Bio available'}</Text>
          {profileData.topCategories && profileData.topCategories.length > 0 && (
            <View style={styles.categoriesContainer}>
              <Text style={styles.categoriesTitle}>Interests</Text>
              <View style={styles.categoriesList}>
                {profileData.topCategories.map((cat, index) => (
                  <Text key={index} style={styles.category}>{cat}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0D1117' 
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backButtonText: {
    color: '#FFA500',
    fontSize: 16,
  },
  profileContainer: { 
    alignItems: 'center', 
    width: '100%'
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60 
  },
  name: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFF', 
    marginBottom: 4 
  },
  username: { 
    fontSize: 18, 
    color: '#AAA', 
    marginBottom: 4 
  },
  email: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 10,
  },
  bio: { 
    fontSize: 16, 
    color: '#AAA', 
    textAlign: 'center',
    marginBottom: 20,
  },
  categoriesContainer: { 
    alignItems: 'center',
    width: '100%',
  },
  categoriesTitle: { 
    fontSize: 18, 
    color: '#FFF', 
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  category: { 
    fontSize: 16, 
    color: '#CCC', 
    marginHorizontal: 4,
  },
  errorText: { 
    fontSize: 18, 
    color: '#F44336', 
    textAlign: 'center'
  },
});

export default FriendProfile;
