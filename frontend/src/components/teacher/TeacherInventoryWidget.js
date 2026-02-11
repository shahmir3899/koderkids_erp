// ============================================
// TEACHER INVENTORY WIDGET - WITH CACHING
// ============================================
// Location: src/components/teacher/TeacherInventoryWidget.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
} from '../../utils/designConstants';
import { teacherDashboardService } from '../../services/teacherDashboardService';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * TeacherInventoryWidget Component
 * Shows inventory summary relevant to the teacher
 * 
 * @param {Object} props
 * @param {Array} props.teacherSchools - Array of school IDs or school objects
 * @param {string} props.teacherName - Teacher's name for filtering assigned items
 */
export const TeacherInventoryWidget = ({ 
  teacherSchools = [], 
  teacherName = '' 
}) => {
  const [data, setData] = useState({
    totalItems: 0,
    availableItems: 0,
    assignedToMe: 0,
    categoryBreakdown: [],
    categoriesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);

      console.log('🔍 TeacherInventoryWidget - Fetching data (CACHED)...');
      console.log('📍 Teacher Schools:', teacherSchools);
      console.log('👤 Teacher Name:', teacherName);

      // Skip if no schools assigned
      if (!teacherSchools || teacherSchools.length === 0) {
        console.warn('⚠️ No schools assigned to teacher');
        setData({
          totalItems: 0,
          availableItems: 0,
          assignedToMe: 0,
          categoryBreakdown: [],
          categoriesCount: 0
        });
        setLoading(false);
        return;
      }

      // Use cached service for inventory data
      const inventoryData = await teacherDashboardService.getInventoryData(teacherSchools, teacherName);

      console.log('📊 Inventory data (cached):', inventoryData);
      setData(inventoryData);

    } catch (error) {
      console.error('❌ Error fetching teacher inventory:', error);

      // Set empty data on error
      setData({
        totalItems: 0,
        availableItems: 0,
        assignedToMe: 0,
        categoryBreakdown: [],
        categoriesCount: 0
      });
    } finally {
      setLoading(false);
    }
  }, [teacherSchools, teacherName]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
        </div>
        <div style={styles.loadingState}>
          <div style={styles.spinner}></div>
          <span style={{ color: COLORS.text.tertiary }}>Loading resources...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, padding: isMobile ? SPACING.md : SPACING.lg, ...(isMobile ? { backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.12)', color: COLORS.text.white } : {}) }}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={{ ...styles.title, ...(isMobile ? { color: COLORS.text.white } : {}) }}>📚 My Teaching Resources</h3>
        <button 
          style={styles.viewAllButton}
          onClick={() => window.location.href = '/inventory'}
          onMouseEnter={(e) => e.target.style.background = COLORS.background.offWhite}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          View All →
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {/* Total Items */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={{ ...styles.statValue, ...(isMobile ? { color: COLORS.text.white } : {}) }}>{data.totalItems}</div>
          <div style={{ ...styles.statLabel, ...(isMobile ? { color: COLORS.text.whiteSubtle } : {}) }}>Total Items</div>
          <div style={styles.statSubtext}>At my schools</div>
        </div>

        {/* Available */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={{ ...styles.statValue, color: COLORS.status.success }}>
            {data.availableItems}
          </div>
          <div style={{ ...styles.statLabel, ...(isMobile ? { color: COLORS.text.whiteSubtle } : {}) }}>Available</div>
          <div style={styles.statSubtext}>Ready to use</div>
        </div>

        {/* Assigned to Me */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👤</div>
          <div style={{ ...styles.statValue, color: COLORS.primary }}>
            {data.assignedToMe}
          </div>
          <div style={{ ...styles.statLabel, ...(isMobile ? { color: COLORS.text.whiteSubtle } : {}) }}>Assigned to Me</div>
          <div style={styles.statSubtext}>Currently using</div>
        </div>

        {/* Categories Count */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📁</div>
          <div style={{ ...styles.statValue, color: COLORS.status.info }}>
            {data.categoriesCount}
          </div>
          <div style={{ ...styles.statLabel, ...(isMobile ? { color: COLORS.text.whiteSubtle } : {}) }}>Categories</div>
          <div style={styles.statSubtext}>Different types</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <div style={styles.categorySection}>
          <h4 style={styles.sectionTitle}>📊 My Items by Category</h4>
          <div style={styles.categoryList}>
            {data.categoryBreakdown.map((cat, idx) => (
              <div key={idx} style={{ ...styles.categoryItem, gridTemplateColumns: isMobile ? '70px 1fr 30px' : '100px 1fr 40px' }}>
                <div style={{ ...styles.categoryName, ...(isMobile ? { color: COLORS.text.whiteSubtle } : {}) }}>{cat.name}</div>
                <div style={styles.categoryBar}>
                  <div 
                    style={{
                      ...styles.categoryBarFill,
                      width: data.assignedToMe > 0 ? `${(cat.count / data.assignedToMe) * 100}%` : '0%'
                    }}
                  />
                </div>
                <div style={styles.categoryCount}>{cat.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.assignedToMe === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: FONT_SIZES['4xl'], marginBottom: SPACING.sm }}>📦</div>
          <div style={{ fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.primary, marginBottom: SPACING.xs }}>
            No items assigned yet
          </div>
          <div style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.tertiary }}>
            Contact your administrator to request teaching resources
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    backgroundColor: COLORS.background.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    border: `1px solid ${COLORS.border.light}`,
    boxShadow: SHADOWS.sm,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
    margin: 0,
  },
  viewAllButton: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: FONT_WEIGHTS.medium,
    padding: `${SPACING.xs} ${SPACING.xs}`,
    borderRadius: BORDER_RADIUS.xs,
    transition: `background ${TRANSITIONS.base}`,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['2xl'],
    gap: SPACING.sm,
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: `3px solid ${COLORS.border.light}`,
    borderTopColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    animation: 'spin 1s linear infinite',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    backgroundColor: COLORS.background.lightGray,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    textAlign: 'center',
    transition: `transform ${TRANSITIONS.base}`,
    cursor: 'default',
  },
  statIcon: {
    fontSize: FONT_SIZES['2xl'],
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  statSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
  },
  categorySection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.light}`,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
    margin: `0 0 ${SPACING.sm} 0`,
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  categoryItem: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 40px',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  categoryBar: {
    height: '8px',
    backgroundColor: COLORS.border.light,
    borderRadius: BORDER_RADIUS.xs,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xs,
    transition: `width ${TRANSITIONS.slower} ease`,
  },
  categoryCount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
    textAlign: 'right',
  },
  emptyState: {
    textAlign: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.sm,
  },
};

// Add spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-teacher-inventory-widget]')) {
    style.setAttribute('data-teacher-inventory-widget', 'true');
    document.head.appendChild(style);
  }
}

export default TeacherInventoryWidget;