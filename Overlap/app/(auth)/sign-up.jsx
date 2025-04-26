import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import VennDiagram from '../../components/VennDiagram'; // ✅ Import VennDiagram
import { signUp } from './auth';
import { saveProfileData } from '../utils/storage';

const SignUp = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startVennAnimation, setStartVennAnimation] = useState(false); // ✅ Venn animation

  const handleSignUp = async () => {
    try {
      setIsSubmitting(true);

      // 1) create the user with Firebase Auth
      const userCredential = await signUp(form.email, form.password);
      console.log("User successfully signed up:", userCredential);
      setStartVennAnimation(true); // ✅ Trigger animation

      // 2) immediately write email + username into Firestore
      //    saveProfileData does a merge, so it won't wipe out any other prefs
      await saveProfileData({
        email:    form.email,
        username: form.username
      });

      // 3) Delay navigation slightly to let animation breathe
      setTimeout(() => {
        router.replace('/(auth)/preferences');
      }, 500);
    } catch (error) {
      console.error("Sign-Up Error:", error);
    } finally {
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
          {/* ✅ VennDiagram scrolls with page */}
          <View className="mt-20 mb-10 items-center">
            <VennDiagram
              startAnimation={startVennAnimation}
              onAnimationComplete={() => setStartVennAnimation(false)}
            />
          </View>

          <View className="justify-center">
            <Text className="text-4xl text-white font-psemibold text-center">
              Sign up to Overlap
            </Text>

            <FormField
              title="Username"
              value={form.username}
              handleChangeText={(e) => setForm({ ...form, username: e })}
              otherStyles="mt-10"
            />

            <FormField
              title="Email"
              value={form.email}
              handleChangeText={(e) => setForm({ ...form, email: e })}
              otherStyles="mt-7"
              keyboardType="email-address"
            />

            <FormField
              title="Password"
              value={form.password}
              handleChangeText={(e) => setForm({ ...form, password: e })}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUp;
