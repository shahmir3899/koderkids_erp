// ============================================
// BDM DASHBOARD - CRM Analytics
// ============================================
// Shows lead statistics, conversion metrics, and upcoming activities
// Follows AdminDashboard.js pattern with caching and progressive loading
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  LineChart,
  Line,
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
  SHADOWS,
  TRANSITIONS,
  LAYOUT,
  MIXINS,
  TOUCH_TARGETS,
} from '../../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../../hooks/useResponsive';

// Common Components
import { UnifiedProfileHeader } from '../../components/common/UnifiedProfileHeader';
import { CollapsibleSection } from '../../components/common/cards/CollapsibleSection';
import { LoadingSpinner } from '../../components/common/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { Button } from '../../components/common/ui/Button';

// CRM Services
import {
  fetchDashboardStats,
  fetchLeadSources,
  fetchConversionMetrics,
  fetchUpcomingActivities,
  fetchTargetProgress,
} from '../../api/services/crmService';
import { getBDMProfile } from '../../services/bdmService';

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
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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
      <div style={{
        width: isMobile ? '36px' : '48px',
        height: isMobile ? '36px' : '48px',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: `${colorScheme.border}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        marginBottom: isMobile ? SPACING.sm : SPACING.md,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      }}>
        <span style={{ fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.xl, color: colorScheme.border }}>
          {color === 'blue' ? '📊' : color === 'green' ? '🆕' : color === 'purple' ? '✅' : '📈'}
        </span>
      </div>
      <p style={{
        fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.white,
        margin: `0 0 ${SPACING.xs} 0`,
      }}>{value}</p>
      <h3 style={{
        fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.whiteMedium,
        margin: `0 0 ${SPACING.xs} 0`,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>{title}</h3>
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
// ACTIVITY CARD COMPONENT WITH HOVER
// ============================================
const ActivityCard = ({ activity, onClick, isMobile = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getTypeColor = (type) => {
    switch (type) {
      case 'Call': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' };
      case 'Meeting': return { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.3)' };
      default: return { bg: 'rgba(255, 255, 255, 0.1)', text: COLORS.text.whiteMedium, border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  const typeColor = getTypeColor(activity.activity_type);

  return (
    <div
      style={{
        padding: isMobile ? SPACING.md : SPACING.lg,
        ...MIXINS.glassmorphicSubtle,
        borderRadius: BORDER_RADIUS.lg,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 24px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        background: isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
        borderLeft: `3px solid ${typeColor.border}`,
        minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' }}>
            <span style={{
              padding: `${SPACING.xs} ${SPACING.sm}`,
              borderRadius: BORDER_RADIUS.md,
              fontSize: FONT_SIZES.xs,
              fontWeight: FONT_WEIGHTS.semibold,
              backgroundColor: typeColor.bg,
              color: typeColor.text,
              border: `1px solid ${typeColor.border}`,
            }}>
              {activity.activity_type}
            </span>
            <span style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle }}>
              {new Date(activity.scheduled_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <h4 style={{
            fontWeight: FONT_WEIGHTS.semibold,
            color: COLORS.text.white,
            marginBottom: SPACING.xs,
            margin: `0 0 ${SPACING.xs} 0`,
            fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
          }}>{activity.subject}</h4>
          <p style={{
            fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
            color: COLORS.text.whiteMedium,
            margin: 0,
          }}>Lead: {activity.lead_name}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// STAT CARD COLORS (moved before component)
// ============================================
const STAT_CARD_COLORS = {
  blue: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3B82F6', text: '#60A5FA' },
  green: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#34D399' },
  purple: { bg: 'rgba(139, 92, 246, 0.15)', border: '#8B5CF6', text: '#A78BFA' },
  yellow: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#FBBF24' },
};

// ============================================
// MAIN COMPONENT
// ============================================
function BDMDashboard() {
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
      marginBottom: SPACING.sm,
    },
    quickActions: {
      display: 'flex',
      gap: isMobile ? SPACING.sm : SPACING.md,
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
      flexWrap: 'wrap',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile
        ? 'repeat(2, 1fr)'
        : 'repeat(auto-fit, minmax(220px, 1fr))',
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
      gap: isMobile ? SPACING.md : SPACING.xl,
    },
    targetsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: isMobile ? SPACING.md : SPACING.xl,
    },
    targetCard: {
      padding: isMobile ? SPACING.md : SPACING.xl,
      ...MIXINS.glassmorphicCard,
      borderRadius: BORDER_RADIUS.lg,
    },
    targetHeader: {
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? SPACING.xs : 0,
    },
  }), [isMobile]);

  const responsiveStyles = getResponsiveStyles();

  // ============================================
  // STATE
  // ============================================
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [leadSources, setLeadSources] = useState([]);
  const [conversionMetrics, setConversionMetrics] = useState([]);
  const [upcomingActivities, setUpcomingActivities] = useState({ today: [], tomorrow: [] });
  const [targets, setTargets] = useState([]);

  const [loading, setLoading] = useState({
    profile: true,
    stats: true,
    leadSources: false,
    conversionMetrics: false,
    activities: false,
    targets: false,
  });

  const [error, setError] = useState(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  const loadBDMProfile = useCallback(async () => {
    console.log('👤 Fetching BDM profile...');
    setLoading((prev) => ({ ...prev, profile: true }));

    try {
      const data = await getBDMProfile();
      console.log('✅ BDM profile loaded:', data);
      if (isMounted.current) {
        setProfile(data);
      }
    } catch (error) {
      console.error('❌ Error loading BDM profile:', error);
    } finally {
      if (isMounted.current) {
        setLoading((prev) => ({ ...prev, profile: false }));
      }
    }
  }, []);

  const loadDashboardStats = useCallback(async () => {
    const cacheKey = 'crm-dashboard-stats';
    const cached = cache.get(cacheKey);

    if (cached) {
      setStats(cached);
      setLoading(prev => ({ ...prev, stats: false }));
      return;
    }

    try {
      const data = await fetchDashboardStats();
      if (isMounted.current) {
        setStats(data);
        cache.set(cacheKey, data);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard stats:', error);
      if (isMounted.current) {
        setError('Failed to load dashboard statistics');
      }
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, stats: false }));
      }
    }
  }, []);

  const loadLeadSources = useCallback(async () => {
    setLoading(prev => ({ ...prev, leadSources: true }));

    try {
      const data = await fetchLeadSources();
      if (isMounted.current) {
        setLeadSources(data);
      }
    } catch (error) {
      console.error('❌ Error loading lead sources:', error);
      toast.error('Failed to load lead sources');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, leadSources: false }));
      }
    }
  }, []);

  const loadConversionMetrics = useCallback(async () => {
    setLoading(prev => ({ ...prev, conversionMetrics: true }));

    try {
      const data = await fetchConversionMetrics();
      if (isMounted.current) {
        setConversionMetrics(data);
      }
    } catch (error) {
      console.error('❌ Error loading conversion metrics:', error);
      toast.error('Failed to load conversion metrics');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, conversionMetrics: false }));
      }
    }
  }, []);

  const loadUpcomingActivities = useCallback(async () => {
    setLoading(prev => ({ ...prev, activities: true }));

    try {
      const data = await fetchUpcomingActivities();
      if (isMounted.current) {
        setUpcomingActivities(data);
      }
    } catch (error) {
      console.error('❌ Error loading activities:', error);
      toast.error('Failed to load upcoming activities');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, activities: false }));
      }
    }
  }, []);

  const loadTargetProgress = useCallback(async () => {
    setLoading(prev => ({ ...prev, targets: true }));

    try {
      const data = await fetchTargetProgress();
      if (isMounted.current) {
        setTargets(data);
      }
    } catch (error) {
      console.error('❌ Error loading target progress:', error);
      toast.error('Failed to load target progress');
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, targets: false }));
      }
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    isMounted.current = true;

    // Load essential data immediately
    loadBDMProfile();
    loadDashboardStats();

    // Load activities immediately since section is defaultOpen={true}
    loadUpcomingActivities();

    return () => {
      isMounted.current = false;
    };
  }, [loadBDMProfile, loadDashboardStats, loadUpcomingActivities]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleProfileUpdate = useCallback((updatedProfile) => {
    console.log('📝 Profile updated:', updatedProfile);
    setProfile(updatedProfile);
  }, []);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderActivityCard = (activity) => (
    <ActivityCard
      key={activity.id}
      activity={activity}
      onClick={() => navigate(`/crm/activities`)}
      isMobile={isMobile}
    />
  );

  const renderTargetProgress = (target) => {
    const getProgressColor = (percentage) => {
      if (percentage >= 80) return COLORS.status.success;
      if (percentage >= 50) return COLORS.status.warning;
      return COLORS.status.error;
    };

    return (
      <div key={target.id} style={responsiveStyles.targetCard}>
        <div style={{ marginBottom: isMobile ? SPACING.md : SPACING.lg }}>
          <div style={responsiveStyles.targetHeader}>
            <h4 style={{
              ...styles.targetTitle,
              fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
            }}>{target.period_type} Target</h4>
            <span style={{
              ...styles.targetDate,
              fontSize: isMobile ? FONT_SIZES.xs : FONT_SIZES.sm,
            }}>
              {new Date(target.start_date).toLocaleDateString()} - {new Date(target.end_date).toLocaleDateString()}
            </span>
          </div>
          <p style={styles.targetBdm}>BDM: {target.bdm_name}</p>
        </div>

        {/* Leads Progress */}
        <div style={{ marginBottom: SPACING.lg }}>
          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>Leads</span>
            <span style={styles.progressValue}>{target.leads_achieved} / {target.leads_target}</span>
          </div>
          <div style={styles.progressTrack}>
            <div
              style={styles.progressBar(target.leads_progress, getProgressColor(target.leads_progress))}
            />
          </div>
          <span style={styles.progressPercent}>{target.leads_progress}%</span>
        </div>

        {/* Conversions Progress */}
        <div style={{ marginBottom: SPACING.lg }}>
          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>Conversions</span>
            <span style={styles.progressValue}>{target.conversions_achieved} / {target.conversions_target}</span>
          </div>
          <div style={styles.progressTrack}>
            <div
              style={styles.progressBar(target.conversions_progress, getProgressColor(target.conversions_progress))}
            />
          </div>
          <span style={styles.progressPercent}>{target.conversions_progress}%</span>
        </div>

        {/* Revenue Progress */}
        <div>
          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>Revenue</span>
            <span style={styles.progressValue}>
              PKR {parseFloat(target.revenue_achieved).toLocaleString()} / PKR {parseFloat(target.revenue_target).toLocaleString()}
            </span>
          </div>
          <div style={styles.progressTrack}>
            <div
              style={styles.progressBar(target.revenue_progress, getProgressColor(target.revenue_progress))}
            />
          </div>
          <span style={styles.progressPercent}>{target.revenue_progress}%</span>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadDashboardStats} />;
  }

  return (
    <div style={responsiveStyles.pageContainer}>
      {/* Profile Header */}
      <UnifiedProfileHeader
        role="BDM"
        profile={profile}
        loading={loading.profile}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Header */}
      <div style={styles.headerSection}>
        <h1 style={responsiveStyles.pageTitle}>CRM Dashboard</h1>
        <p style={styles.pageSubtitle}>Track leads, activities, and performance metrics</p>
      </div>

      {/* Quick Actions */}
      <div style={responsiveStyles.quickActions}>
        <Button
          onClick={() => navigate('/crm/leads')}
          style={{
            minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
            flex: isMobile ? '1 1 auto' : 'none',
          }}
        >
          {isMobile ? 'Leads' : 'View All Leads'}
        </Button>
        <Button
          onClick={() => navigate('/crm/activities')}
          variant="secondary"
          style={{
            minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
            flex: isMobile ? '1 1 auto' : 'none',
          }}
        >
          {isMobile ? 'Activities' : 'View Activities'}
        </Button>
        <Button
          onClick={() => cache.clear()}
          variant="outline"
          style={{
            minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
            flex: isMobile ? '1 1 auto' : 'none',
          }}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {loading.stats ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadDashboardStats} />
      ) : stats ? (
        <div style={responsiveStyles.statsGrid}>
          <StatCard title="Total Leads" value={stats.total_leads || 0} subtitle={`${stats.leads_this_month || 0} this month`} color="blue" isMobile={isMobile} />
          <StatCard title="New Leads" value={stats.new_leads || 0} subtitle="Awaiting contact" color="green" isMobile={isMobile} />
          <StatCard title="Converted" value={stats.converted_leads || 0} subtitle={`${stats.conversions_this_month || 0} this month`} color="purple" isMobile={isMobile} />
          <StatCard title="Conversion Rate" value={`${stats.conversion_rate || 0}%`} subtitle="Overall performance" color="yellow" isMobile={isMobile} />
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>No dashboard stats available</p>
        </div>
      )}

      {/* Charts Section */}
      <div style={responsiveStyles.chartsGrid}>
        {/* Lead Sources Chart */}
        <CollapsibleSection
          title={isMobile ? "Lead Sources" : "Lead Sources Breakdown"}
          onToggle={(isOpen) => {
            if (isOpen && leadSources.length === 0) {
              loadLeadSources();
            }
          }}
          defaultOpen={false}
        >
          {loading.leadSources ? (
            <LoadingSpinner />
          ) : leadSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <PieChart>
                <Pie
                  data={leadSources}
                  dataKey="count"
                  nameKey="lead_source"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 70 : 100}
                  label={isMobile ? false : (entry) => `${entry.lead_source}: ${entry.count}`}
                >
                  {leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.chartEmptyText}>No lead source data available</p>
          )}
        </CollapsibleSection>

        {/* Conversion Metrics Chart */}
        <CollapsibleSection
          title={isMobile ? "Conversion Trends" : "Conversion Trends (Last 6 Months)"}
          onToggle={(isOpen) => {
            if (isOpen && conversionMetrics.length === 0) {
              loadConversionMetrics();
            }
          }}
          defaultOpen={false}
        >
          {loading.conversionMetrics ? (
            <LoadingSpinner />
          ) : conversionMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <LineChart data={conversionMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                <Line type="monotone" dataKey="leads" stroke={CHART_COLORS[0]} name="Leads" />
                <Line type="monotone" dataKey="conversions" stroke={CHART_COLORS[1]} name="Conversions" />
                <Line type="monotone" dataKey="conversion_rate" stroke={CHART_COLORS[2]} name="Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.chartEmptyText}>No conversion data available</p>
          )}
        </CollapsibleSection>
      </div>

      {/* Upcoming Activities */}
      <CollapsibleSection
        title={isMobile
          ? `Activities (${stats?.upcoming_activities || 0}/${stats?.overdue_activities || 0})`
          : `Upcoming Activities (${stats?.upcoming_activities || 0} scheduled, ${stats?.overdue_activities || 0} overdue)`}
        onToggle={(isOpen) => {
          if (isOpen && upcomingActivities.today.length === 0 && upcomingActivities.tomorrow.length === 0) {
            loadUpcomingActivities();
          }
        }}
        defaultOpen={true}
      >
        {loading.activities ? (
          <LoadingSpinner />
        ) : (
          <div style={responsiveStyles.activitiesGrid}>
            {/* Today */}
            <div>
              <h3 style={{
                ...styles.activitiesDayTitle,
                fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
              }}>Today</h3>
              {upcomingActivities.today.length > 0 ? (
                <div style={styles.activityList}>
                  {upcomingActivities.today.map(renderActivityCard)}
                </div>
              ) : (
                <p style={styles.noActivitiesText}>
                  No activities scheduled for today
                </p>
              )}
            </div>

            {/* Tomorrow */}
            <div>
              <h3 style={{
                ...styles.activitiesDayTitle,
                fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
              }}>Tomorrow</h3>
              {upcomingActivities.tomorrow.length > 0 ? (
                <div style={styles.activityList}>
                  {upcomingActivities.tomorrow.map(renderActivityCard)}
                </div>
              ) : (
                <p style={styles.noActivitiesText}>
                  No activities scheduled for tomorrow
                </p>
              )}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Target Progress */}
      <CollapsibleSection
        title={isMobile ? "Target Progress" : "Current Target Progress"}
        onToggle={(isOpen) => {
          if (isOpen && targets.length === 0) {
            loadTargetProgress();
          }
        }}
        defaultOpen={false}
      >
        {loading.targets ? (
          <LoadingSpinner />
        ) : targets.length > 0 ? (
          <div style={responsiveStyles.targetsGrid}>
            {targets.map(renderTargetProgress)}
          </div>
        ) : (
          <p style={styles.chartEmptyText}>No active targets</p>
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
  headerSection: {
    marginBottom: SPACING.xl,
    marginTop: SPACING.xl,
  },
  pageTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: SPACING.sm,
  },
  pageSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.whiteMedium,
  },

  // Quick Actions
  quickActions: {
    display: 'flex',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  // Empty State
  emptyState: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING['2xl'],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  emptyStateText: {
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
  },

  // Charts Grid
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  chartEmptyText: {
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    padding: `${SPACING['2xl']} 0`,
  },

  // Activities Section
  activitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: SPACING.xl,
  },
  activitiesDayTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.lg,
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  noActivitiesText: {
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    padding: `${SPACING['2xl']} 0`,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
  },

  // Targets Grid
  targetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: SPACING.xl,
  },
  targetCard: {
    padding: SPACING.xl,
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
  },
  targetHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  targetTitle: {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  targetDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  targetBdm: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
  },

  // Progress Bars
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteMedium,
  },
  progressValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
  },
  progressTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: COLORS.border.whiteTransparent,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressBar: (percentage, color) => ({
    height: '8px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: color,
    width: `${Math.min(percentage, 100)}%`,
    transition: TRANSITIONS.normal,
  }),
  progressPercent: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
};

export default BDMDashboard;
