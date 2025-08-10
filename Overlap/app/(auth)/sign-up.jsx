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
import VennDiagram from '../../components/VennDiagram';
import { signUp } from '../../_utils/auth';
import { saveProfileData } from '../../_utils/storage';

const BG = '#161622';

const SignUp = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startVennAnimation, setStartVennAnimation] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSignUp = async () => {
    try {
      setIsSubmitting(true);

      // 1) Create the account
      const userCredential = await signUp(form.email, form.password);
      console.log('User successfully signed up:', userCredential);

      // 2) Save initial profile data
      await saveProfileData({ email: form.email, username: form.username });

      // 3) Animate venn + navigate
      setStartVennAnimation(true);
      setTimeout(() => {
        router.replace('/(auth)/preferences');
      }, 500);
    } catch (error) {
      console.error('Sign-Up Error:', error);
    } finally {
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
          {/* Title at the top */}
          <Text style={styles.title}>Overlap</Text>

          {/* Venn diagram below title */}
          <View style={styles.vennWrap}>
            <VennDiagram
              startAnimation={startVennAnimation}
              onAnimationComplete={() => setStartVennAnimation(false)}
            />
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Create Account</Text>

          {/* Username */}
          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(v) => setForm({ ...form, username: v })}
            placeholder="yourname"
            otherStyles="mt-7"
            inputTextColor="#fff"
            placeholderTextColor="#aaa"
          />

          {/* Email */}
          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(v) => setForm({ ...form, email: v })}
            placeholder="you@example.com"
            keyboardType="email-address"
            otherStyles="mt-7"
            inputTextColor="#fff"
            placeholderTextColor="#aaa"
          />

          {/* Password */}
          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(v) => setForm({ ...form, password: v })}
            placeholder="••••••••"
            secureTextEntry
            otherStyles="mt-7"
            inputTextColor="#fff"
            placeholderTextColor="#aaa"
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

  title: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 20,
  },
  vennWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },

  // CTA button (blue, matches Sign In)
  ctaBtn: {
    marginTop: 28,
    backgroundColor: '#4dabf7',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  bottomRow: {
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
  },
  bottomText: { fontSize: 16, color: '#f0f0f0' },
  bottomLink: { fontSize: 16, fontWeight: '700', color: '#4dabf7' },
});

export default SignUp;
