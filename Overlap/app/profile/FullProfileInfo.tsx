import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getProfileData, saveProfileData } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

// Module-level variable to persist profile data between mounts
let persistentProfile: any = null;

// Helper function to convert URI to Blob using XMLHttpRequest
const uriToBlob = (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!uri) {
      reject(new Error("Empty URI"));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

const FullProfileInfo = () => {
  const [profile, setProfile] = useState<any>(persistentProfile);
  const [uploading, setUploading] = useState(false);
  const auth = getAuth();

  const fetchProfile = async () => {
    try {
      const data = await getProfileData();
      if (data) {
        setProfile(data);
        persistentProfile = data; // update persistent cache
      }
    } catch (error) {
      console.error("Error fetching profile data", error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Permission is required to access your media library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      console.log("Picked image URI:", uri);
      uploadImage(uri);
    } else {
      console.log("Image picker canceled or no URI returned");
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      console.log("Converting URI to blob:", uri);
      const blob = await uriToBlob(uri);
      console.log("Blob created");

      const user = auth.currentUser;
      if (!user) throw new Error('No user is signed in');

      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${user.uid}`);

      console.log("Uploading blob to Firebase Storage...");
      await uploadBytes(storageRef, blob);
      console.log("Blob uploaded successfully");

      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL received:", downloadURL);

      const updatedProfile = {
        topCategories: profile?.topCategories || [],
        name: profile?.name || '',
        bio: profile?.bio || '',
        avatarUrl: downloadURL,
        email: profile?.email || '',
        username: profile?.username || '',
      };

      await saveProfileData(updatedProfile);
      setProfile(updatedProfile);
      persistentProfile = updatedProfile; // update persistent cache
    } catch (error) {
      console.error("Error uploading image", error);
      Alert.alert("Upload Error", "There was an error uploading your image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Determine which avatar to use
  const avatarSource =
    profile && profile.avatarUrl
      ? { uri: profile.avatarUrl }
      : persistentProfile && persistentProfile.avatarUrl
      ? { uri: persistentProfile.avatarUrl }
      : require('../../assets/images/profile.png');

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image source={avatarSource} style={styles.avatar} />
        <TouchableOpacity style={styles.plusContainer} onPress={pickImage}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.name}>{profile?.name || 'User Name'}</Text>
      <Text style={styles.bio}>{profile?.bio || 'User bio goes here.'}</Text>
      {uploading && <ActivityIndicator style={styles.loadingIndicator} color="#FFF" />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 20 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ccc' },
  plusContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFA500',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { marginTop: 10, fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  bio: { fontSize: 14, color: '#AAA', textAlign: 'center', marginVertical: 5 },
  loadingIndicator: { marginTop: 10 },
});

export default FullProfileInfo;
