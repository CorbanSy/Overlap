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
import { saveProfileData } from '../app/utils/storage';

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
    if (!result.cancelled) {
      onChangeImage(result.uri);
    }
  };

  return (
    <View style={pictureStyles.wrapper}>
      <View style={pictureStyles.container}>
        <Image
          source={
            imageUri
              ? { uri: imageUri }
              : require('../assets/images/profile.png')
          }
          style={pictureStyles.image}
        />
      </View>
      <TouchableOpacity style={pictureStyles.plusButton} onPress={pickImage}>
        <Ionicons name="add" size={20} color="#FFF" />
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
  },
  image: {
    width: '100%',
    height: '100%',
  },
  plusButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F5A623',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
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
  
  // Editable profile details
  const [name, setName] = useState('John Doe');
  const [tagline, setTagline] = useState('Always up for an adventure!');
  const [isEditing, setIsEditing] = useState(false);
  
  const handleSaveEdits = async () => {
    try {
      await saveProfileData({
        name: name,
        bio: tagline,
        avatarUrl: profileUri || null, // use null if profileUri is undefined
        topCategories: [] // if applicable
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };
  

  return (
    <View style={styles.fullProfileSection}>
      <View style={styles.profileHeader}>
        <ProfilePicture imageUri={profileUri} onChangeImage={setProfileUri} />
        <View style={styles.profileDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil-outline" size={18} color="#FFF" style={styles.pencilIcon} />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{user ? user.email : '@unknown'}</Text>
          <Text style={styles.tagline}>{tagline}</Text>
        </View>
      </View>
      
      {/* Edit Profile Modal */}
      <Modal visible={isEditing} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Edit Profile</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#888"
            />
            <TextInput
              style={modalStyles.input}
              value={tagline}
              onChangeText={setTagline}
              placeholder="Enter your bio"
              placeholderTextColor="#888"
            />
            <View style={modalStyles.buttonRow}>
              <TouchableOpacity style={modalStyles.button} onPress={handleSaveEdits}>
                <Text style={modalStyles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.button, modalStyles.cancelButton]} onPress={() => setIsEditing(false)}>
                <Text style={modalStyles.buttonText}>Cancel</Text>
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
    padding: 16,
    backgroundColor: '#0D1117',
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
    color: '#FFFFFF',
  },
  pencilIcon: {
    marginLeft: 8,
  },
  username: {
    fontSize: 16,
    color: '#DDDDDD',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#DDDDDD',
    marginBottom: 8,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#1B1F24',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    backgroundColor: '#222',
    color: '#FFF',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    backgroundColor: '#FFA500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default FullProfileInfo;
