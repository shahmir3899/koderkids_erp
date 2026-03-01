// ============================================
// LEAD CARD - Glassmorphism Design System
// Individual Lead Display with activities
// Follows SchoolCard / UserCard pattern
// ============================================

import React, { useState } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  getButtonStyle,
} from '../../utils/designConstants';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LEAD_STATUS } from '../../utils/constants';

// Status-based left border colors
const STATUS_BORDER_COLORS = {
  New: '#3B82F6',
  Contacted: '#F59E0B',
  Interested: '#10B981',
  'Not Interested': '#6B7280',
  Converted: '#8B5CF6',
  Lost: '#EF4444',
};

// Lead source label colors
const SOURCE_COLORS = {
  Website: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
  Referral: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399' },
  'Cold Call': { bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24' },
  'Walk-in': { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA' },
  'Social Media': { bg: 'rgba(236, 72, 153, 0.15)', text: '#F472B6' },
  Other: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF' },
};

/**
 * LeadCard Component
 * Displays a lead's information with activities in a glassmorphic card
 */
export const LeadCard = ({
  lead,
  onEdit,
  onView,
  onConvert,
  onDelete,
  isAdmin = false,
  isMobile = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  const {
    school_name,
    phone,
    contact_person,
    email,
    lead_source,
    status,
    assigned_to_name,
    estimated_students,
    activities_count = 0,
    recent_activities = [],
    next_scheduled_activity,
    days_since_last_activity,
    created_at,
  } = lead;

  const borderColor = STATUS_BORDER_COLORS[status] || '#6B7280';
  const sourceColor = SOURCE_COLORS[lead_source] || SOURCE_COLORS.Other;

  // Days since creation
  const daysOld = created_at
    ? Math.floor((Date.now() - new Date(created_at).getTime()) / 86400000)
    : null;

  // Aging color for days since last activity
  const getAgingColor = (days) => {
    if (days === null || days === undefined) return COLORS.text.whiteSubtle;
    if (days <= 3) return '#34D399';   // green
    if (days <= 7) return '#FBBF24';   // yellow
    return '#EF4444';                   // red
  };

  // Format scheduled date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Card style with hover
  const getCardStyle = () => ({
    ...styles.card,
    borderLeft: `4px solid ${borderColor}`,
    transform: isHovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
    boxShadow: isHovered
      ? '0 16px 48px rgba(0, 0, 0, 0.3)'
      : '0 4px 24px rgba(0, 0, 0, 0.12)',
    background: isHovered
      ? 'rgba(255, 255, 255, 0.16)'
      : 'rgba(255, 255, 255, 0.1)',
    borderTopColor: isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.18)',
    borderRightColor: isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.18)',
    borderBottomColor: isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.18)',
  });

  const getActionButtonStyle = (variant, buttonId) => {
    const isButtonHovered = hoveredButton === buttonId;
    return {
      ...getButtonStyle(variant, isButtonHovered),
      flex: 1,
      minWidth: 'auto',
      padding: `${SPACING.sm} ${SPACING.md}`,
      fontSize: FONT_SIZES.xs,
      transform: isButtonHovered ? 'scale(1.02)' : 'scale(1)',
    };
  };

  // Activity type icon
  const getActivityIcon = (type, actStatus) => {
    if (actStatus === 'Completed') return '✅';
    if (actStatus === 'Cancelled') return '❌';
    return type === 'Call' ? '📞' : '🤝';
  };

  // Show max 3 activities on card
  const displayActivities = recent_activities.slice(0, 3);
  const remainingCount = activities_count - displayActivities.length;

  return (
    <div
      style={getCardStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Row: Status + Source badges */}
      <div style={styles.badgeRow}>
        <LeadStatusBadge status={status} />
        {lead_source && (
          <span style={{
            ...styles.sourceBadge,
            backgroundColor: sourceColor.bg,
            color: sourceColor.text,
          }}>
            {lead_source}
          </span>
        )}
      </div>

      {/* Header: School name + contact info */}
      <div style={styles.header}>
        <div style={styles.avatarPlaceholder}>
          {school_name?.charAt(0) || '🏫'}
        </div>
        <div style={styles.headerContent}>
          <div style={styles.name}>{school_name || 'Unnamed Lead'}</div>
          <div style={styles.contactInfo}>
            {phone && <span>📱 {phone}</span>}
            {phone && contact_person && <span style={styles.dot}></span>}
            {contact_person && <span>👤 {contact_person}</span>}
          </div>
          {email && (
            <div style={styles.email}>✉️ {email}</div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsContainer}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Est. Students</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>👥</span> {estimated_students || '—'}
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Activities</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>📋</span> {activities_count}
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Assigned To</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>👤</span> {assigned_to_name || 'Unassigned'}
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Last Activity</span>
          <span style={{
            ...styles.statValue,
            color: getAgingColor(days_since_last_activity),
          }}>
            <span style={styles.statIcon}>🕐</span>
            {days_since_last_activity !== null && days_since_last_activity !== undefined
              ? `${days_since_last_activity}d ago`
              : 'None'}
          </span>
        </div>
      </div>

      {/* Next Scheduled Activity */}
      {next_scheduled_activity && (
        <div style={styles.nextActivity}>
          <span style={styles.nextActivityIcon}>📅</span>
          <span>
            Upcoming: {next_scheduled_activity.activity_type} on{' '}
            {formatDate(next_scheduled_activity.scheduled_date)}
          </span>
        </div>
      )}

      {/* Recent Activities Mini Timeline */}
      <div style={styles.activitiesSection}>
        <div style={styles.activitiesHeader}>Recent Activities</div>
        {displayActivities.length > 0 ? (
          <>
            {displayActivities.map((activity) => (
              <div key={activity.id} style={styles.activityItem}>
                <span style={styles.activityIcon}>
                  {getActivityIcon(activity.activity_type, activity.status)}
                </span>
                <div style={styles.activityContent}>
                  <span style={styles.activitySubject}>
                    {activity.activity_type} - "{activity.subject || 'No subject'}"
                  </span>
                  <span style={styles.activityDate}>
                    {activity.status === 'Scheduled' ? 'Scheduled ' : ''}
                    {formatDate(activity.scheduled_date)}
                    {activity.outcome && ` · ${activity.outcome}`}
                  </span>
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div style={styles.moreActivities}>
                +{remainingCount} more
              </div>
            )}
          </>
        ) : (
          <div style={styles.noActivities}>No activities yet</div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button
          style={getActionButtonStyle('primary', 'edit')}
          onClick={() => onEdit && onEdit(lead)}
          onMouseEnter={() => setHoveredButton('edit')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          {isMobile ? '✏️' : '✏️ Edit'}
        </button>
        <button
          style={getActionButtonStyle('secondary', 'view')}
          onClick={() => onView && onView(lead)}
          onMouseEnter={() => setHoveredButton('view')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          {isMobile ? '👁️' : '👁️ View'}
        </button>
        {status !== LEAD_STATUS.CONVERTED && (
          <button
            style={getActionButtonStyle('purple', 'convert')}
            onClick={() => onConvert && onConvert(lead)}
            onMouseEnter={() => setHoveredButton('convert')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            {isMobile ? '✅' : '✅ Convert'}
          </button>
        )}
        <button
          style={getActionButtonStyle('danger', 'delete')}
          onClick={() => onDelete && onDelete(lead)}
          onMouseEnter={() => setHoveredButton('delete')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          {isMobile ? '🗑️' : '🗑️'}
        </button>
      </div>
    </div>
  );
};

// ============================================
// STYLES - Glassmorphism Design System
// ============================================

const styles = {
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    display: 'flex',
    flexDirection: 'column',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'default',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },

  badgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  sourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `2px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },

  avatarPlaceholder: {
    width: '48px',
    height: '48px',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#3B82F6',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    flexShrink: 0,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.xs,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  contactInfo: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    marginBottom: '2px',
  },

  dot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    backgroundColor: COLORS.text.whiteSubtle,
    display: 'inline-block',
  },

  email: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  statValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  statIcon: {
    fontSize: FONT_SIZES.xs,
  },

  nextActivity: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    color: '#60A5FA',
    marginBottom: SPACING.md,
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },

  nextActivityIcon: {
    flexShrink: 0,
  },

  activitiesSection: {
    marginBottom: SPACING.md,
  },

  activitiesHeader: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteSubtle,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },

  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: `${SPACING.xs} 0`,
  },

  activityIcon: {
    fontSize: FONT_SIZES.sm,
    flexShrink: 0,
    marginTop: '1px',
  },

  activityContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },

  activitySubject: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  activityDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  moreActivities: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
    paddingTop: SPACING.xs,
    paddingLeft: `calc(${FONT_SIZES.sm} + ${SPACING.sm})`,
  },

  noActivities: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
    padding: `${SPACING.sm} 0`,
  },

  actions: {
    display: 'flex',
    gap: SPACING.sm,
    marginTop: 'auto',
    paddingTop: SPACING.md,
    flexWrap: 'wrap',
  },
};

export default LeadCard;
