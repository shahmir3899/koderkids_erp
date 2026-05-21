import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as onlineStudentAdminService from '../../services/onlineStudentAdminService';
import { API_URL, getAuthHeaders } from '../../api';
import {
  COLORS as RAW_COLORS,
  SPACING as RAW_SPACING,
  FONT_SIZES as RAW_FONT_SIZES,
  FONT_WEIGHTS as RAW_FONT_WEIGHTS,
  BORDER_RADIUS as RAW_BORDER_RADIUS,
  Z_INDEX as RAW_Z_INDEX,
  TRANSITIONS as RAW_TRANSITIONS,
} from '../../utils/designConstants';

const COLORS = {
  ...RAW_COLORS,
  PRIMARY: RAW_COLORS.PRIMARY ?? RAW_COLORS.primary,
  WHITE: RAW_COLORS.WHITE ?? RAW_COLORS.background?.white,
  GRAY: RAW_COLORS.GRAY ?? RAW_COLORS.text?.secondary,
  LIGHT_GRAY: RAW_COLORS.LIGHT_GRAY ?? RAW_COLORS.background?.gray,
  BORDER: RAW_COLORS.BORDER ?? RAW_COLORS.border?.default,
  TEXT: RAW_COLORS.TEXT ?? RAW_COLORS.text?.primary,
};

const SPACING = {
  ...RAW_SPACING,
  XS: RAW_SPACING.XS ?? RAW_SPACING.xs,
  SM: RAW_SPACING.SM ?? RAW_SPACING.sm,
  MD: RAW_SPACING.MD ?? RAW_SPACING.md,
  LG: RAW_SPACING.LG ?? RAW_SPACING.lg,
};

const FONT_SIZES = {
  ...RAW_FONT_SIZES,
  XS: RAW_FONT_SIZES.XS ?? RAW_FONT_SIZES.xs,
  SM: RAW_FONT_SIZES.SM ?? RAW_FONT_SIZES.sm,
  LG: RAW_FONT_SIZES.LG ?? RAW_FONT_SIZES.lg,
};

const FONT_WEIGHTS = {
  ...RAW_FONT_WEIGHTS,
  MEDIUM: RAW_FONT_WEIGHTS.MEDIUM ?? RAW_FONT_WEIGHTS.medium,
  SEMIBOLD: RAW_FONT_WEIGHTS.SEMIBOLD ?? RAW_FONT_WEIGHTS.semibold,
};

const BORDER_RADIUS = {
  ...RAW_BORDER_RADIUS,
  MD: RAW_BORDER_RADIUS.MD ?? RAW_BORDER_RADIUS.md,
  LG: RAW_BORDER_RADIUS.LG ?? RAW_BORDER_RADIUS.lg,
};

const Z_INDEX = {
  ...RAW_Z_INDEX,
  MODAL: RAW_Z_INDEX.MODAL ?? RAW_Z_INDEX.modal,
};

const TRANSITIONS = {
  ...RAW_TRANSITIONS,
  FAST: RAW_TRANSITIONS.FAST ?? RAW_TRANSITIONS.fast,
};

