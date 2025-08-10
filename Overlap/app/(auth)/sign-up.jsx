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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import VennDiagram from '../../components/VennDiagram';
import { signUp } from '../../_utils/auth';
import { saveProfileData } from '../../_utils/storage';

const BG = '#161622';

const SignUp = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startVennAnimation, setStartVennAnimation] = useState(false);

  const handleSignUp = async () => {
    try {
      setIsSubmitting(true);

      // 1) Create the user
      const userCredential = await signUp(form.email, form.password);
      console.log('User successfully signed up:', userCredential);

      // 2) Save profile info
      await saveProfileData({
        email: form.email,
        username: form.username,
      });

      // 3) Kick off the venn animation
      setStartVennAnimation(true);

      // 4) Let the animation breathe, then navigate
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Venn Diagram */}
          <View style={styles.vennWrap}>
            <VennDiagram
              startAnimation={startVennAnimation}
              onAnimationComplete={() => setStartVennAnimation(false)}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Sign up to Overlap</Text>

          {/* Username */}
          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(v) => setForm({ ...form, username: v })}
            otherStyles={{ marginTop: 28 }}
          />

          {/* Email */}
          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(v) => setForm({ ...form, email: v })}
            keyboardType="email-address"
            otherStyles={{ marginTop: 28 }}
          />

          {/* Password */}
          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(v) => setForm({ ...form, password: v })}
            secureTextEntry
            otherStyles={{ marginTop: 28 }}
          />

          {/* Big white rounded button */}
          <CustomButton
            title="Sign Up"
            handlePress={handleSignUp}
            containerStyles={styles.ctaBtn}
            isLoading={isSubmitting}
          />

          {/* Already have account */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Have an account already?</Text>
            <Link href="/sign-in" style={styles.bottomLink}>
              Sign In
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  vennWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaBtn: {
    marginTop: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    minWidth: 280,
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bottomRow: {
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
  },
  bottomText: { fontSize: 16, color: '#f0f0f0' },
  bottomLink: { fontSize: 16, fontWeight: '600', color: '#4dabf7' },
});

export default SignUp;
