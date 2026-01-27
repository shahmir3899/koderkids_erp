import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * TodayILearned - Displays today's learned topics with checkmarks
 */
const TodayILearned = ({ topics = [], isMobile }) => {
  return (
    <div style={getStyles(isMobile).card}>
      <h4 style={getStyles(isMobile).title}>Today i Learned ...</h4>
      <div style={getStyles(isMobile).topicsList}>
        {topics.length > 0 ? (
          topics.slice(0, 3).map((topic, index) => (
            <div key={index} style={getStyles(isMobile).topicItem}>
              <span style={getStyles(isMobile).checkmark}>&#10003;</span>
              <span style={getStyles(isMobile).topicText}>
                {typeof topic === 'string' ? topic : topic.title || 'Topic'}
              </span>
            </div>
          ))
        ) : (
          <div style={getStyles(isMobile).emptyState}>
            No lessons recorded for today
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
  topicsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  topicItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkmark: {
    color: COLORS.status.success,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  topicText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '200px',
  },
  emptyState: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
  },
});

export default TodayILearned;
