// app/meetupFolder/_layout.jsx
import React from 'react';
import { Stack } from 'expo-router';
import { PortalProvider } from '@gorhom/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function MeetupLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PortalProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
        </PortalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
