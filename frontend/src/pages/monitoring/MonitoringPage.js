// ============================================
// MONITORING PAGE - School Visit Monitoring
// ============================================
// Follows LeadsListPage.js pattern
// Client-side filtering with data load on mount
// Enhanced: Status badges, Quick actions, Evaluation wizard
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
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { ConfirmationModal } from '../../components/common/modals/ConfirmationModal';

// Monitoring Components
import PlanVisitModal from '../../components/monitoring/PlanVisitModal';
import EvaluationWizard from '../../components/monitoring/EvaluationWizard';

// Monitoring Services
import {
  fetchVisits,
  deleteVisit,
  startVisit,
  completeVisit,
  fetchMonitoringStats,
} from '../../services/monitoringService';

// ============================================
// VISIT STATUS CONSTANTS
// ============================================
const VISIT_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'missed', label: 'Missed' },
];

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
// STATUS BADGE COLORS
// ============================================
const STATUS_BADGE_COLORS = {
  planned: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.4)' },
  in_progress: { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.4)' },
  completed: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399', border: 'rgba(16, 185, 129, 0.4)' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.2)', text: '#F87171', border: 'rgba(239, 68, 68, 0.4)' },
  missed: { bg: 'rgba(239, 68, 68, 0.2)', text: '#F87171', border: 'rgba(239, 68, 68, 0.4)' },
};

