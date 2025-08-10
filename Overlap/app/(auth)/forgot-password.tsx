// app/(auth)/forgot-password.tsx
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
import { Link } from 'expo-router';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import VennDiagram from '../../components/VennDiagram';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FIREBASE_AUTH } from '../../FirebaseConfig';

const BG = '#161622';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [startVennAnimation, setStartVennAnimation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const insets = useSafeAreaInsets();

  const handleResetPassword = async () => {
    try {
      setIsSubmitting(true);
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setErrorMessage('');
      setStartVennAnimation(true);
    } catch (error) {
      setErrorMessage('Failed to send reset email. Please check your email address.');
      setSuccessMessage('');
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
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>Overlap</Text>

          {/* Venn diagram */}
          <View style={styles.vennWrap}>
            <VennDiagram
              startAnimation={startVennAnimation}
              onAnimationComplete={() => setStartVennAnimation(false)}
            />
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Forgot Password</Text>

          {/* Email field */}
          <FormField
            title="Email"
            placeholder="you@example.com"
            value={email}
            handleChangeText={setEmail}
            keyboardType="email-address"
            otherStyles="mt-7"
            inputTextColor="#fff"
            placeholderTextColor="#aaa"
          />

          {/* Messages */}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          {/* Reset button */}
          <CustomButton
            title="Reset Password"
            handlePress={handleResetPassword}
            containerStyles={styles.ctaBtn}
            textStyles={styles.ctaBtnText}
            isLoading={isSubmitting}
          />

          {/* Links */}
          <View style={styles.bottomLinks}>
            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>Remember your password?</Text>
              <Link href="/sign-in" style={styles.bottomLink}>
                Sign In
              </Link>
            </View>
            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>Don’t have an account?</Text>
              <Link href="/sign-up" style={styles.bottomLink}>
                Sign Up
              </Link>
            </View>
          </View>

          <View style={{ height: insets.bottom }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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

  // Blue CTA
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

  error: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  success: {
    color: '#51cf66',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  bottomLinks: {
    marginTop: 32,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bottomText: { fontSize: 16, color: '#f0f0f0' },
  bottomLink: { fontSize: 16, fontWeight: '700', color: '#4dabf7' },
});
