// components/profile_components/headers/ProfileHeader.tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FullProfileInfo from '../FullProfileInfo';
import { Colors } from '../../../constants/colors';

interface ProfileHeaderProps {
  onSettingsPress: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ onSettingsPress }) => {
  return (
    <View style={styles.profileHeader}>
      <FullProfileInfo />
      <TouchableOpacity style={styles.settingsButton} onPress={onSettingsPress}>
        <View style={styles.settingsButtonContent}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    marginBottom: 20,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

export default ProfileHeader;