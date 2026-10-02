// ============================================
// SEND NOTIFICATION MODAL - Admin Component
// ============================================
// Location: src/components/admin/SendNotificationModal.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getAuthHeaders, API_URL } from '../../api';
import { FormModal } from '../common/modals/FormModal';
import { TypeSelector } from '../common/ui/TypeSelector';
import { ToggleButtonGroup } from '../common/ui/ToggleButtonGroup';
import { QuickActions } from '../common/ui/QuickActions';
import { Form } from 'react-bootstrap';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../../utils/designConstants';

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
    { value: 'info', label: '📢 Information', color: '#3B82F6', icon: '📢' },
    { value: 'success', label: '✅ Success', color: '#10B981', icon: '✅' },
    { value: 'warning', label: '⚠️ Warning', color: '#F59E0B', icon: '⚠️' },
    { value: 'error', label: '❌ Error/Alert', color: '#EF4444', icon: '❌' },
    { value: 'message', label: '💬 Message', color: '#8B5CF6', icon: '💬' },
    { value: 'reminder', label: '🔔 Reminder', color: '#EC4899', icon: '🔔' },
  ];

  // Quick templates
  const templates = [
    {
      id: 'meeting',
      name: 'Meeting Reminder',
      label: 'Meeting Reminder',
      icon: '📅',
      title: 'Staff Meeting Reminder',
      message: 'This is a reminder about the upcoming staff meeting. Please ensure your attendance.',
      type: 'reminder',
    },
    {
      id: 'salary',
      name: 'Salary Processed',
      label: 'Salary Processed',
      icon: '💰',
      title: 'Salary Has Been Processed',
      message: 'Your salary for this month has been processed and will be credited to your account shortly.',
      type: 'success',
    },
    {
      id: 'document',
      name: 'Document Required',
      label: 'Document Required',
      icon: '📄',
      title: 'Document Submission Required',
      message: 'Please submit the required documents at your earliest convenience.',
      type: 'warning',
    },
    {
      id: 'holiday',
      name: 'Holiday Notice',
      label: 'Holiday Notice',
      icon: '🏖️',
      title: 'Holiday Announcement',
      message: 'Please note that the school will be closed on the mentioned date.',
      type: 'info',
    },
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

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      message: template.message,
      notificationType: template.type,
    }));
  };

  return (
    <FormModal
      show={isOpen}
      title="📤 Send Notification"
      onClose={onClose}
      onSubmit={handleSubmit}
      isLoading={isSubmitting}
      submitText={formData.recipientType === 'all' ? 'Send to All' : 'Send Notification'}
      size="lg"
    >
      {/* Quick Templates */}
      <QuickActions
        label="Quick Templates"
        actions={templates}
        onAction={applyTemplate}
      />

      {/* Recipient Type Toggle */}
      <ToggleButtonGroup
        label="Send To"
        value={formData.recipientType}
        onChange={(value) => setFormData(prev => ({ ...prev, recipientType: value }))}
        options={[
          { value: 'single', label: 'Single Teacher', icon: '👤' },
          { value: 'all', label: 'All Teachers', icon: '👥' },
        ]}
        required
      />

      {/* Recipient Dropdown (only for single) */}
      {formData.recipientType === 'single' && (
        <Form.Group className="mb-3">
          <Form.Label>Select Teacher *</Form.Label>
          <Form.Select
            name="recipient"
            value={formData.recipient}
            onChange={handleChange}
            disabled={isLoadingTeachers}
            required
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
          </Form.Select>
        </Form.Group>
      )}

      {/* Notification Type */}
      <TypeSelector
        label="Notification Type"
        value={formData.notificationType}
        onChange={(value) => setFormData(prev => ({ ...prev, notificationType: value }))}
        options={notificationTypes}
        layout="grid"
      />

      {/* Title */}
      <Form.Group className="mb-3">
        <Form.Label>Title *</Form.Label>
        <Form.Control
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter notification title"
          maxLength={200}
          required
        />
        <Form.Text className="text-muted text-end d-block">
          {formData.title.length}/200
        </Form.Text>
      </Form.Group>

      {/* Message */}
      <Form.Group className="mb-3">
        <Form.Label>Message *</Form.Label>
        <Form.Control
          as="textarea"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Enter notification message"
          rows={5}
          maxLength={1000}
          required
        />
        <Form.Text className="text-muted text-end d-block">
          {formData.message.length}/1000
        </Form.Text>
      </Form.Group>

      {/* Related URL (Optional) */}
      <Form.Group className="mb-3">
        <Form.Label>Related Link (Optional)</Form.Label>
        <Form.Control
          type="url"
          name="relatedUrl"
          value={formData.relatedUrl}
          onChange={handleChange}
          placeholder="https://example.com/page"
        />
        <Form.Text className="text-muted">
          User will be redirected to this URL when clicking the notification
        </Form.Text>
      </Form.Group>

      {/* Preview */}
      <div style={styles.previewSection}>
        <p style={styles.previewLabel}>Preview:</p>
        <div style={styles.previewCard}>
          <div style={styles.previewIcon}>
            {notificationTypes.find(t => t.value === formData.notificationType)?.icon || '📢'}
          </div>
          <div style={styles.previewContent}>
            <p style={styles.previewTitle}>{formData.title || 'Notification Title'}</p>
            <p style={styles.previewMessage}>{formData.message || 'Notification message will appear here...'}</p>
            <span style={styles.previewTime}>Just now</span>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

// Minimal styles for preview section
const styles = {
  previewSection: {
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.background.lightGray,
    borderRadius: BORDER_RADIUS.sm,
  },
  previewLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.secondary,
    margin: `0 0 ${SPACING.sm} 0`,
    textTransform: 'uppercase',
  },
  previewCard: {
    display: 'flex',
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.background.white,
    borderRadius: BORDER_RADIUS.sm,
    border: `1px solid ${COLORS.border.light}`,
  },
  previewIcon: {
    fontSize: FONT_SIZES['2xl'],
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
    margin: `0 0 ${SPACING.xs} 0`,
  },
  previewMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    margin: `0 0 ${SPACING.xs} 0`,
  },
  previewTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
  },
};

export default SendNotificationModal;
