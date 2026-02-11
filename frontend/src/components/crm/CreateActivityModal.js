// ============================================
// CREATE ACTIVITY MODAL - Add New Activity
// Gradient Design System
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { createActivity, fetchLeads, fetchBDMs } from '../../api/services/crmService';
import { getUserData, getAuthHeaders } from '../../utils/authHelpers';
import { API_URL } from '../../utils/constants';
import { toast } from 'react-toastify';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
} from '../../utils/designConstants';

export const CreateActivityModal = ({ onClose, onSuccess, preselectedLeadId }) => {
  const currentUser = getUserData();
  const isAdmin = currentUser.role === 'Admin';

  const [closeButtonHovered, setCloseButtonHovered] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: 'Call',
    lead: preselectedLeadId || '',
    subject: '',
    description: '',
    assigned_to: '',
    scheduled_date: '',
    status: 'Scheduled',
    // New fields for quick-log and outcome tracking
    is_logged: false,
    outcome: '',
    duration_minutes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [leads, setLeads] = useState([]);
  const [bdms, setBdms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Handle ESC key to close modal
  const handleEscKey = useCallback((e) => {
    if (e.key === 'Escape' && !loading) {
      onClose();
    }
  }, [onClose, loading]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [handleEscKey]);

  // Load current user ID and form data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        // Fetch current user ID
        const userResponse = await axios.get(`${API_URL}/api/auth/user/`, {
          headers: getAuthHeaders(),
        });
        const userId = userResponse.data.id;
        setCurrentUserId(userId);

        // For BDM, auto-assign to themselves
        if (!isAdmin) {
          setFormData((prev) => ({ ...prev, assigned_to: userId }));
        }

        // Fetch leads and BDMs
        const [leadsData, bdmsData] = await Promise.all([
          fetchLeads(),
          isAdmin ? fetchBDMs() : Promise.resolve([]),
        ]);
        setLeads(leadsData);
        if (isAdmin) {
          setBdms(bdmsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.activity_type) {
      newErrors.activity_type = 'Activity type is required';
    }
    if (!formData.lead) {
      newErrors.lead = 'Lead is required';
    }
    if (!formData.subject) {
      newErrors.subject = 'Subject is required';
    }
    // Scheduled date only required for scheduled activities (not logged ones)
    if (!formData.is_logged && !formData.scheduled_date) {
      newErrors.scheduled_date = 'Scheduled date is required';
    }
    if (isAdmin && !formData.assigned_to) {
      newErrors.assigned_to = 'Assigned to is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // Clean up empty fields
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== '')
      );

      // Convert scheduled_date to ISO format if needed
      if (cleanData.scheduled_date) {
        cleanData.scheduled_date = new Date(cleanData.scheduled_date).toISOString();
      }

      const response = await createActivity(cleanData);
      toast.success('Activity created successfully');

      // Show automation notification if present
      if (response?.automation) {
        toast.info(response.automation, { autoClose: 5000 });
      }

      onSuccess();
    } catch (error) {
      console.error('❌ Error creating activity:', error);
      if (error.response?.data) {
        // Handle validation errors from backend
        setErrors(error.response.data);
        toast.error('Please fix the errors and try again');
      } else {
        toast.error('Failed to create activity');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>
        {`
          .activity-modal-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          .activity-modal-input:focus {
            border-color: rgba(59, 130, 246, 0.6);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .activity-modal-select option {
            background: #1e293b;
            color: #ffffff;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Create New Activity</h2>
            <p style={styles.subtitle}>Schedule a call or meeting with a lead</p>
          </div>
          <button
            onClick={onClose}
            style={{
              ...styles.closeButton,
              ...(closeButtonHovered ? styles.closeButtonHover : {}),
            }}
            onMouseEnter={() => setCloseButtonHovered(true)}
            onMouseLeave={() => setCloseButtonHovered(false)}
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Loading State */}
          {loadingData ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Loading form data...</p>
            </div>
          ) : (
            <>
              {/* General Error */}
              {errors.general && (
                <div style={styles.errorBox}>
                  <p style={styles.errorBoxText}>{errors.general}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* Quick Log Toggle */}
                <div style={styles.toggleContainer}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_logged: false, status: 'Scheduled' }))}
                    style={{
                      ...styles.toggleButton,
                      ...(formData.is_logged ? {} : styles.toggleButtonActive),
                    }}
                  >
                    📅 Schedule Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_logged: true, status: 'Completed' }))}
                    style={{
                      ...styles.toggleButton,
                      ...(formData.is_logged ? styles.toggleButtonActive : {}),
                    }}
                  >
                    ✓ Log Completed Activity
                  </button>
                </div>

                {formData.is_logged && (
                  <div style={styles.loggedInfoBox}>
                    <p style={styles.loggedInfoText}>
                      📝 Quick log mode: Record an activity that just happened. It will be saved as completed.
                    </p>
                  </div>
                )}

                <div style={styles.formGrid}>
                  {/* Activity Type */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Activity Type *</label>
                    <select
                      name="activity_type"
                      value={formData.activity_type}
                      onChange={handleChange}
                      style={{
                        ...styles.select,
                        ...(errors.activity_type ? styles.inputError : {}),
                      }}
                      className="activity-modal-select"
                    >
                      <option value="Call">Call</option>
                      <option value="Meeting">Meeting</option>
                    </select>
                    {errors.activity_type && (
                      <p style={styles.errorText}>{errors.activity_type}</p>
                    )}
                  </div>

                  {/* Lead */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Lead *</label>
                    <select
                      name="lead"
                      value={formData.lead}
                      onChange={handleChange}
                      style={{
                        ...styles.select,
                        ...(errors.lead ? styles.inputError : {}),
                      }}
                      className="activity-modal-select"
                    >
                      <option value="">Select a lead...</option>
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.school_name || lead.phone} - {lead.status}
                        </option>
                      ))}
                    </select>
                    {errors.lead && (
                      <p style={styles.errorText}>{errors.lead}</p>
                    )}
                  </div>

                  {/* Subject - Full Width */}
                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Subject *</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      style={{
                        ...styles.input,
                        ...(errors.subject ? styles.inputError : {}),
                      }}
                      placeholder="Follow-up call regarding pricing"
                      className="activity-modal-input"
                    />
                    {errors.subject && (
                      <p style={styles.errorText}>{errors.subject}</p>
                    )}
                  </div>

                  {/* Scheduled Date - Only for scheduled activities */}
                  {!formData.is_logged && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        name="scheduled_date"
                        value={formData.scheduled_date}
                        onChange={handleChange}
                        style={{
                          ...styles.input,
                          ...(errors.scheduled_date ? styles.inputError : {}),
                        }}
                        className="activity-modal-input"
                      />
                      {errors.scheduled_date && (
                        <p style={styles.errorText}>{errors.scheduled_date}</p>
                      )}
                    </div>
                  )}

                  {/* Assigned To (Admin only) */}
                  {isAdmin && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Assign To BDM *</label>
                      <select
                        name="assigned_to"
                        value={formData.assigned_to}
                        onChange={handleChange}
                        style={{
                          ...styles.select,
                          ...(errors.assigned_to ? styles.inputError : {}),
                        }}
                        className="activity-modal-select"
                      >
                        <option value="">Select BDM...</option>
                        {bdms.map((bdm) => (
                          <option key={bdm.id} value={bdm.id}>
                            {bdm.full_name}
                          </option>
                        ))}
                      </select>
                      {errors.assigned_to && (
                        <p style={styles.errorText}>{errors.assigned_to}</p>
                      )}
                    </div>
                  )}

                  {/* Status - Hidden in quick-log mode */}
                  {!formData.is_logged && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        style={styles.select}
                        className="activity-modal-select"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}

                  {/* Outcome - Show for logged activities or completed status */}
                  {(formData.is_logged || formData.status === 'Completed') && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Outcome {formData.is_logged ? '*' : ''}</label>
                      <select
                        name="outcome"
                        value={formData.outcome}
                        onChange={handleChange}
                        style={{
                          ...styles.select,
                          ...(errors.outcome ? styles.inputError : {}),
                        }}
                        className="activity-modal-select"
                      >
                        <option value="">Select outcome...</option>
                        <option value="Interested">Interested</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Follow-up Required">Follow-up Required</option>
                        <option value="No Answer">No Answer</option>
                        <option value="Wrong Number">Wrong Number</option>
                        <option value="Callback Requested">Callback Requested</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.outcome && (
                        <p style={styles.errorText}>{errors.outcome}</p>
                      )}
                    </div>
                  )}

                  {/* Duration - Show for calls in logged mode or completed status */}
                  {formData.activity_type === 'Call' && (formData.is_logged || formData.status === 'Completed') && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Call Duration (minutes)</label>
                      <input
                        type="number"
                        name="duration_minutes"
                        value={formData.duration_minutes}
                        onChange={handleChange}
                        min="1"
                        max="300"
                        style={styles.input}
                        placeholder="e.g., 5"
                        className="activity-modal-input"
                      />
                    </div>
                  )}

                  {/* Description - Full Width */}
                  <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Notes/Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                      placeholder="Additional notes about this activity..."
                      className="activity-modal-input"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div style={styles.actions}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={styles.cancelButton}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...styles.submitButton,
                      ...(loading ? styles.buttonDisabled : {}),
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (formData.is_logged ? 'Log Activity' : 'Schedule Activity')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles - Gradient Design
const styles = {
  toggleContainer: {
    display: 'flex',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    padding: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.lg,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  toggleButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    backgroundColor: 'transparent',
    color: COLORS.text.whiteSubtle,
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
  },
  loggedInfoBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  loggedInfoText: {
    color: '#6EE7B7',
    fontSize: FONT_SIZES.sm,
    margin: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.modal,
    padding: SPACING.sm,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    marginTop: SPACING.xs,
    margin: 0,
  },
  closeButton: {
    padding: SPACING.sm,
    background: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: '50%',
    cursor: 'pointer',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast} ease`,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeButtonHover: {
    background: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    transform: 'scale(1.05)',
  },
  content: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: COLORS.status.info,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    margin: 0,
  },
  errorBox: {
    padding: SPACING.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorBoxText: {
    fontSize: FONT_SIZES.sm,
    color: '#fca5a5',
    margin: 0,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: SPACING.md,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },
  input: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    transition: `all ${TRANSITIONS.fast} ease`,
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
  },
  inputError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  select: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    outline: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    transition: `all ${TRANSITIONS.fast} ease`,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FFFFFF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.5rem center',
    backgroundSize: '1rem',
    paddingRight: '2rem',
  },
  errorText: {
    fontSize: FONT_SIZES.xs,
    color: '#fca5a5',
    margin: 0,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  cancelButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
  },
  submitButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast} ease`,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default CreateActivityModal;
