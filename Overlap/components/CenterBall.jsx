// components/CenterBall.jsx
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing as RNEasing } from 'react-native';

const CENTER_BALL_SIZE = 200;

const CenterBall = ({ 
  title = "Overlap",
  shouldExplode = false,
  onExplosionComplete = null,
  ballColor = 'rgba(245, 166, 35, 0.4)', // Updated to match orange accent
  borderColor = 'rgba(245, 166, 35, 0.6)', // Updated to match orange accent
  titleColor = '#FFFFFF', // Updated to match consistent white text
  titleSize = 40,
  explosionColors = ['#F5A623', '#1B1F24', '#AAAAAA', '#FFFFFF', '#333333', '#F44336'], // Updated to match sign-up palette
  size = CENTER_BALL_SIZE,
  containerStyle = {},
  disabled = false
}) => {
  // Animation refs for the center ball
  const ballScale = useRef(new Animated.Value(1)).current;
  const ballOpacity = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  // Explosion particles
  const [particles, setParticles] = useState([]);
  const [hasExploded, setHasExploded] = useState(false);

  // Floating animation for the center ball
  useEffect(() => {
    if (disabled) return;
    
    const floatingAnimation = Animated.loop(
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
    );
    
    floatingAnimation.start();
    
    return () => floatingAnimation.stop();
  }, [disabled]);

  // Create explosion particles
  const createExplosionParticles = () => {
    const particleCount = 12;
    
    const newParticles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = 150 + Math.random() * 100;
      const particleSize = 20 + Math.random() * 30;
      
      return {
        id: i,
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
        targetX: Math.cos(angle) * velocity,
        targetY: Math.sin(angle) * velocity,
        color: explosionColors[i % explosionColors.length],
        size: particleSize,
      };
    });
    
    setParticles(newParticles);
    return newParticles;
  };

  // Handle explosion trigger
  useEffect(() => {
    if (shouldExplode && !hasExploded) {
      setHasExploded(true);
      
      // Create and animate particles
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
        if (onExplosionComplete) {
          setTimeout(() => {
            onExplosionComplete();
          }, 200);
        }
      });
    }
  }, [shouldExplode, hasExploded]);

  // Reset explosion state when shouldExplode becomes false
  useEffect(() => {
    if (!shouldExplode && hasExploded) {
      setHasExploded(false);
      setParticles([]);
      ballScale.setValue(1);
      ballOpacity.setValue(0.8);
    }
  }, [shouldExplode]);

  // Floating animation interpolation
  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  const ballSize = size || CENTER_BALL_SIZE;

  return (
    <View style={[styles.ballContainer, containerStyle]}>
      <Animated.View
        style={[
          styles.centerBall,
          {
            width: ballSize,
            height: ballSize,
            borderRadius: ballSize / 2,
            backgroundColor: ballColor,
            borderColor: borderColor,
            opacity: ballOpacity,
            transform: [
              { scale: ballScale },
              { translateY: disabled ? 0 : floatTranslateY },
            ],
          },
        ]}
      >
        <Text style={[styles.titleInsideBall, { color: titleColor, fontSize: titleSize }]}>
          {title}
        </Text>
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
  );
};

const styles = StyleSheet.create({
  ballContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    marginBottom: 40,
    height: 220,
    position: 'relative',
  },
  
  centerBall: {
    borderWidth: 2,
    shadowColor: '#F5A623', // Updated shadow color to match orange accent
    shadowOpacity: 0.3,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  titleInsideBall: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(245, 166, 35, 0.8)', // Updated text shadow to match orange accent
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  
  particle: {
    position: 'absolute',
  },
});

export default CenterBall;