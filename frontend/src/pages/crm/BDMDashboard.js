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
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// ============================================
// MAIN COMPONENT
// ============================================
function BDMDashboard() {
  const isMounted = useRef(true);
  const navigate = useNavigate();

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

  const renderStatCard = (title, value, subtitle, color = 'blue') => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      purple: 'bg-purple-50 border-purple-200',
    };

    return (
      <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
        <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
      </div>
    );
  };

  const renderActivityCard = (activity) => (
    <div
      key={activity.id}
      className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/crm/activities`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              activity.activity_type === 'Call' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {activity.activity_type}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(activity.scheduled_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">{activity.subject}</h4>
          <p className="text-sm text-gray-600">Lead: {activity.lead_name}</p>
        </div>
      </div>
    </div>
  );

  const renderTargetProgress = (target) => {
    const getProgressColor = (percentage) => {
      if (percentage >= 80) return 'bg-green-500';
      if (percentage >= 50) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div key={target.id} className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">{target.period_type} Target</h4>
            <span className="text-sm text-gray-500">
              {new Date(target.start_date).toLocaleDateString()} - {new Date(target.end_date).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-gray-600">BDM: {target.bdm_name}</p>
        </div>

        {/* Leads Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Leads</span>
            <span className="text-sm text-gray-600">{target.leads_achieved} / {target.leads_target}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(target.leads_progress)}`}
              style={{ width: `${Math.min(target.leads_progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{target.leads_progress}%</span>
        </div>

        {/* Conversions Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Conversions</span>
            <span className="text-sm text-gray-600">{target.conversions_achieved} / {target.conversions_target}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(target.conversions_progress)}`}
              style={{ width: `${Math.min(target.conversions_progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{target.conversions_progress}%</span>
        </div>

        {/* Revenue Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Revenue</span>
            <span className="text-sm text-gray-600">
              PKR {parseFloat(target.revenue_achieved).toLocaleString()} / PKR {parseFloat(target.revenue_target).toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(target.revenue_progress)}`}
              style={{ width: `${Math.min(target.revenue_progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{target.revenue_progress}%</span>
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Profile Header */}
      <UnifiedProfileHeader
        role="BDM"
        profile={profile}
        loading={loading.profile}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Header */}
      <div className="mb-6 mt-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM Dashboard</h1>
        <p className="text-gray-600">Track leads, activities, and performance metrics</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <Button onClick={() => navigate('/crm/leads')}>
          View All Leads
        </Button>
        <Button onClick={() => navigate('/crm/activities')} variant="secondary">
          View Activities
        </Button>
        <Button onClick={() => cache.clear()} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      {loading.stats ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={loadDashboardStats} />
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {renderStatCard('Total Leads', stats.total_leads || 0, `${stats.leads_this_month || 0} this month`, 'blue')}
          {renderStatCard('New Leads', stats.new_leads || 0, 'Awaiting contact', 'green')}
          {renderStatCard('Converted', stats.converted_leads || 0, `${stats.conversions_this_month || 0} this month`, 'purple')}
          {renderStatCard('Conversion Rate', `${stats.conversion_rate || 0}%`, 'Overall performance', 'yellow')}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg border border-gray-200 mb-6">
          <p className="text-center text-gray-500">No dashboard stats available</p>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Lead Sources Chart */}
        <CollapsibleSection
          title="Lead Sources Breakdown"
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSources}
                  dataKey="count"
                  nameKey="lead_source"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.lead_source}: ${entry.count}`}
                >
                  {leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-8">No lead source data available</p>
          )}
        </CollapsibleSection>

        {/* Conversion Metrics Chart */}
        <CollapsibleSection
          title="Conversion Trends (Last 6 Months)"
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#3B82F6" name="Leads" />
                <Line type="monotone" dataKey="conversions" stroke="#10B981" name="Conversions" />
                <Line type="monotone" dataKey="conversion_rate" stroke="#F59E0B" name="Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-8">No conversion data available</p>
          )}
        </CollapsibleSection>
      </div>

      {/* Upcoming Activities */}
      <CollapsibleSection
        title={`Upcoming Activities (${stats?.upcoming_activities || 0} scheduled, ${stats?.overdue_activities || 0} overdue)`}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today</h3>
              {upcomingActivities.today.length > 0 ? (
                <div className="space-y-3">
                  {upcomingActivities.today.map(renderActivityCard)}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                  No activities scheduled for today
                </p>
              )}
            </div>

            {/* Tomorrow */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tomorrow</h3>
              {upcomingActivities.tomorrow.length > 0 ? (
                <div className="space-y-3">
                  {upcomingActivities.tomorrow.map(renderActivityCard)}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                  No activities scheduled for tomorrow
                </p>
              )}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Target Progress */}
      <CollapsibleSection
        title="Current Target Progress"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {targets.map(renderTargetProgress)}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No active targets</p>
        )}
      </CollapsibleSection>
    </div>
  );
}

export default BDMDashboard;
