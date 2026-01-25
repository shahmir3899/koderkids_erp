// ============================================
// REQUEST REPORT PAGE - Employee Report Request Form
// ============================================
// Location: src/pages/RequestReportPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reportRequestService } from '../services/reportRequestService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../utils/designConstants';

/**
 * RequestReportPage Component
 * Form for employees to request official reports
 */
function RequestReportPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    recipient_text: '',
    body_text: '',
    priority: 'normal',
    notes: '',
  });
  const [prefillData, setPrefillData] = useState(null);
  const [remainingPlaceholders, setRemainingPlaceholders] = useState([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const data = await reportRequestService.fetchTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load report templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = async (template) => {
    setSelectedTemplate(template);
    setPrefillData(null);
    setRemainingPlaceholders([]);

    // Pre-fill form with template + employee data
    if (template) {
      try {
        // Use the prefill endpoint to auto-fill placeholders with user's data
        const prefilled = await reportRequestService.prefillTemplate(template.id);
        setPrefillData(prefilled);
        setRemainingPlaceholders(prefilled.remaining_placeholders || []);

        setFormData({
          subject: prefilled.prefilled_subject || `${template.name} Request`,
          recipient_text: '',
          body_text: prefilled.prefilled_body || '',
          priority: 'normal',
          notes: '',
        });
      } catch (error) {
        console.error('Error prefilling template:', error);
        // Fallback to basic template fetch
        try {
          const fullTemplate = await reportRequestService.fetchTemplateById(template.id);
          setFormData({
            subject: fullTemplate.default_subject || `${template.name} Request`,
            recipient_text: '',
            body_text: fullTemplate.default_body || '',
            priority: 'normal',
            notes: '',
          });
        } catch (fallbackError) {
          setFormData({
            subject: `${template.name} Request`,
            recipient_text: '',
            body_text: '',
            priority: 'normal',
            notes: '',
          });
        }
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e, asDraft = false) => {
    e.preventDefault();

    if (!selectedTemplate) {
      toast.warning('Please select a report template');
      return;
    }

    if (!formData.subject.trim()) {
      toast.warning('Please enter a subject');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the request
      const requestData = {
        template: selectedTemplate.id,
        subject: formData.subject,
        recipient_text: formData.recipient_text,
        body_text: formData.body_text,
        priority: formData.priority,
      };

      const createdRequest = await reportRequestService.createRequest(requestData);

      if (!asDraft) {
        // Submit for approval immediately
        await reportRequestService.submitRequest(createdRequest.id);
        toast.success('Report request submitted for approval!');
      } else {
        toast.success('Request saved as draft');
      }

      navigate('/self-services');
    } catch (error) {
      console.error('Error creating request:', error);
      // DRF validation errors can come in different formats
      const errorData = error.response?.data;
      let errorMessage = 'Failed to submit request';

      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(', ');
        } else if (Array.isArray(errorData)) {
          errorMessage = errorData.join(', ');
        } else {
          // Field-specific errors like { "template": ["error msg"] }
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'CERTIFICATE': return '📜';
      case 'LETTER': return '✉️';
      case 'REPORT': return '📊';
      case 'OFFICIAL': return '🏛️';
      default: return '📄';
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/self-services')} style={styles.backButton}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 style={styles.title}>Request a Report</h1>
        <p style={styles.subtitle}>Select a template and fill in the details for your report request.</p>
      </div>

      <div style={styles.content}>
        {/* Template Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Select Report Type</h2>

          {isLoadingTemplates ? (
            <div style={styles.loadingState}>Loading templates...</div>
          ) : templates.length === 0 ? (
            <div style={styles.emptyState}>No report templates available for your role.</div>
          ) : (
            <div style={styles.templatesGrid}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  style={{
                    ...styles.templateCard,
                    ...(selectedTemplate?.id === template.id ? styles.templateCardSelected : {}),
                  }}
                >
                  <span style={styles.templateIcon}>{getCategoryIcon(template.category)}</span>
                  <div style={styles.templateInfo}>
                    <h4 style={styles.templateName}>{template.name}</h4>
                    <p style={styles.templateDescription}>{template.description}</p>
                    <span style={styles.templateCategory}>{template.category}</span>
                  </div>
                  {selectedTemplate?.id === template.id && (
                    <div style={styles.selectedCheck}>
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Form */}
        {selectedTemplate && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>2. Request Details</h2>

            {/* Auto-filled Fields Info */}
            {prefillData && Object.keys(prefillData.auto_filled || {}).length > 0 && (
              <div style={styles.autoFilledInfo}>
                <div style={styles.autoFilledHeader}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Auto-filled from your profile:</span>
                </div>
                <div style={styles.autoFilledTags}>
                  {Object.entries(prefillData.auto_filled).map(([key, value]) => (
                    <span key={key} style={styles.autoFilledTag}>
                      {key.replace(/_/g, ' ')}: <strong>{value}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining Placeholders Warning */}
            {remainingPlaceholders.length > 0 && (
              <div style={styles.remainingWarning}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Please fill in these fields in the content below: </span>
                {remainingPlaceholders.map((placeholder, idx) => (
                  <code key={placeholder} style={styles.placeholderCode}>
                    {`{${placeholder}}`}{idx < remainingPlaceholders.length - 1 ? ', ' : ''}
                  </code>
                ))}
              </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, false)}>
              {/* Subject */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Enter request subject"
                  style={styles.input}
                  required
                />
              </div>

              {/* Recipient (To Whom It May Concern) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Recipient / Addressed To</label>
                <input
                  type="text"
                  name="recipient_text"
                  value={formData.recipient_text}
                  onChange={handleInputChange}
                  placeholder="e.g., To Whom It May Concern, Embassy of..."
                  style={styles.input}
                />
                <span style={styles.helpText}>Leave blank for generic "To Whom It May Concern"</span>
              </div>

              {/* Body Text */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Report Content</label>
                <textarea
                  name="body_text"
                  value={formData.body_text}
                  onChange={handleInputChange}
                  placeholder="Add any specific information needed in the report..."
                  style={styles.textarea}
                  rows={12}
                />
                {remainingPlaceholders.length > 0 && (
                  <span style={styles.helpText}>
                    Replace the highlighted placeholders in curly braces with the required information.
                  </span>
                )}
              </div>

              {/* Priority */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Priority</label>
                <div style={styles.priorityOptions}>
                  {['normal', 'high', 'urgent'].map((priority) => (
                    <label
                      key={priority}
                      style={{
                        ...styles.priorityOption,
                        ...(formData.priority === priority ? styles.priorityOptionSelected : {}),
                        ...(formData.priority === priority ? { borderColor: getPriorityColor(priority) } : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={priority}
                        checked={formData.priority === priority}
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                      />
                      <span style={{ color: getPriorityColor(priority) }}>
                        {priority === 'urgent' && '🔴 '}
                        {priority === 'high' && '🟡 '}
                        {priority === 'normal' && '🟢 '}
                        {priority.toUpperCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  style={styles.draftButton}
                  disabled={isSubmitting}
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info Box */}
        <div style={styles.infoBox}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong>What happens next?</strong>
            <p style={{ margin: `${SPACING.xs} 0 0` }}>
              Your request will be reviewed by an administrator. Once approved, the report will be
              generated and you'll be notified. You can track the status in "My Requests".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent': return COLORS.status.error;
    case 'high': return COLORS.status.warning;
    default: return COLORS.status.success;
  }
};

const styles = {
  pageContainer: {
    minHeight: '100vh',
    padding: SPACING.xl,
    background: COLORS.background.gradient,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    marginBottom: SPACING.md,
    transition: `all ${TRANSITIONS.fast}`,
  },
  title: {
    margin: 0,
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  subtitle: {
    margin: `${SPACING.sm} 0 0`,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.whiteMedium,
  },
  content: {
    maxWidth: '900px',
  },
  section: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    margin: `0 0 ${SPACING.md}`,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  loadingState: {
    padding: SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
  },
  emptyState: {
    padding: SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: SPACING.md,
  },
  templateCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    position: 'relative',
  },
  templateCardSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
  },
  templateIcon: {
    fontSize: '28px',
    flexShrink: 0,
  },
  templateInfo: {
    flex: 1,
    minWidth: 0,
  },
  templateName: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  templateDescription: {
    margin: `${SPACING.xs} 0`,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    lineHeight: 1.4,
  },
  templateCategory: {
    display: 'inline-block',
    padding: `2px ${SPACING.sm}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.xs,
    fontSize: '10px',
    color: COLORS.text.whiteMedium,
    textTransform: 'uppercase',
  },
  selectedCheck: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    color: '#8B5CF6',
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    display: 'block',
    marginBottom: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },
  input: {
    width: '100%',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.base,
    fontFamily: 'Inter, sans-serif',
    transition: `all ${TRANSITIONS.fast}`,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.base,
    fontFamily: 'Inter, sans-serif',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  helpText: {
    display: 'block',
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  priorityOptions: {
    display: 'flex',
    gap: SPACING.sm,
  },
  priorityOption: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
    textAlign: 'center',
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  priorityOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  formActions: {
    display: 'flex',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    justifyContent: 'flex-end',
  },
  draftButton: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  submitButton: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    backgroundColor: '#8B5CF6',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  autoFilledInfo: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: BORDER_RADIUS.sm,
  },
  autoFilledHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: '#4ADE80',
  },
  autoFilledTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  autoFilledTag: {
    display: 'inline-block',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteMedium,
    textTransform: 'capitalize',
  },
  remainingWarning: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.25)',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    color: '#FCD34D',
  },
  placeholderCode: {
    display: 'inline',
    padding: `2px ${SPACING.xs}`,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: FONT_SIZES.xs,
    color: '#FCD34D',
  },
  infoBox: {
    display: 'flex',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.sm,
    lineHeight: 1.5,
  },
};

export default RequestReportPage;
