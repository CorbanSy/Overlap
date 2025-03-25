import React, { useRef } from 'react';
import { View, Image, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import images from '../constants/images';
import CustomButton from '../components/CustomButton';

export default function App() {
  // Animated values for scale and vertical translation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Handle animation sequence then navigate to sign-in screen
  const handleStart = () => {
    Animated.sequence([
      // Scale animation for merging effect
      Animated.timing(scaleAnim, {
        toValue: 0.5, // adjust as needed to simulate a merged circle
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Slide up animation for the whole view
      Animated.timing(slideAnim, {
        toValue: -100, // change this value to control the slide distance
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate after the animation completes
      router.push('/sign-in');
    });
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <View style={{ flex: 1 }}>
        {/* Animated container for the logo */}
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            alignItems: 'center', // center the image horizontally
          }}
        >
          <Image
            source={images.overlap}
            style={{
              width: 200,  // adjust width/height as needed
              height: 200,
              // Optionally add borderRadius to smooth the transformation into a circle
              borderRadius: 100,
            }}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Footer with Start button */}
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 }}>
          <CustomButton
            title="Start"
            handlePress={handleStart}
            containerStyles="w-[279px] mt-7"
          />
        </View>
      </View>
      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
}
