//components/swiping.SwipingHeader.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MeetupParticipants from '../MeetupParticipants';

const COLORS = {
  background: '#0D1117',
  textSecondary: '#8B949E',
  accent: '#F5A623',
  border: '#30363D',
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

type Props = {
  currentIndex: number;
  total: number;
  meetupId: string;
};

function SwipingHeader({ currentIndex, total, meetupId }: Props) {
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <View style={styles.headerArea}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.min(currentIndex + 1, total)} / {total}
        </Text>
      </View>

      <View style={styles.participantsContainer}>
        <MeetupParticipants meetupId={meetupId} maxVisible={5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  participantsContainer: {
    alignItems: 'center',
  },
});

export default memo(SwipingHeader);