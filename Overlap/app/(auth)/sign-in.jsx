// app/sign-in.jsx
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
import CenterBall from '../../components/CenterBall';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { signIn } from '../../_utils/auth';

const BG = '#0D1117'; // Updated to match home.tsx

const SignIn = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startExplosion, setStartExplosion] = useState(false);

  const insets = useSafeAreaInsets();

  const handleExplosionComplete = () => {
    router.push('/home');
  };

  const handleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signIn(form.email, form.password);
      setFailedAttempts(0);
      setErrorMessage('');
      
      // Trigger explosion animation
      setStartExplosion(true);
      
    } catch (error) {
      const tries = failedAttempts + 1;
      setFailedAttempts(tries);
      setErrorMessage(
        tries < 5
          ? `Invalid credentials. Please try again. Attempts left: ${5 - tries}`
          : 'You have exceeded the number of attempts. Please create an account or click on "Forgot Password".'
      );
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
          />

          {/* Subtitle */}
          <Text style={styles.subtitle}>Log In</Text>

          {/* Email */}
          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            placeholder="you@example.com"
            otherStyles="mt-7"
            inputTextColor="#FFFFFF"
            placeholderTextColor="#AAAAAA"
          />

          {/* Password */}
          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            placeholder="••••••••"
            otherStyles="mt-7"
            inputTextColor="#FFFFFF"
            placeholderTextColor="#AAAAAA"
          />

          {/* Forgot password */}
          <View style={styles.forgotWrap}>
            <Link href="/forgot-password" style={styles.forgotLink}>
              Forgot Password?
            </Link>
          </View>

          {/* Error */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Sign in button */}
          <CustomButton
            title="Sign In"
            handlePress={handleSignIn}
            containerStyles={styles.signInBtn}
            textStyles={styles.signInBtnText}
            disabled={failedAttempts >= 5}
            isLoading={isSubmitting}
          />

          {/* Bottom link */}
          <View style={styles.signupWrap}>
            <Text style={styles.signupText}>Don't have an account yet?</Text>
            <Link href="/sign-up" style={styles.signupLink}>
              Sign Up
            </Link>
          </View>

          {/* extra spacer if desired */}
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
    color: '#FFFFFF', // Updated to match home.tsx
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  forgotLink: { fontSize: 14, color: '#F5A623' }, // Updated to match home.tsx accent
  errorText: { color: '#F44336', fontSize: 14, marginTop: 8 }, // Updated to a more muted red

  // Button
  signInBtn: {
    marginTop: 28,
    backgroundColor: '#F5A623', // Updated to match home.tsx accent
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
  signInBtnText: { color: '#0D1117', fontSize: 18, fontWeight: '700' }, // Updated text color for contrast

  // Bottom section
  signupWrap: {
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 20,
  },
  signupText: { fontSize: 16, color: '#AAAAAA' }, // Updated to match home.tsx secondary text
  signupLink: { fontSize: 16, fontWeight: '700', color: '#F5A623' }, // Updated to match accent color
});

export default SignIn;