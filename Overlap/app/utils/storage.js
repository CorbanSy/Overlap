// storage.js (or any file you prefer)
import AsyncStorage from '@react-native-async-storage/async-storage';

export const markPreferencesComplete = async () => {
  try {
    await AsyncStorage.setItem('preferencesComplete', 'true');
  } catch (error) {
    console.error('Error saving preferences completion flag:', error);
  }
};

export const checkPreferencesComplete = async () => {
  try {
    const value = await AsyncStorage.getItem('preferencesComplete');
    return value === 'true';
  } catch (error) {
    console.error('Error checking preferences completion flag:', error);
    return false;
  }
};
