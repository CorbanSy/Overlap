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
const ORB_COUNT = 18;
const EDGE_PAD  = 16;
const CENTER_BASE = 80; // base px for center ball (we scale this)

// ----- Poisson-disc scatter for natural, even placement -----
function samplePoisson(width, height, targetCount, edgePad) {
  const W = Math.max(0, width  - edgePad * 2);
  const H = Math.max(0, height - edgePad * 2);
  const area = W * H;
  const minDist = Math.max(36, 0.75 * Math.sqrt(area / Math.max(1, targetCount)));
  const k = 25;
  const cellSize = minDist / Math.SQRT2;
  const gx = Math.max(1, Math.ceil(W / cellSize));
  const gy = Math.max(1, Math.ceil(H / cellSize));
  const grid = Array(gx * gy).fill(-1);

  const pts = [];
  const active = [];

  const randInBounds = () => ({ x: edgePad + Math.random() * W, y: edgePad + Math.random() * H });
  const gi = (x, y) => {
    const cx = Math.floor((x - edgePad) / cellSize);
    const cy = Math.floor((y - edgePad) / cellSize);
    return cy * gx + cx;
  };
  const valid = (x, y) => {
    if (x < edgePad || x > width - edgePad || y < edgePad || y > height - edgePad) return false;
    const cx = Math.floor((x - edgePad) / cellSize);
    const cy = Math.floor((y - edgePad) / cellSize);
    for (let yy = Math.max(0, cy - 2); yy <= Math.min(gy - 1, cy + 2); yy++) {
      for (let xx = Math.max(0, cx - 2); xx <= Math.min(gx - 1, cx + 2); xx++) {
        const idx = grid[yy * gx + xx];
        if (idx !== -1) {
          const p = pts[idx];
          const dx = p.x - x, dy = p.y - y;
          if (dx * dx + dy * dy < minDist * minDist) return false;
        }
      }
    }
    return true;
  };

  const p0 = randInBounds();
  pts.push(p0);
  active.push(0);
  grid[gi(p0.x, p0.y)] = 0;

  while (active.length && pts.length < targetCount) {
    const aIndex = active[(Math.random() * active.length) | 0];
    const a = pts[aIndex];
    let found = false;

    for (let i = 0; i < k; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = minDist * (1 + Math.random()); // r..2r
      const x = a.x + Math.cos(ang) * rad;
      const y = a.y + Math.sin(ang) * rad;
      if (!valid(x, y)) continue;
      pts.push({ x, y });
      const idx = pts.length - 1;
      grid[gi(x, y)] = idx;
      active.push(idx);
      found = true;
      break;
    }
    if (!found) {
      const last = active.pop();
      if (aIndex < active.length) active[aIndex] = last;
    }
  }

  while (pts.length < targetCount) {
    const c = randInBounds();
    const ok = pts.every(p => {
      const dx = p.x - c.x, dy = p.y - c.y;
      return dx * dx + dy * dy >= (minDist * 0.75) ** 2;
    });
    if (ok) pts.push(c);
  }
  return { points: pts, minDist };
}

