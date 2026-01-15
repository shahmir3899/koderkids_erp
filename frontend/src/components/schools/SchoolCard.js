// ============================================
// SCHOOL CARD - Glassmorphism Design System
// Individual School Display with hover effects
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
 * SchoolCard Component
 * Displays a school's information in a glassmorphic card format
 *
 * @param {Object} props
 * @param {Object} props.school - School object
 * @param {Function} props.onView - Callback when view button is clicked
 * @param {Function} props.onEdit - Callback when edit button is clicked (Admin only)
 * @param {Function} props.onDelete - Callback when delete button is clicked (Admin only)
 * @param {boolean} props.isAdmin - Whether user is admin
 */
export const SchoolCard = ({ school, onView, onEdit, onDelete, isAdmin = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  const {
    name,
    logo,
    address,
    location,
    contact_phone,
    total_students = 0,
    total_classes = 0,
    monthly_revenue = 0,
    capacity_utilization = 0,
    total_capacity,
  } = school;

  // Calculate capacity bar width
  const capacityWidth = Math.min(capacity_utilization || 0, 100);

  // Determine capacity color
  const getCapacityColor = () => {
    if (capacityWidth >= 90) return '#EF4444'; // Red - overcrowded
    if (capacityWidth >= 70) return '#10B981'; // Green - good
    if (capacityWidth >= 50) return '#F59E0B'; // Orange - moderate
    return '#6B7280'; // Gray - low
  };

  const capacityColor = getCapacityColor();

  // Dynamic card style with hover
  const getCardStyle = () => ({
    ...styles.card,
    transform: isHovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
    boxShadow: isHovered
      ? '0 16px 48px rgba(0, 0, 0, 0.3)'
      : '0 4px 24px rgba(0, 0, 0, 0.12)',
    background: isHovered
      ? 'rgba(255, 255, 255, 0.16)'
      : 'rgba(255, 255, 255, 0.1)',
    borderColor: isHovered
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(255, 255, 255, 0.18)',
  });

  // Get button style using design constants helper
  const getActionButtonStyle = (variant, buttonId) => {
    const isButtonHovered = hoveredButton === buttonId;
    return {
      ...getButtonStyle(variant, isButtonHovered),
      flex: 1,
      transform: isButtonHovered ? 'scale(1.02)' : 'scale(1)',
    };
  };

  return (
    <div
      style={getCardStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Logo and Name */}
      <div style={styles.header}>
        {logo ? (
          <img src={logo} alt={name} style={styles.logo} />
        ) : (
          <div style={styles.logoPlaceholder}>{name?.charAt(0) || '🏫'}</div>
        )}
        <div style={styles.headerContent}>
          <div style={styles.name}>{name}</div>
          <div style={styles.address}>
            <span>📍</span>
            <span>{address || location || 'No address'}</span>
          </div>
          {contact_phone && (
            <div style={styles.address}>
              <span>📞</span>
              <span>{contact_phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div style={styles.statsContainer}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Students</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>👥</span> {total_students}
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Classes</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>📚</span> {total_classes}
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Revenue</span>
          <span style={styles.statValue}>
            <span style={styles.statIcon}>💰</span> {(monthly_revenue / 1000).toFixed(0)}K
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Capacity</span>
          <span style={styles.statValue}>
            {total_students}/{total_capacity || 'N/A'}
          </span>
        </div>
      </div>

      {/* Capacity Bar */}
      {capacity_utilization > 0 && (
        <div style={styles.capacityContainer}>
          <div style={styles.capacityLabel}>
            <span>Capacity Utilization</span>
            <span style={{ color: capacityColor, fontWeight: FONT_WEIGHTS.semibold }}>
              {capacity_utilization}%
            </span>
          </div>
          <div style={styles.capacityBarBg}>
            <div
              style={{
                ...styles.capacityBarFill,
                width: `${capacityWidth}%`,
                backgroundColor: capacityColor,
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button
          style={getActionButtonStyle('primary', 'view')}
          onClick={() => onView && onView(school)}
          onMouseEnter={() => setHoveredButton('view')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          👁️ View
        </button>
        {isAdmin && (
          <>
            <button
              style={getActionButtonStyle('success', 'edit')}
              onClick={() => onEdit && onEdit(school)}
              onMouseEnter={() => setHoveredButton('edit')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              ✏️ Edit
            </button>
            <button
              style={getActionButtonStyle('danger', 'delete')}
              onClick={() => onDelete && onDelete(school)}
              onMouseEnter={() => setHoveredButton('delete')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              🗑️ Delete
            </button>
          </>
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

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  logo: {
    width: '60px',
    height: '60px',
    borderRadius: BORDER_RADIUS.lg,
    objectFit: 'cover',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  logoPlaceholder: {
    width: '60px',
    height: '60px',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES['2xl'],
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
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.xs,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  address: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },

  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.md,
    marginTop: SPACING.md,
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
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  statIcon: {
    fontSize: FONT_SIZES.sm,
  },

  capacityContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  capacityLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  capacityBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },

  capacityBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
    transition: `width ${TRANSITIONS.normal}`,
  },

  actions: {
    display: 'flex',
    gap: SPACING.sm,
    marginTop: 'auto',
    paddingTop: SPACING.lg,
  },
};

export default SchoolCard;
