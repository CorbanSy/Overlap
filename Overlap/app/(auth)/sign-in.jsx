// app/sign-in.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Animated,
  Easing as RNEasing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { signIn } from '../../_utils/auth';

const BG = '#161622';
const CENTER_BALL_SIZE = 200; // Size of the center ball (made bigger)

const SignIn = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation refs for the center ball
  const ballScale = useRef(new Animated.Value(1)).current;
  const ballOpacity = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  // Explosion particles
  const [particles, setParticles] = useState([]);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });

  const insets = useSafeAreaInsets();

  // Floating animation for the center ball
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: RNEasing.inOut(RNEasing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Create explosion particles
  const createExplosionParticles = () => {
    const particleCount = 12;
    const colors = ['#7C4DFF', '#00E5FF', '#61F3F3', '#8E7CFF', '#43E8E1', '#57D2F6'];
    
    const newParticles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = 150 + Math.random() * 100; // Random velocity
      const size = 20 + Math.random() * 30;
      
      return {
        id: i,
        x: new Animated.Value(0), // Start from center (0,0)
        y: new Animated.Value(0), // Start from center (0,0)
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
        targetX: Math.cos(angle) * velocity,
        targetY: Math.sin(angle) * velocity,
        color: colors[i % colors.length],
        size,
      };
    });
    
    setParticles(newParticles);
    return newParticles;
  };

  const handleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signIn(form.email, form.password);
      setFailedAttempts(0);
      setErrorMessage('');
      
      // Start explosion animation
      const particles = createExplosionParticles();
      
      // Ball shrinks and fades
      Animated.parallel([
        Animated.timing(ballScale, {
          toValue: 0,
          duration: 300,
          easing: RNEasing.out(RNEasing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ballOpacity, {
          toValue: 0,
          duration: 300,
          easing: RNEasing.out(RNEasing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      
      // Particles explode outward
      const particleAnimations = particles.map((particle) => 
        Animated.parallel([
          Animated.timing(particle.x, {
            toValue: particle.targetX,
            duration: 800,
            easing: RNEasing.out(RNEasing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: particle.targetY,
            duration: 800,
            easing: RNEasing.out(RNEasing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: 800,
            delay: 200,
            easing: RNEasing.out(RNEasing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 600,
            delay: 400,
            easing: RNEasing.out(RNEasing.cubic),
            useNativeDriver: true,
          }),
        ])
      );
      
      Animated.parallel(particleAnimations).start(() => {
        // Navigate after explosion completes
        setTimeout(() => {
          router.push('/home');
        }, 200);
      });
      
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

  // Floating animation interpolation
  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

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
          {/* Title at very top - REMOVED */}

          {/* Center Ball with Title Inside */}
          <View 
            style={styles.ballContainer}
          >
            <Animated.View
              style={[
                styles.centerBall,
                {
                  opacity: ballOpacity,
                  transform: [
                    { scale: ballScale },
                    { translateY: floatTranslateY },
                  ],
                },
              ]}
            >
              <Text style={styles.titleInsideBall}>Overlap</Text>
            </Animated.View>
            
            {/* Explosion particles */}
            {particles.map((particle) => (
              <Animated.View
                key={particle.id}
                style={[
                  styles.particle,
                  {
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size / 2,
                    backgroundColor: particle.color,
                    opacity: particle.opacity,
                    transform: [
                      { translateX: particle.x },
                      { translateY: particle.y },
                      { scale: particle.scale },
                    ],
                  },
                ]}
              />
            ))}
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Log In</Text>

          {/* Email */}
          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            placeholder="you@example.com"
            otherStyles="mt-7"
            inputTextColor="#fff"
            placeholderTextColor="#aaa"
          />

          {/* Password */}
          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            placeholder="••••••••"
            otherStyles="mt-7"
            inputTextColor="#fff"
            placeholderTextColor="#aaa"
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
  
  // Ball container (replaces vennWrap)
  ballContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40, // Increased margin since no title above
    marginBottom: 20,
    height: 220, // Increased height for bigger ball
    position: 'relative',
  },
  
  // Center ball styles
  centerBall: {
    width: CENTER_BALL_SIZE,
    height: CENTER_BALL_SIZE,
    borderRadius: CENTER_BALL_SIZE / 2,
    backgroundColor: 'rgba(87, 210, 246, 0.4)', // Made more transparent
    borderWidth: 2,
    borderColor: 'rgba(87, 210, 246, 0.6)',
    shadowColor: '#57D2F6',
    shadowOpacity: 0.3,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Title inside the ball
  titleInsideBall: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(87, 210, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  
  // Explosion particles
  particle: {
    position: 'absolute',
  },
  
  title: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  forgotLink: { fontSize: 14, color: '#4dabf7' },
  errorText: { color: '#ff4d4f', fontSize: 14, marginTop: 8 },

  // Button
  signInBtn: {
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
  signInBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Bottom section
  signupWrap: {
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 20,
  },
  signupText: { fontSize: 16, color: '#f0f0f0' },
  signupLink: { fontSize: 16, fontWeight: '700', color: '#4dabf7' },
});

export default SignIn;