export default function App() {
  // Loops (native)
  const floatAnim = useRef(new Animated.Value(0)).current;

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

  // Growing center ball
  const centerScale = useRef(new Animated.Value(0)).current; // 0 → targetScale
  const [centerPos, setCenterPos] = useState({ left: 0, top: 0 });
  const [centerStepScales, setCenterStepScales] = useState([]); // step targets per arriving orb

  // Palette
  const palette = useMemo(() => ['#7C4DFF', '#00E5FF', '#61F3F3', '#8E7CFF', '#43E8E1'], []);

  // Float loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim]);

  const floatUnit = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] }); // -1..1

  // Center ball position
  useEffect(() => {
    if (!stage.w || !stage.h) return;
    setCenterPos({ left: stage.w / 2 - CENTER_BASE / 2, top: stage.h / 2 - CENTER_BASE / 2 });
  }, [stage]);

  // Poisson scatter + per-orb drift; then compute center growth targets
  useEffect(() => {
    if (!stage.w || !stage.h) return;
    const { points, minDist } = samplePoisson(stage.w, stage.h, ORB_COUNT, EDGE_PAD);

    const sizeMin = Math.max(36, 0.60 * minDist);
    const sizeMax = Math.min(160, 1.10 * minDist);

    const created = points.slice(0, ORB_COUNT).map((p, i) => {
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      const ampX = (minDist * (0.10 + Math.random() * 0.06)) * (Math.random() < 0.5 ? -1 : 1);
      const ampY = (minDist * (0.10 + Math.random() * 0.06)) * (Math.random() < 0.5 ? -1 : 1);
      return {
        key: `orb-${i}`,
        color: palette[i % palette.length],
        size,
        depth: 0.22 + Math.random() * 0.18,
        ampX, ampY,
        pos: { x: new Animated.Value(p.x - size / 2), y: new Animated.Value(p.y - size / 2) }, // native
        scale: new Animated.Value(1),
      };
    });

    setOrbs(created);

    // ---------- FINAL TARGET + STEP SCALES (no early plateau) ----------
    const areas = created.map(o => Math.PI * (o.size / 2) ** 2);
    const totalArea = areas.reduce((a, b) => a + b, 0);

    const maxDiameter = Math.min(stage.w, stage.h) - EDGE_PAD * 2; // fill more of screen
    const finalUncapped = 2 * Math.sqrt(totalArea / Math.PI);     // equivalent diameter for all orbs
    const finalDiameter = Math.max(
      CENTER_BASE * 0.6,
      Math.min(finalUncapped, maxDiameter)
    );

    // Build step scales proportional to cumulative area / total area
    const stepScales = [];
    let cum = 0;
    for (let i = 0; i < areas.length; i++) {
      cum += areas[i];
      const d = finalDiameter * (cum / totalArea); // grows every merge
      stepScales.push(d / CENTER_BASE);
    }
    setCenterStepScales(stepScales);
    centerScale.setValue(0.0001); // tiny dot to start
  }, [stage, palette]);

  const handleStart = () => {
    // Ripple
    rippleScale.stopAnimation(() => rippleScale.setValue(0));
    rippleOpacity.stopAnimation(() => rippleOpacity.setValue(0.4));
    Animated.parallel([
      Animated.timing(rippleScale,   { toValue: 1, duration: 700, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }),
      Animated.timing(rippleOpacity, { toValue: 0, duration: 700, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }),
    ]).start();

    // Button micro
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 280, easing: RNEasing.out(RNEasing.ease), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10,  duration: 260, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: true }),
    ]).start();

    // Collapse orbs to center (native)
    const cx = stage.w / 2;
    const cy = stage.h / 2;
    const orbArrivals = orbs.map((o, idx) => {
      const tx = cx - o.size / 2;
      const ty = cy - o.size / 2;
      return Animated.parallel([
        Animated.timing(o.pos.x, { toValue: tx, duration: 650, delay: idx * 30, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
        Animated.timing(o.pos.y, { toValue: ty, duration: 650, delay: idx * 30, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
        Animated.timing(o.scale, { toValue: 0.6, duration: 650, delay: idx * 30, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
      ]);
    });

    // Center ball growth: sequence, proportional to mass merged
    const growthSeq = [
      Animated.delay(120), // slight lag so it “absorbs” after first arrivals
      ...centerStepScales.flatMap((toVal, idx) => ([
        Animated.timing(centerScale, {
          toValue: toVal,
          duration: 240,
          easing: RNEasing.out(RNEasing.cubic),
          useNativeDriver: true,
        }),
        ...(idx < centerStepScales.length - 1 ? [Animated.delay(30)] : []),
      ])),
    ];

    Animated.parallel([
      Animated.stagger(30, orbArrivals), // orbs fly in
      Animated.sequence(growthSeq),      // center grows step-by-step
    ]).start(() => router.push('/sign-in'));
  };

  // Centers for ripple
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
        <View
          style={styles.stage}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setStage({ w: width, h: height });
          }}
        >
          {/* BACKGROUND: scattered orbs (no big center glow) */}
          <View style={styles.orbLayer} pointerEvents="none">
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

            {/* center ripple */}
            <Animated.View
              style={[
                styles.ripple,
                { left: rippleLeft, top: rippleTop, opacity: rippleOpacity, transform: [{ scale: rippleScale }] },
              ]}
            />

            {/* growing center ball */}
            <Animated.View
              style={[
                styles.centerBall,
                {
                  left: centerPos.left,
                  top: centerPos.top,
                  transform: [{ scale: centerScale }],
                },
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

  orb: { position: 'absolute' },

  ripple: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: '#61F3F3',
  },

  // center ball (we scale this; base size constant)
  centerBall: {
    position: 'absolute',
    width: CENTER_BASE,
    height: CENTER_BASE,
    borderRadius: CENTER_BASE / 2,
    backgroundColor: '#57D2F6',
    opacity: 0.65,
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
