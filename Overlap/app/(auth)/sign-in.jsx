import { View, Text, ScrollView, Image } from 'react-native';
import React, { useState } from 'react';
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

  const handleSignIn = async () => {
    try {
      await signIn(form.email, form.password);
      // Reset failed attempts on successful login
      setFailedAttempts(0);
      setErrorMessage('');
      // Navigate to the home screen or any other screen after successful sign-in
      router.push('/home');
    } catch (error) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      if (newFailedAttempts < 5) {
        setErrorMessage(`Invalid credentials. Please try again. Attempts left: ${5 - newFailedAttempts}`);
      } else {
        setErrorMessage('You have exceeded the number of attempts. Please create an account or click on "Forgot Password".');
        // Optionally, you can disable the sign-in button here
      }
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full justify-center min-h-[83vh] px-4 my-6">
          
          {/* Logo Image */}
          <View className="w-full items-center mt-10">
            <Image 
              source={images.overlap} 
              style={{ width: 100, height: 100, resizeMode: 'contain' }} 
            />
          </View>

          <Text className="text-4xl text-white text-semibold mt-10 font-psemibold">Overlap</Text>
          <Text className="text-2xl text-white text-semibold mt-10 font-psemibold">Log In</Text>

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

          {/* Forgot Password Link */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
