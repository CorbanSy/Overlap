//components/swiping/ActionRow.tsx
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  success: '#28A745',
  danger: '#DC3545',
  border: '#30363D',
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

type Props = {
  disabled?: boolean;
  onPass: () => void;
  onInfo: () => void;
  onLike: () => void;
};

function ActionRow({ disabled, onPass, onInfo, onLike }: Props) {
  return (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.actionButton, styles.passButton]}
        onPress={onPass}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.infoButton]}
        onPress={onInfo}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="information" size={20} color={COLORS.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.likeButton]}
        onPress={onLike}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="heart" size={24} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    gap: SPACING.xl,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  passButton: { backgroundColor: COLORS.danger },
  likeButton: { backgroundColor: COLORS.success },
  infoButton: { backgroundColor: COLORS.accent, width: 48, height: 48, borderRadius: 24 },
});

export default memo(ActionRow);