// ============================================
// STAT CARD COMPONENT WITH HOVER
// ============================================
const StatCard = ({ label, value, icon, color = 'blue', isMobile = false }) => {
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
          {icon}
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
// VISIT CARD COMPONENT
// ============================================
const VisitCard = ({ visit, isMobile, showAssignedTo = false, onStart, onComplete, onEvaluate, onEdit, onDelete, onViewDetails }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  const statusColors = STATUS_BADGE_COLORS[visit.status] || STATUS_BADGE_COLORS.planned;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatStatus = (status) => {
    const statusMap = {
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      missed: 'Missed',
    };
    return statusMap[status] || status;
  };

  const getActionButtons = () => {
    switch (visit.status) {
      case 'planned':
        return (
          <div style={{
            display: 'flex',
            gap: SPACING.sm,
            flexWrap: 'wrap',
          }}>
            <button
              style={{
                ...actionButtonBase,
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60A5FA',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                ...(hoveredButton === 'start' ? { background: 'rgba(59, 130, 246, 0.35)' } : {}),
              }}
              onMouseEnter={() => setHoveredButton('start')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={() => onStart(visit)}
            >
              Start Visit
            </button>
            <button
              style={{
                ...actionButtonBase,
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#A78BFA',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                ...(hoveredButton === 'edit' ? { background: 'rgba(139, 92, 246, 0.35)' } : {}),
              }}
              onMouseEnter={() => setHoveredButton('edit')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={() => onEdit(visit)}
            >
              Edit
            </button>
            <button
              style={{
                ...actionButtonBase,
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#F87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                ...(hoveredButton === 'delete' ? { background: 'rgba(239, 68, 68, 0.35)' } : {}),
              }}
              onMouseEnter={() => setHoveredButton('delete')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={() => onDelete(visit)}
            >
              Delete
            </button>
          </div>
        );

      case 'in_progress':
        return (
          <div style={{
            display: 'flex',
            gap: SPACING.sm,
            flexWrap: 'wrap',
          }}>
            <button
              style={{
                ...actionButtonBase,
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#FBBF24',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                ...(hoveredButton === 'evaluate' ? { background: 'rgba(245, 158, 11, 0.35)' } : {}),
              }}
              onMouseEnter={() => setHoveredButton('evaluate')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={() => onEvaluate(visit)}
            >
              Evaluate Teacher
            </button>
            <button
              style={{
                ...actionButtonBase,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                ...(hoveredButton === 'complete' ? { background: 'rgba(16, 185, 129, 0.35)' } : {}),
              }}
              onMouseEnter={() => setHoveredButton('complete')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={() => onComplete(visit)}
            >
              Complete Visit
            </button>
          </div>
        );

      case 'completed':
        return (
          <div style={{
            display: 'flex',
            gap: SPACING.sm,
            flexWrap: 'wrap',
          }}>
            <button
              style={{
                ...actionButtonBase,
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#818CF8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                ...(hoveredButton === 'view' ? { background: 'rgba(99, 102, 241, 0.35)' } : {}),
              }}
              onMouseEnter={() => setHoveredButton('view')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={() => onViewDetails(visit)}
            >
              View Details
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        padding: isMobile ? SPACING.md : SPACING.xl,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 12px 40px rgba(0, 0, 0, 0.25)'
          : '0 4px 24px rgba(0, 0, 0, 0.12)',
        background: isHovered
          ? 'rgba(255, 255, 255, 0.16)'
          : 'rgba(255, 255, 255, 0.12)',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.md,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header: School Name + Status Badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SPACING.sm,
      }}>
        <h3 style={{
          fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,
          fontWeight: FONT_WEIGHTS.bold,
          color: COLORS.text.white,
          margin: 0,
          flex: 1,
          lineHeight: 1.3,
        }}>
          {visit.school_name || visit.school?.name || 'Unknown School'}
        </h3>
        <span style={{
          padding: `${SPACING.xs} ${SPACING.sm}`,
          borderRadius: BORDER_RADIUS.full,
          fontSize: FONT_SIZES.xs,
          fontWeight: FONT_WEIGHTS.semibold,
          backgroundColor: statusColors.bg,
          color: statusColors.text,
          border: `1px solid ${statusColors.border}`,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {formatStatus(visit.status)}
        </span>
      </div>

      {/* Visit Details */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm,
      }}>
        {/* Visit Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
        }}>
          <span style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle }}>
            Date:
          </span>
          <span style={{
            fontSize: FONT_SIZES.sm,
            fontWeight: FONT_WEIGHTS.medium,
            color: COLORS.text.whiteMedium,
          }}>
            {formatDate(visit.visit_date || visit.scheduled_date)}
          </span>
        </div>

        {/* Purpose */}
        {visit.purpose && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
          }}>
            <span style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle }}>
              Purpose:
            </span>
            <span style={{
              fontSize: FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.text.whiteMedium,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {visit.purpose}
            </span>
          </div>
        )}

        {/* Teacher Count & Evaluations Row */}
        <div style={{
          display: 'flex',
          gap: SPACING.lg,
          flexWrap: 'wrap',
        }}>
          {showAssignedTo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.xs,
            }}>
              <span style={{
                fontSize: FONT_SIZES.sm,
                color: COLORS.text.whiteSubtle,
              }}>
                Assigned To:
              </span>
              <span style={{
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                color: '#A78BFA',
              }}>
                {visit.bdm_name || 'Unassigned'}
              </span>
            </div>
          )}

          {(visit.teacher_count !== undefined || visit.teachers_count !== undefined) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.xs,
            }}>
              <span style={{
                fontSize: FONT_SIZES.sm,
                color: COLORS.text.whiteSubtle,
              }}>
                Teachers:
              </span>
              <span style={{
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                color: '#60A5FA',
              }}>
                {visit.teacher_count ?? visit.teachers_count ?? 0}
              </span>
            </div>
          )}

          {(visit.evaluations_count !== undefined || visit.evaluation_count !== undefined) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.xs,
            }}>
              <span style={{
                fontSize: FONT_SIZES.sm,
                color: COLORS.text.whiteSubtle,
              }}>
                Evaluations:
              </span>
              <span style={{
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                color: '#34D399',
              }}>
                {visit.evaluations_count ?? visit.evaluation_count ?? 0}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        margin: `${SPACING.xs} 0`,
      }} />

      {/* Action Buttons */}
      {getActionButtons()}
    </div>
  );
};

