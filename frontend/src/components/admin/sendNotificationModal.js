// ============================================
// SEND NOTIFICATION MODAL - Admin Component
// ============================================
// Location: src/components/admin/SendNotificationModal.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getAuthHeaders, API_URL } from '../../api';

/**
 * SendNotificationModal Component
 * Allows admins to send notifications to teachers
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.preselectedRecipient - Optional pre-selected recipient
 */
export const SendNotificationModal = ({
  isOpen,
  onClose,
  preselectedRecipient = null,
}) => {
  // Form State
  const [formData, setFormData] = useState({
    recipient: '',
    recipientType: 'single', // 'single' or 'all'
    title: '',
    message: '',
    notificationType: 'info',
    relatedUrl: '',
  });
  
  // Teachers list for dropdown
  const [teachers, setTeachers] = useState([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification type options
  const notificationTypes = [
    { value: 'info', label: '📢 Information', color: '#3B82F6' },
    { value: 'success', label: '✅ Success', color: '#10B981' },
    { value: 'warning', label: '⚠️ Warning', color: '#F59E0B' },
    { value: 'error', label: '❌ Error/Alert', color: '#EF4444' },
    { value: 'message', label: '💬 Message', color: '#8B5CF6' },
    { value: 'reminder', label: '🔔 Reminder', color: '#EC4899' },
  ];

  // Fetch teachers list on mount
  useEffect(() => {
    if (isOpen) {
      fetchTeachers();
    }
  }, [isOpen]);

  // Set preselected recipient
  useEffect(() => {
    if (preselectedRecipient) {
      setFormData(prev => ({
        ...prev,
        recipient: preselectedRecipient.id,
        recipientType: 'single',
      }));
    }
  }, [preselectedRecipient]);

  // Fetch teachers from API
  const fetchTeachers = async () => {
    setIsLoadingTeachers(true);
    try {
      const response = await axios.get(`${API_URL}/employees/teachers/`, {
        headers: getAuthHeaders(),
      });
      setTeachers(response.data);
    } catch (error) {
      console.error('❌ Error fetching teachers:', error);
      // Fallback: Try alternative endpoint
      try {
        const fallbackResponse = await axios.get(`${API_URL}/api/users/?role=Teacher`, {
          headers: getAuthHeaders(),
        });
        setTeachers(fallbackResponse.data);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        toast.error('Failed to load teachers list');
      }
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a notification title');
      return;
    }
    if (!formData.message.trim()) {
      toast.error('Please enter a notification message');
      return;
    }
    if (formData.recipientType === 'single' && !formData.recipient) {
      toast.error('Please select a recipient');
      return;
    }

    setIsSubmitting(true);

    try {
      if (formData.recipientType === 'all') {
        // Send to all teachers
        const response = await axios.post(
          `${API_URL}/employees/notifications/send-to-all/`,
          {
            title: formData.title,
            message: formData.message,
            notification_type: formData.notificationType,
            related_url: formData.relatedUrl || null,
          },
          { headers: getAuthHeaders() }
        );
        toast.success(`✅ Notification sent to ${response.data.count} teachers!`);
      } else {
        // Send to single recipient
        const response = await axios.post(
          `${API_URL}/employees/notifications/create/`,
          {
            recipient: formData.recipient,
            title: formData.title,
            message: formData.message,
            notification_type: formData.notificationType,
            related_url: formData.relatedUrl || null,
          },
          { headers: getAuthHeaders() }
        );
        toast.success('✅ Notification sent successfully!');
      }

      // Reset form and close
      setFormData({
        recipient: '',
        recipientType: 'single',
        title: '',
        message: '',
        notificationType: 'info',
        relatedUrl: '',
      });
      onClose();
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      toast.error(error.response?.data?.error || 'Failed to send notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick templates
  const templates = [
    {
      name: 'Meeting Reminder',
      title: 'Staff Meeting Reminder',
      message: 'This is a reminder about the upcoming staff meeting. Please ensure your attendance.',
      type: 'reminder',
    },
    {
      name: 'Salary Processed',
      title: 'Salary Has Been Processed',
      message: 'Your salary for this month has been processed and will be credited to your account shortly.',
      type: 'success',
    },
    {
      name: 'Document Required',
      title: 'Document Submission Required',
      message: 'Please submit the required documents at your earliest convenience.',
      type: 'warning',
    },
    {
      name: 'Holiday Notice',
      title: 'Holiday Announcement',
      message: 'Please note that the school will be closed on the mentioned date.',
      type: 'info',
    },
  ];

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      message: template.message,
      notificationType: template.type,
    }));
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📤 Send Notification</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Templates */}
        <div style={styles.templatesSection}>
          <p style={styles.templatesLabel}>Quick Templates:</p>
          <div style={styles.templatesGrid}>
            {templates.map((template, index) => (
              <button
                key={index}
                onClick={() => applyTemplate(template)}
                style={styles.templateButton}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Recipient Type Toggle */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Send To</label>
            <div style={styles.toggleGroup}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, recipientType: 'single' }))}
                style={{
                  ...styles.toggleButton,
                  ...(formData.recipientType === 'single' ? styles.toggleButtonActive : {}),
                }}
              >
                👤 Single Teacher
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, recipientType: 'all' }))}
                style={{
                  ...styles.toggleButton,
                  ...(formData.recipientType === 'all' ? styles.toggleButtonActive : {}),
                }}
              >
                👥 All Teachers
              </button>
            </div>
          </div>

          {/* Recipient Dropdown (only for single) */}
          {formData.recipientType === 'single' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Select Teacher *</label>
              <select
                name="recipient"
                value={formData.recipient}
                onChange={handleChange}
                style={styles.select}
                disabled={isLoadingTeachers}
              >
                <option value="">
                  {isLoadingTeachers ? 'Loading teachers...' : 'Select a teacher'}
                </option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name || teacher.first_name + ' ' + teacher.last_name || teacher.username}
                    {teacher.employee_id ? ` (${teacher.employee_id})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notification Type */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Notification Type</label>
            <div style={styles.typeGrid}>
              {notificationTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, notificationType: type.value }))}
                  style={{
                    ...styles.typeButton,
                    borderColor: formData.notificationType === type.value ? type.color : '#E5E7EB',
                    backgroundColor: formData.notificationType === type.value ? `${type.color}15` : 'transparent',
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter notification title"
              maxLength={200}
            />
            <small style={styles.charCount}>{formData.title.length}/200</small>
          </div>

          {/* Message */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Message *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              style={{ ...styles.input, minHeight: '120px', resize: 'vertical' }}
              placeholder="Enter notification message"
              maxLength={1000}
            />
            <small style={styles.charCount}>{formData.message.length}/1000</small>
          </div>

          {/* Related URL (Optional) */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Related Link (Optional)</label>
            <input
              type="url"
              name="relatedUrl"
              value={formData.relatedUrl}
              onChange={handleChange}
              style={styles.input}
              placeholder="https://example.com/page"
            />
            <small style={styles.helperText}>User will be redirected to this URL when clicking the notification</small>
          </div>

          {/* Preview */}
          <div style={styles.previewSection}>
            <p style={styles.previewLabel}>Preview:</p>
            <div style={styles.previewCard}>
              <div style={styles.previewIcon}>
                {notificationTypes.find(t => t.value === formData.notificationType)?.label.split(' ')[0]}
              </div>
              <div style={styles.previewContent}>
                <p style={styles.previewTitle}>{formData.title || 'Notification Title'}</p>
                <p style={styles.previewMessage}>{formData.message || 'Notification message will appear here...'}</p>
                <span style={styles.previewTime}>Just now</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span style={styles.spinner}></span>
                  Sending...
                </>
              ) : (
                <>
                  📤 {formData.recipientType === 'all' ? 'Send to All' : 'Send Notification'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Styles
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky',
    top: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1F2937',
    margin: 0,
  },
  closeButton: {
    padding: '0.5rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6B7280',
  },
  templatesSection: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  templatesLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6B7280',
    margin: '0 0 0.5rem 0',
    textTransform: 'uppercase',
  },
  templatesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  templateButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  form: {
    padding: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.875rem',
    transition: 'all 0.15s ease',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    outline: 'none',
  },
  toggleGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  toggleButton: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6B7280',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toggleButtonActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    color: '#7C3AED',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  typeButton: {
    padding: '0.5rem',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  charCount: {
    display: 'block',
    textAlign: 'right',
    fontSize: '0.75rem',
    color: '#9CA3AF',
    marginTop: '0.25rem',
  },
  helperText: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#9CA3AF',
    marginTop: '0.25rem',
  },
  previewSection: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
  },
  previewLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6B7280',
    margin: '0 0 0.75rem 0',
    textTransform: 'uppercase',
  },
  previewCard: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
  },
  previewIcon: {
    fontSize: '1.5rem',
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 0.25rem 0',
  },
  previewMessage: {
    fontSize: '0.8125rem',
    color: '#6B7280',
    margin: '0 0 0.25rem 0',
  },
  previewTime: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '1px solid #E5E7EB',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#7C3AED',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  spinner: {
    width: '1rem',
    height: '1rem',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default SendNotificationModal;