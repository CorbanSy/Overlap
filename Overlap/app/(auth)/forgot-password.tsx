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
import CenterBall from '../../components/CenterBall';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FIREBASE_AUTH } from '../../FirebaseConfig';

const BG = '#0D1117'; // Updated to match consistent scheme

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [startExplosion, setStartExplosion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const insets = useSafeAreaInsets();

  const handleExplosionComplete = () => {
    // Reset explosion state after completion
    setTimeout(() => {
      setStartExplosion(false);
    }, 100);
  };

  const handleResetPassword = async () => {
    try {
      setIsSubmitting(true);
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setErrorMessage('');
      setStartExplosion(true);
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
            { paddingBottom: 32 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Add flex spacer to center content vertically */}
          <View style={styles.topSpacer} />

          {/* Center Ball with Title */}
          <CenterBall
            title="Overlap"
            shouldExplode={startExplosion}
            onExplosionComplete={handleExplosionComplete}
            ballColor="rgba(245, 166, 35, 0.4)" // Updated to use orange accent
            borderColor="rgba(245, 166, 35, 0.6)" // Updated to use orange accent
            explosionColors={['#F5A623', '#1B1F24', '#AAAAAA', '#FFF', '#333', '#F44336']} // Updated to match our palette
            containerStyle={styles.centerBallContainer} // Override default margins
          />

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
            inputTextColor="#FFFFFF" // Updated to match consistent scheme
            placeholderTextColor="#AAAAAA" // Updated to match consistent scheme
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
              <Text style={styles.bottomText}>Don't have an account?</Text>
              <Link href="/sign-up" style={styles.bottomLink}>
                Sign Up
              </Link>
            </View>
          </View>

          {/* Add flex spacer to center content vertically */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: { 
    paddingHorizontal: 20,
    flexGrow: 1, // Allow content to expand and center
    justifyContent: 'center', // Center content vertically
    minHeight: '100%', // Ensure full height is available
  },

  // Spacers for better vertical centering
  topSpacer: {
    flex: 0.5, // Takes up less space at the top
  },
  bottomSpacer: {
    flex: 1, // Takes up more space at the bottom
  },

  // Override CenterBall margins for better positioning
  centerBallContainer: {
    marginTop: 20, // Reduced from default 80
    marginBottom: 20, // Reduced from default 40
  },

  subtitle: {
    fontSize: 20,
    color: '#FFFFFF', // Updated to match consistent scheme
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },

  // Orange CTA button (updated from blue)
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

  error: {
    color: '#F44336', // Updated to more muted red
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  success: {
    color: '#4CAF50', // Updated to more muted green
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
  bottomText: { fontSize: 16, color: '#AAAAAA' }, // Updated to match secondary text color
  bottomLink: { fontSize: 16, fontWeight: '700', color: '#F5A623' }, // Updated to match accent color
});