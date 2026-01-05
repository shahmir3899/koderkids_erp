// ============================================
// ACTIVITIES PAGE - CRM Activity Management
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Common Components
import { DataTable } from '../../components/common/tables/DataTable';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { LoadingSpinner } from '../../components/common/ui/LoadingSpinner';

// CRM Components
import { CreateActivityModal } from '../../components/crm/CreateActivityModal';
import { EditActivityModal } from '../../components/crm/EditActivityModal';

// CRM Services
import { fetchActivities, deleteActivity, completeActivity } from '../../api/services/crmService';

function ActivitiesPage() {
  const navigate = useNavigate();

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

  // Table columns
  const tableColumns = [
    {
      key: 'activity_type',
      label: 'Type',
      render: (value, row) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          row?.activity_type === 'Call' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
        }`}>
          {row?.activity_type || '—'}
        </span>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (value, row) => row?.subject || '—',
    },
    {
      key: 'lead_name',
      label: 'Lead',
      render: (value, row) => row?.lead_name || '—',
    },
    {
      key: 'scheduled_date',
      label: 'Scheduled',
      render: (value, row) => row?.scheduled_date
        ? new Date(row.scheduled_date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => {
        const statusColors = {
          'Scheduled': 'bg-yellow-100 text-yellow-800 border-yellow-200',
          'Completed': 'bg-green-100 text-green-800 border-green-200',
          'Cancelled': 'bg-red-100 text-red-800 border-red-200',
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            statusColors[row?.status] || 'bg-gray-100 text-gray-800 border-gray-200'
          }`}>
            {row?.status || '—'}
          </span>
        );
      },
    },
    {
      key: 'assigned_to_name',
      label: 'Assigned To',
      render: (value, row) => row?.assigned_to_name || 'Unassigned',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            title="Edit activity"
          >
            Edit
          </button>
          {row.status === 'Scheduled' && (
            <button
              onClick={() => handleComplete(row.id)}
              className="text-green-600 hover:text-green-800 font-medium text-sm"
              title="Mark as completed"
            >
              Complete
            </button>
          )}
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-800 font-medium text-sm"
            title="Delete activity"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // Render
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Activities</h1>
          <p className="text-gray-600">Manage calls and meetings with leads</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          + Add Activity
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Activities</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Scheduled</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.scheduled}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by subject or lead..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.type || filters.status || filters.search) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
            <span>Active filters:</span>
            {filters.type && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Type: {filters.type}
                <button
                  onClick={() => handleFilterChange('type', '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.status && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                Status: {filters.status}
                <button
                  onClick={() => handleFilterChange('status', '')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.search && (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                Search: "{filters.search}"
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => setFilters({ type: '', status: '', search: '' })}
              className="ml-2 text-red-600 hover:text-red-800 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && <ErrorDisplay message={error} onRetry={loadActivities} />}

      {/* Data Table */}
      {loading.fetch ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <LoadingSpinner message="Loading activities..." />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <DataTable
            data={filteredActivities}
            columns={tableColumns}
            loading={loading.fetch}
            emptyMessage="No activities found"
            className="rounded-lg"
          />
        </div>
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

export default ActivitiesPage;
