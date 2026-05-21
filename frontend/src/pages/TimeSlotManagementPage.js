// ============================================
// TIME SLOT MANAGEMENT PAGE
// Admin: Full CRUD — create/edit/delete time slots, assign teachers
// Teacher: View own slots only (read-only)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useSchools } from '../hooks/useSchools';
import {
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} from '../services/timeSlotService';
import { API_URL, getAuthHeaders } from '../api';
import { useResponsive } from '../hooks/useResponsive';
import { PageHeader } from '../components/common/PageHeader';
import { ConfirmationModal } from '../components/common/modals/ConfirmationModal';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../utils/designConstants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAYS_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EMPTY_FORM = {
  label: '',
  school: '',
  teacher: '',
  days: '',
  start_time: '',
  end_time: '',
  is_active: true,
};

const cardStyle = {
  background: 'rgba(255,255,255,0.12)',
  borderRadius: BORDER_RADIUS.lg,
  border: '1px solid rgba(255,255,255,0.2)',
  padding: SPACING.lg,
  backdropFilter: 'blur(10px)',
};

const inputStyle = {
  width: '100%',
  padding: `${SPACING.sm} ${SPACING.md}`,
  borderRadius: BORDER_RADIUS.md,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(255,255,255,0.15)',
  color: COLORS.text.white,
  fontSize: FONT_SIZES.sm,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  color: COLORS.text.whiteSubtle,
  fontSize: FONT_SIZES.xs,
  marginBottom: SPACING.xs,
  fontWeight: FONT_WEIGHTS.medium,
};

// ---------------------------------------------------------------------------
// TimeSlot Form Modal
// ---------------------------------------------------------------------------

function TimeSlotFormModal({ slot, schools, teachers, onSave, onClose }) {
  const [form, setForm] = useState(slot ? {
    label: slot.label || '',
    school: slot.school || '',
    teacher: slot.teacher || '',
    days: slot.days || '',
    start_time: slot.start_time || '',
    end_time: slot.end_time || '',
    is_active: slot.is_active !== undefined ? slot.is_active : true,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim() || !form.school || !form.days.trim() || !form.start_time || !form.end_time) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        school: Number(form.school),
        days: form.days.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
        is_active: form.is_active,
      };
      if (form.teacher) payload.teacher = Number(form.teacher);
      if (slot) {
        await updateTimeSlot(slot.id, payload);
        toast.success('Time slot updated.');
      } else {
        await createTimeSlot(payload);
        toast.success('Time slot created.');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to save time slot.');
    } finally {
      setSaving(false);
    }
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: SPACING.md,
  };
  const modalStyle = {
    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #2362ab 100%)',
    borderRadius: BORDER_RADIUS.xl,
    border: '1px solid rgba(255,255,255,0.2)',
    padding: SPACING.xl,
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <h2 style={{ color: COLORS.text.white, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.lg }}>
          {slot ? 'Edit Time Slot' : 'New Time Slot'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: SPACING.md }}>

            {/* Label */}
            <div>
              <label style={labelStyle}>Label *</label>
              <input name="label" value={form.label} onChange={handleChange}
                placeholder="e.g. Morning Batch A" style={inputStyle} />
            </div>

            {/* School */}
            <div>
              <label style={labelStyle}>School *</label>
              <select name="school" value={form.school} onChange={handleChange} style={inputStyle}>
                <option value="">— Select School —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Teacher */}
            <div>
              <label style={labelStyle}>Assigned Teacher</label>
              <select name="teacher" value={form.teacher} onChange={handleChange} style={inputStyle}>
                <option value="">— Unassigned —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.full_name || t.username} ({t.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Days */}
            <div>
              <label style={labelStyle}>Days * (e.g. Mon,Wed,Fri)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.xs }}>
                {DAYS_OPTIONS.map(d => {
                  const selected = form.days.split(',').map(x => x.trim()).includes(d);
                  return (
                    <button key={d} type="button"
                      onClick={() => {
                        const current = form.days.split(',').map(x => x.trim()).filter(Boolean);
                        const next = selected ? current.filter(x => x !== d) : [...current, d];
                        setForm(f => ({ ...f, days: next.join(',') }));
                      }}
                      style={{
                        padding: `${SPACING.xs} ${SPACING.sm}`,
                        borderRadius: BORDER_RADIUS.sm,
                        border: '1px solid rgba(255,255,255,0.3)',
                        background: selected ? COLORS.primary : 'rgba(255,255,255,0.1)',
                        color: COLORS.text.white,
                        cursor: 'pointer',
                        fontSize: FONT_SIZES.xs,
                        fontWeight: FONT_WEIGHTS.medium,
                      }}>
                      {d}
                    </button>
                  );
                })}
              </div>
              <input name="days" value={form.days} onChange={handleChange}
                placeholder="Or type manually: Mon,Wed,Fri" style={inputStyle} />
            </div>

            {/* Times */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
              <div>
                <label style={labelStyle}>Start Time *</label>
                <input type="time" name="start_time" value={form.start_time} onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>End Time *</label>
                <input type="time" name="end_time" value={form.end_time} onChange={handleChange} style={inputStyle} />
              </div>
            </div>

            {/* Active */}
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
              <input type="checkbox" id="is_active" name="is_active"
                checked={form.is_active} onChange={handleChange}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="is_active" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                Active
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: SPACING.md, marginTop: SPACING.xl, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: `${SPACING.sm} ${SPACING.lg}`, borderRadius: BORDER_RADIUS.md,
                border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
                color: COLORS.text.white, cursor: 'pointer', fontSize: FONT_SIZES.sm }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: `${SPACING.sm} ${SPACING.lg}`, borderRadius: BORDER_RADIUS.md,
                border: 'none', background: COLORS.primary,
                color: COLORS.text.white, cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold,
                opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : slot ? 'Save Changes' : 'Create Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time Slot Card
