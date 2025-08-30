// components/swiping/CelebrationModal.tsx
import React, { memo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  success: '#28A745',
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

type Props = {
  visible: boolean;
  type: 'unanimous' | 'near-unanimous';
  activityName: string;
  participantCount: number;
  likesCount: number;
  onFinalize: () => void;
  onKeepSwiping: () => void;
};

function CelebrationModal({
  visible,
  type,
  activityName,
  participantCount,
  likesCount,
  onFinalize,
  onKeepSwiping
}: Props) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  const config = type === 'unanimous' 
    ? {
        title: "🎉 PERFECT MATCH! 🎉",
        subtitle: `Everyone said YES to`,
        description: `All ${participantCount} participants are excited to go!`,
        gradient: ['#FFD700', '#FFA500'],
        buttonText: 'Lock It In!',
      }
    : {
        title: "🎊 Nearly Perfect! 🎊",
        subtitle: `${likesCount} out of ${participantCount} want`,
        description: "This is looking like a winner!",
        gradient: ['#28A745', '#20C997'],
        buttonText: 'Lock It In!',
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={config.gradient}
            style={styles.modalGradient}
          >
            {/* Confetti Animation */}
            <View style={styles.confettiContainer}>
              {/* You can add Lottie confetti animation here */}
              <View style={styles.sparkles}>
                {[...Array(6)].map((_, i) => (
                  <Animated.View 
                    key={i}
                    style={[
                      styles.sparkle,
                      { 
                        left: `${10 + i * 15}%`,
                        animationDelay: `${i * 0.2}s`
                      }
                    ]}
                  >
                    <Text style={styles.sparkleText}>✨</Text>
                  </Animated.View>
                ))}
              </View>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.celebrationTitle}>{config.title}</Text>
              <Text style={styles.celebrationSubtitle}>
                {config.subtitle} <Text style={styles.activityNameHighlight}>{activityName}</Text>
              </Text>
              <Text style={styles.celebrationDescription}>{config.description}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={onFinalize}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
                <Text style={styles.primaryButtonText}>{config.buttonText}</Text>
              </TouchableOpacity>

              {type === 'near-unanimous' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={onKeepSwiping}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color={COLORS.background} />
                  <Text style={styles.secondaryButtonText}>Keep Swiping</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalGradient: {
    padding: SPACING.xl,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    overflow: 'hidden',
  },
  sparkles: {
    flex: 1,
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
    top: 10,
  },
  sparkleText: {
    fontSize: 20,
  },
  modalBody: {
    alignItems: 'center',
    marginVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  celebrationTitle: {
    color: COLORS.background,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
  },
  celebrationSubtitle: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  activityNameHighlight: {
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  celebrationDescription: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
    marginTop: SPACING.xs,
  },
  modalActions: {
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 16,
    gap: SPACING.xs,
  },
  primaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default memo(CelebrationModal);