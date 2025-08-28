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
              gestureEnabled: true,
              headerTransparent: true,
              headerTitle: '',
              headerBackTitle: '',
              headerLeft: () => null,
            }}
          >
            {/* Explicitly define screens if needed */}
            <Stack.Screen 
              name="index" 
              options={{ 
                headerShown: false,
                title: '',
              }} 
            />
            <Stack.Screen 
              name="[meetupId]" 
              options={{ 
                headerShown: false,
                title: '',
              }} 
            />
          </Stack>
        </PortalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}