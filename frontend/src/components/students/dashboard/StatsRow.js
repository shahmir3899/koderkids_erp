import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, MIXINS } from '../../../utils/designConstants';
import CircularProgress from './CircularProgress';

/**
 * StatsRow - Displays Course Progress, Activities Completed, and Badges Earned
 */
const StatsRow = ({ data, isMobile }) => {
  const courseProgress = data?.total_activities > 0
    ? Math.round((data?.activities_completed / data?.total_activities) * 100)
    : 0;

  return (
    <div style={getStyles(isMobile).container}>
      {/* Course Progress */}
      <div style={getStyles(isMobile).card}>
        <span style={getStyles(isMobile).label}>Course Progress</span>
        <CircularProgress
          percentage={courseProgress}
          size={isMobile ? 80 : 100}
          strokeWidth={8}
          color={COLORS.studentDashboard.progressOrange}
          backgroundColor="#F0E6FF"
        />
      </div>

      {/* Activities Completed */}
      <div style={getStyles(isMobile).card}>
        <span style={getStyles(isMobile).label}>Activities Completed</span>
        <div style={getStyles(isMobile).activitiesContainer}>
          <CircularProgress
            percentage={(data?.activities_completed / Math.max(data?.total_activities, 1)) * 100}
            size={isMobile ? 80 : 100}
            strokeWidth={8}
            color={COLORS.studentDashboard.progressCyan}
            backgroundColor="#E0F7FA"
            showPercentage={false}
          />
          <div style={getStyles(isMobile).activitiesText}>
            <span style={getStyles(isMobile).activitiesCount}>
              {data?.activities_completed || 0}
            </span>
            <span style={getStyles(isMobile).activitiesTotal}>
              /{data?.total_activities || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Badges Earned */}
      <div style={getStyles(isMobile).card}>
        <span style={getStyles(isMobile).label}>Badges Earned</span>
        <div style={getStyles(isMobile).badgesContainer}>
          <CircularProgress
            percentage={Math.min((data?.badges_count || 0) * 20, 100)}
            size={isMobile ? 80 : 100}
            strokeWidth={8}
            color={COLORS.studentDashboard.progressPurple}
            backgroundColor="#F3E5F5"
            showPercentage={false}
          />
          <div style={getStyles(isMobile).badgesText}>
            <span style={getStyles(isMobile).badgesCount}>
              {data?.badges_count || 0}
            </span>
          </div>
        </div>
        {/* Gift icon */}
        <span style={getStyles(isMobile).giftIcon}>🎁</span>
      </div>
    </div>
  );
};

const getStyles = (isMobile) => ({
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: isMobile ? SPACING.sm : SPACING.md,
    width: '100%',
  },
  card: {
    flex: 1,
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.md : SPACING.lg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.sm,
  },
  activitiesContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activitiesText: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  activitiesCount: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  activitiesTotal: {
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
    color: COLORS.text.whiteSubtle,
  },
  badgesContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesText: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesCount: {
    fontSize: isMobile ? FONT_SIZES['2xl'] : FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  giftIcon: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    fontSize: isMobile ? '24px' : '32px',
  },
});

export default StatsRow;
