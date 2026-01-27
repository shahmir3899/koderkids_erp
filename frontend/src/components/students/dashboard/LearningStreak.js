import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * LearningStreak - Displays learning streak with fire emoji and progress bar
 */
const LearningStreak = ({ streakDays = 0, isMobile }) => {
  // Max streak for full progress bar
  const maxStreak = 30;
  const progressPercentage = Math.min((streakDays / maxStreak) * 100, 100);

  return (
    <div style={getStyles(isMobile).card}>
      <h4 style={getStyles(isMobile).title}>Learning Streak</h4>
      <div style={getStyles(isMobile).streakContainer}>
        <span style={getStyles(isMobile).fireEmoji}>&#128293;</span>
        <span style={getStyles(isMobile).streakNumber}>{streakDays}</span>
        <span style={getStyles(isMobile).streakLabel}>Days</span>
        <span style={getStyles(isMobile).fireEmoji}>&#128293;</span>
      </div>
      {/* Progress bar */}
      <div style={getStyles(isMobile).progressBarContainer}>
        <div style={{ ...getStyles(isMobile).progressBar, width: `${progressPercentage}%` }} />
      </div>
      {/* Decorative dots */}
      <div style={getStyles(isMobile).dotsContainer}>
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            style={{
              ...getStyles(isMobile).dot,
              backgroundColor: i < Math.ceil(streakDays / 6)
                ? COLORS.status.success
                : 'rgba(255, 255, 255, 0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

const getStyles = (isMobile) => ({
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.md : SPACING.lg,
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: `0 0 ${SPACING.md} 0`,
  },
  streakContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  fireEmoji: {
    fontSize: isMobile ? '20px' : '24px',
  },
  streakNumber: {
    fontSize: isMobile ? FONT_SIZES['2xl'] : FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FF6B35',
  },
  streakLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginLeft: SPACING.xs,
  },
  progressBarContainer: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.status.success,
    borderRadius: BORDER_RADIUS.full,
    transition: 'width 0.5s ease-out',
  },
  dotsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: BORDER_RADIUS.full,
    transition: 'background-color 0.3s ease',
  },
});

export default LearningStreak;
