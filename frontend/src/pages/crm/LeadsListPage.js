// ============================================
// LEADS LIST PAGE - CRM Lead Management
// ============================================
// Follows StudentsPage.js pattern
// Client-side filtering with data load on mount
// Enhanced: Status badges, Quick actions, Convert modal
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  LAYOUT,
  MIXINS,
  TOUCH_TARGETS,
} from '../../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../../hooks/useResponsive';

// Common Components
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { ConfirmationModal } from '../../components/common/modals/ConfirmationModal';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/ui/LoadingSpinner';

// CRM Components
import { LeadCard } from '../../components/crm/LeadCard';
import { LeadDetailModal } from '../../components/crm/LeadDetailModal';
import { CreateLeadModal } from '../../components/crm/CreateLeadModal';
import { ConvertLeadModal } from '../../components/crm/ConvertLeadModal';
import { EditLeadModal } from '../../components/crm/EditLeadModal';

// CRM Services & Constants
import { fetchLeads, deleteLead } from '../../api/services/crmService';
import { LEAD_STATUS, LEAD_SOURCES } from '../../utils/constants';

// Status sort priority: active leads first, dead leads last
const STATUS_PRIORITY = {
  'New': 0,
  'Contacted': 1,
  'Interested': 2,
  'Converted': 3,
  'Not Interested': 4,
  'Lost': 5,
};

// ============================================
// STAT CARD COMPONENT WITH HOVER
// ============================================
const StatCard = ({ label, value, color = 'blue', isMobile = false }) => {
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
        width: isMobile ? '36px' : '44px',
        height: isMobile ? '36px' : '44px',
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
        <span style={{ fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg, color: colorScheme.border }}>
          {color === 'blue' ? '📊' : color === 'green' ? '🆕' : color === 'yellow' ? '📞' : color === 'purple' ? '⭐' : '✅'}
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
        margin: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>{label}</h3>
    </div>
  );
};

