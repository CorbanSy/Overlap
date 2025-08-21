// _utils/storage/localStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function markPreferencesComplete() {
  try {
    await AsyncStorage.setItem('preferencesComplete', 'true');
  } catch (error) {
    console.error('Error saving preferences completion flag:', error);
  }
}

export async function checkPreferencesComplete() {
  try {
    const value = await AsyncStorage.getItem('preferencesComplete');
    return value === 'true';
  } catch (error) {
    console.error('Error checking preferences completion flag:', error);
    return false;
  }
}