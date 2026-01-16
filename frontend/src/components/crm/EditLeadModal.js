// ============================================
// EDIT LEAD MODAL - Update Existing Lead (Glassmorphism)
// ============================================

import React, { useState, useEffect } from 'react';
import { updateLead, fetchBDMs } from '../../api/services/crmService';
import { getUserData } from '../../utils/authHelpers';
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

export const EditLeadModal = ({ lead, onClose, onSuccess }) => {
  const currentUser = getUserData();
  const isAdmin = currentUser.role === 'Admin';

  const [formData, setFormData] = useState({
    school_name: lead.school_name || '',
    phone: lead.phone || '',
    contact_person: lead.contact_person || '',
    email: lead.email || '',
    address: lead.address || '',
    city: lead.city || '',
    lead_source: lead.lead_source || 'Other',
    estimated_students: lead.estimated_students || '',
    notes: lead.notes || '',
    status: lead.status || 'New',
    assigned_to: lead.assigned_to || '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [bdms, setBdms] = useState([]);
  const [loadingBDMs, setLoadingBDMs] = useState(false);

  // Load BDMs if admin
  useEffect(() => {
    const loadBDMs = async () => {
      if (!isAdmin) return;

      setLoadingBDMs(true);
      try {
        const bdmsData = await fetchBDMs();
        setBdms(bdmsData);
      } catch (error) {
        console.error('Error loading BDMs:', error);
        toast.error('Failed to load BDM list');
      } finally {
        setLoadingBDMs(false);
      }
    };

    loadBDMs();
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

    // At least one required: school_name OR phone
    if (!formData.school_name && !formData.phone) {
      newErrors.general = 'Either School Name or Phone is required';
    }

    // Can't change status from Converted
    if (lead.status === 'Converted' && formData.status !== 'Converted') {
      newErrors.status = 'Cannot change status of a converted lead';
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

      const response = await updateLead(lead.id, cleanData);
      toast.success('Lead updated successfully');

      // Show automation notification if present
      if (response?.automation) {
        toast.info(response.automation, { autoClose: 5000 });
      }

      onSuccess();
    } catch (error) {
      console.error('❌ Error updating lead:', error);
      if (error.response?.data) {
        // Handle validation errors from backend
        setErrors(error.response.data);
        toast.error('Please fix the errors and try again');
      } else {
        toast.error('Failed to update lead');
      }
    } finally {
      setLoading(false);
    }
  };

  const isConverted = lead.status === 'Converted';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Edit Lead</h3>
          <p style={styles.subtitle}>
            Update lead information {isConverted && '(Converted leads are locked)'}
          </p>
        </div>

        {/* Converted Warning */}
        {isConverted && (
          <div style={styles.successBanner}>
            <p style={styles.successBannerText}>
              ✓ This lead has been converted to a school. Status cannot be changed.
            </p>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div style={styles.errorBanner}>
            <p style={styles.errorBannerText}>{errors.general}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* School Name & Phone */}
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>School Name</label>
              <input
                type="text"
                name="school_name"
                value={formData.school_name}
                onChange={handleChange}
                disabled={isConverted}
                style={{
                  ...styles.input,
                  ...(errors.school_name ? styles.inputError : {}),
                  ...(isConverted ? styles.inputDisabled : {}),
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
                disabled={isConverted}
                style={{
                  ...styles.input,
                  ...(errors.phone ? styles.inputError : {}),
                  ...(isConverted ? styles.inputDisabled : {}),
                }}
                placeholder="+923001234567"
              />
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
                  <option key={source} value={source} style={styles.option}>
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

          {/* Status & Assigned To */}
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isConverted}
                style={{
                  ...styles.select,
                  ...(errors.status ? styles.inputError : {}),
                  ...(isConverted ? styles.inputDisabled : {}),
                }}
              >
                <option value="New" style={styles.option}>New</option>
                <option value="Contacted" style={styles.option}>Contacted</option>
                <option value="Interested" style={styles.option}>Interested</option>
                <option value="Not Interested" style={styles.option}>Not Interested</option>
                <option value="Converted" style={styles.option}>Converted</option>
                <option value="Lost" style={styles.option}>Lost</option>
              </select>
              {errors.status && (
                <p style={styles.fieldError}>{errors.status}</p>
              )}
            </div>

            {isAdmin && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Assign to BDM</label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  disabled={loadingBDMs}
                  style={styles.select}
                >
                  <option value="" style={styles.option}>Unassigned</option>
                  {bdms.map((bdm) => (
                    <option key={bdm.id} value={bdm.id} style={styles.option}>
                      {bdm.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              {loading ? 'Updating...' : 'Update Lead'}
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
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  successBannerText: {
    color: '#34D399',
    fontSize: FONT_SIZES.sm,
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
  inputDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: COLORS.text.whiteSubtle,
    cursor: 'not-allowed',
  },
  select: {
    width: '100%',
    padding: SPACING.md,
    backgroundColor: 'rgba(88, 60, 140, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.white,
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  option: {
    background: '#4a3570',
    color: '#ffffff',
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

export default EditLeadModal;