// ============================================
// STAT CARD COLORS
// ============================================
const STAT_CARD_COLORS = {
  blue: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3B82F6', text: '#60A5FA' },
  green: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#34D399' },
  yellow: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#FBBF24' },
  purple: { bg: 'rgba(139, 92, 246, 0.15)', border: '#8B5CF6', text: '#A78BFA' },
  indigo: { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366F1', text: '#818CF8' },
};

function LeadsListPage() {
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
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile
        ? 'repeat(2, 1fr)'
        : isTablet
          ? 'repeat(3, 1fr)'
          : 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: isMobile ? SPACING.sm : SPACING.lg,
      marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    },
    filtersGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: isMobile ? SPACING.md : SPACING.lg,
      marginBottom: SPACING.lg,
    },
    input: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.lg,
      fontSize: '16px', // Prevents iOS zoom
      outline: 'none',
      width: '100%',
      color: COLORS.text.white,
      minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
    },
    select: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      ...MIXINS.glassmorphicSelect,
      borderRadius: BORDER_RADIUS.lg,
      fontSize: '16px', // Prevents iOS zoom
      outline: 'none',
      width: '100%',
      color: COLORS.text.white,
      cursor: 'pointer',
      minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
    },
    option: {
      ...MIXINS.selectOption,
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
    activeFilters: {
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      fontSize: FONT_SIZES.sm,
      color: COLORS.text.whiteMedium,
      flexWrap: 'wrap',
    },
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      gap: SPACING.lg,
      alignItems: 'start',
    },
  }), [isMobile, isTablet]);

  const responsiveStyles = getResponsiveStyles();

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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [leadToView, setLeadToView] = useState(null);
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

    // Sort: active statuses first, lost/not-interested last
    filtered.sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Within same status, newest first
      return new Date(b.created_at) - new Date(a.created_at);
    });

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
    setLeadToView(lead);
    setIsDetailModalOpen(true);
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

  // User role for card actions
  const userRole = localStorage.getItem('role');

  // ============================================
  // RENDER
  // ============================================

  if (error) {
    return <ErrorDisplay message={error} onRetry={loadLeads} />;
  }

  return (
    <div style={responsiveStyles.pageContainer}>
      {/* Header */}
      <PageHeader
        icon="🎯"
        title="Leads Management"
        subtitle="Manage and track potential school leads"
      />

      {/* Stats Cards */}
      <div style={responsiveStyles.statsGrid}>
        <StatCard label="Total Leads" value={stats.total} color="blue" isMobile={isMobile} />
        <StatCard label="New" value={stats.new} color="green" isMobile={isMobile} />
        <StatCard label="Contacted" value={stats.contacted} color="yellow" isMobile={isMobile} />
        <StatCard label="Interested" value={stats.interested} color="purple" isMobile={isMobile} />
        <StatCard label="Converted" value={stats.converted} color="indigo" isMobile={isMobile} />
      </div>

      {/* Filters and Actions */}
      <div style={{
        ...styles.filtersContainer,
        padding: isMobile ? SPACING.md : SPACING.lg,
      }}>
        <div style={responsiveStyles.filtersGrid}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={responsiveStyles.input}
          />

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={responsiveStyles.select}
          >
            <option value="" style={responsiveStyles.option}>All Status</option>
            {Object.values(LEAD_STATUS).map((status) => (
              <option key={status} value={status} style={responsiveStyles.option}>
                {status}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            style={responsiveStyles.select}
          >
            <option value="" style={responsiveStyles.option}>All Sources</option>
            {Object.values(LEAD_SOURCES).map((source) => (
              <option key={source} value={source} style={responsiveStyles.option}>
                {source}
              </option>
            ))}
          </select>

          {/* Create Button */}
          <button
            style={responsiveStyles.primaryButton}
            onClick={() => setIsCreateModalOpen(true)}
          >
            + New Lead
          </button>
        </div>

        {/* Active Filters Display */}
        {(filters.status || filters.source || filters.search) && (
          <div style={responsiveStyles.activeFilters}>
            <span>{isMobile ? 'Filters:' : 'Active filters:'}</span>
            {filters.status && (
              <span style={styles.filterTag}>
                {isMobile ? filters.status : `Status: ${filters.status}`}
              </span>
            )}
            {filters.source && (
              <span style={styles.filterTag}>
                {isMobile ? filters.source : `Source: ${filters.source}`}
              </span>
            )}
            {filters.search && (
              <span style={styles.filterTag}>
                {isMobile ? `"${filters.search}"` : `Search: ${filters.search}`}
              </span>
            )}
            <button
              onClick={() => setFilters({ status: '', source: '', search: '' })}
              style={{
                ...styles.clearFiltersButton,
                minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
                padding: isMobile ? `${SPACING.xs} ${SPACING.md}` : undefined,
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Lead Cards Grid */}
      {loading.leads ? (
        <LoadingSpinner />
      ) : leads.length === 0 ? (
        <div style={styles.emptyState}>
          No leads found. Create your first lead to get started!
        </div>
      ) : (
        <div style={responsiveStyles.cardsGrid}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onEdit={handleEditClick}
              onView={handleViewDetails}
              onConvert={handleConvertClick}
              onDelete={handleDeleteClick}
              isAdmin={userRole === 'Admin'}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {/* Showing Count */}
      <div style={styles.showingCount}>
        Showing {leads.length} of {allLeads.length} leads
      </div>

      {/* Modals */}
      {isDetailModalOpen && leadToView && (
        <LeadDetailModal
          lead={leadToView}
          onClose={() => {
            setIsDetailModalOpen(false);
            setLeadToView(null);
          }}
          onEdit={(lead) => {
            setIsDetailModalOpen(false);
            setLeadToView(null);
            handleEditClick(lead);
          }}
          onLeadsRefresh={loadLeads}
        />
      )}

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

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  // Filters Section
  filtersContainer: {
    marginBottom: SPACING.xl,
    ...MIXINS.glassmorphicCard,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  input: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    outline: 'none',
    width: '100%',
    color: COLORS.text.white,
  },
  select: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    ...MIXINS.glassmorphicSelect,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    outline: 'none',
    width: '100%',
    color: COLORS.text.white,
    cursor: 'pointer',
  },
  option: {
    ...MIXINS.selectOption,
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
  },

  // Active Filters
  activeFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
  },
  filterTag: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: COLORS.background.whiteSubtle,
    color: COLORS.text.white,
    borderRadius: BORDER_RADIUS.sm,
  },
  clearFiltersButton: {
    color: COLORS.text.white,
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
  },

  // Empty State
  emptyState: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.base,
  },

  // Showing Count
  showingCount: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    textAlign: 'center',
  },
};

export default LeadsListPage;
