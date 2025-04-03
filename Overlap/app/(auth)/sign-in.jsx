import React, { useRef, useState } from 'react';
import { View, Text, Image, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import { images } from '../../constants';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { signIn } from './auth';

const SignIn = () => {
  const [form, setform] = useState({
    email: '',
    password: ''
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animated values for background image animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Function to run the animation sequence
  const triggerAnimation = () => {
    return new Promise((resolve) => {
      Animated.sequence([
        // Scale animation to simulate the merging effect
        Animated.timing(scaleAnim, {
          toValue: 0.5, // Adjust to simulate the merged circle
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        // Slide up animation for the background image
        Animated.timing(slideAnim, {
          toValue: -100, // Change to control the slide distance
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
  };

  // Updated sign in handler that triggers the animation on success
  const handleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signIn(form.email, form.password);
      setFailedAttempts(0);
      setErrorMessage('');
      // Run the animation before navigating
      await triggerAnimation();
      router.push('/home');
    } catch (error) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      if (newFailedAttempts < 5) {
        setErrorMessage(`Invalid credentials. Please try again. Attempts left: ${5 - newFailedAttempts}`);
      } else {
        setErrorMessage('You have exceeded the number of attempts. Please create an account or click on "Forgot Password".');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full relative">
      {/* Absolutely positioned, centered large image wrapped in Animated.View */}
      <Animated.View 
        className="absolute inset-0 z-0 items-center justify-center"
        style={{
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        }}
      >
        <Image
          source={images.overlap}
          style={{
            width: 700,
            height: 700,
            resizeMode: 'contain',
            marginTop: -350 // Adjust as needed
          }}
        />
      </Animated.View>

      {/* Form container */}
      <View className="w-full justify-center min-h-[83vh] px-4 my-6 mt-40">
        <Text className="text-4xl text-white text-semibold mt-10 font-psemibold">
          Overlap
        </Text>
        <Text className="text-2xl text-white text-semibold mt-10 font-psemibold">
          Log In
        </Text>

        <FormField
          title="Email"
          value={form.email}
          handleChangeText={(e) => setform({ ...form, email: e })}
          otherStyles="mt-7"
          keyboardType="email-address"
        />

        <FormField
          title="Password"
          value={form.password}
          handleChangeText={(e) => setform({ ...form, password: e })}
          otherStyles="mt-7"
        />

        <View className="flex-row justify-end mt-2">
          <Link href="/forgot-password" className="text-sm font-pregular text-secondary">
            Forgot Password?
          </Link>
        </View>

        {errorMessage ? (
          <Text className="text-red-500 text-sm mt-2">{errorMessage}</Text>
        ) : null}

        <CustomButton
          title="Sign In"
          handlePress={handleSignIn}
          containerStyles="mt-7"
          disabled={failedAttempts >= 5}
          isLoading={isSubmitting}
        />

        <View className="justify-center pt-5 flex-row gap-2">
          <Text className="text-lg text-gray-100 font-pregular">
            Dont have an account yet?
          </Text>
          <Link href="/sign-up" className="text-lg font-psemibold text-secondary">
            Sign Up
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SignIn;
