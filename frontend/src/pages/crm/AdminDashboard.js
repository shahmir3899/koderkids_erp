// ============================================
// ADMIN CRM DASHBOARD - Team Analytics
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

// Common Components
import { CollapsibleSection } from '../../components/common/cards/CollapsibleSection';
import { LoadingSpinner } from '../../components/common/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { Button } from '../../components/common/ui/Button';

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
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

// ============================================
// MAIN COMPONENT
// ============================================
function AdminDashboard() {
  const isMounted = useRef(true);
  const navigate = useNavigate();

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

  const renderStatCard = (title, value, subtitle, color = 'blue') => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      purple: 'bg-purple-50 border-purple-200',
      red: 'bg-red-50 border-red-200',
      indigo: 'bg-indigo-50 border-indigo-200',
    };

    return (
      <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
        <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
      </div>
    );
  };

  const renderBDMPerformanceTable = () => {
    if (!overview?.bdm_performance || overview.bdm_performance.length === 0) {
      return <p className="text-center text-gray-500 py-8">No BDM performance data available</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                BDM Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Leads
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Converted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversion Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activities
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {overview.bdm_performance.map((bdm, index) => (
              <tr key={bdm.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{bdm.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{bdm.total_leads}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{bdm.converted_leads}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    bdm.conversion_rate >= 30 ? 'bg-green-100 text-green-800' :
                    bdm.conversion_rate >= 15 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {bdm.conversion_rate}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{bdm.total_activities}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{bdm.completed_activities}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRecentActivityCard = (activity) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'Completed':
          return 'bg-green-100 text-green-800';
        case 'Scheduled':
          return 'bg-blue-100 text-blue-800';
        case 'Cancelled':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div
        key={activity.id}
        className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              activity.type === 'Call' ? 'bg-blue-100 text-blue-800' :
              activity.type === 'Meeting' ? 'bg-purple-100 text-purple-800' :
              activity.type === 'Email' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {activity.type}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(activity.status)}`}>
              {activity.status}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(activity.created_at).toLocaleDateString()}
          </span>
        </div>
        <h4 className="font-semibold text-gray-900 mb-1">{activity.subject}</h4>
        <p className="text-sm text-gray-600 mb-1">Lead: {activity.lead_name}</p>
        <p className="text-sm text-gray-500">Assigned to: {activity.assigned_to_name}</p>
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin CRM Dashboard</h1>
        <p className="text-gray-600">Overview of team performance, leads, and activities</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <Button onClick={() => navigate('/crm/leads')}>
          View All Leads
        </Button>
        <Button onClick={() => navigate('/crm/activities')} variant="secondary">
          View All Activities
        </Button>
        <Button onClick={() => navigate('/crm/targets')} variant="secondary">
          Manage Targets
        </Button>
        <Button onClick={() => cache.clear()} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      {loading.overview ? (
        <LoadingSpinner />
      ) : overview ? (
        <>
          {/* Lead Statistics */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {renderStatCard('Total Leads', overview.lead_stats?.total || 0, 'All time', 'blue')}
              {renderStatCard('New', overview.lead_stats?.new || 0, 'Fresh leads', 'green')}
              {renderStatCard('Contacted', overview.lead_stats?.contacted || 0, '', 'yellow')}
              {renderStatCard('Interested', overview.lead_stats?.interested || 0, '', 'purple')}
              {renderStatCard('Not Interested', overview.lead_stats?.not_interested || 0, '', 'red')}
              {renderStatCard('Converted', overview.lead_stats?.converted || 0, `${overview.this_month_conversions || 0} this month`, 'green')}
              {renderStatCard('Lost', overview.lead_stats?.lost || 0, '', 'red')}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {renderStatCard(
              'Recent Activity (7 Days)',
              overview.recent_activities_count || 0,
              'Team-wide activities',
              'indigo'
            )}
            {renderStatCard(
              'This Month Conversions',
              overview.this_month_conversions || 0,
              'Team performance',
              'green'
            )}
          </div>
        </>
      ) : (
        <div className="bg-white p-8 rounded-lg border border-gray-200 mb-6">
          <p className="text-center text-gray-500">No dashboard data available</p>
        </div>
      )}

      {/* BDM Performance Comparison */}
      <CollapsibleSection
        title="BDM Performance Comparison"
        defaultOpen={true}
      >
        {loading.overview ? (
          <LoadingSpinner />
        ) : (
          renderBDMPerformanceTable()
        )}
      </CollapsibleSection>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Lead Distribution Chart */}
        <CollapsibleSection
          title="Lead Distribution Across BDMs"
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadDistribution}
                  dataKey="lead_count"
                  nameKey="bdm_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.bdm_name}: ${entry.lead_count}`}
                >
                  {leadDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-8">No lead distribution data available</p>
          )}
        </CollapsibleSection>

        {/* BDM Conversion Comparison */}
        <CollapsibleSection
          title="BDM Conversion Comparison"
          defaultOpen={false}
        >
          {loading.overview ? (
            <LoadingSpinner />
          ) : overview?.bdm_performance && overview.bdm_performance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overview.bdm_performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_leads" fill="#3B82F6" name="Total Leads" />
                <Bar dataKey="converted_leads" fill="#10B981" name="Converted" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-8">No BDM performance data available</p>
          )}
        </CollapsibleSection>
      </div>

      {/* Recent Activities Across Team */}
      <CollapsibleSection
        title="Recent Activities (Last 10)"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentActivities.map(renderRecentActivityCard)}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No recent activities</p>
        )}
      </CollapsibleSection>
    </div>
  );
}

export default AdminDashboard;
