import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * WeeklyLearning - Displays this week's learning with day-by-day checklist
 */
const WeeklyLearning = ({ weekData = [], isMobile }) => {
  return (
    <div style={getStyles(isMobile).card}>
      <h4 style={getStyles(isMobile).title}>This Week's Learning</h4>
      <div style={getStyles(isMobile).daysList}>
        {weekData.length > 0 ? (
          weekData.map((day, index) => (
            <div key={index} style={getStyles(isMobile).dayItem}>
              <span style={getStyles(isMobile).checkmark(day.completed)}>
                {day.completed ? '✓' : '○'}
              </span>
              <span style={getStyles(isMobile).dayName}>{day.day}:</span>
              <span style={getStyles(isMobile).topicText}>
                {day.topic || '-'}
              </span>
            </div>
          ))
        ) : (
          <div style={getStyles(isMobile).emptyState}>
            No learning data for this week
          </div>
        )}
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
  daysList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  dayItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkmark: (completed) => ({
    color: completed ? COLORS.status.success : COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    minWidth: '20px',
  }),
  dayName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    minWidth: '35px',
  },
  topicText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  emptyState: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
  },
});

export default WeeklyLearning;
