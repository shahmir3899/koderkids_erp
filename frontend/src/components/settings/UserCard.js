// ============================================
// USER CARD - Glassmorphism Design System
// Individual User Display with hover effects
// Modeled after SchoolCard component
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

/**
 * UserCard Component
 * Displays a user's information in a glassmorphic card format
 *
 * @param {Object} props
 * @param {Object} props.user - User object
 * @param {Function} props.onView - Callback when view button is clicked (opens modal with edit option)
 * @param {Function} props.onAssignSchools - Callback when assign schools button is clicked (Teachers only)
 * @param {Function} props.onResetPassword - Callback when reset password button is clicked
 * @param {Function} props.onDeactivate - Callback when deactivate button is clicked
 * @param {Function} props.onReactivate - Callback when reactivate button is clicked (inactive users)
 * @param {boolean} props.isInactive - Whether viewing inactive users tab
 * @param {boolean} props.isReactivating - Whether reactivation is in progress
 */
export const UserCard = ({
  user,
  onView,
  onAssignSchools,
  onResetPassword,
  onDeactivate,
  onReactivate,
  isInactive = false,
  isReactivating = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  const {
    id,
    username,
    first_name,
    last_name,
    email,
    role,
    is_active,
    is_super_admin,
    profile_photo_url,
    assigned_schools_count = 0,
    assigned_schools = [],
    date_of_joining,
    last_login,
    basic_salary,
    employee_id,
  } = user;

  // Get full name
  const fullName = `${first_name || ''} ${last_name || ''}`.trim() || username || 'Unknown User';

  // Get initials for avatar placeholder
  const getInitials = () => {
    if (first_name && last_name) {
      return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
    }
    if (first_name) return first_name.charAt(0).toUpperCase();
    if (username) return username.charAt(0).toUpperCase();
    return '?';
  };

  // Role colors
  const roleColors = {
    Admin: { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.4)' },
    Teacher: { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.4)' },
    Student: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.4)' },
    BDM: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399', border: 'rgba(16, 185, 129, 0.4)' },
  };

  const roleColor = roleColors[role] || { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF', border: 'rgba(107, 114, 128, 0.4)' };

  // Format salary
  const formatSalary = (salary) => {
    if (!salary) return 'Not set';
    return `Rs ${Number(salary).toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format relative time for last login
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  // Dynamic card style with hover
  const getCardStyle = () => ({
    ...styles.card,
    transform: isHovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
    boxShadow: isHovered
      ? '0 16px 48px rgba(0, 0, 0, 0.3)'
      : '0 4px 24px rgba(0, 0, 0, 0.12)',
    background: isInactive
      ? 'rgba(239, 68, 68, 0.08)'
      : isHovered
        ? 'rgba(255, 255, 255, 0.16)'
        : 'rgba(255, 255, 255, 0.1)',
    borderColor: isInactive
      ? 'rgba(239, 68, 68, 0.3)'
      : isHovered
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(255, 255, 255, 0.18)',
    opacity: isInactive ? 0.9 : 1,
  });

  // Get button style using design constants helper
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

  // Get schools count
  const schoolsCount = assigned_schools_count || assigned_schools?.length || 0;

  return (
    <div
      style={getCardStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Inactive Badge */}
      {isInactive && (
        <div style={styles.inactiveBadge}>
          <span>⚠️ Inactive</span>
        </div>
      )}

      {/* Header with Avatar and Info */}
      <div style={styles.header}>
        {profile_photo_url ? (
          <img
            src={profile_photo_url}
            alt={fullName}
            style={{ ...styles.avatar, ...(isInactive && { filter: 'grayscale(50%)' }) }}
          />
        ) : (
          <div style={{ ...styles.avatarPlaceholder, ...(isInactive && { filter: 'grayscale(50%)' }), backgroundColor: roleColor.bg, borderColor: roleColor.border }}>
            {getInitials()}
          </div>
        )}
        <div style={styles.headerContent}>
          <div style={styles.name}>{fullName}</div>
          <div style={styles.username}>@{username}</div>
          <div style={styles.email}>
            <span>✉️</span>
            <span>{email || 'No email'}</span>
          </div>
        </div>
      </div>

      {/* Role Badge */}
      <div style={styles.roleBadgeContainer}>
        <span
          style={{
            ...styles.roleBadge,
            backgroundColor: roleColor.bg,
            color: roleColor.text,
            border: `1px solid ${roleColor.border}`,
          }}
        >
          {role === 'Admin' && '👑 '}
          {role === 'Teacher' && '📚 '}
          {role === 'Student' && '🎓 '}
          {role === 'BDM' && '💼 '}
          {role}
          {is_super_admin && ' (Super)'}
        </span>
      </div>

      {/* Statistics Grid */}
      <div style={styles.statsContainer}>
        {role === 'Teacher' && (
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Schools</span>
            <span style={styles.statValue}>
              <span style={styles.statIcon}>🏫</span> {schoolsCount}
            </span>
          </div>
        )}
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Joined</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>📅</span> {formatDate(date_of_joining)}
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Salary</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>💰</span> {formatSalary(basic_salary)}
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Last Login</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>🕐</span> {formatRelativeTime(last_login)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        {/* View Button - Always shown */}
        <button
          style={getActionButtonStyle('primary', 'view')}
          onClick={() => onView && onView(user)}
          onMouseEnter={() => setHoveredButton('view')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          👁️ View
        </button>

        {/* For active users */}
        {!isInactive && (
          <>
            {/* Assign Schools - Teachers only */}
            {role === 'Teacher' && onAssignSchools && (
              <button
                style={getActionButtonStyle('warning', 'assign')}
                onClick={() => onAssignSchools(user)}
                onMouseEnter={() => setHoveredButton('assign')}
                onMouseLeave={() => setHoveredButton(null)}
              >
                🏫
              </button>
            )}

            {/* Reset Password */}
            {onResetPassword && (
              <button
                style={getActionButtonStyle('purple', 'reset')}
                onClick={() => onResetPassword(user)}
                onMouseEnter={() => setHoveredButton('reset')}
                onMouseLeave={() => setHoveredButton(null)}
              >
                🔑
              </button>
            )}

            {/* Deactivate - Not for super admins */}
            {!is_super_admin && onDeactivate && (
              <button
                style={getActionButtonStyle('danger', 'deactivate')}
                onClick={() => onDeactivate(user)}
                onMouseEnter={() => setHoveredButton('deactivate')}
                onMouseLeave={() => setHoveredButton(null)}
              >
                🗑️
              </button>
            )}
          </>
        )}

        {/* For inactive users: Reactivate button */}
        {isInactive && onReactivate && (
          <button
            style={{
              ...getActionButtonStyle('success', 'reactivate'),
              opacity: isReactivating ? 0.7 : 1,
              cursor: isReactivating ? 'wait' : 'pointer',
            }}
            onClick={() => !isReactivating && onReactivate(user)}
            onMouseEnter={() => setHoveredButton('reactivate')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={isReactivating}
          >
            {isReactivating ? '⏳...' : '✅ Reactivate'}
          </button>
        )}
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
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'default',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },

  inactiveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.md,
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },

  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: BORDER_RADIUS.full,
    objectFit: 'cover',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexShrink: 0,
  },

  avatarPlaceholder: {
    width: '60px',
    height: '60px',
    borderRadius: BORDER_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    border: '2px solid',
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

  username: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    marginBottom: SPACING.xs,
  },

  email: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  roleBadgeContainer: {
    marginBottom: SPACING.md,
  },

  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: `${SPACING.xs} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
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
  },

  statIcon: {
    fontSize: FONT_SIZES.xs,
  },

  actions: {
    display: 'flex',
    gap: SPACING.sm,
    marginTop: 'auto',
    paddingTop: SPACING.lg,
    flexWrap: 'wrap',
  },
};

export default UserCard;
