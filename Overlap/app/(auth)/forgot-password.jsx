import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import VennDiagram from '../../components/VennDiagram'; // ✅ Import VennDiagram
import { sendPasswordResetEmail } from 'firebase/auth';
import { FIREBASE_AUTH } from '../../FirebaseConfig';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [startVennAnimation, setStartVennAnimation] = useState(false); // ✅ Control animation

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setErrorMessage('');
      setStartVennAnimation(true); // ✅ Trigger Venn animation
    } catch (error) {
      setErrorMessage('Failed to send reset email. Please check your email address.');
      setSuccessMessage('');
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ VennDiagram scrolls with content */}
          <View className="mt-20 mb-10 items-center">
            <VennDiagram
              startAnimation={startVennAnimation}
              onAnimationComplete={() => setStartVennAnimation(false)} // Optional reset
            />
          </View>

          <View className="mt-4">
            <Link href="/sign-in" className="text-lg font-psemibold text-secondary">
              &larr; Back
            </Link>

            <Text className="text-3xl text-white font-psemibold mt-6">
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPassword;
