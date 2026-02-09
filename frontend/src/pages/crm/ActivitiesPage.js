// ============================================
// ACTIVITIES PAGE - CRM Activity Management
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  TOUCH_TARGETS,
} from '../../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../../hooks/useResponsive';

// Common Components
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { LoadingSpinner } from '../../components/common/ui/LoadingSpinner';
import { PageHeader } from '../../components/common/PageHeader';

// CRM Components
import { ActivityTimeline } from '../../components/crm/ActivityTimeline';
import { CreateActivityModal } from '../../components/crm/CreateActivityModal';
import { EditActivityModal } from '../../components/crm/EditActivityModal';

// CRM Services
import { fetchActivities, deleteActivity, completeActivity } from '../../api/services/crmService';

// ============================================
// STAT CARD COMPONENT WITH HOVER
// ============================================
const StatCard = ({ label, value, valueColor = null, icon = null, isMobile = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...MIXINS.glassmorphicCard,
        padding: isMobile ? SPACING.md : SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        textAlign: 'center',
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered ? '0 12px 40px rgba(0, 0, 0, 0.25)' : '0 4px 24px rgba(0, 0, 0, 0.12)',
        background: isHovered ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.12)',
        cursor: 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon */}
      {icon && (
        <div style={{
          fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
          marginBottom: SPACING.sm,
          opacity: isHovered ? 1 : 0.85,
          transition: `all ${TRANSITIONS.normal}`,
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}>
          {icon}
        </div>
      )}
      <p style={{
        fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: valueColor || COLORS.text.white,
        margin: `0 0 ${SPACING.xs} 0`,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      }}>{value}</p>
      <p style={{
        fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
        color: COLORS.text.whiteMedium,
        margin: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: FONT_WEIGHTS.semibold,
      }}>{label}</p>
    </div>
  );
};

