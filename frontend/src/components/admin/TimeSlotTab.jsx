// frontend/src/components/admin/TimeSlotTab.jsx
// Time Slot CRUD tab embedded inside OnlineStudentManager
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} from '../../services/timeSlotService';
import { API_URL, getAuthHeaders } from '../../api';
import { useSchools } from '../../hooks/useSchools';
import { ConfirmationModal } from '../common/modals/ConfirmationModal';
import {
  COLORS as RAW_COLORS,
  SPACING as RAW_SPACING,
  FONT_SIZES as RAW_FONT_SIZES,
  FONT_WEIGHTS as RAW_FONT_WEIGHTS,
  BORDER_RADIUS as RAW_BORDER_RADIUS,
  MIXINS,
} from '../../utils/designConstants';

const C = RAW_COLORS;
const S = RAW_SPACING;
const FS = RAW_FONT_SIZES;
const FW = RAW_FONT_WEIGHTS;
const BR = RAW_BORDER_RADIUS;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EMPTY = { label: '', school: '', teacher: '', days: '', start_time: '', end_time: '', is_active: true };

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------
const input = {
  width: '100%', padding: `${S.sm} ${S.md}`,
  borderRadius: BR.md, border: '1px solid rgba(255,255,255,0.25)',
  background: '#23234a', // Fix: dark background for select
  color: '#fff', // Always white text
  fontSize: FS.sm, outline: 'none', boxSizing: 'border-box',
  appearance: 'none', // Remove default arrow for custom styling
};
const lbl = {
  display: 'block', color: 'rgba(255,255,255,0.65)',
  fontSize: FS.xs, marginBottom: S.xs, fontWeight: FW.medium,
};
const btn = (variant = 'primary') => ({
  padding: `${S.sm} ${S.lg}`,
  borderRadius: BR.md,
  border: variant === 'outline' ? '1px solid rgba(255,255,255,0.3)' : 'none',
  background: variant === 'danger' ? C.status?.error ?? '#EF4444'
    : variant === 'secondary' ? 'rgba(255,255,255,0.1)'
    : variant === 'outline' ? 'transparent'
    : C.primary ?? '#B061CE',
  color: '#fff', cursor: 'pointer',
  fontSize: FS.sm, fontWeight: FW.semibold,
  whiteSpace: 'nowrap',
});

// ---------------------------------------------------------------------------
// Create / Edit Modal
// ---------------------------------------------------------------------------
function SlotFormModal({ slot, schools, teachers, onSave, onClose }) {
  const [form, setForm] = useState(slot ? {
    label: slot.label || '',
    school: slot.school || '',
    teacher: slot.teacher || '',
    days: slot.days || '',
    start_time: slot.start_time || '',
    end_time: slot.end_time || '',
    is_active: slot.is_active !== undefined ? slot.is_active : true,
  } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleDay = (d) => {
    const cur = form.days.split(',').map(x => x.trim()).filter(Boolean);
    const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d];
    setForm(f => ({ ...f, days: next.join(',') }));
  };

  const submit = async (e) => {
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: S.md }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'linear-gradient(135deg,#6366F1 0%,#8B5CF6 50%,#2362ab 100%)',
        borderRadius: BR.xl, border: '1px solid rgba(255,255,255,0.2)',
        padding: S.xl, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h2 style={{ color: '#fff', fontSize: FS.xl, fontWeight: FW.bold, marginBottom: S.lg }}>
          {slot ? 'Edit Time Slot' : 'New Time Slot'}
        </h2>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: S.md }}>

            <div>
              <label style={lbl}>Label *</label>
              <input name="label" value={form.label} onChange={set}
                placeholder="e.g. Morning Batch A" style={input} />
            </div>

            <div>
              <label style={lbl}>School *</label>
              <select name="school" value={form.school} onChange={set} style={input}>
                <option value="">— Select School —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Assigned Teacher</label>
              <select name="teacher" value={form.teacher} onChange={set} style={input}>
                <option value="">— Unassigned —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.profile_id ?? t.id}>
                    {t.full_name || t.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>Days *</label>
              <div style={{ display: 'flex', gap: S.xs, flexWrap: 'wrap', marginBottom: S.xs }}>
                {DAYS.map(d => {
                  const on = form.days.split(',').map(x => x.trim()).includes(d);
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      style={{ padding: `${S.xs} ${S.sm}`, borderRadius: BR.sm,
                        border: '1px solid rgba(255,255,255,0.3)',
                        background: on ? (C.primary ?? '#B061CE') : 'rgba(255,255,255,0.1)',
                        color: '#fff', cursor: 'pointer', fontSize: FS.xs, fontWeight: FW.medium }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.md }}>
              <div>
                <label style={lbl}>Start Time *</label>
                <input type="time" name="start_time" value={form.start_time} onChange={set} style={input} />
              </div>
              <div>
                <label style={lbl}>End Time *</label>
                <input type="time" name="end_time" value={form.end_time} onChange={set} style={input} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: S.sm }}>
              <input type="checkbox" id="is_active" name="is_active"
                checked={form.is_active} onChange={set}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="is_active" style={{ ...lbl, marginBottom: 0, cursor: 'pointer' }}>Active</label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: S.md, marginTop: S.xl, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btn('outline')}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ ...btn('primary'), opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : slot ? 'Save Changes' : 'Create Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main TimeSlotTab
