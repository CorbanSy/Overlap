// FullProfileInfo.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getProfileData, saveProfileData } from '../../_utils/storage/userProfile';
import { useIsFocused } from '@react-navigation/native';

export const options = {
  headerShown: false,
};

// Persistent cache across mounts
let persistentProfile: any = null;

const uriToBlob = (uri: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    if (!uri) return reject(new Error('Empty URI'));
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

const FullProfileInfo = () => {
  const [profile, setProfile] = useState<any>(persistentProfile);
  const [uploading, setUploading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const isFocused = useIsFocused();
  const auth = getAuth();

  // Shared fetch logic
  const fetchProfile = async () => {
    try {
      const data = await getProfileData();
      if (data) {
        setProfile(data);
        persistentProfile = data;
      }
    } catch (err) {
      console.error('Error fetching profile', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProfile();
  }, []);

  // Re-fetch on focus
  useEffect(() => {
    if (isFocused) {
      fetchProfile();
    }
  }, [isFocused]);

  // Pick and upload new avatar
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission required', 'We need photo access to update your avatar.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const blob = await uriToBlob(uri);
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');

      const storage = getStorage();
      const avatarRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(avatarRef, blob);
      const downloadURL = await getDownloadURL(avatarRef);

      const updated = {
        topCategories: profile?.topCategories || [],
        name:          profile?.name          || '',
        bio:           profile?.bio           || '',
        avatarUrl:     downloadURL,
        email:         profile?.email         || '',
        username:      profile?.username      || '',
      };

      await saveProfileData(updated);
      setProfile(updated);
      persistentProfile = updated;
    } catch (err) {
      console.error('Upload error', err);
      Alert.alert('Upload failed', 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Fallback avatar
  const avatarSource = profile?.avatarUrl
    ? { uri: profile.avatarUrl }
    : persistentProfile?.avatarUrl
    ? { uri: persistentProfile.avatarUrl }
    : require('../../assets/images/profile.png');

  return (
    <View style={styles.container}>
      {/* Avatar + “lightbox” */}
      <TouchableOpacity onPress={() => setViewerVisible(true)}>
        <View style={styles.avatarContainer}>
          <Image source={avatarSource} style={styles.avatar} />
          <TouchableOpacity style={styles.plusContainer} onPress={pickImage}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Full-screen modal */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setViewerVisible(false)}>
          <View style={styles.modalBackground}>
            <Image source={avatarSource} style={styles.modalImage} />
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Profile text */}
      <Text style={styles.name}>{profile?.name || 'Your Name'}</Text>
      <Text style={styles.username}>
        {profile?.username ? `@${profile.username}` : ''}
      </Text>
      <Text style={styles.email}>{profile?.email || ''}</Text>
      <Text style={styles.bio}>
        {profile?.bio || 'Tell us a bit about yourself.'}
      </Text>

      {uploading && <ActivityIndicator style={styles.loadingIndicator} color="#FFF" />}
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { alignItems: 'center', marginVertical: 20 },
  avatarContainer:  { position: 'relative' },
  avatar:           { width: 100, height: 100, borderRadius: 50, backgroundColor: '#444' },
  plusContainer:    {
    position: 'absolute',
    bottom:   0,
    right:    0,
    backgroundColor: '#FFA500',
    width:    30,
    height:   30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name:             { marginTop: 10, fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  username:         { fontSize: 16, color: '#DDD', marginTop: 4 },
  email:            { fontSize: 14, color: '#AAA', marginTop: 2 },
  bio:              {
    fontSize:       14,
    color:          '#AAA',
    textAlign:      'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  loadingIndicator: { marginTop: 10 },

  // modal styles
  modalBackground:  {
    flex:           1,
    backgroundColor:'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems:     'center',
  },
  modalImage:       {
    width:          '90%',
    height:         '90%',
    resizeMode:     'contain',
  },
});

export default FullProfileInfo;