const OnlineStudentProfileEditModal = ({ open, onClose, student, onProfileUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [slots, setSlots] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
    status: '',
    time_slot: '',
    monthly_fee: '',
  });

  useEffect(() => {
    if (!open || !student) {
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await onlineStudentAdminService.getOnlineStudentProfile(student.id);
        setProfileData(data);
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          status: data.status || '',
          time_slot: data.time_slot != null ? String(data.time_slot) : '',
          monthly_fee: data.monthly_fee != null ? String(data.monthly_fee) : '',
        });
        setFieldErrors({});

        // Load time slots for the student's school
        if (data.school_id) {
          try {
            const res = await fetch(
              `${API_URL}/api/time-slots/?school_id=${data.school_id}`,
              { headers: getAuthHeaders() }
            );
            if (res.ok) {
              const slotData = await res.json();
              setSlots(Array.isArray(slotData) ? slotData : slotData.results || []);
            }
          } catch { /* silent */ }
        }
      } catch (err) {
        const msg = err.message || 'Failed to load profile';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [open, student]);

  if (!open || !student) {
    return null;
  }

  const handleChange = (field) => (e) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validateForm = () => {
    const nextErrors = {};
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const phoneDigits = form.phone.replace(/\D/g, '');

    if (!trimmedName) {
      nextErrors.name = 'Name is required';
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (form.phone && phoneDigits.length < 10) {
      nextErrors.phone = 'Phone number must be at least 10 digits';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please fix the highlighted fields');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        status: form.status,
        time_slot: form.time_slot ? Number(form.time_slot) : null,
        monthly_fee: form.monthly_fee !== '' ? form.monthly_fee : null,
      };

      await onlineStudentAdminService.updateOnlineStudentProfile(student.id, payload, true);
      toast.success('Student profile updated');

      if (onProfileUpdated) {
        onProfileUpdated();
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: Z_INDEX.MODAL,
  };

  const dialogStyle = {
    backgroundColor: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '640px',
    width: '92%',
    maxHeight: '85vh',
    overflowY: 'auto',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: SPACING.MD,
  };

  const labelStyle = {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.GRAY,
    marginBottom: SPACING.XS,
    display: 'block',
  };

  const inputStyle = {
    width: '100%',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    border: `1px solid ${COLORS.BORDER}`,
    fontSize: FONT_SIZES.SM,
    boxSizing: 'border-box',
  };

  const fieldErrorStyle = {
    color: '#B91C1C',
    fontSize: FONT_SIZES.XS,
    marginTop: SPACING.XS,
  };

  const withErrorStyle = (field) => ({
    ...inputStyle,
    border: fieldErrors[field] ? '1px solid #DC2626' : inputStyle.border,
  });

  const buttonBase = {
    padding: `${SPACING.SM} ${SPACING.LG}`,
    borderRadius: BORDER_RADIUS.MD,
    border: 'none',
    cursor: 'pointer',
    fontWeight: FONT_WEIGHTS.MEDIUM,
    fontSize: FONT_SIZES.SM,
    transition: TRANSITIONS.FAST,
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: SPACING.LG, borderBottom: `1px solid ${COLORS.LIGHT_GRAY}` }}>
          <h2 style={{ margin: 0, fontSize: FONT_SIZES.LG, fontWeight: FONT_WEIGHTS.SEMIBOLD }}>
            Edit Profile: {student.name}
          </h2>
        </div>

        <div style={{ padding: SPACING.LG }}>
          {error && (
            <div
              style={{
                padding: SPACING.MD,
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                borderRadius: BORDER_RADIUS.MD,
                marginBottom: SPACING.MD,
                fontSize: FONT_SIZES.SM,
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <p style={{ margin: 0, color: COLORS.GRAY }}>Loading profile...</p>
          ) : (
            <>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Reg Number</label>
                  <input
                    value={profileData?.reg_num || ''}
                    readOnly
                    style={{ ...inputStyle, backgroundColor: '#F9FAFB', cursor: 'default' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>School</label>
                  <input
                    value={profileData?.school_name || ''}
                    readOnly
                    style={{ ...inputStyle, backgroundColor: '#F9FAFB', cursor: 'default' }}
                  />
                </div>
                <div>
                  <label htmlFor="online-student-name" style={labelStyle}>Name</label>
                  <input
                    id="online-student-name"
                    value={form.name}
                    onChange={handleChange('name')}
                    style={withErrorStyle('name')}
                    maxLength={100}
                  />
                  {fieldErrors.name && <div style={fieldErrorStyle}>{fieldErrors.name}</div>}
                </div>
                <div>
                  <label htmlFor="online-student-email" style={labelStyle}>Email</label>
                  <input
                    id="online-student-email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    style={withErrorStyle('email')}
                    maxLength={254}
                  />
                  {fieldErrors.email && <div style={fieldErrorStyle}>{fieldErrors.email}</div>}
                </div>
                <div>
                  <label htmlFor="online-student-phone" style={labelStyle}>Phone</label>
                  <input
                    id="online-student-phone"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    style={withErrorStyle('phone')}
                    maxLength={20}
                    inputMode="tel"
                  />
                  {fieldErrors.phone && <div style={fieldErrorStyle}>{fieldErrors.phone}</div>}
                </div>
                <div>
                  <label htmlFor="online-student-dob" style={labelStyle}>Date of Birth</label>
                  <input
                    id="online-student-dob"
                    type="date"
                    value={form.date_of_birth || ''}
                    onChange={handleChange('date_of_birth')}
                    style={inputStyle}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label htmlFor="online-student-gender" style={labelStyle}>Gender</label>
                  <select id="online-student-gender" value={form.gender} onChange={handleChange('gender')} style={inputStyle}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="online-student-time-slot" style={labelStyle}>Time Slot</label>
                  <select
                    id="online-student-time-slot"
                    value={form.time_slot}
                    onChange={handleChange('time_slot')}
                    style={inputStyle}
                  >
                    <option value="">No Slot</option>
                    {slots.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="online-student-monthly-fee" style={labelStyle}>Monthly Fee</label>
                  <input
                    id="online-student-monthly-fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monthly_fee}
                    onChange={handleChange('monthly_fee')}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="online-student-status" style={labelStyle}>Status</label>
                  <select id="online-student-status" value={form.status} onChange={handleChange('status')} style={inputStyle}>
                    <option value="">Select</option>
                    <option value="Active">Active</option>
                    <option value="Pass Out">Pass Out</option>
                    <option value="Left">Left</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Expelled">Expelled</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: SPACING.MD }}>
                <label htmlFor="online-student-address" style={labelStyle}>Address</label>
                <textarea
                  id="online-student-address"
                  value={form.address}
                  onChange={handleChange('address')}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  maxLength={500}
                />
              </div>
            </>
          )}
        </div>

        <div
          style={{
            padding: SPACING.LG,
            borderTop: `1px solid ${COLORS.LIGHT_GRAY}`,
            display: 'flex',
            gap: SPACING.MD,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              ...buttonBase,
              backgroundColor: COLORS.WHITE,
              color: COLORS.TEXT,
              border: `1px solid ${COLORS.BORDER}`,
              opacity: saving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            style={{
              ...buttonBase,
              backgroundColor: COLORS.PRIMARY,
              color: COLORS.WHITE,
              opacity: saving || loading ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnlineStudentProfileEditModal;
