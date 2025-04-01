import React, { useRef, useState } from 'react';
import { View, Image, Animated, Easing as RNEasing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import VennDiagram from '../components/VennDiagram';
// Import Reanimated so it's available, but don't import Easing from here
import 'react-native-reanimated';

export default function App() {
  // Controls if the VennDiagram animation should start
  const [startVennAnimation, setStartVennAnimation] = useState(false);

  // React Native Animated values for the example image
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // When the "Start" button is pressed, trigger both the Venn animation + the RN Animations
  const handleStart = () => {
    setStartVennAnimation(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.5,
        duration: 500,
        easing: RNEasing.out(RNEasing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 500,
        easing: RNEasing.inOut(RNEasing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Called when the VennDiagram’s complex animation finishes
  const handleVennAnimationComplete = () => {
    router.push('/sign-in');
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* VennDiagram with advanced Reanimated transitions */}
        <VennDiagram
          startAnimation={startVennAnimation}
          onAnimationComplete={handleVennAnimationComplete}
        />

        {/* Example: React Native Animated image (optional) */}
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
            marginTop: 40,
          }}
        >
          <Image
            source={{ uri: 'https://via.placeholder.com/150' }}
            style={{ width: 100, height: 100, borderRadius: 50 }}
          />
        </Animated.View>
      </View>

      {/* Footer with Start button */}
      <View style={{ alignItems: 'center', paddingBottom: 20 }}>
        <CustomButton
          title="Start"
          handlePress={handleStart}
          containerStyles="w-[279px] mt-7"
        />
      </View>

      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
}