// ---------------------------------------------------------------------------
export default function TimeSlotTab() {
  const { schools } = useSchools();
  const [slots, setSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSchool, setFilterSchool] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterSchool) params.school_id = filterSchool;
      const data = await getTimeSlots(params);
      setSlots(Array.isArray(data) ? data : data.results || []);
    } catch {
      toast.error('Failed to load time slots.');
    } finally {
      setLoading(false);
    }
  }, [filterSchool]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/employees/teachers/`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setTeachers(Array.isArray(data) ? data : data.results || []);
        }
      } catch { /* silent */ }
    })();
  }, []);

  const handleSaved = () => { setShowForm(false); setEditSlot(null); loadSlots(); };

  const handleDeleteConfirm = async () => {
    try {
      await deleteTimeSlot(deleteTarget.id);
      toast.success('Time slot deleted.');
      setDeleteTarget(null);
      loadSlots();
    } catch (err) {
      toast.error(err.message || 'Failed to delete.');
    }
  };

  const visible = slots.filter(s => {
    if (filterActive === 'active' && !s.is_active) return false;
    if (filterActive === 'inactive' && s.is_active) return false;
    return true;
  });

  const thStyle = {
    padding: S.md, textAlign: 'left',
    fontSize: FS.sm, fontWeight: FW.semibold,
    color: 'rgba(255,255,255,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
  };
  const tdStyle = {
    padding: S.md, fontSize: FS.sm,
    color: 'rgba(255,255,255,0.9)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    verticalAlign: 'middle',
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: S.md, alignItems: 'center', marginBottom: S.lg, flexWrap: 'wrap' }}>
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)}
          style={{ ...input, maxWidth: 220, flex: 'none' }}>
          <option value="">All Schools</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
          style={{ ...input, maxWidth: 160, flex: 'none' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => loadSlots()} style={btn('secondary')}>↻ Refresh</button>
        <button onClick={() => { setEditSlot(null); setShowForm(true); }} style={btn('primary')}>
          + New Time Slot
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: S.md, marginBottom: S.lg, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Slots', value: slots.length, color: '139,92,246' },
          { label: 'Active', value: slots.filter(s => s.is_active).length, color: '16,185,129' },
          { label: 'Online Students', value: slots.reduce((n, s) => n + (s.student_count || 0), 0), color: '59,130,246' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: 1, minWidth: 110, padding: S.lg,
            ...MIXINS.glassmorphicCard,
            borderRadius: BR.md,
            borderLeft: `4px solid rgb(${stat.color})`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: FS.xs, fontWeight: FW.semibold, color: 'rgba(255,255,255,0.65)',
              margin: `0 0 ${S.sm}`, textTransform: 'uppercase' }}>{stat.label}</p>
            <p style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: S.xl }}>Loading…</p>
      ) : visible.length === 0 ? (
        <div style={{ ...MIXINS.glassmorphicCard, borderRadius: BR.md, textAlign: 'center',
          padding: S.xl, color: 'rgba(255,255,255,0.5)' }}>
          No time slots found. Click "+ New Time Slot" to create one.
        </div>
      ) : (
        <div style={{ ...MIXINS.glassmorphicCard, borderRadius: BR.md, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.08)' }}>
              <tr>
                <th style={thStyle}>Label</th>
                <th style={thStyle}>School</th>
                <th style={thStyle}>Teacher</th>
                <th style={thStyle}>Days / Time</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Students</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(slot => (
                <tr key={slot.id}>
                  <td style={{ ...tdStyle, fontWeight: FW.semibold }}>{slot.label}</td>
                  <td style={tdStyle}>{slot.school_name || `School #${slot.school}`}</td>
                  <td style={tdStyle}>{slot.teacher_name || <span style={{ color: 'rgba(255,255,255,0.35)' }}>Unassigned</span>}</td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: FS.xs, color: 'rgba(255,255,255,0.7)' }}>{slot.days}</div>
                    <div style={{ fontWeight: FW.medium }}>
                      {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: `${S.xs} ${S.md}`,
                      borderRadius: BR.full, fontSize: FS.xs, fontWeight: FW.medium,
                      background: 'rgba(139,92,246,0.2)', color: 'rgba(196,181,253,1)',
                      border: '1px solid rgba(139,92,246,0.4)' }}>
                      {slot.student_count ?? 0}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: `${S.xs} ${S.md}`,
                      borderRadius: BR.full, fontSize: FS.xs, fontWeight: FW.medium,
                      background: slot.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: slot.is_active ? '#10B981' : '#EF4444',
                      border: `1px solid ${slot.is_active ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}` }}>
                      {slot.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: S.sm, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setEditSlot(slot); setShowForm(true); }}
                        style={{ padding: `${S.xs} ${S.md}`, borderRadius: BR.md,
                          border: '1px solid rgba(196,181,253,0.7)', background: 'transparent',
                          color: 'rgba(196,181,253,1)', cursor: 'pointer', fontSize: FS.xs }}>
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(slot)}
                        style={{ padding: `${S.xs} ${S.md}`, borderRadius: BR.md,
                          border: 'none', background: 'rgba(239,68,68,0.8)',
                          color: '#fff', cursor: 'pointer', fontSize: FS.xs }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SlotFormModal
          slot={editSlot}
          schools={schools}
          teachers={teachers}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditSlot(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Time Slot"
          message={`Delete "${deleteTarget.label}"? Students in this slot will lose their assignment.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
