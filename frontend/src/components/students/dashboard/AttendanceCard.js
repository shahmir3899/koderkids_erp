import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * AttendanceCard - Displays monthly attendance percentage
 */
const AttendanceCard = ({ percentage = 0, isMobile }) => {
  return (
    <div style={getStyles(isMobile).card}>
      <div style={getStyles(isMobile).header}>
        <span style={getStyles(isMobile).label}>Attendance</span>
        <span style={getStyles(isMobile).percentage}>{percentage}%</span>
        <span style={getStyles(isMobile).star}>*</span>
      </div>
      <span style={getStyles(isMobile).sublabel}>This Month</span>
    </div>
  );
};

const getStyles = (isMobile) => ({
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.md : SPACING.lg,
    display: 'flex',
    flexDirection: 'column',
    minWidth: isMobile ? '100%' : '140px',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
  },
  percentage: {
    fontSize: isMobile ? FONT_SIZES['2xl'] : FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  star: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    alignSelf: 'flex-start',
  },
  sublabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
});

export default AttendanceCard;
