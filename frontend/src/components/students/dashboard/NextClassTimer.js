import React, { useState, useEffect } from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * NextClassTimer - Displays countdown to next class
 */
const NextClassTimer = ({ nextClass = null, isMobile }) => {
  const [countdown, setCountdown] = useState({ hours: '00', minutes: '00', seconds: '00' });

  useEffect(() => {
    if (!nextClass?.date) return;

    const calculateCountdown = () => {
      const now = new Date();
      const classDate = new Date(nextClass.date);
      // Assume class starts at 9:00 AM
      classDate.setHours(9, 0, 0, 0);

      const diff = classDate - now;

      if (diff <= 0) {
        setCountdown({ hours: '00', minutes: '00', seconds: '00' });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextClass]);

  return (
    <div style={getStyles(isMobile).card}>
      <div style={getStyles(isMobile).content}>
        {/* Info icon */}
        <div style={getStyles(isMobile).iconContainer}>
          <span style={getStyles(isMobile).icon}>&#9432;</span>
        </div>

        <span style={getStyles(isMobile).label}>Next Class In</span>

        <span style={getStyles(isMobile).timer}>
          {countdown.hours}:{countdown.minutes}:{countdown.seconds}
        </span>
      </div>

      {nextClass?.days_until !== undefined && nextClass.days_until > 0 && (
        <span style={getStyles(isMobile).daysText}>
          ({nextClass.days_until} day{nextClass.days_until !== 1 ? 's' : ''} away)
        </span>
      )}
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
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: '28px',
    height: '28px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: '16px',
    color: COLORS.status.error,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
  },
  timer: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: '#00BCD4',
    fontFamily: 'monospace',
  },
  daysText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginLeft: SPACING.sm,
  },
});

export default NextClassTimer;
