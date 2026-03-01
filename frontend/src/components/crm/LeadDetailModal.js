// ============================================
// LEAD DETAIL MODAL - View Lead with Activities
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchLeadById, completeActivity, deleteActivity } from '../../api/services/crmService';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { LeadStatusBadge } from './LeadStatusBadge';
import { CreateActivityModal } from './CreateActivityModal';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

// Activity type icons
const TYPE_ICONS = { Call: '📞', Meeting: '🤝' };
const STATUS_ICONS = { Completed: '✅', Scheduled: '🕐', Cancelled: '❌' };

const NODE_COLORS = {
  Completed: { dot: '#10B981', border: '#34D399' },
  Scheduled: { dot: '#3B82F6', border: '#60A5FA' },
  Cancelled: { dot: '#6B7280', border: '#9CA3AF' },
};

const SOURCE_COLORS = {
  Website: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
  Referral: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399' },
  'Cold Call': { bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24' },
  'Walk-in': { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA' },
  'Social Media': { bg: 'rgba(236, 72, 153, 0.15)', text: '#F472B6' },
  Other: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const LeadDetailModal = ({ lead, onClose, onEdit, onLeadsRefresh }) => {
  const navigate = useNavigate();
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateActivity, setShowCreateActivity] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      const data = await fetchLeadById(lead.id);
      setDetailData(data);
    } catch (err) {
      console.error('Error loading lead details:', err);
      setDetailData(lead);
    } finally {
      setLoading(false);
    }
  }, [lead.id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleCompleteActivity = async (activityId) => {
    try {
      await completeActivity(activityId);
      toast.success('Activity marked as completed');
      loadDetails();
      if (onLeadsRefresh) onLeadsRefresh();
    } catch (err) {
      console.error('Error completing activity:', err);
      toast.error('Failed to complete activity');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Delete this activity?')) return;
    try {
      await deleteActivity(activityId);
      toast.success('Activity deleted');
      loadDetails();
      if (onLeadsRefresh) onLeadsRefresh();
    } catch (err) {
      console.error('Error deleting activity:', err);
      toast.error('Failed to delete activity');
    }
  };

  const handleActivityCreated = () => {
    setShowCreateActivity(false);
    toast.success('Activity created');
    loadDetails();
    if (onLeadsRefresh) onLeadsRefresh();
  };

  const displayLead = detailData || lead;
  const activities = detailData?.activities || lead?.recent_activities || [];
  const proposals = detailData?.proposals || [];
  const sourceColor = SOURCE_COLORS[displayLead.lead_source] || SOURCE_COLORS.Other;

  // Separate past and scheduled activities
  const scheduledActivities = activities.filter(a => a.status === 'Scheduled');
  const pastActivities = activities.filter(a => a.status !== 'Scheduled');

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div style={{ padding: SPACING.xl }}>
            <LoadingSpinner message="Loading lead details..." />
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerTop}>
                <div style={styles.headerLeft}>
                  <div style={styles.avatarPlaceholder}>
                    {displayLead.school_name?.charAt(0) || '🏫'}
                  </div>
                  <div>
                    <h2 style={styles.title}>
                      {displayLead.school_name || 'Unnamed Lead'}
                    </h2>
                    <div style={styles.headerMeta}>
                      <LeadStatusBadge status={displayLead.status} />
                      {displayLead.lead_source && (
                        <span style={{
                          ...styles.sourceBadge,
                          backgroundColor: sourceColor.bg,
                          color: sourceColor.text,
                        }}>
                          {displayLead.lead_source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button style={styles.closeButton} onClick={onClose}>✕</button>
              </div>
            </div>

            {/* Contact & Info Grid */}
            <div style={styles.infoGrid}>
              <InfoItem label="Contact Person" value={displayLead.contact_person} icon="👤" />
              <InfoItem label="Phone" value={displayLead.phone} icon="📱" />
              <InfoItem label="Email" value={displayLead.email} icon="✉️" />
              <InfoItem label="City" value={displayLead.city} icon="📍" />
              <InfoItem label="Est. Students" value={displayLead.estimated_students} icon="👥" />
              <InfoItem label="Assigned To" value={displayLead.assigned_to_name || 'Unassigned'} icon="👤" />
              <InfoItem label="Created" value={formatDate(displayLead.created_at)} icon="📅" />
              <InfoItem label="Last Updated" value={formatDate(displayLead.updated_at)} icon="🔄" />
            </div>

            {/* Address */}
            {displayLead.address && (
              <div style={styles.addressBlock}>
                <span style={styles.addressLabel}>📍 Address</span>
                <span style={styles.addressValue}>{displayLead.address}</span>
              </div>
            )}

            {/* Notes */}
            {displayLead.notes && (
              <div style={styles.notesBlock}>
                <span style={styles.notesLabel}>📝 Notes</span>
                <p style={styles.notesValue}>{displayLead.notes}</p>
              </div>
            )}

            {/* Proposals Section */}
            <div style={styles.addActivityRow}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                📄 Proposals ({proposals.length})
              </h3>
              <button
                style={styles.generateProposalBtn}
                onClick={() => {
                  onClose();
                  navigate(`/crm/proposals?leadId=${lead.id}`);
                }}
              >
                + Generate Proposal
              </button>
            </div>
            {proposals.length > 0 ? (
              <div style={styles.proposalsList}>
                {proposals.map((proposal) => (
                  <div key={proposal.id} style={styles.proposalCard}>
                    <div style={styles.proposalTopRow}>
                      <span style={styles.proposalSchool}>{proposal.school_name}</span>
                      <span style={styles.proposalDate}>{formatDate(proposal.created_at)}</span>
                    </div>
                    <div style={styles.proposalMeta}>
                      <span style={styles.proposalRate}>
                        {proposal.discounted_rate}
                      </span>
                      <span style={styles.proposalStrikeRate}>
                        {proposal.standard_rate}
                      </span>
                      {proposal.generated_by_name && (
                        <span style={styles.proposalAuthor}>· by {proposal.generated_by_name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.emptyText}>No proposals yet. Generate one above!</p>
            )}

            {/* Add Activity Button */}
            <div style={styles.addActivityRow}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                📋 Activities ({activities.length})
              </h3>
              <button
                style={styles.addActivityBtn}
                onClick={() => setShowCreateActivity(true)}
              >
                + Add Activity
              </button>
            </div>

            {/* Scheduled Activities */}
            {scheduledActivities.length > 0 && (
              <div style={styles.activitiesSection}>
                <h4 style={styles.subSectionTitle}>
                  🕐 Upcoming ({scheduledActivities.length})
                </h4>
                <div style={styles.timelineContainer}>
                  {scheduledActivities
                    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                    .map((activity, idx) => (
                      <ActivityNode
                        key={activity.id}
                        activity={activity}
                        isLast={idx === scheduledActivities.length - 1}
                        onComplete={handleCompleteActivity}
                        onDelete={handleDeleteActivity}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Past Activities */}
            {pastActivities.length > 0 && (
              <div style={styles.activitiesSection}>
                <h4 style={styles.subSectionTitle}>
                  ✅ Completed / Cancelled ({pastActivities.length})
                </h4>
                <div style={styles.timelineContainer}>
                  {pastActivities
                    .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
                    .map((activity, idx) => (
                      <ActivityNode
                        key={activity.id}
                        activity={activity}
                        isLast={idx === pastActivities.length - 1}
                        onDelete={handleDeleteActivity}
                      />
                    ))}
                </div>
              </div>
            )}

            {activities.length === 0 && (
              <p style={styles.emptyText}>No activities yet. Add one above!</p>
            )}

            {/* Footer Actions */}
            <div style={styles.footerActions}>
              <button style={styles.secondaryButton} onClick={onClose}>
                Close
              </button>
              {onEdit && (
                <button
                  style={styles.primaryButton}
                  onClick={() => {
                    onClose();
                    onEdit(displayLead);
                  }}
                >
                  ✏️ Edit Lead
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Activity Modal (nested) */}
      {showCreateActivity && (
        <CreateActivityModal
          preselectedLeadId={lead.id}
          onClose={() => setShowCreateActivity(false)}
          onSuccess={handleActivityCreated}
        />
      )}
    </div>
  );
};

// ============================================
// Info Item Sub-component
// ============================================
const InfoItem = ({ label, value, icon }) => (
  <div style={styles.infoItem}>
    <span style={styles.infoLabel}>{icon} {label}</span>
    <span style={styles.infoValue}>{value || '—'}</span>
  </div>
);

// ============================================
// Activity Node Sub-component
// ============================================
const ActivityNode = ({ activity, isLast, onComplete, onDelete }) => {
  const nodeColor = NODE_COLORS[activity.status] || NODE_COLORS.Scheduled;

  return (
    <div style={{ ...styles.timelineItem, ...(isLast ? { paddingBottom: 0 } : {}) }}>
      {/* Vertical line */}
      {!isLast && <div style={styles.verticalLine} />}

      {/* Dot */}
      <div style={{
        ...styles.dot,
        backgroundColor: nodeColor.dot,
        boxShadow: `0 0 8px ${nodeColor.dot}40`,
      }} />

      {/* Content */}
      <div style={{
        ...styles.activityCard,
        borderLeft: `3px solid ${nodeColor.border}`,
      }}>
        <div style={styles.activityTopRow}>
          <span style={styles.activityType}>
            {TYPE_ICONS[activity.activity_type]} {activity.activity_type}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <span style={styles.activityStatus}>
              {STATUS_ICONS[activity.status]} {activity.status}
            </span>
            {/* Action buttons */}
            {onComplete && activity.status === 'Scheduled' && (
              <button
                style={styles.nodeActionBtn}
                onClick={() => onComplete(activity.id)}
                title="Mark as completed"
              >
                ✅
              </button>
            )}
            {onDelete && (
              <button
                style={{ ...styles.nodeActionBtn, color: '#EF4444' }}
                onClick={() => onDelete(activity.id)}
                title="Delete activity"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
        <div style={styles.activitySubject}>
          {activity.subject || 'No subject'}
        </div>
        {activity.description && (
          <p style={styles.activityDescription}>{activity.description}</p>
        )}
        <div style={styles.activityMeta}>
          <span>📅 {formatDateTime(activity.scheduled_date)}</span>
          {activity.outcome && <span>· Outcome: {activity.outcome}</span>}
          {activity.duration_minutes && <span>· {activity.duration_minutes} min</span>}
          {activity.assigned_to_name && <span>· 👤 {activity.assigned_to_name}</span>}
        </div>
        {activity.completed_date && (
          <div style={styles.activityCompleted}>
            Completed: {formatDateTime(activity.completed_date)}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: SPACING.lg,
  },
  modal: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING['2xl'],
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },

  // Header
  header: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
    minWidth: 0,
  },
  avatarPlaceholder: {
    width: '56px',
    height: '56px',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: '#3B82F6',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    flexShrink: 0,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: `0 0 ${SPACING.sm} 0`,
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  sourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `2px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.lg,
    cursor: 'pointer',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    lineHeight: 1,
    transition: TRANSITIONS.normal,
    flexShrink: 0,
  },

  // Info Grid
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.medium,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Address & Notes
  addressBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  addressLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
  },
  addressValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
  },
  notesBlock: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  notesLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    fontWeight: FONT_WEIGHTS.medium,
  },
  notesValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    margin: `${SPACING.xs} 0 0 0`,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },

  // Activities Section
  addActivityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  addActivityBtn: {
    padding: `${SPACING.xs} ${SPACING.md}`,
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    color: '#60A5FA',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
    flexShrink: 0,
  },
  subSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteMedium,
    margin: `0 0 ${SPACING.sm} 0`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  nodeActionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    padding: '2px 4px',
    borderRadius: BORDER_RADIUS.sm,
    transition: TRANSITIONS.fast,
    opacity: 0.7,
  },
  activitiesSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: `0 0 ${SPACING.md} 0`,
    paddingBottom: SPACING.sm,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
    margin: 0,
    padding: `${SPACING.sm} 0`,
  },

  // Timeline
  timelineContainer: {
    paddingLeft: SPACING.sm,
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: `calc(${SPACING.lg} + 8px)`,
    paddingBottom: SPACING.md,
  },
  verticalLine: {
    position: 'absolute',
    left: '4px',
    top: '14px',
    bottom: 0,
    width: '2px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dot: {
    position: 'absolute',
    left: 0,
    top: '10px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    zIndex: 1,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  activityTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  activityType: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteMedium,
  },
  activityStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  activitySubject: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    marginBottom: SPACING.xs,
  },
  activityDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    margin: `0 0 ${SPACING.xs} 0`,
    lineHeight: 1.4,
  },
  activityMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  activityCompleted: {
    fontSize: FONT_SIZES.xs,
    color: '#34D399',
    marginTop: SPACING.xs,
  },

  // Proposals
  generateProposalBtn: {
    padding: `${SPACING.xs} ${SPACING.md}`,
    background: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    color: '#A78BFA',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
    flexShrink: 0,
  },
  proposalsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  proposalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderLeft: '3px solid #A78BFA',
  },
  proposalTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  proposalSchool: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },
  proposalDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  proposalMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  proposalRate: {
    color: '#34D399',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  proposalStrikeRate: {
    color: COLORS.text.whiteSubtle,
    textDecoration: 'line-through',
    fontSize: FONT_SIZES.xs,
  },
  proposalAuthor: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  // Footer
  footerActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    paddingTop: SPACING.lg,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  secondaryButton: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
  },
  primaryButton: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: TRANSITIONS.normal,
    boxShadow: '0 4px 15px rgba(176, 97, 206, 0.4)',
  },
};

export default LeadDetailModal;
