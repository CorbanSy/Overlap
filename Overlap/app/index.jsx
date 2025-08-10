// app/index.jsx
import React, { useRef, useState } from 'react';
import { View, Image, Animated, Easing as RNEasing, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import VennDiagram from '../components/VennDiagram';
import 'react-native-reanimated';

export default function App() {
  const [startVennAnimation, setStartVennAnimation] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleStart = () => {
    setStartVennAnimation(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 400,
        easing: RNEasing.out(RNEasing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 400,
        easing: RNEasing.inOut(RNEasing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleVennAnimationComplete = () => {
    router.push('/sign-in');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.hero}>
          {/* Give the wrapper explicit size + overflow hidden */}
          <View style={styles.vennWrap}>
            <VennDiagram
              startAnimation={startVennAnimation}
              onAnimationComplete={handleVennAnimationComplete}
            />
          </View>

          <Animated.View
            style={[
              styles.badgeWrap,
              { transform: [{ scale: scaleAnim }, { translateY: slideAnim }] },
            ]}
          >
            <Image
              source={{ uri: 'https://via.placeholder.com/150' }}
              style={styles.badge}
            />
          </Animated.View>
        </View>

        {/* Big white rounded CTA */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleStart} activeOpacity={0.85} style={styles.startBtn}>
            <Text style={styles.startText}>Start</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const BG = '#161622';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 20 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Tweak these dims to match your VennDiagram's natural size
  vennWrap: {
    width: 280,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',               // ⬅ hides stray corners
    transform: [{ scale: 1.15 }],
    marginBottom: 24,
  },

  badgeWrap: { marginTop: 8 },
  badge: { width: 96, height: 96, borderRadius: 48 },

  footer: { paddingBottom: 28, alignItems: 'center' },

  // Big white rounded button
  startBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minWidth: 280,
    alignItems: 'center',
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  startText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 0.3,
  },
});
