import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

const RecentActivityList = ({ activities = [] }) => {
  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return null;
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    return `${(minutes / 60).toFixed(1)} hr`;
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>&#9200; Recent Activity</h3>
      {activities.length === 0 ? (
        <p style={styles.empty}>No topics completed yet. Start learning!</p>
      ) : (
        <ul style={styles.list}>
          {activities.map((item, i) => (
            <li key={i} style={styles.item}>
              <span style={styles.dot} />
              <div style={styles.itemBody}>
                <p style={styles.topicTitle}>{item.topic_title}</p>
                <p style={styles.bookName}>{item.book_title}</p>
              </div>
              <div style={styles.itemRight}>
                <p style={styles.date}>
                  {new Date(item.completed_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                {formatTime(item.time_spent_minutes) && (
                  <p style={styles.time}>{formatTime(item.time_spent_minutes)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles = {
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  heading: {
    margin: `0 0 ${SPACING.md} 0`,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.sm} 0`,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  topicTitle: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  bookName: {
    margin: 0,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  itemRight: {
    textAlign: 'right',
    flexShrink: 0,
  },
  date: {
    margin: 0,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  time: {
    margin: 0,
    fontSize: FONT_SIZES.xs,
    color: '#6366f1',
  },
  empty: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    textAlign: 'center',
    padding: SPACING.lg,
  },
};

export default RecentActivityList;
