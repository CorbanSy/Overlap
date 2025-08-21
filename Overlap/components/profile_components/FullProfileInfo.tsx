// components/profile_components/FullProfileInfo.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  TextInput 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { saveProfileData } from '../../_utils/storage';
import { Colors } from '../../constants/colors';

///////////////////////////
// ProfilePicture Component
///////////////////////////
interface ProfilePictureProps {
  imageUri?: string;
  onChangeImage: (uri: string) => void;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({ imageUri, onChangeImage }) => {
  const pickImage = async () => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    Alert.alert('Permission required', 'Permission to access camera roll is required!');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  
  // Fix: Use result.canceled instead of result.cancelled
  if (!result.canceled && result.assets && result.assets[0]) {
    onChangeImage(result.assets[0].uri);
  }
};

  return (
    <View style={pictureStyles.wrapper}>
      <View style={pictureStyles.container}>
        <Image
          source={
            imageUri
              ? { uri: imageUri }
              : require('../../assets/images/profile.png')
          }
          style={pictureStyles.image}
        />
      </View>
      <TouchableOpacity style={pictureStyles.plusButton} onPress={pickImage}>
        <Ionicons name="add" size={20} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const pictureStyles = StyleSheet.create({
  wrapper: {
    width: 120,
    height: 120,
  },
  container: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  plusButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    zIndex: 10,
  },
});

///////////////////////////
// FullProfileInfo Component
///////////////////////////
const FullProfileInfo: React.FC = () => {
  const [profileUri, setProfileUri] = useState<string | undefined>(undefined);
  const auth = getAuth();
  const user = auth.currentUser;
  
  // Editable profile details with safe defaults
  const [name, setName] = useState('John Doe');
  const [tagline, setTagline] = useState('Always up for an adventure!');
  const [isEditing, setIsEditing] = useState(false);
  
  const handleSaveEdits = async () => {
    try {
      await saveProfileData({
        name: name || 'Anonymous',
        bio: tagline || '',
        avatarUrl: profileUri || null,
        topCategories: []
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  // Safe email extraction
  const userEmail = user?.email || '@unknown';
  const displayName = name || 'Anonymous';
  const displayTagline = tagline || 'No bio yet';

  return (
    <View style={styles.fullProfileSection}>
      <View style={styles.profileHeader}>
        <ProfilePicture imageUri={profileUri} onChangeImage={setProfileUri} />
        <View style={styles.profileDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil-outline" size={18} color={Colors.text} style={styles.pencilIcon} />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{userEmail}</Text>
          <Text style={styles.tagline}>{displayTagline}</Text>
        </View>
      </View>
      
      {/* Edit Profile Modal */}
      <Modal visible={isEditing} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Edit Profile</Text>
              <TouchableOpacity 
                style={modalStyles.closeButton} 
                onPress={() => setIsEditing(false)}
              >
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={modalStyles.content}>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>Name</Text>
                <TextInput
                  style={modalStyles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>Bio</Text>
                <TextInput
                  style={modalStyles.input}
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder="Enter your bio"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
            
            <View style={modalStyles.buttonRow}>
              <TouchableOpacity 
                style={[modalStyles.button, modalStyles.cancelButton]} 
                onPress={() => setIsEditing(false)}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.button} onPress={handleSaveEdits}>
                <Text style={modalStyles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fullProfileSection: {
    backgroundColor: Colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  pencilIcon: {
    marginLeft: 8,
  },
  username: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FullProfileInfo;