// ============================================
// APPROVAL MODAL - Minimalistic Request Approval Modal
// ============================================
// Location: src/components/admin/ApprovalModal.js

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { reportRequestService } from '../../services/reportRequestService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
  Z_INDEX,
} from '../../utils/designConstants';

/**
 * ApprovalModal Component
 * Minimalistic modal for viewing and approving/rejecting report requests
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.onApprovalComplete - Callback after approval/rejection
 */
export const ApprovalModal = ({
  isOpen,
  onClose,
  onApprovalComplete,
}) => {
  const [requests, setRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState('');

  // Fetch requests when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPendingRequests();
      fetchHistory();
    }
  }, [isOpen]);

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    try {
      const data = await reportRequestService.fetchPendingRequests();
      setRequests(data.results || data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast.error('Failed to load pending requests');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await reportRequestService.fetchAllRequests({
        status: 'APPROVED,REJECTED,GENERATED',
        limit: 20
      });
      setHistoryRequests(data.results || data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryRequests([]);
    }
  };

  if (!isOpen) return null;

  const handleSelectRequest = (request) => {
    setSelectedRequest(request);
    setShowRejectForm(false);
    setRejectReason('');
    setAdminNotes('');
    setIsEditing(false);
    setEditedBody(request.body_text || '');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      // Include edited body if changed
      const payload = {
        admin_notes: adminNotes || undefined,
      };

      // If body was edited, include it
      if (isEditing && editedBody !== selectedRequest.body_text) {
        payload.body_text = editedBody;
      }

      await reportRequestService.approveRequest(selectedRequest.id, payload);
      toast.success('Request approved successfully');

      // Remove from local list and add to history
      const approvedRequest = { ...selectedRequest, status: 'APPROVED' };
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setHistoryRequests(prev => [approvedRequest, ...prev]);
      setSelectedRequest(null);
      setAdminNotes('');
      setIsEditing(false);

      // Notify parent to refresh count
      if (onApprovalComplete) onApprovalComplete(selectedRequest.id, 'approved');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error.response?.data?.error || 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectReason.trim()) {
      toast.warning('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    try {
      await reportRequestService.rejectRequest(
        selectedRequest.id,
        rejectReason,
        adminNotes
      );
      toast.success('Request rejected');

      // Remove from local list and add to history
      const rejectedRequest = { ...selectedRequest, status: 'REJECTED' };
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setHistoryRequests(prev => [rejectedRequest, ...prev]);
      setSelectedRequest(null);
      setRejectReason('');
      setAdminNotes('');
      setShowRejectForm(false);
      setIsEditing(false);

      // Notify parent to refresh count
      if (onApprovalComplete) onApprovalComplete(selectedRequest.id, 'rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error.response?.data?.error || 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return COLORS.status.error;
      case 'high': return COLORS.status.warning;
      default: return COLORS.text.whiteSubtle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'GENERATED': return COLORS.status.success;
      case 'REJECTED': return COLORS.status.error;
      default: return COLORS.text.whiteSubtle;
    }
  };

  const currentList = activeTab === 'pending' ? requests : historyRequests;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Report Requests</h3>
          <button onClick={onClose} style={styles.closeButton}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Request List */}
          <div style={styles.listSection}>
            {/* Tabs */}
            <div style={styles.tabContainer}>
              <button
                onClick={() => { setActiveTab('pending'); setSelectedRequest(null); }}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'pending' ? styles.tabActive : {}),
                }}
              >
                Pending ({requests.length})
              </button>
              <button
                onClick={() => { setActiveTab('history'); setSelectedRequest(null); }}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'history' ? styles.tabActive : {}),
                }}
              >
                History ({historyRequests.length})
              </button>
            </div>
            <div style={styles.list}>
              {isLoading ? (
                <p style={styles.emptyText}>Loading requests...</p>
              ) : currentList.length === 0 ? (
                <p style={styles.emptyText}>
                  {activeTab === 'pending' ? 'No pending requests' : 'No history yet'}
                </p>
              ) : (
                currentList.map((request) => (
                  <div
                    key={request.id}
                    onClick={() => handleSelectRequest(request)}
                    style={{
                      ...styles.listItem,
                      ...(selectedRequest?.id === request.id ? styles.listItemSelected : {}),
                    }}
                  >
                    <div style={styles.listItemHeader}>
                      <span style={styles.requestNumber}>{request.request_number}</span>
                      {activeTab === 'pending' && request.priority !== 'normal' && (
                        <span style={{ ...styles.priorityBadge, color: getPriorityColor(request.priority) }}>
                          {request.priority?.toUpperCase()}
                        </span>
                      )}
                      {activeTab === 'history' && (
                        <span style={{ ...styles.statusBadge, color: getStatusColor(request.status) }}>
                          {request.status}
                        </span>
                      )}
                    </div>
                    <p style={styles.listItemSubject}>{request.subject}</p>
                    <span style={styles.listItemMeta}>
                      {request.requested_by_name} • {formatDate(request.requested_at || request.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail Section */}
          <div style={styles.detailSection}>
            {selectedRequest ? (
              <>
                <div style={styles.detailHeader}>
                  <h4 style={styles.detailTitle}>{selectedRequest.subject}</h4>
                  <span style={styles.templateBadge}>
                    {selectedRequest.template_name || 'Custom Report'}
                  </span>
                </div>

                <div style={styles.detailInfo}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Request #:</span>
                    <span style={styles.infoValue}>{selectedRequest.request_number}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Requested by:</span>
                    <span style={styles.infoValue}>{selectedRequest.requested_by_name}</span>
                  </div>
                  {selectedRequest.target_employee_name && (
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>For Employee:</span>
                      <span style={styles.infoValue}>{selectedRequest.target_employee_name}</span>
                    </div>
                  )}
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Submitted:</span>
                    <span style={styles.infoValue}>{formatDate(selectedRequest.requested_at)}</span>
                  </div>
                </div>

                {/* Body Content - Editable for pending requests */}
                {selectedRequest.body_text && (
                  <div style={styles.bodyPreview}>
                    <div style={styles.bodyHeader}>
                      <span style={styles.bodyLabel}>
                        {isEditing ? 'Edit Content:' : 'Content Preview:'}
                      </span>
                      {activeTab === 'pending' && !isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          style={styles.editButton}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      )}
                      {isEditing && (
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditedBody(selectedRequest.body_text);
                          }}
                          style={styles.cancelEditButton}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        style={styles.editTextarea}
                        rows={8}
                      />
                    ) : (
                      <p style={styles.bodyText}>
                        {selectedRequest.body_text.substring(0, 300)}
                        {selectedRequest.body_text.length > 300 ? '...' : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* History: Show status and rejection reason */}
                {activeTab === 'history' && (
                  <div style={styles.historyInfo}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Status:</span>
                      <span style={{ ...styles.infoValue, color: getStatusColor(selectedRequest.status) }}>
                        {selectedRequest.status}
                      </span>
                    </div>
                    {selectedRequest.rejection_reason && (
                      <div style={styles.rejectionReason}>
                        <span style={styles.infoLabel}>Rejection Reason:</span>
                        <p style={styles.rejectionText}>{selectedRequest.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pending: Show approval/rejection actions */}
                {activeTab === 'pending' && (
                  <>
                    {/* Reject Form */}
                    {showRejectForm ? (
                      <div style={styles.rejectForm}>
                        <label style={styles.formLabel}>Rejection Reason *</label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Enter reason for rejection..."
                          style={styles.textarea}
                          rows={3}
                        />
                        <div style={styles.formActions}>
                          <button
                            onClick={() => setShowRejectForm(false)}
                            style={styles.cancelButton}
                            disabled={isProcessing}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleReject}
                            style={styles.confirmRejectButton}
                            disabled={isProcessing || !rejectReason.trim()}
                          >
                            {isProcessing ? 'Rejecting...' : 'Confirm Reject'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Admin Notes */}
                        <div style={styles.notesSection}>
                          <label style={styles.formLabel}>Admin Notes (Optional)</label>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add any notes..."
                            style={styles.textarea}
                            rows={2}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div style={styles.actions}>
                          <button
                            onClick={() => setShowRejectForm(true)}
                            style={styles.rejectButton}
                            disabled={isProcessing}
                          >
                            Reject
                          </button>
                          <button
                            onClick={handleApprove}
                            style={styles.approveButton}
                            disabled={isProcessing}
                          >
                            {isProcessing ? 'Processing...' : (isEditing ? 'Save & Approve' : 'Approve')}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <div style={styles.emptyDetail}>
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.3 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p style={styles.emptyDetailText}>Select a request to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.modal, // Above sidebar and all other elements
    padding: SPACING.lg,
  },
  modal: {
    width: '100%',
    maxWidth: '800px',
    maxHeight: '80vh',
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.lg,
    boxShadow: SHADOWS.xl,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: COLORS.text.whiteSubtle,
    cursor: 'pointer',
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    transition: `all ${TRANSITIONS.fast}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    flex: 1,
    overflow: 'hidden',
  },
  listSection: {
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  tabActive: {
    color: '#8B5CF6',
    borderBottomColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  listHeader: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  listTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  listItem: {
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid transparent',
  },
  listItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  listItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: '2px',
  },
  requestNumber: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#6366F1',
  },
  priorityBadge: {
    fontSize: '10px',
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: 'uppercase',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: 'uppercase',
  },
  listItemSubject: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listItemMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  detailSection: {
    padding: SPACING.lg,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  detailTitle: {
    margin: 0,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  templateBadge: {
    padding: `2px ${SPACING.sm}`,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#A78BFA',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    borderRadius: BORDER_RADIUS.sm,
    whiteSpace: 'nowrap',
  },
  detailInfo: {
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.medium,
  },
  bodyPreview: {
    marginBottom: SPACING.md,
  },
  bodyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  bodyLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    textTransform: 'uppercase',
  },
  editButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: `2px ${SPACING.sm}`,
    background: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: BORDER_RADIUS.sm,
    color: '#A78BFA',
    fontSize: FONT_SIZES.xs,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  cancelEditButton: {
    padding: `2px ${SPACING.sm}`,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.xs,
    cursor: 'pointer',
  },
  bodyText: {
    margin: 0,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.sm,
    lineHeight: 1.5,
  },
  editTextarea: {
    width: '100%',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter, sans-serif',
    resize: 'vertical',
    lineHeight: 1.5,
  },
  historyInfo: {
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  rejectionReason: {
    marginTop: SPACING.sm,
  },
  rejectionText: {
    margin: `${SPACING.xs} 0 0 0`,
    padding: SPACING.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
  },
  notesSection: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    display: 'block',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.xs,
  },
  textarea: {
    width: '100%',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter, sans-serif',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    gap: SPACING.sm,
    marginTop: 'auto',
  },
  approveButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  rejectButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'transparent',
    color: COLORS.status.error,
    border: `1px solid ${COLORS.status.error}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  rejectForm: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  formActions: {
    display: 'flex',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
  },
  confirmRejectButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.status.error,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
  },
  emptyDetail: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.text.whiteSubtle,
  },
  emptyDetailText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
  },
};

export default ApprovalModal;
