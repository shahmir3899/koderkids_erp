import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * WeeklyGoalCard - Displays weekly attendance goal with progress bar
 */
const WeeklyGoalCard = ({ weeklyAttendance = {}, isMobile }) => {
  const { days_attended = 0, total_school_days = 5, percentage = 0 } = weeklyAttendance;

  return (
    <div style={getStyles(isMobile).card}>
      <h4 style={getStyles(isMobile).title}>Weekly Goal</h4>
      {/* Decorative dots */}
      <div style={getStyles(isMobile).dotsContainer}>
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            style={{
              ...getStyles(isMobile).dot,
              backgroundColor: i < 3 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
            }}
          />
        ))}
      </div>
      {/* Progress bar */}
      <div style={getStyles(isMobile).progressBarContainer}>
        <div
          style={{
            ...getStyles(isMobile).progressBar,
            width: `${percentage}%`,
          }}
        />
      </div>
      {/* Percentage badge */}
      <div style={getStyles(isMobile).badgeContainer}>
        <span style={getStyles(isMobile).badge}>{percentage}% Complete</span>
      </div>
      {/* Days count */}
      <p style={getStyles(isMobile).daysText}>
        {days_attended}/{total_school_days} days attended
      </p>
    </div>
  );
};

const getStyles = (isMobile) => ({
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.md : SPACING.lg,
    flex: 1,
    position: 'relative',
  },
  title: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: `0 0 ${SPACING.md} 0`,
  },
  dotsContainer: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    display: 'flex',
    gap: '4px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: BORDER_RADIUS.full,
  },
  progressBarContainer: {
    width: '100%',
    height: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: '100%',
    background: `linear-gradient(90deg, #00BCD4 0%, ${COLORS.status.success} 100%)`,
    borderRadius: BORDER_RADIUS.full,
    transition: 'width 0.5s ease-out',
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  badge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
    padding: `${SPACING.xs} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  daysText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    textAlign: 'center',
    margin: 0,
  },
});

export default WeeklyGoalCard;
