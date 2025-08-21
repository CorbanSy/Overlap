// app/(auth)/sign-up.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import CenterBall from '../../components/CenterBall';
import { signUp } from '../../_utils/auth';
import { saveProfileData } from '../../_utils/storage/userProfile';

const BG = '#0D1117'; // Updated to match home.tsx

const SignUp = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startExplosion, setStartExplosion] = useState(false);
  const insets = useSafeAreaInsets();

  const handleExplosionComplete = () => {
    router.replace('/(auth)/preferences');
  };

  const handleSignUp = async () => {
    try {
      setIsSubmitting(true);

      // 1) Create the account
      const userCredential = await signUp(form.email, form.password);
      console.log('User successfully signed up:', userCredential);

      // 2) Save initial profile data
      await saveProfileData({ email: form.email, username: form.username });

      // 3) Trigger explosion animation
      setStartExplosion(true);

    } catch (error) {
      console.error('Sign-Up Error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.bottom}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 32 + insets.bottom, flexGrow: 1 },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {/* Center Ball with Title */}
          <CenterBall
            title="Overlap"
            shouldExplode={startExplosion}
            onExplosionComplete={handleExplosionComplete}
            ballColor="rgba(245, 166, 35, 0.4)" // Updated to use orange accent
            borderColor="rgba(245, 166, 35, 0.6)" // Updated to use orange accent
            explosionColors={['#F5A623', '#1B1F24', '#AAAAAA', '#FFF', '#333', '#F44336']} // Updated to match our palette
          />

          {/* Subtitle */}
          <Text style={styles.subtitle}>Create Account</Text>

          {/* Username */}
          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(v) => setForm({ ...form, username: v })}
            placeholder="yourname"
            otherStyles="mt-7"
            inputTextColor="#FFFFFF" // Updated to match consistent scheme
            placeholderTextColor="#AAAAAA" // Updated to match consistent scheme
          />

          {/* Email */}
          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(v) => setForm({ ...form, email: v })}
            placeholder="you@example.com"
            keyboardType="email-address"
            otherStyles="mt-7"
            inputTextColor="#FFFFFF" // Updated to match consistent scheme
            placeholderTextColor="#AAAAAA" // Updated to match consistent scheme
          />

          {/* Password */}
          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(v) => setForm({ ...form, password: v })}
            placeholder="••••••••"
            secureTextEntry
            otherStyles="mt-7"
            inputTextColor="#FFFFFF" // Updated to match consistent scheme
            placeholderTextColor="#AAAAAA" // Updated to match consistent scheme
          />

          {/* CTA */}
          <CustomButton
            title="Sign Up"
            handlePress={handleSignUp}
            containerStyles={styles.ctaBtn}
            textStyles={styles.ctaBtnText}
            isLoading={isSubmitting}
          />

          {/* Already have account */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Have an account already?</Text>
            <Link href="/sign-in" style={styles.bottomLink}>
              Sign In
            </Link>
          </View>

          <View style={{ height: insets.bottom }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 20 },

  subtitle: {
    fontSize: 20,
    color: '#FFFFFF', // Updated to match consistent scheme
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },

  // CTA button (updated to match orange accent)
  ctaBtn: {
    marginTop: 28,
    backgroundColor: '#F5A623', // Updated to match orange accent
    borderRadius: 14,
    paddingVertical: 16,
    minWidth: 280,
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  ctaBtnText: {
    color: '#0D1117', // Updated text color for contrast against orange
    fontSize: 18,
    fontWeight: '700',
  },

  bottomRow: {
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
  },
  bottomText: { fontSize: 16, color: '#AAAAAA' }, // Updated to match secondary text color
  bottomLink: { fontSize: 16, fontWeight: '700', color: '#F5A623' }, // Updated to match accent color
});

export default SignUp;