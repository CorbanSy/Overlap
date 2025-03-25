import { View, Text, ScrollView, Image } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { signUp } from './auth';
import { images } from '../../constants';

const SignUp = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async () => {
    try {
      setIsSubmitting(true);
      const userCredential = await signUp(form.email, form.password);
      console.log("User successfully signed up:", userCredential);

      // Navigate to preferences or wherever you'd like
      router.replace('/(auth)/preferences');
    } catch (error) {
      console.error("Sign-Up Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full relative">
      
      {/* 2) Absolutely positioned background image */}
      <View className="absolute inset-0 z-0 items-center justify-center">
        <Image
          source={images.overlap}
          style={{
            width: 700,
            height: 700,
            resizeMode: 'contain',
            // Adjust to move the image up or down
            marginTop: -350
          }}
        />
      </View>

      {/* 3) Main form content with higher z-index so it appears above the image */}
      <ScrollView className="z-10">
        <View className="w-full justify-center min-h-[83vh] px-4 mt-32 my-6">
          {/* Removed the small "Logo Image" block here */}

          <Text className="text-4xl text-white text-semibold mt-10 font-psemibold">
            Sign up to Overlap
          </Text>

          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(e) => setForm({...form, username: e})}
            otherStyles="mt-10"
          />

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({...form, email: e})}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({...form, password: e})}
            otherStyles="mt-7"
            secureTextEntry
          />

          <CustomButton
            title="Sign Up"
            handlePress={handleSignUp}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Have an account already?
            </Text>
            <Link href="/sign-in" className="text-lg font-psemibold text-secondary">
              Sign In
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