// ---------------------------------------------------------------------------

function TimeSlotCard({ slot, isAdmin, onEdit, onDelete }) {
  const statusColor = slot.is_active ? COLORS.status.success : COLORS.status.error;

  return (
    <div style={{ ...cardStyle, position: 'relative' }}>
      {/* Status dot */}
      <div style={{ position: 'absolute', top: SPACING.md, right: SPACING.md,
        width: 10, height: 10, borderRadius: '50%', background: statusColor }} title={slot.is_active ? 'Active' : 'Inactive'} />

      <div style={{ marginBottom: SPACING.sm }}>
        <span style={{ fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white }}>
          {slot.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${SPACING.xs} ${SPACING.lg}`, marginBottom: SPACING.md }}>
        <InfoRow icon="🏫" label="School" value={slot.school_name || `School #${slot.school}`} />
        <InfoRow icon="👤" label="Teacher" value={slot.teacher_name || 'Unassigned'} />
        <InfoRow icon="📅" label="Days" value={slot.days} />
        <InfoRow icon="⏰" label="Time" value={`${slot.start_time?.slice(0,5)} – ${slot.end_time?.slice(0,5)}`} />
        <InfoRow icon="👥" label="Students" value={slot.student_count ?? '—'} />
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: SPACING.sm, justifyContent: 'flex-end' }}>
          <button onClick={() => onEdit(slot)}
            style={{ padding: `${SPACING.xs} ${SPACING.md}`, borderRadius: BORDER_RADIUS.md,
              border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)',
              color: COLORS.text.white, cursor: 'pointer', fontSize: FONT_SIZES.xs }}>
            Edit
          </button>
          <button onClick={() => onDelete(slot)}
            style={{ padding: `${SPACING.xs} ${SPACING.md}`, borderRadius: BORDER_RADIUS.md,
              border: 'none', background: COLORS.status.error,
              color: COLORS.text.white, cursor: 'pointer', fontSize: FONT_SIZES.xs }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div>
      <span style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle }}>{icon} {label}</span>
      <div style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.white, fontWeight: FONT_WEIGHTS.medium }}>
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TimeSlotManagementPage() {
  const { isMobile } = useResponsive();
  const { schools } = useSchools();
  const [slots, setSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSchool, setFilterSchool] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Determine role from stored user
  const userRole = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').role || ''; } catch { return ''; }
  })();
  const isAdmin = userRole === 'Admin';

  // Fetch teachers list (Admin only)
  const fetchTeachers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API_URL}/employees/teachers/`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        // API may return {results:[...]} or [...]
        setTeachers(Array.isArray(data) ? data : data.results || []);
      }
    } catch { /* silent */ }
  }, [isAdmin]);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterSchool) params.school_id = filterSchool;
      const data = await getTimeSlots(params);
      setSlots(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      toast.error('Failed to load time slots.');
    } finally {
      setLoading(false);
    }
  }, [filterSchool]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);
  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const handleSaved = () => {
    setShowForm(false);
    setEditSlot(null);
    fetchSlots();
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteTimeSlot(deleteTarget.id);
      toast.success('Time slot deleted.');
      setDeleteTarget(null);
      fetchSlots();
    } catch (err) {
      toast.error(err.message || 'Failed to delete time slot.');
    }
  };

  // Filtered display
  const visibleSlots = slots.filter(s => {
    if (filterActive === 'active' && !s.is_active) return false;
    if (filterActive === 'inactive' && s.is_active) return false;
    return true;
  });

  const activeCount = slots.filter(s => s.is_active).length;

  // ---- Styles ----
  const pageStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #2362ab 100%)',
    padding: isMobile ? SPACING.md : SPACING.xl,
  };
  const wrapperStyle = { maxWidth: 1100, margin: '0 auto' };
  const statsRowStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  };
  const statCardStyle = {
    ...cardStyle,
    textAlign: 'center',
  };
  const toolbarStyle = {
    display: 'flex',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
    alignItems: 'center',
    flexDirection: isMobile ? 'column' : 'row',
  };
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: SPACING.lg,
  };

  return (
    <div style={pageStyle}>
      <div style={wrapperStyle}>
        <PageHeader
          title="Time Slot Management"
          subtitle="Manage online class schedules and teacher assignments"
        />

        {/* Stats */}
        <div style={statsRowStyle}>
          <div style={statCardStyle}>
            <div style={{ fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white }}>{slots.length}</div>
            <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle }}>Total Slots</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.status.success }}>{activeCount}</div>
            <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle }}>Active</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white }}>
              {slots.reduce((sum, s) => sum + (s.student_count || 0), 0)}
            </div>
            <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle }}>Online Students</div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={toolbarStyle}>
          {/* School filter */}
          <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)}
            style={{ ...inputStyle, maxWidth: isMobile ? '100%' : 220, flex: isMobile ? '1' : 'unset' }}>
            <option value="">All Schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Active filter */}
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
            style={{ ...inputStyle, maxWidth: isMobile ? '100%' : 160, flex: isMobile ? '1' : 'unset' }}>
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <div style={{ flex: 1 }} />

          {isAdmin && (
            <button
              onClick={() => { setEditSlot(null); setShowForm(true); }}
              style={{ padding: `${SPACING.sm} ${SPACING.lg}`, borderRadius: BORDER_RADIUS.md,
                border: 'none', background: COLORS.primary, color: COLORS.text.white,
                cursor: 'pointer', fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold,
                whiteSpace: 'nowrap' }}>
              + New Time Slot
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', color: COLORS.text.whiteSubtle, padding: SPACING['2xl'] }}>
            Loading…
          </div>
        ) : visibleSlots.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: SPACING['2xl'] }}>
            <div style={{ fontSize: 40, marginBottom: SPACING.md }}>🗓</div>
            <div style={{ color: COLORS.text.white, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold }}>
              No time slots found
            </div>
            <div style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.sm, marginTop: SPACING.xs }}>
              {isAdmin ? 'Click "+ New Time Slot" to create one.' : 'No time slots assigned to you yet.'}
            </div>
          </div>
        ) : (
          <div style={gridStyle}>
            {visibleSlots.map(slot => (
              <TimeSlotCard
                key={slot.id}
                slot={slot}
                isAdmin={isAdmin}
                onEdit={(s) => { setEditSlot(s); setShowForm(true); }}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <TimeSlotFormModal
          slot={editSlot}
          schools={schools}
          teachers={teachers}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditSlot(null); }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Time Slot"
          message={`Are you sure you want to delete "${deleteTarget.label}"? Students in this slot will lose their assignment.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