function ActivitiesPage() {
  const { isMobile, isTablet } = useResponsive();

  // State
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState({ fetch: false });
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // ============================================
  // RESPONSIVE STYLES HELPER
  // ============================================
  const getResponsiveStyles = useCallback(() => ({
    pageContainer: {
      padding: isMobile ? SPACING.md : SPACING.xl,
      background: COLORS.background.gradient,
      minHeight: '100vh',
    },
    headerSection: {
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? SPACING.md : 0,
    },
    pageTitle: {
      fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
      fontWeight: FONT_WEIGHTS.bold,
      color: COLORS.text.white,
      marginBottom: SPACING.sm,
    },
    primaryButton: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: COLORS.text.white,
      borderRadius: BORDER_RADIUS.lg,
      border: 'none',
      fontSize: FONT_SIZES.base,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      transition: TRANSITIONS.normal,
      boxShadow: '0 4px 15px rgba(176, 97, 206, 0.4)',
      minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
      width: isMobile ? '100%' : 'auto',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile
        ? 'repeat(2, 1fr)'
        : 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: isMobile ? SPACING.sm : SPACING.lg,
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    },
    filtersContainer: {
      ...MIXINS.glassmorphicCard,
      padding: isMobile ? SPACING.md : SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    },
    filtersRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: isMobile ? SPACING.md : SPACING.lg,
      alignItems: 'flex-end',
      flexDirection: isMobile ? 'column' : 'row',
    },
    filterField: {
      flex: 1,
      minWidth: isMobile ? '100%' : '200px',
      width: isMobile ? '100%' : 'auto',
    },
    filterFieldSmall: {
      minWidth: isMobile ? '100%' : '150px',
      width: isMobile ? '100%' : 'auto',
    },
    input: {
      width: '100%',
      padding: `${SPACING.sm} ${SPACING.lg}`,
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.lg,
      fontSize: '16px', // Prevents iOS zoom
      outline: 'none',
      color: COLORS.text.white,
      minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
    },
    select: {
      width: '100%',
      padding: `${SPACING.sm} ${SPACING.lg}`,
      ...MIXINS.glassmorphicSelect,
      borderRadius: BORDER_RADIUS.lg,
      fontSize: '16px', // Prevents iOS zoom
      outline: 'none',
      color: COLORS.text.white,
      cursor: 'pointer',
      minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
    },
    option: {
      ...MIXINS.selectOption,
    },
    activeFilters: {
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      fontSize: FONT_SIZES.sm,
      color: COLORS.text.whiteMedium,
      marginTop: SPACING.lg,
      flexWrap: 'wrap',
    },
  }), [isMobile]);

  const responsiveStyles = getResponsiveStyles();

  // Load activities
  const loadActivities = useCallback(async () => {
    setLoading((prev) => ({ ...prev, fetch: true }));
    setError(null);

    try {
      const data = await fetchActivities();
      setActivities(data);
    } catch (err) {
      console.error('❌ Error loading activities:', err);
      setError('Failed to load activities');
      toast.error('Failed to load activities');
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }));
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Filter activities
  const filteredActivities = React.useMemo(() => {
    return activities.filter((activity) => {
      const matchesType = !filters.type || activity.activity_type === filters.type;
      const matchesStatus = !filters.status || activity.status === filters.status;
      const matchesSearch = !filters.search ||
        activity.subject?.toLowerCase().includes(filters.search.toLowerCase()) ||
        activity.lead_name?.toLowerCase().includes(filters.search.toLowerCase());

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [activities, filters]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = activities.length;
    const scheduled = activities.filter(a => a.status === 'Scheduled').length;
    const completed = activities.filter(a => a.status === 'Completed').length;
    const cancelled = activities.filter(a => a.status === 'Cancelled').length;

    return { total, scheduled, completed, cancelled };
  }, [activities]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Handle create activity success
  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadActivities();
  };

  // Handle edit activity
  const handleEdit = (activity) => {
    setSelectedActivity(activity);
    setShowEditModal(true);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedActivity(null);
    loadActivities();
  };

  // Handle mark as complete
  const handleComplete = async (activityId) => {
    try {
      await completeActivity(activityId);
      toast.success('Activity marked as completed');
      loadActivities();
    } catch (error) {
      console.error('Error completing activity:', error);
      toast.error('Failed to complete activity');
    }
  };

  // Handle delete
  const handleDelete = async (activityId) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      await deleteActivity(activityId);
      toast.success('Activity deleted successfully');
      loadActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  };

  // Render
  return (
    <div style={responsiveStyles.pageContainer}>
      {/* Header */}
      <PageHeader
        icon="📅"
        title="Activities"
        subtitle="Manage calls and meetings with leads"
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            style={responsiveStyles.primaryButton}
          >
            + Add Activity
          </button>
        }
      />

      {/* Stats Cards */}
      <div style={responsiveStyles.statsGrid}>
        <StatCard label="Total" value={stats.total} icon="📊" isMobile={isMobile} />
        <StatCard label="Scheduled" value={stats.scheduled} icon="⏰" valueColor={COLORS.status.warning} isMobile={isMobile} />
        <StatCard label="Completed" value={stats.completed} icon="✅" valueColor={COLORS.status.success} isMobile={isMobile} />
        <StatCard label="Cancelled" value={stats.cancelled} icon="❌" valueColor={COLORS.status.error} isMobile={isMobile} />
      </div>

      {/* Filters */}
      <div style={responsiveStyles.filtersContainer}>
        <div style={responsiveStyles.filtersRow}>
          {/* Search */}
          <div style={responsiveStyles.filterField}>
            <label style={styles.filterLabel}>Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by subject or lead..."
              style={responsiveStyles.input}
            />
          </div>

          {/* Type Filter */}
          <div style={responsiveStyles.filterFieldSmall}>
            <label style={styles.filterLabel}>Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              style={responsiveStyles.select}
            >
              <option value="" style={responsiveStyles.option}>All Types</option>
              <option value="Call" style={responsiveStyles.option}>Call</option>
              <option value="Meeting" style={responsiveStyles.option}>Meeting</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={responsiveStyles.filterFieldSmall}>
            <label style={styles.filterLabel}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={responsiveStyles.select}
            >
              <option value="" style={responsiveStyles.option}>All Statuses</option>
              <option value="Scheduled" style={responsiveStyles.option}>Scheduled</option>
              <option value="Completed" style={responsiveStyles.option}>Completed</option>
              <option value="Cancelled" style={responsiveStyles.option}>Cancelled</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.type || filters.status || filters.search) && (
          <div style={responsiveStyles.activeFilters}>
            <span>{isMobile ? 'Filters:' : 'Active filters:'}</span>
            {filters.type && (
              <span style={styles.filterTag('blue')}>
                {isMobile ? filters.type : `Type: ${filters.type}`}
                <button
                  onClick={() => handleFilterChange('type', '')}
                  style={{
                    ...styles.filterTagClose,
                    minWidth: isMobile ? '24px' : 'auto',
                    minHeight: isMobile ? '24px' : 'auto',
                  }}
                >
                  x
                </button>
              </span>
            )}
            {filters.status && (
              <span style={styles.filterTag('purple')}>
                {isMobile ? filters.status : `Status: ${filters.status}`}
                <button
                  onClick={() => handleFilterChange('status', '')}
                  style={{
                    ...styles.filterTagClose,
                    minWidth: isMobile ? '24px' : 'auto',
                    minHeight: isMobile ? '24px' : 'auto',
                  }}
                >
                  x
                </button>
              </span>
            )}
            {filters.search && (
              <span style={styles.filterTag('gray')}>
                {isMobile ? `"${filters.search}"` : `Search: "${filters.search}"`}
                <button
                  onClick={() => handleFilterChange('search', '')}
                  style={{
                    ...styles.filterTagClose,
                    minWidth: isMobile ? '24px' : 'auto',
                    minHeight: isMobile ? '24px' : 'auto',
                  }}
                >
                  x
                </button>
              </span>
            )}
            <button
              onClick={() => setFilters({ type: '', status: '', search: '' })}
              style={{
                ...styles.clearAllButton,
                minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
                padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.xs} ${SPACING.sm}`,
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && <ErrorDisplay message={error} onRetry={loadActivities} />}

      {/* Activities Timeline */}
      {loading.fetch ? (
        <div style={styles.loadingContainer}>
          <LoadingSpinner message="Loading activities..." />
        </div>
      ) : (
        <ActivityTimeline
          activities={filteredActivities}
          onActivityClick={handleEdit}
          onComplete={handleComplete}
          onDelete={handleDelete}
          isMobile={isMobile}
        />
      )}

      {/* Create Activity Modal */}
      {showCreateModal && (
        <CreateActivityModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Edit Activity Modal */}
      {showEditModal && selectedActivity && (
        <EditActivityModal
          activity={selectedActivity}
          onClose={() => {
            setShowEditModal(false);
            setSelectedActivity(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  filterLabel: {
    display: 'block',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteMedium,
    marginBottom: SPACING.xs,
  },
  filterTag: (color) => {
    const colorMap = {
      blue: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' },
      purple: { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.3)' },
      gray: { bg: 'rgba(255, 255, 255, 0.1)', text: COLORS.text.white, border: 'rgba(255, 255, 255, 0.2)' },
    };
    const colorScheme = colorMap[color] || colorMap.gray;
    return {
      padding: `${SPACING.xs} ${SPACING.sm}`,
      backgroundColor: colorScheme.bg,
      color: colorScheme.text,
      borderRadius: BORDER_RADIUS.md,
      border: `1px solid ${colorScheme.border}`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: SPACING.xs,
    };
  },
  filterTagClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: 'inherit',
    opacity: 0.8,
    transition: TRANSITIONS.fast,
  },
  clearAllButton: {
    marginLeft: SPACING.sm,
    color: '#F87171',
    fontWeight: FONT_WEIGHTS.medium,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    transition: TRANSITIONS.normal,
  },
  loadingContainer: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING['2xl'],
    borderRadius: BORDER_RADIUS.lg,
  },
};

export default ActivitiesPage;
