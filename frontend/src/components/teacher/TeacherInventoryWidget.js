// ============================================
// TEACHER INVENTORY WIDGET - FINAL WORKING VERSION
// ============================================
// Location: src/components/teacher/TeacherInventoryWidget.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
} from '../../utils/designConstants';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('access');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

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

  useEffect(() => {
    fetchInventoryData();
  }, [teacherSchools, teacherName]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 TeacherInventoryWidget - Fetching data...');
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

      // Extract school IDs (handle both objects and primitives)
      let schoolIds = [];
      if (Array.isArray(teacherSchools)) {
        schoolIds = teacherSchools.map(school => {
          if (typeof school === 'object' && school !== null) {
            return school.id || school.school_id;
          }
          return school;
        }).filter(id => id !== null && id !== undefined);
      }

      console.log('📤 Using school IDs:', schoolIds);

      // Ensure we have valid IDs
      if (schoolIds.length === 0) {
        console.warn('⚠️ No valid school IDs found');
        setLoading(false);
        return;
      }
      
      // Check auth token
      const token = localStorage.getItem('access');
      if (!token) {
        console.error('❌ No access token found!');
        setLoading(false);
        return;
      }
      
      // Fetch data for all schools in PARALLEL (not sequential)
console.log('🚀 Fetching inventory data for all schools in parallel...');

// Build all requests at once
const schoolRequests = schoolIds.map(schoolId => 
  Promise.all([
    // Summary request
    axios.get(
      `${API_BASE_URL}/api/inventory/summary/`,
      { 
        headers: getAuthHeaders(),
        params: { school: schoolId }
      }
    ).catch(err => {
      console.warn(`⚠️ Error fetching summary for school ${schoolId}:`, err.message);
      return { data: { total: 0, available_count: 0 } }; // Return empty data on error
    }),
    
    // Items request
    axios.get(
      `${API_BASE_URL}/api/inventory/items/`,
      {
        headers: getAuthHeaders(),
        params: {
          school: schoolId,
          status: 'Assigned'
        }
      }
    ).catch(err => {
      console.warn(`⚠️ Error fetching items for school ${schoolId}:`, err.message);
      return { data: [] }; // Return empty array on error
    })
  ]).then(([summaryResponse, itemsResponse]) => ({
    schoolId,
    summary: summaryResponse.data,
    items: itemsResponse.data.results || itemsResponse.data || []
  }))
);

// Wait for ALL schools to complete
const schoolResults = await Promise.all(schoolRequests);

console.log('✅ All school data fetched in parallel:', schoolResults);

// Aggregate results
let totalSummary = { total: 0, available_count: 0 };
let allAssignedItems = [];

schoolResults.forEach(({ schoolId, summary, items }) => {
  // Aggregate totals
  totalSummary.total += summary.total || 0;
  totalSummary.available_count += summary.available_count || 0;
  
  // Collect all items
  if (Array.isArray(items)) {
    allAssignedItems = allAssignedItems.concat(items);
  }
  
  console.log(`✅ School ${schoolId}: ${summary.total} total, ${items.length} assigned items`);
});

      console.log('📦 Total items across all schools:', allAssignedItems.length);

      // Log sample item to see structure
      if (allAssignedItems.length > 0) {
        console.log('🔍 Sample item structure:', allAssignedItems[0]);
      }

      // Filter to only items assigned to this teacher
      let teacherItems = [];
      
      if (teacherName && Array.isArray(allAssignedItems)) {
        teacherItems = allAssignedItems.filter(item => {
          // The API returns:
          // - assigned_to: ID (number like 3)
          // - assigned_to_name: Name (string like "Mah Noor")
          // We need to match by assigned_to_name!
          
          const assignedToName = item.assigned_to_name || '';
          const teacherNameStr = String(teacherName || '').toLowerCase();
          const assignedNameStr = String(assignedToName).toLowerCase();
          
          const matches = assignedNameStr.includes(teacherNameStr);
          console.log(`🔎 Checking: "${assignedToName}" includes "${teacherName}"? ${matches}`);
          return matches;
        });
        
        console.log('🔍 Filtered to teacher items:', teacherItems.length);
      } else if (!teacherName) {
        // If no teacher name provided, show all assigned items
        console.log('⚠️ No teacher name provided, showing all assigned items');
        teacherItems = allAssignedItems;
      }

      // Category breakdown (top 3 categories)
      const categoryMap = {};
      teacherItems.forEach(item => {
        const cat = item.category_name || item.category || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });

      const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      // Count unique categories
      const categoriesCount = Object.keys(categoryMap).length;

      const finalData = {
        totalItems: totalSummary.total,
        availableItems: totalSummary.available_count,
        assignedToMe: teacherItems.length,
        categoryBreakdown: topCategories,
        categoriesCount
      };

      console.log('📊 Final data:', finalData);
      setData(finalData);

    } catch (error) {
      console.error('❌ Error fetching teacher inventory:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
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
  };

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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>📚 My Teaching Resources</h3>
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
      <div style={styles.statsGrid}>
        {/* Total Items */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statValue}>{data.totalItems}</div>
          <div style={styles.statLabel}>Total Items</div>
          <div style={styles.statSubtext}>At my schools</div>
        </div>

        {/* Available */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={{ ...styles.statValue, color: COLORS.status.success }}>
            {data.availableItems}
          </div>
          <div style={styles.statLabel}>Available</div>
          <div style={styles.statSubtext}>Ready to use</div>
        </div>

        {/* Assigned to Me */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👤</div>
          <div style={{ ...styles.statValue, color: COLORS.primary }}>
            {data.assignedToMe}
          </div>
          <div style={styles.statLabel}>Assigned to Me</div>
          <div style={styles.statSubtext}>Currently using</div>
        </div>

        {/* Categories Count */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📁</div>
          <div style={{ ...styles.statValue, color: COLORS.status.info }}>
            {data.categoriesCount}
          </div>
          <div style={styles.statLabel}>Categories</div>
          <div style={styles.statSubtext}>Different types</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <div style={styles.categorySection}>
          <h4 style={styles.sectionTitle}>📊 My Items by Category</h4>
          <div style={styles.categoryList}>
            {data.categoryBreakdown.map((cat, idx) => (
              <div key={idx} style={styles.categoryItem}>
                <div style={styles.categoryName}>{cat.name}</div>
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