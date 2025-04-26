import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import VennDiagram from '../../components/VennDiagram';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { signIn } from './auth';

const SignIn = () => {
  const [form, setform] = useState({ email: '', password: '' });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startVennAnimation, setStartVennAnimation] = useState(false);

  const handleVennAnimationComplete = () => {
    router.push('/home');
  };

  const triggerAnimation = () => {
    return new Promise((resolve) => {
      setStartVennAnimation(true);
      resolve();
    });
  };

  const handleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signIn(form.email, form.password);
      setFailedAttempts(0);
      setErrorMessage('');
      await triggerAnimation();
    } catch (error) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      if (newFailedAttempts < 5) {
        setErrorMessage(
          `Invalid credentials. Please try again. Attempts left: ${5 - newFailedAttempts}`
        );
      } else {
        setErrorMessage(
          'You have exceeded the number of attempts. Please create an account or click on "Forgot Password".'
        );
      }
      setIsSubmitting(false);
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
          {/* VennDiagram now scrolls with the rest of the content */}
          <View className="mt-20 mb-10 items-center">
            <VennDiagram
              startAnimation={startVennAnimation}
              onAnimationComplete={handleVennAnimationComplete}
            />
          </View>

          <View className="justify-center">
            <Text className="text-4xl text-white font-psemibold text-center">
              Overlap
            </Text>
            <Text className="text-2xl text-white font-psemibold text-center mt-2">
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
              secureTextEntry
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
                Don't have an account yet?
              </Text>
              <Link href="/sign-up" className="text-lg font-psemibold text-secondary">
                Sign Up
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
