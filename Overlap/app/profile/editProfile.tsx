import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProfileData, saveProfileData } from '../../_utils/storage';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';

export const options = {
  headerShown: false,
};
// Hide the default Expo Router header
export const unstable_settings = {
  headerShown: false,
};

const EditProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getProfileData();
        if (data) {
          setProfile(data);
          setName(data.name || '');
          setUsername(data.username || '');
          setEmail(data.email || '');
          setBio(data.bio || '');
        }
      } catch (error) {
        console.error("Error fetching profile data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedProfile = {
        topCategories: profile?.topCategories || [],
        name,
        username,
        email,
        bio,
        avatarUrl: profile?.avatarUrl || '',
      };
      await saveProfileData(updatedProfile);
      Alert.alert("Success", "Profile updated successfully.");
      router.back();
    } catch (error) {
      console.error("Error saving profile data", error);
      Alert.alert("Error", "There was an error updating your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Back Button in top-right corner */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
        blurOnSubmit={true}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#888"
        value={username}
        onChangeText={setUsername}
        blurOnSubmit={true}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        blurOnSubmit={true}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Bio"
        placeholderTextColor="#888"
        value={bio}
        onChangeText={setBio}
        multiline
        blurOnSubmit={true}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#0D1117' 
  },
  container: { 
    flex: 1, 
    backgroundColor: '#0D1117', 
    padding: 20, 
    justifyContent: 'center' 
  },
  backButton: {
    position: 'absolute',
    top: 40,    // Adjust as needed for your layout
    right: 20,
    zIndex: 10,
  },
  input: {
    backgroundColor: '#222',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: { 
    color: '#000', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});

export default EditProfile;