// Shared action button base style
const actionButtonBase = {
  padding: `${SPACING.xs} ${SPACING.md}`,
  borderRadius: BORDER_RADIUS.lg,
  fontSize: FONT_SIZES.sm,
  fontWeight: FONT_WEIGHTS.medium,
  cursor: 'pointer',
  transition: `all ${TRANSITIONS.normal}`,
  whiteSpace: 'nowrap',
};

// ============================================
// MAIN MONITORING PAGE COMPONENT
// ============================================
function MonitoringPage() {
  const { isMobile, isTablet } = useResponsive();
  const userRole = localStorage.getItem('role') || '';
  const isAdmin = userRole === 'Admin';

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
    select: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      ...MIXINS.glassmorphicSelect,
      borderRadius: BORDER_RADIUS.lg,
      fontSize: '16px',
      outline: 'none',
      width: '100%',
      color: COLORS.text.white,
      cursor: 'pointer',
      minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
    },
    input: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.lg,
      fontSize: '16px',
      outline: 'none',
      width: '100%',
      color: COLORS.text.white,
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
    secondaryButton: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      background: 'rgba(255, 255, 255, 0.1)',
      color: COLORS.text.white,
      borderRadius: BORDER_RADIUS.lg,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      fontSize: FONT_SIZES.base,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: 'pointer',
      transition: TRANSITIONS.normal,
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
  const [visits, setVisits] = useState([]);
  const [allVisits, setAllVisits] = useState([]);
  const [stats, setStats] = useState({
    total_visits: 0,
    planned: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    evaluations_done: 0,
  });

  // Filter States
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // UI States - Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEvalWizard, setShowEvalWizard] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    visitId: null,
    visitName: '',
  });

  // Loading States
  const [loading, setLoading] = useState({
    visits: true,
    stats: true,
    action: false,
    delete: false,
  });

  // Error State
  const [error, setError] = useState(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  const loadStats = useCallback(async () => {
    setLoading((prev) => ({ ...prev, stats: true }));
    try {
      const data = await fetchMonitoringStats();
      if (data) {
        setStats({
          total_visits: data.total_visits ?? data.total ?? 0,
          planned: data.planned ?? 0,
          in_progress: data.in_progress ?? 0,
          completed: data.completed ?? 0,
          overdue: data.overdue ?? 0,
          evaluations_done: data.evaluations_done ?? data.evaluations ?? 0,
        });
      }
    } catch (err) {
      console.error('Error fetching monitoring stats:', err);
    } finally {
      setLoading((prev) => ({ ...prev, stats: false }));
    }
  }, []);

  const loadVisits = useCallback(async () => {
    setLoading((prev) => ({ ...prev, visits: true }));
    setError(null);

    try {
      const data = await fetchVisits();

      if (!Array.isArray(data)) {
        console.error('Expected an array but received:', data);
        setError('Invalid data received from server');
        setVisits([]);
        setAllVisits([]);
        return;
      }

      setAllVisits(data);
      setVisits(data);
    } catch (err) {
      console.error('Error fetching visits:', err);
      setError(err.message || 'Failed to load visits');
      setVisits([]);
      setAllVisits([]);
    } finally {
      setLoading((prev) => ({ ...prev, visits: false }));
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([loadVisits(), loadStats()]);
  }, [loadVisits, loadStats]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ============================================
  // CLIENT-SIDE FILTERING
  // ============================================

  useEffect(() => {
    let filtered = [...allVisits];

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((visit) => visit.status === filters.status);
    }

    // Filter by date range - from
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter((visit) => {
        const visitDate = new Date(visit.visit_date || visit.scheduled_date);
        return visitDate >= fromDate;
      });
    }

    // Filter by date range - to
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((visit) => {
        const visitDate = new Date(visit.visit_date || visit.scheduled_date);
        return visitDate <= toDate;
      });
    }

    // Sort: in_progress first, then planned, then by date descending
    const statusPriority = { in_progress: 0, planned: 1, completed: 2, missed: 3, cancelled: 4 };
    filtered.sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 99;
      const priorityB = statusPriority[b.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.visit_date || b.scheduled_date || b.created_at) -
             new Date(a.visit_date || a.scheduled_date || a.created_at);
    });

    setVisits(filtered);
  }, [filters, allVisits]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleStartVisit = async (visit) => {
    if (!visit || !visit.id) {
      toast.error('Unable to start: Invalid visit data');
      return;
    }

    setLoading((prev) => ({ ...prev, action: true }));
    try {
      await startVisit(visit.id);
      toast.success('Visit started successfully');
      await refreshData();
    } catch (err) {
      console.error('Error starting visit:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to start visit');
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleCompleteVisit = async (visit) => {
    if (!visit || !visit.id) {
      toast.error('Unable to complete: Invalid visit data');
      return;
    }

    setLoading((prev) => ({ ...prev, action: true }));
    try {
      await completeVisit(visit.id);
      toast.success('Visit completed successfully');
      await refreshData();
    } catch (err) {
      console.error('Error completing visit:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to complete visit');
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleEvaluateTeacher = (visit) => {
    if (!visit || !visit.id) {
      toast.error('Unable to evaluate: Invalid visit data');
      return;
    }
    setSelectedVisit(visit);
    setShowEvalWizard(true);
  };

  const handleEditVisit = (visit) => {
    if (!visit || !visit.id) {
      toast.error('Unable to edit: Invalid visit data');
      return;
    }
    setSelectedVisit(visit);
    setShowPlanModal(true);
  };

  const handleDeleteClick = (visit) => {
    if (!visit || !visit.id) {
      toast.error('Unable to delete: Invalid visit data');
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      visitId: visit.id,
      visitName: visit.school_name || visit.school?.name || 'this visit',
    });
  };

  const handleDeleteConfirm = async () => {
    setLoading((prev) => ({ ...prev, delete: true }));

    try {
      await deleteVisit(deleteConfirm.visitId);
      toast.success('Visit deleted successfully');
      await refreshData();
    } catch (err) {
      console.error('Error deleting visit:', err);
      toast.error('Failed to delete visit');
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
      setDeleteConfirm({ isOpen: false, visitId: null, visitName: '' });
    }
  };

  const handleViewDetails = (visit) => {
    if (!visit || !visit.id) {
      toast.error('Unable to view: Invalid visit data');
      return;
    }
    setSelectedVisit(visit);
    setShowPlanModal(true);
  };

  const handlePlanVisitSuccess = (mode = 'create') => {
    setShowPlanModal(false);
    setSelectedVisit(null);
    toast.success(mode === 'edit' ? 'Visit updated successfully' : 'Visit planned successfully');
    refreshData();
  };

  const handleEvalWizardClose = () => {
    setShowEvalWizard(false);
    setSelectedVisit(null);
    refreshData();
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters]);

  // ============================================
  // RENDER
  // ============================================

  if (error && !loading.visits) {
    return <ErrorDisplay message={error} onRetry={refreshData} />;
  }

  return (
    <div style={responsiveStyles.pageContainer}>
      {/* Header */}
      <PageHeader
        icon="🏫"
        title="School Monitoring"
        subtitle="Plan, execute, and track school monitoring visits"
      />

      {/* Quick Action Buttons */}
      <div style={{
        display: 'flex',
        gap: SPACING.md,
        marginBottom: isMobile ? SPACING.lg : SPACING.xl,
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <button
          style={responsiveStyles.primaryButton}
          onClick={() => {
            setSelectedVisit(null);
            setShowPlanModal(true);
          }}
        >
          + Plan Visit
        </button>
        <button
          style={responsiveStyles.secondaryButton}
          onClick={refreshData}
          disabled={loading.visits || loading.stats}
        >
          {(loading.visits || loading.stats) ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={responsiveStyles.statsGrid}>
        <StatCard
          label="Total Visits"
          value={stats.total_visits}
          icon="📊"
          color="blue"
          isMobile={isMobile}
        />
        <StatCard
          label="Planned"
          value={stats.planned}
          icon="📋"
          color="indigo"
          isMobile={isMobile}
        />
        <StatCard
          label="In Progress"
          value={stats.in_progress}
          icon="🔄"
          color="yellow"
          isMobile={isMobile}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon="✅"
          color="green"
          isMobile={isMobile}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon="⚠️"
          color="red"
          isMobile={isMobile}
        />
        <StatCard
          label="Evaluations Done"
          value={stats.evaluations_done}
          icon="📝"
          color="purple"
          isMobile={isMobile}
        />
      </div>

      {/* Filters Section */}
      <div style={{
        ...styles.filtersContainer,
        padding: isMobile ? SPACING.md : SPACING.lg,
      }}>
        <div style={responsiveStyles.filtersGrid}>
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={responsiveStyles.select}
          >
            <option value="" style={responsiveStyles.option}>All Statuses</option>
            {VISIT_STATUSES.map((status) => (
              <option key={status.value} value={status.value} style={responsiveStyles.option}>
                {status.label}
              </option>
            ))}
          </select>

          {/* Date From */}
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            style={{
              ...responsiveStyles.input,
              colorScheme: 'dark',
            }}
            placeholder="From Date"
          />

          {/* Date To */}
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            style={{
              ...responsiveStyles.input,
              colorScheme: 'dark',
            }}
            placeholder="To Date"
          />
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div style={responsiveStyles.activeFilters}>
            <span>{isMobile ? 'Filters:' : 'Active filters:'}</span>
            {filters.status && (
              <span style={styles.filterTag}>
                {isMobile
                  ? VISIT_STATUSES.find(s => s.value === filters.status)?.label || filters.status
                  : `Status: ${VISIT_STATUSES.find(s => s.value === filters.status)?.label || filters.status}`
                }
              </span>
            )}
            {filters.dateFrom && (
              <span style={styles.filterTag}>
                {isMobile ? `From: ${filters.dateFrom}` : `From: ${filters.dateFrom}`}
              </span>
            )}
            {filters.dateTo && (
              <span style={styles.filterTag}>
                {isMobile ? `To: ${filters.dateTo}` : `To: ${filters.dateTo}`}
              </span>
            )}
            <button
              onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '' })}
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

      {/* Visit Cards Grid */}
      {loading.visits ? (
        <LoadingSpinner />
      ) : visits.length === 0 ? (
        <div style={styles.emptyState}>
          {activeFilterCount > 0
            ? 'No visits found matching your filters. Try adjusting your criteria.'
            : 'No monitoring visits found. Plan your first visit to get started!'
          }
        </div>
      ) : (
        <div style={responsiveStyles.cardsGrid}>
          {visits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              isMobile={isMobile}
              showAssignedTo={isAdmin}
              onStart={handleStartVisit}
              onComplete={handleCompleteVisit}
              onEvaluate={handleEvaluateTeacher}
              onEdit={handleEditVisit}
              onDelete={handleDeleteClick}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Showing Count */}
      <div style={styles.showingCount}>
        Showing {visits.length} of {allVisits.length} visits
      </div>

      {/* Plan Visit Modal */}
      <PlanVisitModal
        isOpen={showPlanModal}
        onClose={() => {
          setShowPlanModal(false);
          setSelectedVisit(null);
        }}
        onSuccess={handlePlanVisitSuccess}
        mode={selectedVisit ? 'edit' : 'create'}
        initialVisit={selectedVisit}
      />

      {/* Evaluation Wizard */}
      <EvaluationWizard
        isOpen={showEvalWizard && !!selectedVisit}
        visitId={selectedVisit?.id}
        visitSchoolName={selectedVisit?.school_name}
        onClose={handleEvalWizardClose}
        onSuccess={() => {
          toast.success('Evaluation submitted successfully');
          handleEvalWizardClose();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title="Delete Visit"
          message={`Are you sure you want to delete the visit to "${deleteConfirm.visitName}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm({ isOpen: false, visitId: null, visitName: '' })}
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
  // Filters Section
  filtersContainer: {
    marginBottom: SPACING.xl,
    ...MIXINS.glassmorphicCard,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },

  // Active Filters
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

export default MonitoringPage;
