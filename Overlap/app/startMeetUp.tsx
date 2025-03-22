import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import SwipingScreen from '../components/swiping'; // Adjust the import path as needed

const StartMeetupScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <SwipingScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
});

export default StartMeetupScreen;
