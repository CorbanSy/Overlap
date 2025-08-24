// app/index.jsx - UPDATED WITH CASCADING ANIMATION
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing as RNEasing, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';

const BG = '#0D1117'; // Updated to match home.tsx
const ORB_COUNT = 24; // Increased for more particles
const EDGE_PAD  = 16;
const CENTER_BASE = 80; // base px for center ball (we scale this)
const PARTICLE_COUNT = 15; // Extra ambient particles

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
  const [particles, setParticles] = useState([]); // Extra ambient particles

  // Growing center ball
  const centerScale = useRef(new Animated.Value(0)).current; // 0 → targetScale
  const [centerPos, setCenterPos] = useState({ left: 0, top: 0 });

  // Updated palette to match home.tsx colors
  const palette = useMemo(() => ['#F5A623', '#1B1F24', '#AAAAAA', '#FFF', '#333'], []);

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

  // Enhanced orb creation with dynamic movement patterns
  useEffect(() => {
    if (!stage.w || !stage.h) return;
    const { points, minDist } = samplePoisson(stage.w, stage.h, ORB_COUNT, EDGE_PAD);

    const sizeMin = Math.max(36, 0.60 * minDist);
    const sizeMax = Math.min(160, 1.10 * minDist);

    const created = points.slice(0, ORB_COUNT).map((p, i) => {
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      
      // Enhanced floating patterns
      const pattern = Math.floor(Math.random() * 4); // 4 different movement patterns
      
      let ampX, ampY, rotationRadius, rotationSpeed, phaseOffset;
      
      switch(pattern) {
        case 0: // Linear drift (original)
          ampX = (minDist * (0.10 + Math.random() * 0.08)) * (Math.random() < 0.5 ? -1 : 1);
          ampY = (minDist * (0.10 + Math.random() * 0.08)) * (Math.random() < 0.5 ? -1 : 1);
          rotationRadius = 0;
          rotationSpeed = 0;
          break;
          
        case 1: // Circular motion
          ampX = 0;
          ampY = 0;
          rotationRadius = minDist * (0.08 + Math.random() * 0.06);
          rotationSpeed = (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.3);
          break;
          
        case 2: // Figure-8 / Lissajous
          ampX = minDist * (0.08 + Math.random() * 0.05);
          ampY = minDist * (0.06 + Math.random() * 0.04);
          rotationRadius = 0;
          rotationSpeed = (Math.random() < 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.4);
          break;
          
        case 3: // Elliptical orbit
          ampX = minDist * (0.06 + Math.random() * 0.04);
          ampY = minDist * (0.10 + Math.random() * 0.06);
          rotationRadius = 0;
          rotationSpeed = (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.3);
          break;
      }
      
      phaseOffset = Math.random() * Math.PI * 2; // Random starting phase
      
      return {
        key: `orb-${i}`,
        color: palette[i % palette.length],
        size,
        depth: 0.22 + Math.random() * 0.18,
        pattern,
        ampX, ampY,
        rotationRadius,
        rotationSpeed,
        phaseOffset,
        pos: { x: new Animated.Value(p.x - size / 2), y: new Animated.Value(p.y - size / 2) },
        scale: new Animated.Value(1),
      };
    });

    setOrbs(created);

    // Create extra ambient particles
    const particlePositions = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePositions.push({
        x: EDGE_PAD + Math.random() * (stage.w - EDGE_PAD * 2),
        y: EDGE_PAD + Math.random() * (stage.h - EDGE_PAD * 2),
      });
    }

    const ambientParticles = particlePositions.map((p, i) => {
      const size = 8 + Math.random() * 16; // Small particles
      const ampX = (20 + Math.random() * 15) * (Math.random() < 0.5 ? -1 : 1);
      const ampY = (20 + Math.random() * 15) * (Math.random() < 0.5 ? -1 : 1);
      
      return {
        key: `particle-${i}`,
        color: palette[Math.floor(Math.random() * palette.length)],
        size,
        depth: 0.1 + Math.random() * 0.15, // More transparent
        ampX, ampY,
        phaseOffset: Math.random() * Math.PI * 2,
        pos: { x: new Animated.Value(p.x - size / 2), y: new Animated.Value(p.y - size / 2) },
        scale: new Animated.Value(1),
      };
    });

    setParticles(ambientParticles);

    // Simple center ball setup - no complex calculations needed
    centerScale.setValue(0.0001);
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

    // CASCADING ANIMATION - Groups of orbs that start when previous group is halfway
    const cx = stage.w / 2;
    const cy = stage.h / 2;
    
    // Create cascading groups: 1, 2, 4, 8, remaining
    const groups = [];
    let orbIndex = 0;
    const groupSizes = [1, 2, 4, 8]; // Then all remaining
    
    groupSizes.forEach(size => {
      if (orbIndex < orbs.length) {
        const groupOrbs = orbs.slice(orbIndex, Math.min(orbIndex + size, orbs.length));
        groups.push(groupOrbs);
        orbIndex += size;
      }
    });
    
    // Add remaining orbs as final group
    if (orbIndex < orbs.length) {
      groups.push(orbs.slice(orbIndex));
    }

    const moveDuration = 300;
    const halfwayTime = moveDuration / 2; // 150ms
    const scaleDuration = 150;
    const baseDelay = 60;

    const allAnimations = [];
    let groupStartDelay = baseDelay;

    groups.forEach((groupOrbs, groupIndex) => {
      groupOrbs.forEach((o, orbIndexInGroup) => {
        const tx = cx - o.size / 2;
        const ty = cy - o.size / 2;
        
        // Small stagger within each group for natural feel
        const inGroupDelay = orbIndexInGroup * 20;
        const totalDelay = groupStartDelay + inGroupDelay;
        
        const orbAnimation = Animated.parallel([
          Animated.timing(o.pos.x, { 
            toValue: tx, 
            duration: moveDuration, 
            delay: totalDelay, 
            easing: RNEasing.out(RNEasing.cubic), 
            useNativeDriver: true 
          }),
          Animated.timing(o.pos.y, { 
            toValue: ty, 
            duration: moveDuration, 
            delay: totalDelay, 
            easing: RNEasing.out(RNEasing.cubic), 
            useNativeDriver: true 
          }),
          Animated.timing(o.scale, { 
            toValue: 0.1,
            duration: scaleDuration,
            delay: totalDelay + moveDuration - scaleDuration,
            easing: RNEasing.out(RNEasing.cubic), 
            useNativeDriver: true 
          }),
        ]);
        
        allAnimations.push(orbAnimation);
      });
      
      // Next group starts when this group is halfway through their journey
      groupStartDelay += halfwayTime;
    });

    // Simple center ball growth - just grows naturally as orbs arrive
    const totalOrbs = orbs.length;
    const finalScale = Math.min(stage.w, stage.h) * 0.4 / CENTER_BASE; // Simple final size
    
    // Start growing after first orb starts moving, finish when last orb arrives
    const firstOrbStart = baseDelay;
    const lastOrbArrival = baseDelay + (groups.length - 1) * halfwayTime + moveDuration;
    const totalGrowthTime = lastOrbArrival - firstOrbStart;
    
    const centerGrowth = Animated.timing(centerScale, {
      toValue: finalScale,
      duration: totalGrowthTime,
      delay: firstOrbStart,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: true,
    });

    // Start all animations
    Animated.parallel([
      ...allAnimations,
      centerGrowth,
    ]).start(() => router.push('/sign-in'));
  };

  // Centers for ripple
  const rippleLeft = stage.w ? stage.w / 2 - 140 : 0;
  const rippleTop  = stage.h ? stage.h / 2 - 140 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0D1117', '#1B1F24', '#161B22']} // Updated gradient to match home.tsx
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
          {/* BACKGROUND: scattered orbs with dynamic movement */}
          <View style={styles.orbLayer} pointerEvents="none">
            {/* Main orbs */}
            {orbs.map((o) => {
              let translateX, translateY;
              
              switch(o.pattern) {
                case 0: // Linear drift
                  translateX = Animated.add(o.pos.x, Animated.multiply(floatUnit, o.ampX));
                  translateY = Animated.add(o.pos.y, Animated.multiply(floatUnit, o.ampY));
                  break;
                  
                case 1: // Circular motion
                  const circleTime = Animated.add(
                    Animated.multiply(floatUnit, Math.PI * o.rotationSpeed),
                    o.phaseOffset
                  );
                  translateX = Animated.add(
                    o.pos.x, 
                    Animated.multiply(floatUnit, o.rotationRadius * Math.cos(o.phaseOffset))
                  );
                  translateY = Animated.add(
                    o.pos.y,
                    Animated.multiply(floatUnit, o.rotationRadius * Math.sin(o.phaseOffset))
                  );
                  break;
                  
                case 2: // Figure-8 / Lissajous
                  translateX = Animated.add(
                    o.pos.x,
                    Animated.multiply(floatUnit, o.ampX * Math.sin(o.phaseOffset))
                  );
                  translateY = Animated.add(
                    o.pos.y,
                    Animated.multiply(floatUnit, o.ampY * Math.sin(o.phaseOffset * 2))
                  );
                  break;
                  
                case 3: // Elliptical orbit  
                  translateX = Animated.add(
                    o.pos.x,
                    Animated.multiply(floatUnit, o.ampX * Math.cos(o.phaseOffset))
                  );
                  translateY = Animated.add(
                    o.pos.y,
                    Animated.multiply(floatUnit, o.ampY * Math.sin(o.phaseOffset))
                  );
                  break;
                  
                default:
                  translateX = o.pos.x;
                  translateY = o.pos.y;
              }

              return (
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
                        { translateX },
                        { translateY },
                        { scale: o.scale },
                      ],
                    },
                  ]}
                />
              );
            })}

            {/* Ambient particles */}
            {particles.map((p) => {
              const translateX = Animated.add(p.pos.x, Animated.multiply(floatUnit, p.ampX));
              const translateY = Animated.add(p.pos.y, Animated.multiply(floatUnit, p.ampY));

              return (
                <Animated.View
                  key={p.key}
                  style={[
                    styles.orb,
                    {
                      width: p.size,
                      height: p.size,
                      borderRadius: p.size / 2,
                      backgroundColor: p.color,
                      opacity: p.depth,
                      transform: [
                        { translateX },
                        { translateY },
                        { scale: p.scale },
                      ],
                    },
                  ]}
                />
              );
            })}

            {/* center ripple */}
            <Animated.View
              style={[
                styles.ripple,
                { left: rippleLeft, top: rippleTop, opacity: rippleOpacity, transform: [{ scale: rippleScale }] },
              ]}
            />

            {/* growing center ball with orbital particles */}
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
            
            {/* Orbital particles around center ball */}
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const radius = CENTER_BASE * 0.8;
              const orbitalX = centerPos.left + CENTER_BASE / 2 + Math.cos(angle) * radius - 4;
              const orbitalY = centerPos.top + CENTER_BASE / 2 + Math.sin(angle) * radius - 4;
              
              const orbitalTranslateX = Animated.add(
                orbitalX,
                Animated.multiply(floatUnit, 15 * Math.cos(angle + Math.PI / 4))
              );
              const orbitalTranslateY = Animated.add(
                orbitalY,
                Animated.multiply(floatUnit, 15 * Math.sin(angle + Math.PI / 4))
              );

              return (
                <Animated.View
                  key={`orbital-${i}`}
                  style={[
                    styles.orb,
                    {
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#F5A623',
                      opacity: 0.3,
                      transform: [
                        { translateX: orbitalTranslateX },
                        { translateY: orbitalTranslateY },
                        { scale: centerScale },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* FOREGROUND UI */}
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Overlap</Text>
              <Text style={styles.subtitle}>Find the sweet spot with friends</Text>
            </View>

            <View style={styles.hero}>
              {/* Empty hero space for visual balance */}
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
              
              <BlurView intensity={35} tint="dark" style={styles.glassCard}>
                <Text style={styles.glassText}>Swipe what you like—Overlap does the rest.</Text>
              </BlurView>
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
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 20 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: 0.8 },
  subtitle: { color: '#AAAAAA', marginTop: 4, fontSize: 14 }, // Updated to match home.tsx

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  orb: { position: 'absolute' },

  ripple: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: '#F5A623', // Updated to match home.tsx accent color
  },

  centerBall: {
    position: 'absolute',
    width: CENTER_BASE,
    height: CENTER_BASE,
    borderRadius: CENTER_BASE / 2,
    backgroundColor: '#F5A623', // Updated to match home.tsx accent color
    opacity: 0.65,
  },

  glassCard: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  glassText: { color: '#FFFFFF', fontSize: 14 }, // Updated to white for better contrast

  footer: { paddingBottom: 28, alignItems: 'center' },
  startBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 280,
    backgroundColor: '#F5A623', // Updated to match home.tsx accent color
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
  startText: { fontSize: 20, fontWeight: '700', color: '#0D1117', letterSpacing: 0.3 }, // Updated text color for contrast
});