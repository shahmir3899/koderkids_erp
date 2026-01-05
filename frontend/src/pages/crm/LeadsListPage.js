// ============================================
// LEADS LIST PAGE - CRM Lead Management
// ============================================
// Follows StudentsPage.js pattern
// Client-side filtering with data load on mount
// Enhanced: Status badges, Quick actions, Convert modal
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Common Components
import { DataTable } from '../../components/common/tables/DataTable';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { ConfirmationModal } from '../../components/common/modals/ConfirmationModal';

// CRM Components
import { LeadStatusBadge } from '../../components/crm/LeadStatusBadge';
import { CreateLeadModal } from '../../components/crm/CreateLeadModal';
import { ConvertLeadModal } from '../../components/crm/ConvertLeadModal';
import { EditLeadModal } from '../../components/crm/EditLeadModal';

// CRM Services & Constants
import { fetchLeads, deleteLead } from '../../api/services/crmService';
import { LEAD_STATUS, LEAD_SOURCES } from '../../utils/constants';

function LeadsListPage() {
  const navigate = useNavigate();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // Data States
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]); // Unfiltered data
  const [selectedLead, setSelectedLead] = useState(null);

  // UI States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    search: '',
  });

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    leadId: null,
    leadName: '',
  });

  // Loading States
  const [loading, setLoading] = useState({
    leads: true,
    delete: false,
  });

  // Error State
  const [error, setError] = useState(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  const loadLeads = useCallback(async () => {
    setLoading((prev) => ({ ...prev, leads: true }));
    setError(null);

    try {
      console.log('🔍 Fetching all leads from server...');

      const data = await fetchLeads();

      if (!Array.isArray(data)) {
        console.error('❌ Error: Expected an array but received:', data);
        setError('Invalid data received from server');
        setLeads([]);
        setAllLeads([]);
        return;
      }

      console.log('✅ Leads Data Loaded:', data.length, 'leads');
      setAllLeads(data);
      setLeads(data);
    } catch (err) {
      console.error('❌ Error fetching leads:', err);
      setError(err.message || 'Failed to load leads');
      setLeads([]);
      setAllLeads([]);
    } finally {
      setLoading((prev) => ({ ...prev, leads: false }));
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // ============================================
  // CLIENT-SIDE FILTERING
  // ============================================

  useEffect(() => {
    let filtered = [...allLeads];

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((lead) => lead.status === filters.status);
    }

    // Filter by source
    if (filters.source) {
      filtered = filtered.filter((lead) => lead.lead_source === filters.source);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          (lead.school_name && lead.school_name.toLowerCase().includes(searchLower)) ||
          (lead.phone && lead.phone.toLowerCase().includes(searchLower)) ||
          (lead.contact_person && lead.contact_person.toLowerCase().includes(searchLower)) ||
          (lead.email && lead.email.toLowerCase().includes(searchLower))
      );
    }

    console.log('🔍 Filtered Leads:', filtered.length, 'out of', allLeads.length);
    setLeads(filtered);
  }, [filters, allLeads]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleEditClick = (lead) => {
    setLeadToEdit(lead);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setLeadToEdit(null);
    loadLeads();
  };

  const handleDeleteClick = (lead) => {
    if (!lead || !lead.id) {
      console.error('❌ Invalid lead data:', lead);
      toast.error('Unable to delete: Invalid lead data');
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      leadId: lead.id,
      leadName: lead.school_name || lead.phone || 'this lead',
    });
  };

  const handleDeleteConfirm = async () => {
    setLoading((prev) => ({ ...prev, delete: true }));

    try {
      const response = await deleteLead(deleteConfirm.leadId);

      // Show success message with cascade deletion info
      if (response?.message) {
        toast.success(response.message);
      } else {
        toast.success('Lead deleted successfully');
      }

      // Show info about deleted activities if any
      if (response?.deleted_activities && response.deleted_activities > 0) {
        toast.info(`${response.deleted_activities} associated activity/activities were also deleted`, { autoClose: 5000 });
      }

      loadLeads();
    } catch (err) {
      console.error('❌ Error deleting lead:', err);
      toast.error('Failed to delete lead');
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
      setDeleteConfirm({ isOpen: false, leadId: null, leadName: '' });
    }
  };

  const handleConvertClick = (lead) => {
    if (!lead || !lead.id) {
      console.error('❌ Invalid lead data:', lead);
      toast.error('Unable to convert: Invalid lead data');
      return;
    }
    setSelectedLead(lead);
    setIsConvertModalOpen(true);
  };

  const handleViewDetails = (lead) => {
    if (!lead || !lead.id) {
      console.error('❌ Invalid lead data:', lead);
      toast.error('Unable to view details: Invalid lead data');
      return;
    }
    navigate(`/crm/leads/${lead.id}`);
  };

  const handleCreateSuccess = () => {
    toast.success('Lead created successfully');
    loadLeads();
    setIsCreateModalOpen(false);
  };

  const handleConvertSuccess = () => {
    toast.success('Lead converted to school successfully');
    loadLeads();
    setIsConvertModalOpen(false);
  };

  // ============================================
  // STATS CALCULATIONS
  // ============================================

  const stats = useMemo(() => {
    return {
      total: allLeads.length,
      new: allLeads.filter((l) => l.status === LEAD_STATUS.NEW).length,
      contacted: allLeads.filter((l) => l.status === LEAD_STATUS.CONTACTED).length,
      interested: allLeads.filter((l) => l.status === LEAD_STATUS.INTERESTED).length,
      converted: allLeads.filter((l) => l.status === LEAD_STATUS.CONVERTED).length,
    };
  }, [allLeads]);

  // ============================================
  // TABLE CONFIGURATION
  // ============================================

  const tableColumns = [
    {
      key: 'school_name',
      label: 'School Name',
      render: (value, row) => row?.school_name || '—',
    },
    {
      key: 'contact_person',
      label: 'Contact Person',
      render: (value, row) => row?.contact_person || '—',
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value, row) => row?.phone || '—',
    },
    {
      key: 'email',
      label: 'Email',
      render: (value, row) => row?.email || '—',
    },
    {
      key: 'lead_source',
      label: 'Source',
      render: (value, row) => row?.lead_source || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => row?.status ? <LeadStatusBadge status={row.status} /> : '—',
    },
    {
      key: 'assigned_to_name',
      label: 'Assigned To',
      render: (value, row) => row?.assigned_to_name || 'Unassigned',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value, row) => row?.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <div className="flex gap-2">
          <button
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => handleEditClick(row)}
          >
            Edit
          </button>
          <button
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            onClick={() => handleViewDetails(row)}
          >
            View
          </button>
          {row?.status !== LEAD_STATUS.CONVERTED && (
            <button
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              onClick={() => handleConvertClick(row)}
            >
              Convert
            </button>
          )}
          <button
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => handleDeleteClick(row)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // ============================================
  // RENDER
  // ============================================

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadLeads} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads Management</h1>
        <p className="text-gray-600">Manage and track potential school leads</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Leads</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-gray-600 mb-1">New</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Contacted</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.contacted}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Interested</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.interested}</p>
        </div>
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Converted</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.converted}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            {Object.values(LEAD_STATUS).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Sources</option>
            {Object.values(LEAD_SOURCES).map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          {/* Create Button */}
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + New Lead
          </button>
        </div>

        {/* Active Filters Display */}
        {(filters.status || filters.source || filters.search) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Active filters:</span>
            {filters.status && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Status: {filters.status}
              </span>
            )}
            {filters.source && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Source: {filters.source}
              </span>
            )}
            {filters.search && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Search: {filters.search}
              </span>
            )}
            <button
              onClick={() => setFilters({ status: '', source: '', search: '' })}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <DataTable
          data={leads}
          columns={tableColumns}
          loading={loading.leads}
          emptyMessage="No leads found. Create your first lead to get started!"
        />
      </div>

      {/* Showing Count */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        Showing {leads.length} of {allLeads.length} leads
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateLeadModal onClose={() => setIsCreateModalOpen(false)} onSuccess={handleCreateSuccess} />
      )}

      {isEditModalOpen && leadToEdit && (
        <EditLeadModal
          lead={leadToEdit}
          onClose={() => {
            setIsEditModalOpen(false);
            setLeadToEdit(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {isConvertModalOpen && selectedLead && (
        <ConvertLeadModal
          lead={selectedLead}
          onClose={() => {
            setIsConvertModalOpen(false);
            setSelectedLead(null);
          }}
          onSuccess={handleConvertSuccess}
        />
      )}

      {deleteConfirm.isOpen && (
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Delete Lead"
          message={`Are you sure you want to delete "${deleteConfirm.leadName}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm({ isOpen: false, leadId: null, leadName: '' })}
          isLoading={loading.delete}
          variant="danger"
        />
      )}
    </div>
  );
}

export default LeadsListPage;
