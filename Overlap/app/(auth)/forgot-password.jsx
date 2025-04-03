import React, { useState } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { images } from '../../constants';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FIREBASE_AUTH } from '../../FirebaseConfig';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to send reset email. Please check your email address.');
      setSuccessMessage('');
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full relative">
      {/* Absolutely positioned background image */}
      <View className="absolute inset-0 z-0 items-center justify-center">
        <Image
          source={images.overlap}
          style={{
            width: 700,
            height: 700,
            resizeMode: 'contain',
            // Adjust as needed to move the image up/down
            marginTop: -350
          }}
        />
      </View>

      {/* Give the main content a large margin/padding on top to push it lower */}
      <ScrollView className="z-10">
        {/* Example: 'mt-64' pushes everything 16 * 4 = 256px down */}
        <View className="w-full justify-center h-full px-4 mt-60 my-6">
          
          <View className="mt-4">
            <Link href="/sign-in" className="text-lg font-psemibold text-secondary">
              &larr; Back
            </Link>
          </View>

          <Text className="text-2xl text-white text-semibold mt-10 font-psemibold">
            Forgot Password
          </Text>

          <FormField
            title="Email"
            value={email}
            handleChangeText={setEmail}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          {errorMessage ? (
            <Text className="text-red-500 text-sm mt-2">{errorMessage}</Text>
          ) : null}

          {successMessage ? (
            <Text className="text-green-500 text-sm mt-2">{successMessage}</Text>
          ) : null}

          <CustomButton
            title="Reset Password"
            handlePress={handleResetPassword}
            containerStyles="w-full mt-7"
          />

          {/* Sign In / Sign Up Links */}
          <View className="mt-10">
            <View className="flex-row justify-center items-center">
              <Text className="text-lg text-gray-100 font-pregular">
                Remember your password?
              </Text>
              <Link href="/sign-in" className="text-lg font-psemibold text-secondary ml-1">
                Sign In
              </Link>
            </View>
            <View className="flex-row justify-center items-center mt-2">
              <Text className="text-lg text-gray-100 font-pregular">
                Don't have an account?
              </Text>
              <Link href="/sign-up" className="text-lg font-psemibold text-secondary ml-1">
                Sign Up
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPassword;
