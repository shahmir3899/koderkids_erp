// ============================================
// ACTIVITY TIMELINE - Vertical Timeline View
// Groups activities by date with color-coded nodes
// ============================================

import React, { useState, useMemo } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

// Node colors by status
const NODE_COLORS = {
  Completed: { bg: 'rgba(16, 185, 129, 0.25)', border: '#34D399', dot: '#10B981' },
  Scheduled: { bg: 'rgba(59, 130, 246, 0.25)', border: '#60A5FA', dot: '#3B82F6' },
  Cancelled: { bg: 'rgba(107, 114, 128, 0.25)', border: '#9CA3AF', dot: '#6B7280' },
};

// Activity type icons
const TYPE_ICONS = {
  Call: '📞',
  Meeting: '🤝',
};

// Status icons
const STATUS_ICONS = {
  Completed: '✅',
  Scheduled: '🕐',
  Cancelled: '❌',
};

/**
 * Get date group label (Today, Yesterday, or formatted date)
 */
const getDateLabel = (dateStr) => {
  if (!dateStr) return 'No Date';
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Format time from date string
 */
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * ActivityTimeline Component
 * Displays activities as a vertical timeline grouped by date
 */
export const ActivityTimeline = ({
  activities = [],
  onActivityClick,
  onComplete,
  onDelete,
  isMobile = false,
}) => {
  const [hoveredId, setHoveredId] = useState(null);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups = {};
    const sorted = [...activities].sort(
      (a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)
    );

    sorted.forEach((activity) => {
      const dateKey = activity.scheduled_date
        ? new Date(activity.scheduled_date).toDateString()
        : 'no-date';
      if (!groups[dateKey]) {
        groups[dateKey] = {
          label: getDateLabel(activity.scheduled_date),
          items: [],
        };
      }
      groups[dateKey].items.push(activity);
    });

    return Object.values(groups);
  }, [activities]);

  if (activities.length === 0) {
    return (
      <div style={styles.emptyState}>
        No activities found. Create your first activity to get started!
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {groupedActivities.map((group, groupIndex) => (
        <div key={groupIndex} style={styles.dateGroup}>
          {/* Date Header */}
          <div style={styles.dateHeader}>
            <span style={styles.dateLabel}>{group.label}</span>
            <div style={styles.dateLine} />
          </div>

          {/* Timeline Items */}
          <div style={styles.timelineTrack}>
            {group.items.map((activity, itemIndex) => {
              const nodeColor = NODE_COLORS[activity.status] || NODE_COLORS.Scheduled;
              const isHovered = hoveredId === activity.id;
              const isLast = itemIndex === group.items.length - 1;

              return (
                <div
                  key={activity.id}
                  style={{
                    ...styles.timelineItem,
                    ...(isLast ? { paddingBottom: 0 } : {}),
                  }}
                  onMouseEnter={() => setHoveredId(activity.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Vertical Line */}
                  {!isLast && <div style={styles.verticalLine} />}

                  {/* Dot */}
                  <div
                    style={{
                      ...styles.dot,
                      backgroundColor: nodeColor.dot,
                      boxShadow: isHovered
                        ? `0 0 12px ${nodeColor.dot}80`
                        : `0 0 6px ${nodeColor.dot}40`,
                      transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />

                  {/* Content Card */}
                  <div
                    style={{
                      ...styles.contentCard,
                      borderLeft: `3px solid ${nodeColor.border}`,
                      background: isHovered
                        ? 'rgba(255, 255, 255, 0.14)'
                        : 'rgba(255, 255, 255, 0.08)',
                      transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                    }}
                    onClick={() => onActivityClick && onActivityClick(activity)}
                  >
                    {/* Top row: Time + Type + Subject */}
                    <div style={styles.contentTopRow}>
                      <span style={styles.timeLabel}>
                        {formatTime(activity.scheduled_date)}
                      </span>
                      <span style={{
                        ...styles.typeBadge,
                        backgroundColor: activity.activity_type === 'Call'
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(139, 92, 246, 0.2)',
                        color: activity.activity_type === 'Call'
                          ? '#60A5FA'
                          : '#A78BFA',
                      }}>
                        {TYPE_ICONS[activity.activity_type]} {activity.activity_type}
                      </span>
                    </div>

                    {/* Subject */}
                    <div style={styles.subject}>
                      {activity.subject || 'No subject'}
                    </div>

                    {/* Details row */}
                    <div style={styles.detailsRow}>
                      <span style={styles.detailItem}>
                        {STATUS_ICONS[activity.status]} {activity.status}
                      </span>
                      {activity.outcome && (
                        <span style={styles.detailItem}>
                          · {activity.outcome}
                        </span>
                      )}
                      {activity.duration_minutes && (
                        <span style={styles.detailItem}>
                          · {activity.duration_minutes} min
                        </span>
                      )}
                    </div>

                    {/* Lead + BDM info */}
                    <div style={styles.metaRow}>
                      {activity.lead_name && (
                        <span style={styles.metaItem}>
                          🏫 {activity.lead_name}
                        </span>
                      )}
                      {activity.assigned_to_name && (
                        <span style={styles.metaItem}>
                          👤 {activity.assigned_to_name}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={styles.actionsRow}>
                      {activity.status === 'Scheduled' && onComplete && (
                        <button
                          style={styles.actionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onComplete(activity.id);
                          }}
                        >
                          ✅ Complete
                        </button>
                      )}
                      {onDelete && (
                        <button
                          style={{ ...styles.actionBtn, ...styles.actionBtnDanger }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(activity.id);
                          }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    padding: 0,
  },

  emptyState: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.base,
  },

  dateGroup: {
    marginBottom: SPACING.xl,
  },

  dateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },

  dateLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    padding: `${SPACING.xs} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.full,
  },

  dateLine: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(to right, rgba(255,255,255,0.2), transparent)',
  },

  timelineTrack: {
    paddingLeft: SPACING.lg,
  },

  timelineItem: {
    position: 'relative',
    paddingLeft: `calc(${SPACING.lg} + 12px)`,
    paddingBottom: SPACING.lg,
  },

  verticalLine: {
    position: 'absolute',
    left: '5px',
    top: '16px',
    bottom: 0,
    width: '2px',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },

  dot: {
    position: 'absolute',
    left: 0,
    top: '12px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: `all ${TRANSITIONS.normal}`,
    zIndex: 1,
  },

  contentCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  contentTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },

  timeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
  },

  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: `2px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },

  subject: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.xs,
    lineHeight: 1.4,
  },

  detailsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginBottom: SPACING.xs,
  },

  detailItem: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
  },

  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },

  metaItem: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  actionsRow: {
    display: 'flex',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },

  actionBtn: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
    borderRadius: BORDER_RADIUS.md,
    border: 'none',
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
  },

  actionBtnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#F87171',
  },
};

export default ActivityTimeline;
