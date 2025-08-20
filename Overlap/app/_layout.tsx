// app/_layout.jsx
import 'expo-dev-client';
import { SplashScreen, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import "../global.css";
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FiltersProvider } from '../context/FiltersContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import VennLoader from '../components/vennloader';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
  });

  // Show our custom loader instead of the native splash while things warm up
  const [showLoader, setShowLoader] = useState(true);

  // Hide the native splash ASAP so our React loader can render
  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) {
      // tiny grace period so the animation is visible briefly
      const t = setTimeout(() => setShowLoader(false), 250);
      return () => clearTimeout(t);
    }
  }, [fontsLoaded, error]);

  // ⛔️ IMPORTANT: don't early-return null, or the loader can't render
  return (
    <BottomSheetModalProvider>
      <FiltersProvider>
        <View style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="morefilters" options={{ title: 'More Filters', headerShown: false }} />
            <Stack.Screen name="moreInfo" options={{ title: 'More Info', headerShown: false }} />
          </Stack>

          {/* Global loading overlay */}
          {showLoader && (
            <View style={styles.overlay}>
              <VennLoader size={148} />
            </View>
          )}
        </View>
      </FiltersProvider>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D1117', // match your theme
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
});
