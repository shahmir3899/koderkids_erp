import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * TeacherNoteCard - Displays the latest teacher's note
 */
const TeacherNoteCard = ({ note = null, isMobile }) => {
  return (
    <div style={getStyles(isMobile).card}>
      <div style={getStyles(isMobile).content}>
        <span style={getStyles(isMobile).label}>Teacher's Note:</span>
        <span style={getStyles(isMobile).quote}>
          "{note || 'Keep up the great work!'}"
        </span>
      </div>
    </div>
  );
};

const getStyles = (isMobile) => ({
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: SPACING.md,
  },
  content: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    alignItems: 'baseline',
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
  },
  quote: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    color: COLORS.text.white,
  },
});

export default TeacherNoteCard;
