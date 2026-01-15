// ============================================
// ADMIN CRM DASHBOARD - Glassmorphism Design System
// ============================================
// Shows team-wide CRM statistics, BDM performance comparison, and lead distribution
// Follows BDMDashboard.js pattern with caching and progressive loading
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  LAYOUT,
  TOUCH_TARGETS,
} from '../../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../../hooks/useResponsive';

// Common Components
import { CollapsibleSection } from '../../components/common/cards/CollapsibleSection';
import { LoadingSpinner } from '../../components/common/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { PageHeader } from '../../components/common/PageHeader';

// CRM Services
import {
  fetchAdminDashboardOverview,
  fetchAdminLeadDistribution,
  fetchAdminRecentActivities,
} from '../../api/services/crmService';

// ============================================
// CACHE MANAGER
// ============================================
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    console.log('📦 Cache HIT:', key);
    return item.data;
  }

  set(key, data) {
    console.log('💾 Cache SET:', key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }
}

const cache = new CacheManager();

// Chart Colors
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

// ============================================
// STAT CARD COLORS
// ============================================
const STAT_CARD_COLORS = {
  blue: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3B82F6', text: '#60A5FA' },
  green: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#34D399' },
  yellow: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#FBBF24' },
  purple: { bg: 'rgba(139, 92, 246, 0.15)', border: '#8B5CF6', text: '#A78BFA' },
  red: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', text: '#F87171' },
  indigo: { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366F1', text: '#818CF8' },
};

// ============================================
// STAT CARD COMPONENT WITH HOVER
// ============================================
const StatCard = ({ title, value, subtitle, color = 'blue', isMobile = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const colorScheme = STAT_CARD_COLORS[color] || STAT_CARD_COLORS.blue;

  return (
    <div
      style={{
        padding: isMobile ? SPACING.md : SPACING.xl,
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        borderLeft: `4px solid ${colorScheme.border}`,
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
      <h3 style={{
        fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.whiteMedium,
        margin: `0 0 ${isMobile ? SPACING.xs : SPACING.sm} 0`,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>{title}</h3>
      <p style={{
        fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.white,
        margin: `0 0 ${SPACING.xs} 0`,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      }}>{value}</p>
      {subtitle && (
        <p style={{
          fontSize: FONT_SIZES.xs,
          color: COLORS.text.whiteSubtle,
          margin: 0,
        }}>{subtitle}</p>
      )}
    </div>
  );
};

// ============================================
// ACTION BUTTON COMPONENT WITH HOVER
// ============================================
const ActionButton = ({ onClick, variant = 'primary', children, isMobile = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: COLORS.primary, hoverBg: '#4F46E5', text: COLORS.text.white };
      case 'secondary':
        return { bg: 'rgba(255, 255, 255, 0.1)', hoverBg: 'rgba(255, 255, 255, 0.2)', text: COLORS.text.white };
      case 'outline':
        return { bg: 'transparent', hoverBg: 'rgba(255, 255, 255, 0.1)', text: COLORS.text.white };
      default:
        return { bg: COLORS.primary, hoverBg: '#4F46E5', text: COLORS.text.white };
    }
  };

  const colors = getColors();

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: `${SPACING.sm} ${SPACING.lg}`,
        fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        backgroundColor: isHovered ? colors.hoverBg : colors.bg,
        color: colors.text,
        borderRadius: BORDER_RADIUS.lg,
        border: variant === 'outline' ? `1px solid ${COLORS.border.whiteTransparent}` : 'none',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none',
        minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
        flex: isMobile ? '1 1 auto' : 'none',
      }}
    >
      {children}
    </button>
  );
};

// ============================================
// ACTIVITY CARD COMPONENT WITH HOVER
// ============================================
const ActivityCard = ({ activity, isMobile = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getTypeColor = (type) => {
    switch (type) {
      case 'Call': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
      case 'Meeting': return { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.3)' };
      case 'Email': return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' };
      default: return { bg: 'rgba(255, 255, 255, 0.1)', text: COLORS.text.whiteMedium, border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399' };
      case 'Scheduled': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' };
      case 'Cancelled': return { bg: 'rgba(239, 68, 68, 0.2)', text: '#F87171' };
      default: return { bg: 'rgba(255, 255, 255, 0.1)', text: COLORS.text.whiteMedium };
    }
  };

  const typeColor = getTypeColor(activity.type);
  const statusColor = getStatusColor(activity.status);

  return (
    <div
      style={{
        padding: isMobile ? SPACING.md : SPACING.lg,
        ...MIXINS.glassmorphicSubtle,
        borderRadius: BORDER_RADIUS.lg,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 24px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        background: isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
        cursor: 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'flex-start',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? SPACING.xs : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
          <span style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.xs,
            fontWeight: FONT_WEIGHTS.semibold,
            backgroundColor: typeColor.bg,
            color: typeColor.text,
            border: `1px solid ${typeColor.border}`,
          }}>
            {activity.type}
          </span>
          <span style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.xs,
            fontWeight: FONT_WEIGHTS.semibold,
            backgroundColor: statusColor.bg,
            color: statusColor.text,
          }}>
            {activity.status}
          </span>
        </div>
        <span style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle }}>
          {new Date(activity.created_at).toLocaleDateString()}
        </span>
      </div>
      <h4 style={{
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.white,
        margin: `0 0 ${SPACING.xs} 0`,
        fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
      }}>{activity.subject}</h4>
      <p style={{
        fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
        color: COLORS.text.whiteMedium,
        margin: `0 0 ${SPACING.xs} 0`,
      }}>Lead: {activity.lead_name}</p>
      {!isMobile && (
        <p style={{
          fontSize: FONT_SIZES.sm,
          color: COLORS.text.whiteSubtle,
          margin: 0,
        }}>Assigned to: {activity.assigned_to_name}</p>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
function AdminDashboard() {
  const isMounted = useRef(true);
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  // ============================================
  // RESPONSIVE STYLES HELPER
  // ============================================
  const getResponsiveStyles = useCallback(() => ({
    pageContainer: {
      padding: isMobile ? SPACING.md : SPACING.xl,
      maxWidth: LAYOUT.maxWidth.lg,
      margin: '0 auto',
      minHeight: '100vh',
      background: COLORS.background.gradient,
    },
    pageTitle: {
      fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
      fontWeight: FONT_WEIGHTS.bold,
      color: COLORS.text.white,
      marginBottom: SPACING.xs,
    },
    actionsRow: {
      display: 'flex',
      gap: isMobile ? SPACING.sm : SPACING.md,
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
      flexWrap: 'wrap',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile
        ? 'repeat(2, 1fr)'
        : isTablet
          ? 'repeat(3, 1fr)'
          : 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: isMobile ? SPACING.sm : SPACING.lg,
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: isMobile ? SPACING.sm : SPACING.lg,
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    },
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: isMobile ? SPACING.lg : SPACING.xl,
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    },
    activitiesGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: isMobile ? SPACING.md : SPACING.lg,
    },
    tableContainer: {
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch', // iOS smooth scrolling
    },
    tableHeader: {
      padding: isMobile ? SPACING.sm : SPACING.md,
      textAlign: 'left',
      fontSize: isMobile ? '10px' : FONT_SIZES.xs,
      fontWeight: FONT_WEIGHTS.semibold,
      color: COLORS.text.whiteMedium,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
      background: 'rgba(255, 255, 255, 0.05)',
      whiteSpace: 'nowrap',
    },
    tableCell: {
      padding: isMobile ? SPACING.sm : SPACING.md,
      fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
      color: COLORS.text.whiteMedium,
      borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
    },
  }), [isMobile, isTablet]);

  const responsiveStyles = getResponsiveStyles();

  // ============================================
  // STATE
  // ============================================
  const [overview, setOverview] = useState(null);
  const [leadDistribution, setLeadDistribution] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  const [loading, setLoading] = useState({
    overview: true,
    distribution: false,
    activities: false,
  });

  const [error, setError] = useState(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  const loadDashboardOverview = useCallback(async () => {
    const cacheKey = 'admin-crm-dashboard-overview';
    const cached = cache.get(cacheKey);

    if (cached) {
      setOverview(cached);
      setLoading(prev => ({ ...prev, overview: false }));
      return;
    }

    try {
      const data = await fetchAdminDashboardOverview();
      if (isMounted.current) {
        setOverview(data);
        cache.set(cacheKey, data);
      }
    } catch (error) {
      console.error('❌ Error loading admin dashboard overview:', error);
      if (isMounted.current) {
        setError('Failed to load dashboard overview');
      }
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, overview: false }));
      }
    }
  }, []);

  const loadLeadDistribution = useCallback(async () => {
    setLoading(prev => ({ ...prev, distribution: true }));

    try {
      const data = await fetchAdminLeadDistribution();
      if (isMounted.current) {
        setLeadDistribution(data);
      }
    } catch (error) {
      console.error('❌ Error loading lead distribution:', error);
      toast.error('Failed to load lead distribution');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, distribution: false }));
      }
    }
  }, []);

  const loadRecentActivities = useCallback(async () => {
    setLoading(prev => ({ ...prev, activities: true }));

    try {
      const data = await fetchAdminRecentActivities();
      if (isMounted.current) {
        setRecentActivities(data);
      }
    } catch (error) {
      console.error('❌ Error loading recent activities:', error);
      toast.error('Failed to load recent activities');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, activities: false }));
      }
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    isMounted.current = true;

    // Load essential data immediately
    loadDashboardOverview();

    return () => {
      isMounted.current = false;
    };
  }, [loadDashboardOverview]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderBDMPerformanceTable = () => {
    if (!overview?.bdm_performance || overview.bdm_performance.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>No BDM performance data available</p>
        </div>
      );
    }

    return (
      <div style={responsiveStyles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={responsiveStyles.tableHeader}>BDM Name</th>
              <th style={responsiveStyles.tableHeader}>{isMobile ? 'Leads' : 'Total Leads'}</th>
              <th style={responsiveStyles.tableHeader}>{isMobile ? 'Conv.' : 'Converted'}</th>
              <th style={responsiveStyles.tableHeader}>{isMobile ? 'Rate' : 'Conversion Rate'}</th>
              {!isMobile && <th style={responsiveStyles.tableHeader}>Activities</th>}
              {!isMobile && <th style={responsiveStyles.tableHeader}>Completed</th>}
            </tr>
          </thead>
          <tbody>
            {overview.bdm_performance.map((bdm, index) => (
              <tr key={bdm.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                <td style={responsiveStyles.tableCell}>
                  <span style={{ fontWeight: FONT_WEIGHTS.medium, color: COLORS.text.white, fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm }}>{bdm.name}</span>
                </td>
                <td style={responsiveStyles.tableCell}>{bdm.total_leads}</td>
                <td style={responsiveStyles.tableCell}>{bdm.converted_leads}</td>
                <td style={responsiveStyles.tableCell}>
                  <span style={{
                    padding: `${SPACING.xs} ${isMobile ? SPACING.xs : SPACING.sm}`,
                    borderRadius: BORDER_RADIUS.md,
                    fontSize: isMobile ? '10px' : FONT_SIZES.xs,
                    fontWeight: FONT_WEIGHTS.semibold,
                    backgroundColor: bdm.conversion_rate >= 30 ? 'rgba(16, 185, 129, 0.2)' :
                      bdm.conversion_rate >= 15 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: bdm.conversion_rate >= 30 ? '#34D399' :
                      bdm.conversion_rate >= 15 ? '#FBBF24' : '#F87171',
                  }}>
                    {bdm.conversion_rate}%
                  </span>
                </td>
                {!isMobile && <td style={responsiveStyles.tableCell}>{bdm.total_activities}</td>}
                {!isMobile && <td style={responsiveStyles.tableCell}>{bdm.completed_activities}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadDashboardOverview} />;
  }

  return (
    <div style={responsiveStyles.pageContainer}>
      {/* Header */}
      <PageHeader
        icon="📊"
        title={isMobile ? 'CRM Dashboard' : 'Admin CRM Dashboard'}
        subtitle={isMobile ? 'Team overview' : 'Overview of team performance, leads, and activities'}
      />

      {/* Quick Actions */}
      <div style={responsiveStyles.actionsRow}>
        <ActionButton onClick={() => navigate('/crm/leads')} variant="primary" isMobile={isMobile}>
          {isMobile ? 'Leads' : 'View All Leads'}
        </ActionButton>
        <ActionButton onClick={() => navigate('/crm/activities')} variant="secondary" isMobile={isMobile}>
          {isMobile ? 'Activities' : 'View All Activities'}
        </ActionButton>
        <ActionButton onClick={() => cache.clear()} variant="outline" isMobile={isMobile}>
          Refresh
        </ActionButton>
      </div>

      {/* Stats Cards */}
      {loading.overview ? (
        <LoadingSpinner />
      ) : overview ? (
        <>
          {/* Lead Statistics */}
          <div style={styles.sectionHeader}>
            <h2 style={{
              ...styles.sectionTitle,
              fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.xl,
            }}>Lead Statistics</h2>
          </div>
          <div style={responsiveStyles.statsGrid}>
            <StatCard title="Total Leads" value={overview.lead_stats?.total || 0} subtitle={isMobile ? null : "All time"} color="blue" isMobile={isMobile} />
            <StatCard title="New" value={overview.lead_stats?.new || 0} subtitle={isMobile ? null : "Fresh leads"} color="green" isMobile={isMobile} />
            <StatCard title="Contacted" value={overview.lead_stats?.contacted || 0} color="yellow" isMobile={isMobile} />
            <StatCard title="Interested" value={overview.lead_stats?.interested || 0} color="purple" isMobile={isMobile} />
            {!isMobile && <StatCard title="Not Interested" value={overview.lead_stats?.not_interested || 0} color="red" isMobile={isMobile} />}
            <StatCard title="Converted" value={overview.lead_stats?.converted || 0} subtitle={isMobile ? null : `${overview.this_month_conversions || 0} this month`} color="green" isMobile={isMobile} />
            {!isMobile && <StatCard title="Lost" value={overview.lead_stats?.lost || 0} color="red" isMobile={isMobile} />}
          </div>

          {/* Key Metrics */}
          <div style={responsiveStyles.metricsGrid}>
            <StatCard
              title={isMobile ? "Recent (7d)" : "Recent Activity (7 Days)"}
              value={overview.recent_activities_count || 0}
              subtitle={isMobile ? null : "Team-wide activities"}
              color="indigo"
              isMobile={isMobile}
            />
            <StatCard
              title={isMobile ? "Monthly Conv." : "This Month Conversions"}
              value={overview.this_month_conversions || 0}
              subtitle={isMobile ? null : "Team performance"}
              color="green"
              isMobile={isMobile}
            />
          </div>
        </>
      ) : (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>No dashboard data available</p>
        </div>
      )}

      {/* BDM Performance Comparison */}
      <CollapsibleSection
        title={isMobile ? "BDM Performance" : "BDM Performance Comparison"}
        defaultOpen={true}
      >
        {loading.overview ? (
          <LoadingSpinner />
        ) : (
          renderBDMPerformanceTable()
        )}
      </CollapsibleSection>

      {/* Charts Section */}
      <div style={responsiveStyles.chartsGrid}>
        {/* Lead Distribution Chart */}
        <CollapsibleSection
          title={isMobile ? "Lead Distribution" : "Lead Distribution Across BDMs"}
          onToggle={(isOpen) => {
            if (isOpen && leadDistribution.length === 0) {
              loadLeadDistribution();
            }
          }}
          defaultOpen={false}
        >
          {loading.distribution ? (
            <LoadingSpinner />
          ) : leadDistribution.length > 0 ? (
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <PieChart>
                  <Pie
                    data={leadDistribution}
                    dataKey="lead_count"
                    nameKey="bdm_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 70 : 100}
                    label={isMobile ? false : (entry) => `${entry.bdm_name}: ${entry.lead_count}`}
                  >
                    {leadDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(30, 30, 50, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: BORDER_RADIUS.md,
                      color: COLORS.text.white,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateText}>No lead distribution data available</p>
            </div>
          )}
        </CollapsibleSection>

        {/* BDM Conversion Comparison */}
        <CollapsibleSection
          title={isMobile ? "Conversion Comparison" : "BDM Conversion Comparison"}
          defaultOpen={false}
        >
          {loading.overview ? (
            <LoadingSpinner />
          ) : overview?.bdm_performance && overview.bdm_performance.length > 0 ? (
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <BarChart data={overview.bdm_performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={isMobile ? 80 : 100}
                    tick={{ fill: COLORS.text.whiteMedium, fontSize: isMobile ? 8 : FONT_SIZES.xs }}
                  />
                  <YAxis tick={{ fill: COLORS.text.whiteMedium, fontSize: isMobile ? 10 : FONT_SIZES.xs }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(30, 30, 50, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: BORDER_RADIUS.md,
                      color: COLORS.text.white,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                  <Bar dataKey="total_leads" fill="#3B82F6" name={isMobile ? "Leads" : "Total Leads"} />
                  <Bar dataKey="converted_leads" fill="#10B981" name="Converted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateText}>No BDM performance data available</p>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Recent Activities Across Team */}
      <CollapsibleSection
        title={isMobile ? "Recent Activities" : "Recent Activities (Last 10)"}
        onToggle={(isOpen) => {
          if (isOpen && recentActivities.length === 0) {
            loadRecentActivities();
          }
        }}
        defaultOpen={false}
      >
        {loading.activities ? (
          <LoadingSpinner />
        ) : recentActivities.length > 0 ? (
          <div style={responsiveStyles.activitiesGrid}>
            {recentActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} isMobile={isMobile} />
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyStateText}>No recent activities</p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  // Page Layout
  pageContainer: {
    padding: SPACING.xl,
    maxWidth: LAYOUT.maxWidth.lg,
    margin: '0 auto',
    minHeight: '100vh',
    background: COLORS.background.gradient,
  },

  // Header
  headerSection: {
    marginBottom: SPACING.xl,
  },
  pageTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.xs,
  },
  pageSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.whiteMedium,
    margin: 0,
  },

  // Actions Row
  actionsRow: {
    display: 'flex',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
  },

  // Section Header
  sectionHeader: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: 0,
  },

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  // Charts Grid
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  chartContainer: {
    padding: SPACING.lg,
  },

  // Activities Grid
  activitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: SPACING.lg,
  },

  // Table Styles
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    padding: SPACING.md,
    textAlign: 'left',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteMedium,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
    background: 'rgba(255, 255, 255, 0.05)',
  },
  tableRowEven: {
    background: 'rgba(255, 255, 255, 0.02)',
  },
  tableRowOdd: {
    background: 'rgba(255, 255, 255, 0.05)',
  },
  tableCell: {
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
  },

  // Empty State
  emptyState: {
    padding: SPACING['2xl'],
    textAlign: 'center',
  },
  emptyStateText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.base,
    margin: 0,
  },
};

export default AdminDashboard;
