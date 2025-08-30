// components/swiping/RecommendationNotification.tsx - Compact version
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
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

type BannerType = 'soft' | 'strong' | 'unanimous' | 'near-unanimous';

type Props = {
  banner: {
    activityName: string;
    likes: number;
    viewers: number;
    type: BannerType;
    score: number;
    participantCount: number;
  } | null;
  onFinalize?: () => void;
  onDismiss?: () => void;
};

function RecommendationNotification({ banner, onFinalize, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (banner) {
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
    } else {
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
  }, [banner, slideAnim, scaleAnim]);

  if (!banner) return null;

  const getBannerConfig = (type: BannerType) => {
    switch (type) {
      case 'unanimous':
        return {
          title: "Perfect Match!",
          subtitle: "Everyone agrees",
          icon: 'trophy' as const,
          gradient: ['#FFD700', '#FFA500'],
          showFinalize: true,
        };
      case 'near-unanimous':
        return {
          title: "Almost Perfect!",
          subtitle: `${banner.likes}/${banner.participantCount} want this`,
          icon: 'medal' as const,
          gradient: ['#28A745', '#20C997'],
          showFinalize: true,
        };
      case 'strong':
        return {
          title: "Hot Pick",
          subtitle: `${Math.round(banner.score * 100)}% approval`,
          icon: 'thumbs-up' as const,
          gradient: [COLORS.accent, '#FF6B35'],
          showFinalize: false,
        };
      case 'soft':
      default:
        return {
          title: "Trending",
          subtitle: `${banner.likes}/${banner.viewers} like this`,
          icon: 'trending-up' as const,
          gradient: [COLORS.success, '#06D6A0'],
          showFinalize: false,
        };
    }
  };

  const config = getBannerConfig(banner.type);

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.notification}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={16} color={COLORS.background} />
          </View>
          
          <View style={styles.textContent}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.subtitle}>{config.subtitle}</Text>
            <Text style={styles.activityName} numberOfLines={1}>
              {banner.activityName}
            </Text>
          </View>

          <View style={styles.actions}>
            {config.showFinalize && (
              <TouchableOpacity 
                style={styles.finalizeButton}
                onPress={onFinalize}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={14} color={COLORS.background} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={12} color={COLORS.background} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80, // Below the header
    right: SPACING.md,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  notification: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 200,
    maxWidth: 240,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    minWidth: 0, // Allow text to shrink
  },
  title: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  subtitle: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.9,
    lineHeight: 12,
    marginTop: 1,
  },
  activityName: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 0,
  },
  finalizeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(RecommendationNotification);