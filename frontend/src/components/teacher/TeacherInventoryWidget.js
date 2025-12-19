// ============================================
// TEACHER INVENTORY WIDGET - FINAL WORKING VERSION
// ============================================
// Location: src/components/teacher/TeacherInventoryWidget.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

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
          <span style={{ color: '#9CA3AF' }}>Loading resources...</span>
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
          onMouseEnter={(e) => e.target.style.background = '#F3F4F6'}
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
          <div style={{ ...styles.statValue, color: '#10B981' }}>
            {data.availableItems}
          </div>
          <div style={styles.statLabel}>Available</div>
          <div style={styles.statSubtext}>Ready to use</div>
        </div>

        {/* Assigned to Me */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👤</div>
          <div style={{ ...styles.statValue, color: '#8B5CF6' }}>
            {data.assignedToMe}
          </div>
          <div style={styles.statLabel}>Assigned to Me</div>
          <div style={styles.statSubtext}>Currently using</div>
        </div>

        {/* Categories Count */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📁</div>
          <div style={{ ...styles.statValue, color: '#3B82F6' }}>
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
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#4B5563', marginBottom: '0.5rem' }}>
            No items assigned yet
          </div>
          <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
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
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
  },
  viewAllButton: {
    fontSize: '0.875rem',
    color: '#7C3AED',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    gap: '1rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #E5E7EB',
    borderTopColor: '#7C3AED',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
    transition: 'transform 0.2s',
    cursor: 'default',
  },
  statIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '0.25rem',
  },
  statLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: '0.25rem',
  },
  statSubtext: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
  },
  categorySection: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #E5E7EB',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#4B5563',
    margin: '0 0 1rem 0',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  categoryItem: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 40px',
    alignItems: 'center',
    gap: '0.75rem',
  },
  categoryName: {
    fontSize: '0.875rem',
    color: '#4B5563',
    fontWeight: '500',
  },
  categoryBar: {
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  categoryCount: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#7C3AED',
    textAlign: 'right',
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    marginTop: '1rem',
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