import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, MIXINS } from '../../../utils/designConstants';

/**
 * AchievementsBadges - Displays earned badge icons
 */
const AchievementsBadges = ({ badges = [], isMobile }) => {
  // Default badges to show if none earned
  const defaultBadges = [
    { icon: '⭐', name: 'Star' },
    { icon: '😊', name: 'Happy' },
    { icon: '🛡️', name: 'Shield' },
  ];

  const displayBadges = badges.length > 0
    ? badges.map(b => ({ icon: b.badge__icon || '🏅', name: b.badge__name }))
    : defaultBadges;

  return (
    <div style={getStyles(isMobile).card}>
      <h4 style={getStyles(isMobile).title}>Achievements</h4>
      <div style={getStyles(isMobile).badgesGrid}>
        {displayBadges.slice(0, 3).map((badge, index) => (
          <div key={index} style={getStyles(isMobile).badgeItem} title={badge.name}>
            <span style={getStyles(isMobile).badgeIcon}>{badge.icon}</span>
          </div>
        ))}
      </div>
      {badges.length === 0 && (
        <p style={getStyles(isMobile).emptyText}>Earn badges to display here!</p>
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
  title: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: `0 0 ${SPACING.md} 0`,
  },
  badgesGrid: {
    display: 'flex',
    justifyContent: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  badgeItem: {
    width: isMobile ? '40px' : '50px',
    height: isMobile ? '40px' : '50px',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: SHADOWS.sm,
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
  badgeIcon: {
    fontSize: isMobile ? '20px' : '28px',
  },
  emptyText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    textAlign: 'center',
    margin: `${SPACING.sm} 0 0 0`,
  },
});

export default AchievementsBadges;
