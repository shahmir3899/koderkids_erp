// ============================================
// MONITORING PAGE - School Visit Monitoring
// ============================================
// Follows LeadsListPage.js pattern
// Client-side filtering with data load on mount
// Enhanced: Status badges, Quick actions, Evaluation wizard
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  fetchVisitSummary,
  deleteVisit,
  startVisit,
  completeVisit,
  fetchMonitoringStats,
  fetchVisitEvaluations,
  deleteEvaluation,
  fetchEvaluationDetail,
  getTemplatesCacheVersion,
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

const VIEW_MODES = [
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
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
const StatCard = ({ label, value, icon, color = 'blue', isMobile = false, onClick, isActive = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const colorScheme = STAT_CARD_COLORS[color] || STAT_CARD_COLORS.blue;
  const clickable = typeof onClick === 'function';

  return (
    <div
      style={{
        padding: isMobile ? SPACING.md : SPACING.xl,
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        borderLeft: `4px solid ${isActive ? colorScheme.text : colorScheme.border}`,
        border: isActive ? `1px solid ${colorScheme.border}` : '1px solid rgba(255, 255, 255, 0.12)',
        textAlign: 'center',
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered ? '0 12px 40px rgba(0, 0, 0, 0.25)' : '0 4px 24px rgba(0, 0, 0, 0.12)',
        background: isActive
          ? colorScheme.bg
          : (isHovered ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.12)'),
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      title={clickable ? `Filter by ${label}` : undefined}
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
const VisitCard = ({ visit, isMobile, showAssignedTo = false, onStart, onComplete, onEvaluate, onEdit, onDelete, onViewDetails, onEditEval, onDeleteEval, userRole }) => {
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

  const getTeacherDisplay = () => {
    const names = Array.isArray(visit.teacher_names)
      ? visit.teacher_names.filter(Boolean)
      : [];
    if (names.length > 0) {
      return names.join(', ');
    }
    return String(visit.teacher_count ?? visit.teachers_count ?? 0);
  };

  const disabledEvaluateReasonByStatus = {
    planned: 'Evaluation will be enabled after you start this visit.',
    completed: 'New evaluations are disabled because this visit is completed.',
    cancelled: 'Evaluation is disabled because this visit was cancelled.',
    missed: 'Evaluation is disabled because this visit was marked missed.',
  };

  const renderDisabledEvaluateButton = () => {
    const reason = disabledEvaluateReasonByStatus[visit.status] || 'Evaluation is not available for this visit status.';
    return (
      <span title={reason} style={{ display: 'inline-block' }}>
        <button
          disabled
          style={{
            ...actionButtonBase,
            background: 'rgba(245, 158, 11, 0.18)',
            color: 'rgba(255, 236, 179, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            cursor: 'not-allowed',
          }}
        >
          Evaluate Teacher
        </button>
      </span>
    );
  };

  const getEvaluationGuidance = () => {
    const guidanceByStatus = {
      in_progress: 'Evaluation is active now. Complete Visit will lock new submissions.',
      planned: 'Start Visit to enable teacher evaluation.',
      completed: userRole === 'Admin'
        ? 'New evaluations are locked. Use Edit Evaluations to update existing submissions.'
        : 'New evaluations are locked once a visit is completed.',
      cancelled: 'Evaluation is unavailable for cancelled visits.',
      missed: 'Evaluation is unavailable for missed visits.',
    };
    return guidanceByStatus[visit.status] || null;
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
            {renderDisabledEvaluateButton()}
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
                background: 'rgba(67, 56, 202, 0.35)',
                color: '#E0E7FF',
                border: '1px solid rgba(129, 140, 248, 0.65)',
                ...(hoveredButton === 'view' ? { background: 'rgba(67, 56, 202, 0.5)' } : {}),
              }}
              onMouseEnter={() => setHoveredButton('view')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={() => onViewDetails(visit)}
            >
              View Details
            </button>
            {userRole === 'Admin' && onEditEval && (
              <button
                style={{
                  ...actionButtonBase,
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  ...(hoveredButton === 'editEval' ? { background: 'rgba(245, 158, 11, 0.35)' } : {}),
                }}
                onMouseEnter={() => setHoveredButton('editEval')}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => onEditEval(visit)}
              >
                Edit Evaluations
              </button>
            )}
            {userRole === 'Admin' && onDelete && (
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
            )}
            {renderDisabledEvaluateButton()}
          </div>
        );

      default:
        return (
          <div style={{
            display: 'flex',
            color: 'rgba(255, 255, 255, 0.82)',
            flexWrap: 'wrap',
          }}>
            {renderDisabledEvaluateButton()}
          </div>
        );
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
          color: '#FFFFFF',
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
              color: 'rgba(255, 255, 255, 0.95)',
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
                color: 'rgba(255, 255, 255, 0.82)',
              }}>
                Assigned To:
              </span>
              <span style={{
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                color: '#E9D5FF',
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
                color: 'rgba(255, 255, 255, 0.82)',
              }}>
                Teachers:
              </span>
              <span style={{
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                color: '#BFDBFE',
              }}>
                {getTeacherDisplay()}
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
                color: 'rgba(255, 255, 255, 0.82)',
              }}>
                Evaluations:
              </span>
              <span style={{
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                color: '#86EFAC',
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
      {getEvaluationGuidance() && (
        <p style={{
          margin: 0,
          fontSize: FONT_SIZES.xs,
          color: 'rgba(255, 255, 255, 0.82)',
          lineHeight: 1.5,
        }}>
          {getEvaluationGuidance()}
        </p>
      )}
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
  const [pagination, setPagination] = useState({
    limit: 12,
    offset: 0,
    total: 0,
  });
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
  const [viewMode, setViewMode] = useState('week');

  // UI States - Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEvalWizard, setShowEvalWizard] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [editEvaluation, setEditEvaluation] = useState(null); // when set, EvaluationWizard opens in edit mode
  const [templatesCache, setTemplatesCache] = useState([]);
  const [templatesCacheVersion, setTemplatesCacheVersion] = useState(getTemplatesCacheVersion());

  // Eval management state
  const [visitEvaluations, setVisitEvaluations] = useState([]);
  const [showEvalList, setShowEvalList] = useState(false);
  const [evalDeleteConfirm, setEvalDeleteConfirm] = useState({ isOpen: false, evaluationId: null, teacherName: '' });

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
      const data = await fetchVisits({
        paginate: 'true',
        limit: pagination.limit,
        offset: pagination.offset,
        status: filters.status || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });

      const visitRows = Array.isArray(data)
        ? data
        : (Array.isArray(data?.results) ? data.results : []);
      setAllVisits(visitRows);
      setVisits(visitRows);
      setPagination((prev) => ({
        ...prev,
        total: Array.isArray(data)
          ? data.length
          : Number(data?.count || visitRows.length),
      }));
    } catch (err) {
      console.error('Error fetching visits:', err);
      setError(err.message || 'Failed to load visits');
      setVisits([]);
      setAllVisits([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading((prev) => ({ ...prev, visits: false }));
    }
  }, [filters.dateFrom, filters.dateTo, filters.status, pagination.limit, pagination.offset]);

  const refreshData = useCallback(async () => {
    await Promise.all([loadVisits(), loadStats()]);
  }, [loadVisits, loadStats]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [filters.status, filters.dateFrom, filters.dateTo]);

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
    const currentVersion = getTemplatesCacheVersion();
    if (currentVersion !== templatesCacheVersion) {
      setTemplatesCache([]);
      setTemplatesCacheVersion(currentVersion);
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

  const navigate = useNavigate();

  const handleViewDetails = (visit) => {
    if (!visit || !visit.id) {
      toast.error('Unable to view: Invalid visit data');
      return;
    }
    if (visit.status === 'completed') {
      navigate(`/monitoring/visits/${visit.id}`);
      return;
    }
    // For non-completed visits open the plan modal (edit/info)
    setSelectedVisit(visit);
    setShowPlanModal(true);
  };

  const handlePlanVisitSuccess = (mode = 'create') => {
    setShowPlanModal(false);
    setSelectedVisit(null);
    toast.success(mode === 'edit' ? 'Visit updated successfully' : 'Visit planned successfully');
    refreshData();
  };

  const updateVisitInState = useCallback((updatedVisit) => {
    if (!updatedVisit?.id) return;
    const mergeVisit = (visit) => (
      visit.id === updatedVisit.id ? { ...visit, ...updatedVisit } : visit
    );

    setAllVisits((prev) => prev.map(mergeVisit));
    setVisits((prev) => prev.map(mergeVisit));
    setSelectedVisit((prev) => {
      if (!prev || prev.id !== updatedVisit.id) return prev;
      return { ...prev, ...updatedVisit };
    });
  }, []);

  const applyEvaluationCountDelta = useCallback((visitId, delta) => {
    if (!visitId || !delta) return;
    const updateCount = (visit) => {
      const current = Number(visit.evaluations_count ?? visit.evaluation_count ?? 0);
      const next = Math.max(0, current + delta);
      return {
        ...visit,
        evaluations_count: next,
        evaluation_count: next,
      };
    };

    setAllVisits((prev) => prev.map((visit) => (
      visit.id === visitId ? updateCount(visit) : visit
    )));
    setVisits((prev) => prev.map((visit) => (
      visit.id === visitId ? updateCount(visit) : visit
    )));
    setSelectedVisit((prev) => {
      if (!prev || prev.id !== visitId) return prev;
      return updateCount(prev);
    });
    setStats((prev) => ({
      ...prev,
      evaluations_done: Math.max(0, Number(prev.evaluations_done || 0) + delta),
    }));
  }, []);

  const handleTemplatesLoaded = useCallback((templates) => {
    if (!Array.isArray(templates) || templates.length === 0) return;
    setTemplatesCache(templates);
    setTemplatesCacheVersion(getTemplatesCacheVersion());
  }, []);

  const handleEvalWizardClose = () => {
    setShowEvalWizard(false);
    setSelectedVisit(null);
    setEditEvaluation(null);
  };

  const handleEvalWizardSuccess = useCallback(async (mode = 'create') => {
    const targetVisitId = selectedVisit?.id;
    if (mode === 'create' && targetVisitId) {
      applyEvaluationCountDelta(targetVisitId, 1);
    }

    if (targetVisitId) {
      try {
        const visitSummary = await fetchVisitSummary(targetVisitId);
        updateVisitInState(visitSummary);
      } catch {
        // Keep optimistic state when detail refresh fails.
      }
    }

    toast.success(mode === 'edit' ? 'Evaluation updated successfully' : 'Evaluation submitted successfully');
    handleEvalWizardClose();
  }, [applyEvaluationCountDelta, selectedVisit?.id, updateVisitInState]);

  const handleEvalListClose = () => {
    setShowEvalList(false);
    setVisitEvaluations([]);
  };

  const handleEditEval = async (visit) => {
    if (!visit || !visit.id) return;
    try {
      const evals = await fetchVisitEvaluations(visit.id);
      setVisitEvaluations(Array.isArray(evals) ? evals : []);
      setSelectedVisit(visit);
      setShowEvalList(true);
    } catch {
      toast.error('Failed to load evaluations for this visit.');
    }
  };

  const handleSelectEvalToEdit = async (evaluation) => {
    try {
      const detail = await fetchEvaluationDetail(evaluation.id);
      setEditEvaluation(detail);
      handleEvalListClose();
      setShowEvalWizard(true);
    } catch {
      toast.error('Failed to load evaluation details.');
    }
  };

  const handleEvalDeleteClick = (evaluation) => {
    setEvalDeleteConfirm({
      isOpen: true,
      evaluationId: evaluation.id,
      teacherName: evaluation.teacher_name || 'this teacher',
    });
  };

  const handleEvalDeleteConfirm = async () => {
    setLoading((prev) => ({ ...prev, delete: true }));
    const deletedEvaluationId = evalDeleteConfirm.evaluationId;
    const targetVisitId = selectedVisit?.id;
    try {
      await deleteEvaluation(deletedEvaluationId);
      toast.success('Evaluation deleted');
      setVisitEvaluations((prev) => prev.filter((e) => e.id !== deletedEvaluationId));
      if (targetVisitId) {
        applyEvaluationCountDelta(targetVisitId, -1);
        try {
          const visitSummary = await fetchVisitSummary(targetVisitId);
          updateVisitInState(visitSummary);
        } catch {
          // Keep optimistic state when summary refresh fails.
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete evaluation');
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
      setEvalDeleteConfirm({ isOpen: false, evaluationId: null, teacherName: '' });
    }
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

  const getVisitDate = useCallback((visit) => {
    const raw = visit.visit_date || visit.scheduled_date || visit.created_at;
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const { recentVisits, archivedVisits } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);

    const recent = [];
    const archived = [];

    visits.forEach((visit) => {
      const visitDate = getVisitDate(visit);
      if (visitDate && visitDate < cutoff) {
        archived.push(visit);
      } else {
        recent.push(visit);
      }
    });

    return { recentVisits: recent, archivedVisits: archived };
  }, [visits, getVisitDate]);

  const activeStatFilter = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    if (filters.status === 'planned' && filters.dateTo && filters.dateTo < todayIso) return 'overdue';
    if (filters.status === 'planned') return 'planned';
    if (filters.status === 'in_progress') return 'in_progress';
    if (filters.status === 'completed') return 'completed';
    return 'total_visits';
  }, [filters.status, filters.dateTo]);

  const handleStatCardFilter = useCallback((key) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);
    const nextFilters = { ...filters };

    if (key === 'planned') {
      nextFilters.status = 'planned';
      nextFilters.dateTo = '';
    } else if (key === 'in_progress') {
      nextFilters.status = 'in_progress';
      nextFilters.dateTo = '';
    } else if (key === 'completed' || key === 'evaluations_done') {
      nextFilters.status = 'completed';
      nextFilters.dateTo = '';
    } else if (key === 'overdue') {
      nextFilters.status = 'planned';
      nextFilters.dateTo = yesterdayIso;
    } else {
      nextFilters.status = '';
      nextFilters.dateTo = '';
    }

    setFilters(nextFilters);
  }, [filters]);

  const dayGroups = useMemo(() => {
    const sorted = [...recentVisits].sort((a, b) => {
      const dateA = getVisitDate(a);
      const dateB = getVisitDate(b);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB - dateA;
    });

    const map = new Map();
    sorted.forEach((visit) => {
      const key = visit.visit_date || visit.scheduled_date || 'unknown-date';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(visit);
    });

    return Array.from(map.entries()).map(([dateKey, items]) => ({ dateKey, items }));
  }, [recentVisits, getVisitDate]);

  const archivedDayGroups = useMemo(() => {
    const sorted = [...archivedVisits].sort((a, b) => {
      const dateA = getVisitDate(a);
      const dateB = getVisitDate(b);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB - dateA;
    });

    const map = new Map();
    sorted.forEach((visit) => {
      const key = visit.visit_date || visit.scheduled_date || 'unknown-date';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(visit);
    });

    return Array.from(map.entries()).map(([dateKey, items]) => ({ dateKey, items }));
  }, [archivedVisits, getVisitDate]);

  const weekGroups = useMemo(() => {
    const map = new Map();

    dayGroups.forEach(({ dateKey, items }) => {
      const date = new Date(`${dateKey}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        if (!map.has('Unknown Week')) {
          map.set('Unknown Week', { weekLabel: 'Unknown Week', days: [] });
        }
        map.get('Unknown Week').days.push({ dateKey, items });
        return;
      }

      const dayIndex = (date.getDay() + 6) % 7; // Monday=0
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - dayIndex);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      if (!map.has(weekLabel)) {
        map.set(weekLabel, { weekLabel, weekStart, days: [] });
      }
      map.get(weekLabel).days.push({ dateKey, items });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (!a.weekStart || !b.weekStart) return 0;
      return b.weekStart - a.weekStart;
    });
  }, [dayGroups]);

  const archivedWeekGroups = useMemo(() => {
    const map = new Map();

    archivedDayGroups.forEach(({ dateKey, items }) => {
      const date = new Date(`${dateKey}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        if (!map.has('Unknown Week')) {
          map.set('Unknown Week', { weekLabel: 'Unknown Week', days: [] });
        }
        map.get('Unknown Week').days.push({ dateKey, items });
        return;
      }

      const dayIndex = (date.getDay() + 6) % 7;
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - dayIndex);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      if (!map.has(weekLabel)) {
        map.set(weekLabel, { weekLabel, weekStart, days: [] });
      }
      map.get(weekLabel).days.push({ dateKey, items });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (!a.weekStart || !b.weekStart) return 0;
      return b.weekStart - a.weekStart;
    });
  }, [archivedDayGroups]);

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const canGoPrev = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.total;

  const formatDayLabel = (dateKey) => {
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateKey;
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderGroupedCards = (items) => (
    <div style={responsiveStyles.cardsGrid}>
      {items.map((visit) => (
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
          onEditEval={handleEditEval}
          userRole={userRole}
          onViewDetails={handleViewDetails}
        />
      ))}
    </div>
  );

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
          onClick={() => handleStatCardFilter('total_visits')}
          isActive={activeStatFilter === 'total_visits'}
        />
        <StatCard
          label="Planned"
          value={stats.planned}
          icon="📋"
          color="indigo"
          isMobile={isMobile}
          onClick={() => handleStatCardFilter('planned')}
          isActive={activeStatFilter === 'planned'}
        />
        <StatCard
          label="In Progress"
          value={stats.in_progress}
          icon="🔄"
          color="yellow"
          isMobile={isMobile}
          onClick={() => handleStatCardFilter('in_progress')}
          isActive={activeStatFilter === 'in_progress'}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon="✅"
          color="green"
          isMobile={isMobile}
          onClick={() => handleStatCardFilter('completed')}
          isActive={activeStatFilter === 'completed'}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon="⚠️"
          color="red"
          isMobile={isMobile}
          onClick={() => handleStatCardFilter('overdue')}
          isActive={activeStatFilter === 'overdue'}
        />
        <StatCard
          label="Evaluations Done"
          value={stats.evaluations_done}
          icon="📝"
          color="purple"
          isMobile={isMobile}
          onClick={() => handleStatCardFilter('evaluations_done')}
          isActive={activeStatFilter === 'completed'}
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
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
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
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
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
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
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
      <div style={styles.viewModeRow}>
        <span style={styles.viewModeLabel}>View:</span>
        <div style={styles.viewModeToggle}>
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              style={{
                ...styles.viewModeButton,
                ...(viewMode === mode.value ? styles.viewModeButtonActive : {}),
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {loading.visits ? (
        <LoadingSpinner />
      ) : visits.length === 0 ? (
        <div style={styles.emptyState}>
          {activeFilterCount > 0
            ? 'No visits found matching your filters. Try adjusting your criteria.'
            : 'No monitoring visits found. Plan your first visit to get started!'
          }
        </div>
      ) : viewMode === 'day' ? (
        <div style={styles.groupedContainer}>
          {dayGroups.map((group) => (
            <section key={group.dateKey} style={styles.groupSection}>
              <div style={styles.groupHeader}>
                <h3 style={styles.groupTitle}>{formatDayLabel(group.dateKey)}</h3>
                <span style={styles.groupCount}>{group.items.length} visits</span>
              </div>
              {renderGroupedCards(group.items)}
            </section>
          ))}
        </div>
      ) : viewMode === 'week' ? (
        <div style={styles.groupedContainer}>
          {weekGroups.map((week) => (
            <section key={week.weekLabel} style={styles.groupSection}>
              <div style={styles.groupHeader}>
                <h3 style={styles.groupTitle}>Week: {week.weekLabel}</h3>
                <span style={styles.groupCount}>{week.days.reduce((acc, day) => acc + day.items.length, 0)} visits</span>
              </div>
              {week.days.map((day) => (
                <div key={`${week.weekLabel}-${day.dateKey}`} style={styles.weekDaySection}>
                  <h4 style={styles.weekDayTitle}>{formatDayLabel(day.dateKey)}</h4>
                  {renderGroupedCards(day.items)}
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>No grouped data available.</div>
      )}

      {!loading.visits && archivedVisits.length > 0 && (
        <div style={{ marginTop: SPACING.xl }}>
          <div style={styles.groupHeader}>
            <h3 style={styles.groupTitle}>Archive (Older than 3 Months)</h3>
            <span style={styles.groupCount}>{archivedVisits.length} visits</span>
          </div>

          {viewMode === 'day' ? (
            <div style={styles.groupedContainer}>
              {archivedDayGroups.map((group) => (
                <section key={`archive-${group.dateKey}`} style={styles.groupSection}>
                  <div style={styles.groupHeader}>
                    <h3 style={styles.groupTitle}>{formatDayLabel(group.dateKey)}</h3>
                    <span style={styles.groupCount}>{group.items.length} visits</span>
                  </div>
                  {renderGroupedCards(group.items)}
                </section>
              ))}
            </div>
          ) : (
            <div style={styles.groupedContainer}>
              {archivedWeekGroups.map((week) => (
                <section key={`archive-${week.weekLabel}`} style={styles.groupSection}>
                  <div style={styles.groupHeader}>
                    <h3 style={styles.groupTitle}>Week: {week.weekLabel}</h3>
                    <span style={styles.groupCount}>{week.days.reduce((acc, day) => acc + day.items.length, 0)} visits</span>
                  </div>
                  {week.days.map((day) => (
                    <div key={`archive-${week.weekLabel}-${day.dateKey}`} style={styles.weekDaySection}>
                      <h4 style={styles.weekDayTitle}>{formatDayLabel(day.dateKey)}</h4>
                      {renderGroupedCards(day.items)}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Showing Count */}
      <div style={styles.showingCount}>
        Showing {recentVisits.length} current visits + {archivedVisits.length} archived visits (total {visits.length})
      </div>

      {/* Pagination */}
      <div style={styles.paginationRow}>
        <button
          onClick={() => setPagination((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
          disabled={!canGoPrev || loading.visits}
          style={{ ...styles.paginationButton, opacity: (!canGoPrev || loading.visits) ? 0.5 : 1, cursor: (!canGoPrev || loading.visits) ? 'not-allowed' : 'pointer' }}
        >
          Previous
        </button>
        <span style={styles.paginationText}>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
          disabled={!canGoNext || loading.visits}
          style={{ ...styles.paginationButton, opacity: (!canGoNext || loading.visits) ? 0.5 : 1, cursor: (!canGoNext || loading.visits) ? 'not-allowed' : 'pointer' }}
        >
          Next
        </button>
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
        editEvaluation={editEvaluation}
        initialTemplates={templatesCache}
        onTemplatesLoaded={handleTemplatesLoaded}
        onClose={handleEvalWizardClose}
        onSuccess={handleEvalWizardSuccess}
      />

      {/* Eval List picker (Admin edit evaluations of a completed visit) */}
      {showEvalList && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }} onClick={(e) => { if (e.target === e.currentTarget) handleEvalListClose(); }}>
          <div style={{
            background: 'rgba(30,30,60,0.98)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px', padding: '28px', width: '100%', maxWidth: 480,
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>Select Evaluation to Edit</h2>
              <button onClick={handleEvalListClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            {visitEvaluations.length === 0
              ? <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>No evaluations found for this visit.</p>
              : visitEvaluations.map((ev) => (
                <div key={ev.id} style={{
                  background: 'rgba(255,255,255,0.07)', borderRadius: '12px',
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{ev.teacher_name}</p>
                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                      Score: {ev.normalized_score ?? '—'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleSelectEvalToEdit(ev)}
                      style={{ border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '6px 14px', background: 'rgba(245,158,11,0.25)', color: '#FBBF24', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      Edit
                    </button>
                    {userRole === 'Admin' && selectedVisit?.status !== 'completed' && (
                      <button
                        onClick={() => handleEvalDeleteClick(ev)}
                        style={{ border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '6px 14px', background: 'rgba(239,68,68,0.25)', color: '#F87171', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Eval Delete Confirmation */}
      {evalDeleteConfirm.isOpen && (
        <ConfirmationModal
          isOpen={evalDeleteConfirm.isOpen}
          title="Delete Evaluation"
          message={`Delete the evaluation for "${evalDeleteConfirm.teacherName}"? This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleEvalDeleteConfirm}
          onCancel={() => setEvalDeleteConfirm({ isOpen: false, evaluationId: null, teacherName: '' })}
          isLoading={loading.delete}
          variant="danger"
        />
      )}

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
  viewModeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  viewModeLabel: {
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  viewModeToggle: {
    display: 'inline-flex',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.full,
    padding: '4px',
    gap: '4px',
  },
  viewModeButton: {
    border: 'none',
    borderRadius: BORDER_RADIUS.full,
    background: 'transparent',
    color: COLORS.text.whiteMedium,
    cursor: 'pointer',
    padding: `${SPACING.xs} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  viewModeButtonActive: {
    background: 'rgba(99, 102, 241, 0.3)',
    color: '#818CF8',
  },

  groupedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  groupSection: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  groupTitle: {
    margin: 0,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  groupCount: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  groupBucket: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  groupBucketHeader: {
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  groupedVisitRow: {
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: BORDER_RADIUS.lg,
    background: 'rgba(255, 255, 255, 0.06)',
    padding: SPACING.md,
    display: 'flex',
    gap: SPACING.md,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  groupedVisitMeta: {
    margin: `${SPACING.xs} 0 0 0`,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.xs,
    lineHeight: 1.5,
  },
  groupedVisitMetaStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  groupedVisitActions: {
    display: 'flex',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  groupedVisitActionsMobile: {
    display: 'flex',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  weekDaySection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: SPACING.md,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  weekDayTitle: {
    margin: 0,
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },

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

  paginationRow: {
    marginTop: SPACING.md,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  paginationButton: {
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.text.white,
    borderRadius: BORDER_RADIUS.md,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    minHeight: '44px',
    minWidth: '80px',
  },
  paginationText: {
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
  },
};

export default MonitoringPage;
