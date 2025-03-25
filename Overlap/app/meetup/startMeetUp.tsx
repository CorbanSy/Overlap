import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import SwipingScreen from '../../components/swiping';

export default function StartMeetupScreen() {
  // Grab ?meetupId=... from the URL
  const { meetupId } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      {/* Pass the meetupId down to the SwipingScreen component */}
      <SwipingScreen meetupId={meetupId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
});
