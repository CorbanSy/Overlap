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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import VennDiagram from '../../components/VennDiagram';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { signIn } from '../../_utils/auth';

const BG = '#161622';

const SignIn = () => {
  const [form, setForm] = useState({ email: '', password: '' });
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
              onAnimationComplete={handleVennAnimationComplete}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Overlap</Text>
          <Text style={styles.subtitle}>Log In</Text>

          {/* Email */}
          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            keyboardType="email-address"
            otherStyles={{ marginTop: 28 }}
          />

          {/* Password */}
          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            secureTextEntry
            otherStyles={{ marginTop: 28 }}
          />

          {/* Forgot password */}
          <View style={styles.forgotWrap}>
            <Link href="/forgot-password" style={styles.forgotLink}>
              Forgot Password?
            </Link>
          </View>

          {/* Error */}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {/* Sign in button */}
          <CustomButton
            title="Sign In"
            handlePress={handleSignIn}
            containerStyles={styles.signInBtn}
            disabled={failedAttempts >= 5}
            isLoading={isSubmitting}
          />

          {/* Sign up link */}
          <View style={styles.signupWrap}>
            <Text style={styles.signupText}>Don't have an account yet?</Text>
            <Link href="/sign-up" style={styles.signupLink}>
              Sign Up
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
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  forgotLink: { fontSize: 14, color: '#4dabf7' },
  errorText: { color: '#ff4d4f', fontSize: 14, marginTop: 8 },
  signInBtn: {
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
  signupWrap: {
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 20,
  },
  signupText: { fontSize: 16, color: '#f0f0f0' },
  signupLink: { fontSize: 16, fontWeight: '600', color: '#4dabf7' },
});

export default SignIn;
