// ============================================
// CREATE LEAD MODAL - Add New Lead (Glassmorphism)
// ============================================

import React, { useState, useCallback } from 'react';
import { createLead, checkDuplicateLead } from '../../api/services/crmService';
import { LEAD_SOURCES } from '../../utils/constants';
import { toast } from 'react-toastify';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

export const CreateLeadModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    school_name: '',
    phone: '',
    contact_person: '',
    email: '',
    address: '',
    city: '',
    lead_source: 'Other',
    estimated_students: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Check for duplicate leads when phone number changes
  const checkForDuplicates = useCallback(async (phone) => {
    if (!phone || phone.length < 5) {
      setDuplicates([]);
      return;
    }

    setCheckingDuplicate(true);
    try {
      const result = await checkDuplicateLead(phone);
      if (result.found && result.leads.length > 0) {
        setDuplicates(result.leads);
      } else {
        setDuplicates([]);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      setDuplicates([]);
    } finally {
      setCheckingDuplicate(false);
    }
  }, []);

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

    // At least one required: school_name OR phone
    if (!formData.school_name && !formData.phone) {
      newErrors.general = 'Either School Name or Phone is required';
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

      await createLead(cleanData);
      toast.success('Lead created successfully');
      onSuccess();
    } catch (error) {
      console.error('❌ Error creating lead:', error);
      if (error.response?.data) {
        // Handle validation errors from backend
        setErrors(error.response.data);
        toast.error('Please fix the errors and try again');
      } else {
        toast.error('Failed to create lead');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Create New Lead</h3>
          <p style={styles.subtitle}>
            Add a new potential school lead. At least School Name or Phone is required.
          </p>
        </div>

        {/* General Error */}
        {errors.general && (
          <div style={styles.errorBanner}>
            <p style={styles.errorBannerText}>{errors.general}</p>
          </div>
        )}

        {/* Duplicate Warning Banner */}
        {duplicates.length > 0 && (
          <div style={styles.warningBanner}>
            <div style={styles.warningHeader}>
              <span style={styles.warningIcon}>⚠️</span>
              <span style={styles.warningTitle}>
                {duplicates.length} existing lead(s) found with this phone number
              </span>
            </div>
            <div style={styles.duplicateList}>
              {duplicates.map((lead) => (
                <div key={lead.id} style={styles.duplicateItem}>
                  <span style={styles.duplicateName}>
                    {lead.school_name || lead.phone}
                  </span>
                  <span style={styles.duplicateStatus}>{lead.status}</span>
                  {lead.city && <span style={styles.duplicateCity}>{lead.city}</span>}
                </div>
              ))}
            </div>
            <p style={styles.warningNote}>
              You can still create this lead if needed.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* School Name & Phone (Required - at least one) */}
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>School Name</label>
              <input
                type="text"
                name="school_name"
                value={formData.school_name}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  ...(errors.school_name ? styles.inputError : {}),
                }}
                placeholder="ABC School"
              />
              {errors.school_name && (
                <p style={styles.fieldError}>{errors.school_name}</p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone *</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={(e) => checkForDuplicates(e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.phone ? styles.inputError : {}),
                  ...(duplicates.length > 0 ? styles.inputWarning : {}),
                }}
                placeholder="+923001234567"
              />
              {checkingDuplicate && (
                <p style={styles.checkingText}>Checking for duplicates...</p>
              )}
              {errors.phone && (
                <p style={styles.fieldError}>{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Contact Person & Email */}
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Person</label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                style={styles.input}
                placeholder="Mr. Ahmed"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                style={styles.input}
                placeholder="ahmed@abc.com"
              />
            </div>
          </div>

          {/* Address & City */}
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                style={styles.input}
                placeholder="123 Main Street"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                style={styles.input}
                placeholder="Rawalpindi"
              />
            </div>
          </div>

          {/* Lead Source & Estimated Students */}
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Lead Source</label>
              <select
                name="lead_source"
                value={formData.lead_source}
                onChange={handleChange}
                style={styles.select}
              >
                {Object.values(LEAD_SOURCES).map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Estimated Students</label>
              <input
                type="number"
                name="estimated_students"
                value={formData.estimated_students}
                onChange={handleChange}
                style={styles.input}
                placeholder="50"
                min="0"
              />
            </div>
          </div>

          {/* Notes */}
          <div style={styles.formGroupFull}>
            <label style={styles.label}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              style={styles.textarea}
              placeholder="Additional notes about this lead..."
            />
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
                ...(loading ? styles.submitButtonDisabled : {}),
              }}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// STYLES - Glassmorphism Design
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
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: `0 0 ${SPACING.sm} 0`,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    margin: 0,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorBannerText: {
    color: '#F87171',
    fontSize: FONT_SIZES.sm,
    margin: 0,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  formGroupFull: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteMedium,
    marginBottom: SPACING.xs,
  },
  input: {
    width: '100%',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.white,
    outline: 'none',
    transition: TRANSITIONS.normal,
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  inputWarning: {
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  checkingText: {
    color: '#9CA3AF',
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    margin: `${SPACING.xs} 0 0 0`,
    fontStyle: 'italic',
  },
  warningBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  warningIcon: {
    fontSize: FONT_SIZES.lg,
  },
  warningTitle: {
    color: '#FBBF24',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  duplicateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  duplicateItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: BORDER_RADIUS.md,
  },
  duplicateName: {
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  duplicateStatus: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    color: '#FCD34D',
    padding: '2px 8px',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
  },
  duplicateCity: {
    color: COLORS.text.whiteMedium,
    fontSize: FONT_SIZES.xs,
  },
  warningNote: {
    color: '#D1D5DB',
    fontSize: FONT_SIZES.xs,
    margin: 0,
    fontStyle: 'italic',
  },
  select: {
    width: '100%',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.white,
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.white,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  fieldError: {
    color: '#F87171',
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    margin: `${SPACING.xs} 0 0 0`,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    paddingTop: SPACING.xl,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    marginTop: SPACING.lg,
  },
  cancelButton: {
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
  submitButton: {
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
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default CreateLeadModal;
