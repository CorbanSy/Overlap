// app/index.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing as RNEasing, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';

const BG = '#161622';
const ORB_COUNT = 18;     // tweak to taste
const EDGE_PAD  = 16;     // keep away from the edges

export default function App() {
  // Loops (native)
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  // Ripple (native)
  const rippleScale   = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  // CTA micro motion (native)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Full-screen layout
  const [stage, setStage] = useState({ w: 0, h: 0 });

  // Orbs
  const [orbs, setOrbs] = useState([]);

  // Colors
  const palette = useMemo(() => ['#7C4DFF', '#00E5FF', '#61F3F3', '#8E7CFF', '#43E8E1'], []);

  // Loops
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, easing: RNEasing.inOut(RNEasing.quad), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, easing: RNEasing.inOut(RNEasing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim, glowAnim]);

  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  const floatUnit   = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] }); // -1..1

  // Utility
  const clamp = (n, a, b) => Math.max(a, Math.min(n, b));

  // Jittered-grid placement for even spread
  useEffect(() => {
    if (!stage.w || !stage.h) return;

    // choose grid dims close to square, adjusted for aspect ratio
    const aspect = stage.w / Math.max(1, stage.h);
    const cols   = Math.max(3, Math.round(Math.sqrt(ORB_COUNT * aspect)));
    const rows   = Math.max(3, Math.ceil(ORB_COUNT / cols));

    const cellW  = (stage.w - EDGE_PAD * 2) / cols;
    const cellH  = (stage.h - EDGE_PAD * 2) / rows;
    const cellMin = Math.min(cellW, cellH);

    // sizes scale with cell so they don't clump/overwhelm
    const sizeMin = cellMin * 0.60;
    const sizeMax = cellMin * 0.95;

    const created = Array.from({ length: ORB_COUNT }).map((_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);

      // base cell origin
      const baseX = EDGE_PAD + c * cellW;
      const baseY = EDGE_PAD + r * cellH;

      // pick a size that fits this cell
      const size  = clamp(sizeMin + Math.random() * (sizeMax - sizeMin), 28, 200);

      // jitter within cell, away from hard edges
      const padX = Math.max(0, (cellW - size) * 0.15);
      const padY = Math.max(0, (cellH - size) * 0.15);
      const x0   = baseX + padX + Math.random() * Math.max(2, cellW - size - padX * 2);
      const y0   = baseY + padY + Math.random() * Math.max(2, cellH - size - padY * 2);

      // gentle drift per orb, proportional to cell size
      const ampX = (cellW * (0.08 + Math.random() * 0.08)) * (Math.random() < 0.5 ? -1 : 1);
      const ampY = (cellH * (0.08 + Math.random() * 0.08)) * (Math.random() < 0.5 ? -1 : 1);

      return {
        key: `orb-${i}`,
        color: palette[i % palette.length],
        size,
        depth: 0.22 + Math.random() * 0.18, // opacity for depth
        ampX,
        ampY,
        pos: { x: new Animated.Value(x0), y: new Animated.Value(y0) }, // native-friendly
        scale: new Animated.Value(1),
      };
    });

    setOrbs(created);
  }, [stage, palette]);

  const handleStart = () => {
    // ripple
    rippleScale.stopAnimation(() => rippleScale.setValue(0));
    rippleOpacity.stopAnimation(() => rippleOpacity.setValue(0.4));
    Animated.parallel([
      Animated.timing(rippleScale,   { toValue: 1, duration: 700, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }),
      Animated.timing(rippleOpacity, { toValue: 0, duration: 700, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }),
    ]).start();

    // button micro motion
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 280, easing: RNEasing.out(RNEasing.ease), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10,  duration: 260, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: true }),
    ]).start();

    // collapse to center (native)
    const cx = stage.w / 2;
    const cy = stage.h / 2;

    const animations = orbs.map((o, idx) => {
      const tx = cx - o.size / 2;
      const ty = cy - o.size / 2;

      return Animated.parallel([
        Animated.timing(o.pos.x, { toValue: tx, duration: 650, delay: idx * 30, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
        Animated.timing(o.pos.y, { toValue: ty, duration: 650, delay: idx * 30, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
        Animated.timing(o.scale, { toValue: 0.6, duration: 650, delay: idx * 30, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
      ]);
    });

    Animated.stagger(30, animations).start(() => router.push('/sign-in'));
  };

  // centers for glow/ripple
  const glowLeft   = stage.w ? stage.w / 2 - 180 : 0;
  const glowTop    = stage.h ? stage.h / 2 - 180 : 0;
  const rippleLeft = stage.w ? stage.w / 2 - 140 : 0;
  const rippleTop  = stage.h ? stage.h / 2 - 140 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#12121A', '#0F1220', '#0B0F1E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      >
        {/* Stage covers entire screen so orbs can fill it */}
        <View
          style={styles.stage}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setStage({ w: width, h: height });
          }}
        >
          {/* BACKGROUND: Orbs + glow */}
          <View style={styles.orbLayer} pointerEvents="none">
            <Animated.View
              style={[
                styles.glow,
                { left: glowLeft, top: glowTop, opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />
            {orbs.map((o) => (
              <Animated.View
                key={o.key}
                style={[
                  styles.orb,
                  {
                    width: o.size,
                    height: o.size,
                    borderRadius: o.size / 2,
                    backgroundColor: o.color,
                    opacity: o.depth,
                    transform: [
                      { translateX: Animated.add(o.pos.x, Animated.multiply(floatUnit, o.ampX)) },
                      { translateY: Animated.add(o.pos.y, Animated.multiply(floatUnit, o.ampY)) },
                      { scale: o.scale },
                    ],
                  },
                ]}
              />
            ))}
            <Animated.View
              style={[
                styles.ripple,
                { left: rippleLeft, top: rippleTop, opacity: rippleOpacity, transform: [{ scale: rippleScale }] },
              ]}
            />
          </View>

          {/* FOREGROUND UI */}
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Overlap</Text>
              <Text style={styles.subtitle}>Find the sweet spot with friends</Text>
            </View>

            <View style={styles.hero}>
              <BlurView intensity={35} tint="dark" style={styles.glassCard}>
                <Text style={styles.glassText}>Swipe what you like—Overlap does the rest.</Text>
              </BlurView>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleStart}
                activeOpacity={0.9}
                style={[styles.startBtn, { transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}
              >
                <View style={styles.startGradient}>
                  <Ionicons name="arrow-forward" size={22} color="#0D1117" />
                  <Text style={styles.startText}>Start</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  gradientBg: { flex: 1 },

  stage: { flex: 1, position: 'relative' },
  orbLayer: { ...StyleSheet.absoluteFillObject },

  container: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: 0.8 },
  subtitle: { color: '#AAB2C8', marginTop: 4, fontSize: 14 },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  glow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: '#61F3F3',
  },

  orb: { position: 'absolute' },

  ripple: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: '#61F3F3',
  },

  glassCard: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  glassText: { color: '#DDE3F3', fontSize: 14 },

  footer: { paddingBottom: 28, alignItems: 'center' },
  startBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 280,
    backgroundColor: '#A3FFB0',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  startGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  startText: { fontSize: 20, fontWeight: '700', color: '#111', letterSpacing: 0.3 },
});
