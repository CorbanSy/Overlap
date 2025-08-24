// app/index.jsx - ENHANCED VERSION
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Animated, Easing as RNEasing, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG = '#0D1117';
const ORB_COUNT = 28; // Slightly increased
const EDGE_PAD = 20;
const CENTER_BASE = 90;
const PARTICLE_COUNT = 20;

// Cohesive monochromatic palette with warm tones
const ENHANCED_PALETTE = [
  '#F5A623', // Primary gold
  '#E8941C', // Darker gold
  '#FFB84D', // Lighter gold  
  '#D4860F', // Deep gold
  '#FFC266', // Pale gold
  '#C77A08', // Bronze gold
  '#FFCD80', // Cream gold
  '#B86F05', // Dark bronze
];

// Performance-optimized Poisson-disc sampling
function samplePoisson(width, height, targetCount, edgePad) {
  const W = Math.max(0, width - edgePad * 2);
  const H = Math.max(0, height - edgePad * 2);
  const area = W * H;
  const minDist = Math.max(40, 0.8 * Math.sqrt(area / Math.max(1, targetCount)));
  const k = 30;
  const cellSize = minDist / Math.SQRT2;
  const gx = Math.max(1, Math.ceil(W / cellSize));
  const gy = Math.max(1, Math.ceil(H / cellSize));
  const grid = new Array(gx * gy).fill(-1);

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
    const aIndex = Math.floor(Math.random() * active.length);
    const a = pts[aIndex];
    let found = false;

    for (let i = 0; i < k; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = minDist * (1 + Math.random());
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

  // Fill remaining spots with fallback positioning
  while (pts.length < targetCount) {
    const c = randInBounds();
    const minDistanceOk = pts.every(p => {
      const dx = p.x - c.x, dy = p.y - c.y;
      return dx * dx + dy * dy >= (minDist * 0.6) ** 2;
    });
    if (minDistanceOk) pts.push(c);
  }
  
  return { points: pts, minDist };
}

export default function App() {
  // Core animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current; // New pulse animation
  
  // Ripple effects
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const secondaryRippleScale = useRef(new Animated.Value(0)).current;
  const secondaryRippleOpacity = useRef(new Animated.Value(0)).current;
  
  // Button animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonGlow = useRef(new Animated.Value(0)).current;
  
  // Title animations
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const titleScale = useRef(new Animated.Value(1)).current;
  
  // Layout state
  const [stage, setStage] = useState({ w: SCREEN_WIDTH, h: SCREEN_HEIGHT });
  const [orbs, setOrbs] = useState([]);
  const [particles, setParticles] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Center elements
  const centerScale = useRef(new Animated.Value(0)).current;
  const [centerPos, setCenterPos] = useState({ left: 0, top: 0 });
  
  const palette = useMemo(() => ENHANCED_PALETTE, []);

  // Enhanced floating animation with multiple layers
  useEffect(() => {
    // Primary float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { 
          toValue: 1, 
          duration: 4000, 
          easing: RNEasing.inOut(RNEasing.sin), 
          useNativeDriver: true 
        }),
        Animated.timing(floatAnim, { 
          toValue: 0, 
          duration: 4000, 
          easing: RNEasing.inOut(RNEasing.sin), 
          useNativeDriver: true 
        }),
      ])
    ).start();

    // Pulse animation for subtle breathing effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { 
          toValue: 1, 
          duration: 2500, 
          easing: RNEasing.inOut(RNEasing.ease), 
          useNativeDriver: true 
        }),
        Animated.timing(pulseAnim, { 
          toValue: 0, 
          duration: 2500, 
          easing: RNEasing.inOut(RNEasing.ease), 
          useNativeDriver: true 
        }),
      ])
    ).start();

    // Button glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonGlow, { 
          toValue: 1, 
          duration: 2000, 
          easing: RNEasing.inOut(RNEasing.ease), 
          useNativeDriver: true 
        }),
        Animated.timing(buttonGlow, { 
          toValue: 0, 
          duration: 2000, 
          easing: RNEasing.inOut(RNEasing.ease), 
          useNativeDriver: true 
        }),
      ])
    ).start();
  }, []);

  const floatUnit = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] });
  const pulseUnit = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });
  const glowOpacity = buttonGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  // Center positioning - match CenterBall position exactly
  useEffect(() => {
    if (!stage.w || !stage.h) return;
    // CenterBall has marginTop: 80 + marginBottom: 40 + height: 220
    // So the center is roughly at 80 + 110 = 190px from top
    // As percentage: 190 / screen_height. Let's use a more precise match.
    setCenterPos({ 
      left: stage.w / 2 - CENTER_BASE / 2, 
      top: 140 // Fixed position to match CenterBall exactly
    });
  }, [stage]);

  // Enhanced orb creation with improved movement patterns
  useEffect(() => {
    if (!stage.w || !stage.h) return;
    
    const { points, minDist } = samplePoisson(stage.w, stage.h, ORB_COUNT, EDGE_PAD);
    const sizeMin = Math.max(32, 0.55 * minDist);
    const sizeMax = Math.min(120, 0.95 * minDist);

    const created = points.slice(0, ORB_COUNT).map((p, i) => {
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      const pattern = Math.floor(Math.random() * 5); // 5 movement patterns
      
      let config = {};
      
      switch(pattern) {
        case 0: // Gentle drift
          config = {
            ampX: (minDist * (0.08 + Math.random() * 0.06)) * (Math.random() < 0.5 ? -1 : 1),
            ampY: (minDist * (0.08 + Math.random() * 0.06)) * (Math.random() < 0.5 ? -1 : 1),
            rotationRadius: 0,
            rotationSpeed: 0,
          };
          break;
          
        case 1: // Circular orbit
          config = {
            ampX: 0,
            ampY: 0,
            rotationRadius: minDist * (0.06 + Math.random() * 0.08),
            rotationSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4),
          };
          break;
          
        case 2: // Figure-8 pattern
          config = {
            ampX: minDist * (0.06 + Math.random() * 0.05),
            ampY: minDist * (0.04 + Math.random() * 0.04),
            rotationRadius: 0,
            rotationSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.3),
          };
          break;
          
        case 3: // Elliptical motion
          config = {
            ampX: minDist * (0.05 + Math.random() * 0.04),
            ampY: minDist * (0.08 + Math.random() * 0.06),
            rotationRadius: 0,
            rotationSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.2),
          };
          break;
          
        case 4: // Spiral motion
          config = {
            ampX: minDist * (0.04 + Math.random() * 0.03),
            ampY: minDist * (0.04 + Math.random() * 0.03),
            rotationRadius: minDist * (0.02 + Math.random() * 0.04),
            rotationSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4),
          };
          break;
      }
      
      return {
        key: `orb-${i}`,
        color: palette[i % palette.length],
        size,
        depth: 0.15 + Math.random() * 0.25,
        pattern,
        ...config,
        phaseOffset: Math.random() * Math.PI * 2,
        pos: { 
          x: new Animated.Value(p.x - size / 2), 
          y: new Animated.Value(p.y - size / 2) 
        },
        scale: new Animated.Value(1),
        rotation: new Animated.Value(0),
      };
    });

    setOrbs(created);

    // Enhanced ambient particles
    const particlePositions = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: EDGE_PAD + Math.random() * (stage.w - EDGE_PAD * 2),
      y: EDGE_PAD + Math.random() * (stage.h - EDGE_PAD * 2),
    }));

    const ambientParticles = particlePositions.map((p, i) => {
      const size = 6 + Math.random() * 18;
      const speed = 0.8 + Math.random() * 0.6;
      
      return {
        key: `particle-${i}`,
        color: palette[Math.floor(Math.random() * palette.length)],
        size,
        depth: 0.08 + Math.random() * 0.18,
        ampX: (15 + Math.random() * 20) * (Math.random() < 0.5 ? -1 : 1) * speed,
        ampY: (15 + Math.random() * 20) * (Math.random() < 0.5 ? -1 : 1) * speed,
        phaseOffset: Math.random() * Math.PI * 2,
        pos: { 
          x: new Animated.Value(p.x - size / 2), 
          y: new Animated.Value(p.y - size / 2) 
        },
        scale: new Animated.Value(1),
      };
    });

    setParticles(ambientParticles);
    centerScale.setValue(0.0001);
  }, [stage, palette]);

  // Enhanced start animation with better choreography
  const handleStart = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Enhanced ripple effects
    rippleScale.setValue(0);
    rippleOpacity.setValue(0.6);
    secondaryRippleScale.setValue(0);
    secondaryRippleOpacity.setValue(0.4);

    const rippleAnimations = Animated.parallel([
      Animated.timing(rippleScale, { 
        toValue: 1.2, 
        duration: 800, 
        easing: RNEasing.out(RNEasing.cubic), 
        useNativeDriver: true 
      }),
      Animated.timing(rippleOpacity, { 
        toValue: 0, 
        duration: 800, 
        easing: RNEasing.out(RNEasing.quad), 
        useNativeDriver: true 
      }),
      Animated.timing(secondaryRippleScale, { 
        toValue: 1.5, 
        duration: 1000, 
        delay: 200,
        easing: RNEasing.out(RNEasing.cubic), 
        useNativeDriver: true 
      }),
      Animated.timing(secondaryRippleOpacity, { 
        toValue: 0, 
        duration: 1000, 
        delay: 200,
        easing: RNEasing.out(RNEasing.quad), 
        useNativeDriver: true 
      }),
    ]);

    // Enhanced button interaction
    const buttonAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, { 
          toValue: 0.88, 
          duration: 150, 
          easing: RNEasing.out(RNEasing.cubic), 
          useNativeDriver: true 
        }),
        Animated.timing(slideAnim, { 
          toValue: -8, 
          duration: 150, 
          easing: RNEasing.out(RNEasing.cubic), 
          useNativeDriver: true 
        }),
      ]),
      Animated.parallel([
        Animated.timing(scaleAnim, { 
          toValue: 0.75, 
          duration: 400, 
          easing: RNEasing.in(RNEasing.cubic), 
          useNativeDriver: true 
        }),
        Animated.timing(slideAnim, { 
          toValue: -60, 
          duration: 1200, 
          delay: 300,
          easing: RNEasing.in(RNEasing.cubic), 
          useNativeDriver: true 
        }),
      ]),
    ]);

    // Title stays visible inside the circle - proper timing
    const firstArrival = 100 + 500; // groupDelay + waveDuration
    const titleAnimation = Animated.sequence([
      // Subtle glow as particles approach
      Animated.timing(titleScale, { 
        toValue: 1.05, 
        duration: 200, 
        delay: firstArrival - 100,
        easing: RNEasing.out(RNEasing.cubic), 
        useNativeDriver: true 
      }),
      // Return to normal size
      Animated.timing(titleScale, { 
        toValue: 1.0, 
        duration: 300, 
        easing: RNEasing.out(RNEasing.cubic), 
        useNativeDriver: true 
      }),
      // STAY VISIBLE throughout the entire circle formation
      Animated.timing(titleOpacity, { 
        toValue: 1.0, 
        duration: 2000, // Stay visible much longer - through entire animation
        easing: RNEasing.linear, 
        useNativeDriver: true 
      }),
    ]);

    // BLACK HOLE EFFECT - Converging to exact CenterBall position
    const cx = stage.w / 2;
    const cy = 140 + CENTER_BASE / 2; // Match CenterBall center exactly
    
    const createCascadingGroups = (items, groupSizes) => {
      const groups = [];
      let index = 0;
      
      groupSizes.forEach(size => {
        if (index < items.length) {
          groups.push(items.slice(index, Math.min(index + size, items.length)));
          index += size;
        }
      });
      
      if (index < items.length) {
        groups.push(items.slice(index));
      }
      
      return groups;
    };

    const orbGroups = createCascadingGroups(orbs, [1, 2, 3, 5, 8]);
    const particleGroups = createCascadingGroups(particles, [3, 4, 6]);

    const allAnimations = [];
    let groupDelay = 100;
    const waveDuration = 500;
    const waveSpacing = 180;

    // Animate orb groups with enhanced easing
    orbGroups.forEach((groupOrbs, groupIndex) => {
      groupOrbs.forEach((orb, orbIndex) => {
        const tx = cx - orb.size / 2;
        const ty = cy - orb.size / 2;
        const itemDelay = groupDelay + (orbIndex * 35);
        
        const orbAnimation = Animated.parallel([
          Animated.timing(orb.pos.x, { 
            toValue: tx, 
            duration: waveDuration, 
            delay: itemDelay, 
            easing: RNEasing.in(RNEasing.back(1.2)), 
            useNativeDriver: true 
          }),
          Animated.timing(orb.pos.y, { 
            toValue: ty, 
            duration: waveDuration, 
            delay: itemDelay, 
            easing: RNEasing.in(RNEasing.back(1.2)), 
            useNativeDriver: true 
          }),
          Animated.timing(orb.scale, { 
            toValue: 0,
            duration: 250,
            delay: itemDelay + waveDuration - 200,
            easing: RNEasing.in(RNEasing.cubic), 
            useNativeDriver: true 
          }),
          Animated.timing(orb.rotation, { 
            toValue: Math.PI * 2 * (Math.random() < 0.5 ? 1 : -1),
            duration: waveDuration + 100,
            delay: itemDelay,
            easing: RNEasing.out(RNEasing.cubic), 
            useNativeDriver: true 
          }),
        ]);
        
        allAnimations.push(orbAnimation);
      });
      
      groupDelay += waveSpacing;
    });

    // Animate particle groups with chaotic motion
    let particleDelay = groupDelay + 200;
    particleGroups.forEach((groupParticles) => {
      groupParticles.forEach((particle, index) => {
        const tx = cx - particle.size / 2;
        const ty = cy - particle.size / 2;
        const itemDelay = particleDelay + (index * 60);
        
        const particleAnimation = Animated.parallel([
          Animated.timing(particle.pos.x, { 
            toValue: tx, 
            duration: 700, 
            delay: itemDelay, 
            easing: RNEasing.in(RNEasing.back(2.0)), 
            useNativeDriver: true 
          }),
          Animated.timing(particle.pos.y, { 
            toValue: ty, 
            duration: 700, 
            delay: itemDelay, 
            easing: RNEasing.in(RNEasing.back(2.0)), 
            useNativeDriver: true 
          }),
          Animated.timing(particle.scale, { 
            toValue: 0,
            duration: 200,
            delay: itemDelay + 500,
            easing: RNEasing.in(RNEasing.cubic), 
            useNativeDriver: true 
          }),
        ]);
        
        allAnimations.push(particleAnimation);
      });
      
      particleDelay += 150;
    });

    // Create final circle - match CenterBall size and appearance exactly
    const lastArrival = particleDelay + (6 * 60) + 700;
    const growthDuration = (lastArrival - firstArrival) * 1.0;
    const finalScale = 200 / CENTER_BASE; // Exactly match CenterBall size (200px)
    
    const centerGrowth = Animated.sequence([
      // Brief initial growth showing absorption
      Animated.timing(centerScale, {
        toValue: 0.4,
        duration: growthDuration * 0.3,
        delay: firstArrival,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }),
      // Grow to exact CenterBall size
      Animated.timing(centerScale, {
        toValue: finalScale,
        duration: growthDuration * 0.5,
        easing: RNEasing.out(RNEasing.back(0.3)),
        useNativeDriver: true,
      }),
      // Hold the perfect circle briefly before transition
      Animated.timing(centerScale, {
        toValue: finalScale,
        duration: 600,
        easing: RNEasing.linear,
        useNativeDriver: true,
      }),
    ]);

    // Start all animations
    Animated.parallel([
      rippleAnimations,
      buttonAnimation,
      titleAnimation,
      ...allAnimations,
      centerGrowth,
    ]).start(() => {
      // Add longer pause to show the final state with title visible
      setTimeout(() => router.push('/sign-in'), 800);
    });
  }, [isAnimating, stage, orbs, particles]);

  // Enhanced ripple positioning - match CenterBall exactly
  const rippleLeft = stage.w ? stage.w / 2 - 160 : 0;
  const rippleTop = 140 + CENTER_BASE / 2 - 160;

  // Performance optimization: memoize orb renders
  const renderOrbs = useMemo(() => {
    return orbs.map((orb) => {
      let translateX, translateY;
      
      switch(orb.pattern) {
        case 0: // Gentle drift
          translateX = Animated.add(orb.pos.x, Animated.multiply(floatUnit, orb.ampX));
          translateY = Animated.add(orb.pos.y, Animated.multiply(floatUnit, orb.ampY));
          break;
          
        case 1: // Circular orbit
          translateX = Animated.add(
            orb.pos.x, 
            Animated.multiply(floatUnit, orb.rotationRadius * Math.cos(orb.phaseOffset))
          );
          translateY = Animated.add(
            orb.pos.y,
            Animated.multiply(floatUnit, orb.rotationRadius * Math.sin(orb.phaseOffset))
          );
          break;
          
        case 2: // Figure-8
          translateX = Animated.add(
            orb.pos.x,
            Animated.multiply(floatUnit, orb.ampX * Math.sin(orb.phaseOffset))
          );
          translateY = Animated.add(
            orb.pos.y,
            Animated.multiply(floatUnit, orb.ampY * Math.sin(orb.phaseOffset * 2))
          );
          break;
          
        case 3: // Elliptical
          translateX = Animated.add(
            orb.pos.x,
            Animated.multiply(floatUnit, orb.ampX * Math.cos(orb.phaseOffset))
          );
          translateY = Animated.add(
            orb.pos.y,
            Animated.multiply(floatUnit, orb.ampY * Math.sin(orb.phaseOffset))
          );
          break;
          
        case 4: // Spiral
          translateX = Animated.add(
            orb.pos.x,
            Animated.add(
              Animated.multiply(floatUnit, orb.ampX * Math.cos(orb.phaseOffset)),
              Animated.multiply(floatUnit, orb.rotationRadius * Math.cos(orb.phaseOffset * orb.rotationSpeed))
            )
          );
          translateY = Animated.add(
            orb.pos.y,
            Animated.add(
              Animated.multiply(floatUnit, orb.ampY * Math.sin(orb.phaseOffset)),
              Animated.multiply(floatUnit, orb.rotationRadius * Math.sin(orb.phaseOffset * orb.rotationSpeed))
            )
          );
          break;
          
        default:
          translateX = orb.pos.x;
          translateY = orb.pos.y;
      }

      return (
        <Animated.View
          key={orb.key}
          style={[
            styles.orb,
            {
              width: orb.size,
              height: orb.size,
              borderRadius: orb.size / 2,
              backgroundColor: orb.color,
              opacity: orb.depth,
              transform: [
                { translateX },
                { translateY },
                { scale: Animated.multiply(orb.scale, pulseUnit) },
                { rotate: orb.rotation.interpolate({ 
                  inputRange: [0, Math.PI * 2], 
                  outputRange: ['0deg', '360deg'] 
                })},
              ],
            },
          ]}
        />
      );
    });
  }, [orbs, floatUnit, pulseUnit]);

  const renderParticles = useMemo(() => {
    return particles.map((particle) => {
      const translateX = Animated.add(particle.pos.x, Animated.multiply(floatUnit, particle.ampX));
      const translateY = Animated.add(particle.pos.y, Animated.multiply(floatUnit, particle.ampY));

      return (
        <Animated.View
          key={particle.key}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: particle.color,
              opacity: particle.depth,
              transform: [
                { translateX },
                { translateY },
                { scale: particle.scale },
              ],
            },
          ]}
        />
      );
    });
  }, [particles, floatUnit]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0D1117', '#1B1F24', '#161B22', '#0D1117']}
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
          {/* Background orbs and particles */}
          <View style={styles.orbLayer} pointerEvents="none">
            {renderOrbs}
            {renderParticles}

            {/* Enhanced ripple effects */}
            <Animated.View
              style={[
                styles.ripple,
                { 
                  left: rippleLeft, 
                  top: rippleTop, 
                  opacity: rippleOpacity, 
                  transform: [{ scale: rippleScale }] 
                },
              ]}
            />
            <Animated.View
              style={[
                styles.secondaryRipple,
                { 
                  left: rippleLeft - 20, 
                  top: rippleTop - 20, 
                  opacity: secondaryRippleOpacity, 
                  transform: [{ scale: secondaryRippleScale }] 
                },
              ]}
            />

            {/* Enhanced center ball - FIXED FOR PERFECT CIRCLE */}
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

          {/* Foreground UI */}
          <View style={styles.container}>
            <View style={styles.hero}>
              <Animated.View 
                style={[
                  styles.centerTitle,
                  {
                    opacity: titleOpacity,
                    transform: [{ scale: titleScale }],
                  }
                ]}
              >
                <Text style={styles.centerTitleText}>Overlap</Text>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleStart}
                activeOpacity={0.9}
                disabled={isAnimating}
                style={[
                  styles.startBtn, 
                  { 
                    transform: [
                      { scale: scaleAnim }, 
                      { translateY: slideAnim }
                    ] 
                  }
                ]}
              >
                <Animated.View 
                  style={[
                    styles.buttonGlow,
                    { opacity: glowOpacity }
                  ]} 
                />
                <LinearGradient
                  colors={['#F5A623', '#FF8C42', '#F5A623']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startGradient}
                >
                  <Ionicons name="arrow-forward" size={24} color="#0D1117" />
                  <Text style={styles.startText}>Start</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <BlurView intensity={40} tint="dark" style={styles.glassCard}>
                <Text style={styles.glassText}>
                  Swipe what you like—Overlap does the rest.
                </Text>
                <View style={styles.glassShimmer} />
              </BlurView>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: BG 
  },
  
  gradientBg: { 
    flex: 1 
  },

  stage: { 
    flex: 1, 
    position: 'relative' 
  },
  
  orbLayer: { 
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  container: { 
    flex: 1, 
    paddingHorizontal: 24,
    zIndex: 2,
  },

  hero: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative' 
  },

  centerTitle: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  
  centerTitleText: {
    color: '#FFFFFF', 
    fontSize: 32,
    fontWeight: '800', 
    letterSpacing: 1.0,
    textAlign: 'center',
    textShadowColor: 'rgba(245, 166, 35, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    zIndex: 15,
  },

  orb: { 
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  particle: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  ripple: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#F5A623',
    shadowColor: '#F5A623',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },

  secondaryRipple: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#FF8C42',
    shadowColor: '#FF8C42',
    shadowOpacity: 0.4,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },

  // FIXED centerBall style - removed all octagon-causing properties
  centerBall: {
    position: 'absolute',
    width: CENTER_BASE,
    height: CENTER_BASE,
    borderRadius: CENTER_BASE / 2,
    backgroundColor: 'rgba(245, 166, 35, 0.4)',
    // Removed all problematic properties:
    // - borderWidth (causes octagon artifacts)
    // - borderColor (causes octagon artifacts) 
    // - complex shadows (can cause rendering issues)
    // - overflow: 'hidden' (not needed for circles)
    // - backfaceVisibility (optimization not needed here)
    // - shouldRasterizeIOS (can cause artifacts)
    // - renderToHardwareTextureAndroid (can cause artifacts)
    
    // Keep only essential circle properties
    opacity: 1.0,
  },

  footer: { 
    paddingBottom: 40, 
    alignItems: 'center',
    zIndex: 3,
  },

  startBtn: {
    borderRadius: 18,
    overflow: 'visible',
    minWidth: 300,
    position: 'relative',
    shadowColor: '#F5A623',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  buttonGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: '#F5A623',
    borderRadius: 22,
    zIndex: -1,
  },

  startGradient: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
  },

  startText: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#0D1117', 
    letterSpacing: 0.5,
  },

  glassCard: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 166, 35, 0.15)',
    position: 'relative',
    minWidth: 280,
  },

  glassText: { 
    color: '#FFFFFF', 
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },

  glassShimmer: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-15deg' }],
  },
});