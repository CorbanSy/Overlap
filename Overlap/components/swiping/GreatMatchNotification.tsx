// components/swiping/GreatMatchNotification.tsx
import React, { memo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  success: '#28A745',
  border: '#30363D',
  blue: '#007AFF',
  lightBlue: '#40A9FF',
  darkBlue: '#0051D5',
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

type Props = {
  greatMatch: {
    activityName: string;
    likes: number;
    viewers: number;
    participantCount: number;
    score: number;
  } | null;
  onHostDecision?: () => void;
  onDismiss?: () => void;
};

function GreatMatchNotification({ greatMatch, onHostDecision, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (greatMatch) {
      // Slide in animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
      ]).start();

      // Subtle pulse animation to draw attention
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]).start(() => pulse());
      };
      pulse();
    } else {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [greatMatch, slideAnim, scaleAnim, pulseAnim]);

  if (!greatMatch) return null;

  const approvalPercentage = Math.round((greatMatch.likes / greatMatch.participantCount) * 100);
  const voterCount = greatMatch.viewers?.length || greatMatch.likes;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [
            { translateX: slideAnim },
            { scale: Animated.multiply(scaleAnim, pulseAnim) }
          ]
        }
      ]}
    >
      <LinearGradient
        colors={[COLORS.lightBlue, COLORS.blue, COLORS.darkBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.notification}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="star" size={20} color={COLORS.background} />
          </View>
          
          <View style={styles.textContent}>
            <Text style={styles.title}>Great Match!</Text>
            <Text style={styles.subtitle}>
              {greatMatch.likes} out of {greatMatch.participantCount} want
            </Text>
            <Text style={styles.activityName} numberOfLines={2}>
              {greatMatch.activityName}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.hostDecisionButton}
              onPress={onHostDecision}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={16} color={COLORS.background} />
              <Text style={styles.actionText}>Choose</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={COLORS.background} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Shiny overlay effect */}
        <View style={styles.shineOverlay} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80, // Below the header
    left: SPACING.md, // Left side (opposite of perfect match)
    zIndex: 999, // Slightly lower than perfect match
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 15,
  },
  notification: {
    borderRadius: 16,
    overflow: 'hidden',
    width: 280,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  textContent: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 2,
  },
  subtitle: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.95,
    lineHeight: 16,
    marginBottom: 4,
  },
  activityName: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 0,
  },
  hostDecisionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    pointerEvents: 'none',
  },
});

export default memo(GreatMatchNotification);