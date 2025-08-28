// components/turbo/TurboBriefing.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  success: '#28A745',
} as const;

interface TurboBriefingProps {
  turboData: any;
  onExit: () => void;
}

const TurboBriefing: React.FC<TurboBriefingProps> = ({ turboData }) => {
  const [countdown, setCountdown] = useState(15);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Countdown timer
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="flash" size={64} color={COLORS.accent} />
        </View>
        
        <Text style={styles.title}>Get Ready!</Text>
        
        <Text style={styles.description}>
          120s sprint. Do {turboData.minSwipesPerPerson} swipes so your vote counts. 
          When enough of you finish, we jump to Deathmatch.
        </Text>

        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>Starting in</Text>
          <Text style={styles.countdownNumber}>{countdown}</Text>
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Quick Tips:</Text>
          <Text style={styles.tip}>• Swipe fast - trust your instincts</Text>
          <Text style={styles.tip}>• Right = Like, Left = Pass</Text>
          <Text style={styles.tip}>• Tap for more info if needed</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  countdownLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.accent,
  },
  tips: {
    alignSelf: 'stretch',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  tip: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
});

export default TurboBriefing;