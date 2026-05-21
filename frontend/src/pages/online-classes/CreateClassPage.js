// frontend/src/pages/online-classes/CreateClassPage.js
// Teacher: schedule a new session or edit an existing one

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../utils/designConstants';
import { createSession, getSession, updateSession, getEligibleStudents } from '../../services/onlineClassService';
import { API_URL, getAuthHeaders } from '../../api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

const CreateClassPage = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams(); // set when editing
  const isEditing = Boolean(sessionId);
  const role = localStorage.getItem('role') || '';

  const [schools, setSchools] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    school: '',
    time_slot: '',
    selected_student_ids: [],
    scheduled_at: '',
    duration_mins: 60,
    is_recurring: false,
    recurrence_days: [],
    recording_enabled: false,
    chat_enabled: true,
    screenshare_student_allowed: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolHint, setSchoolHint] = useState('');

  const normalizeSchoolList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.schools)) return data.schools;
    return [];
  };

  // Load teacher's assigned schools
  useEffect(() => {
    const loadSchools = async () => {
      setLoadingSchools(true);
      setSchoolHint('');

      try {
        let schoolList = [];
        if (role === 'Admin') {
          const allSchoolsRes = await fetch(`${API_URL}/api/schools/`, { headers: getAuthHeaders() });
          if (allSchoolsRes.ok) {
            const allSchoolsData = await allSchoolsRes.json();
            schoolList = normalizeSchoolList(allSchoolsData).filter((s) => s.is_active !== false);
          }
        } else {
          const assignedRes = await fetch(`${API_URL}/api/users/me/assigned-schools/`, {
            headers: getAuthHeaders(),
          });

          const assignedData = assignedRes.ok ? await assignedRes.json() : [];
          schoolList = normalizeSchoolList(assignedData);
        }

        setSchools(schoolList);
        setForm((prev) => {
          if (!prev.school && schoolList.length === 1) {
            return { ...prev, school: String(schoolList[0].id) };
          }
          return prev;
        });

        if (schoolList.length === 0) {
          setSchoolHint(
            role === 'Teacher'
              ? 'No assigned schools found. Ask admin to assign at least one school.'
              : 'No active schools found. Add a school first.'
          );
        }
      } catch {
        setSchoolHint('Could not load schools right now. Please refresh and try again.');
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, [role]);

  // Load time slots when school changes
  useEffect(() => {
    if (!form.school) {
      setTimeSlots([]);
      setForm((prev) => ({ ...prev, time_slot: '', selected_student_ids: [] }));
      return;
    }
    setLoadingSlots(true);
    fetch(`${API_URL}/api/time-slots/?school_id=${form.school}`, { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setTimeSlots(list);
      })
      .catch(() => setTimeSlots([]))
      .finally(() => setLoadingSlots(false));
    // reset slot/students when school changes
    setForm((prev) => ({ ...prev, time_slot: '', selected_student_ids: [] }));
    setStudents([]);
  }, [form.school]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load eligible ONLINE students when school or time_slot changes
  useEffect(() => {
    if (!form.school) { setStudents([]); return; }
    setLoadingStudents(true);
    const params = { school_id: form.school };
    if (form.time_slot) params.time_slot_id = form.time_slot;
    getEligibleStudents(params)
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [form.school, form.time_slot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing session when editing
  useEffect(() => {
    if (!isEditing) return;
    getSession(sessionId)
      .then((session) => {
        const days = session.recurrence_rule
          ? session.recurrence_rule.replace('weekly:', '').split(',')
          : [];
        // Format scheduled_at for datetime-local input
        const dt = new Date(session.scheduled_at);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setForm({
          title: session.title || '',
          description: session.description || '',
          school: session.school || '',
          time_slot: session.time_slot || '',
          selected_student_ids: session.selected_student_ids || [],
          scheduled_at: local,
          duration_mins: session.duration_mins || 60,
          is_recurring: session.is_recurring || false,
          recurrence_days: days,
          recording_enabled: session.recording_enabled || false,
          chat_enabled: session.chat_enabled !== false,
          screenshare_student_allowed: session.screenshare_student_allowed || false,
        });
      })
      .catch(() => {});
  }, [isEditing, sessionId]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.school) e.school = 'Please select a school';
    if (!form.scheduled_at) e.scheduled_at = 'Date and time is required';
    if (form.is_recurring && form.recurrence_days.length === 0) {
      e.recurrence_days = 'Select at least one day';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      school: form.school,
      time_slot: form.time_slot || null,
      selected_student_ids: form.selected_student_ids,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_mins: form.duration_mins,
      is_recurring: form.is_recurring,
      recurrence_rule: form.is_recurring ? `weekly:${form.recurrence_days.join(',')}` : '',
      recording_enabled: form.recording_enabled,
      chat_enabled: form.chat_enabled,
      screenshare_student_allowed: form.screenshare_student_allowed,
    };

    try {
      if (isEditing) {
        await updateSession(sessionId, payload);
      } else {
        await createSession(payload);
      }
      navigate('/online-classes/teacher');
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day],
    }));
  };

  const styles = getStyles();

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/online-classes/teacher')} style={styles.backLink}>
        ← Back to Classes
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>{isEditing ? 'Edit Class' : 'Schedule New Class'}</h2>

        <form onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <Field label="Class Title *" error={errors.title}>
            <input
              style={errors.title ? styles.inputError : styles.input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Introduction to Python"
              maxLength={200}
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              style={styles.textarea}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What will students learn in this class?"
              rows={3}
            />
          </Field>

          {/* School */}
          <Field label="School *" error={errors.school}>
            <select
              style={errors.school ? styles.inputError : styles.input}
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              disabled={loadingSchools}
            >
              <option value="">— Select School —</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {schoolHint ? <p style={styles.schoolHint}>{schoolHint}</p> : null}
          </Field>

          {/* Time Slot */}
          <Field label="Time Slot">
            <select
              style={styles.input}
              value={form.time_slot}
              onChange={(e) => setForm({ ...form, time_slot: e.target.value, selected_student_ids: [] })}
              disabled={loadingSlots || !form.school}
            >
              <option value="">— Select Time Slot (optional) —</option>
              {timeSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}{s.days ? ` · ${s.days}` : ''}{s.start_time ? ` · ${s.start_time}` : ''}
                </option>
              ))}
            </select>
            {loadingSlots && <p style={styles.schoolHint}>Loading time slots…</p>}
          </Field>

          {/* Student Selector */}
          {form.school && (
            <Field label="Invite Students (ONLINE only)">
              {loadingStudents ? (
                <p style={styles.schoolHint}>Loading students…</p>
              ) : students.length === 0 ? (
                <p style={styles.schoolHint}>
                  {form.time_slot
                    ? 'No ONLINE students found in this time slot.'
                    : 'No active ONLINE students found for this school.'}
                </p>
              ) : (
                <div style={styles.studentList}>
                  <label style={styles.studentCheckRow}>
                    <input
                      type="checkbox"
                      checked={form.selected_student_ids.length === students.length}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          selected_student_ids: e.target.checked ? students.map((s) => s.id) : [],
                        }))
                      }
                    />
                    <span style={{ fontWeight: 600 }}>Select all ({students.length})</span>
                  </label>
                  {students.map((s) => (
                    <label key={s.id} style={styles.studentCheckRow}>
                      <input
                        type="checkbox"
                        checked={form.selected_student_ids.includes(s.id)}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            selected_student_ids: e.target.checked
                              ? [...prev.selected_student_ids, s.id]
                              : prev.selected_student_ids.filter((id) => id !== s.id),
                          }))
                        }
                      />
                      <span>{s.name}</span>
                      {s.student_id && <span style={styles.studentId}>#{s.student_id}</span>}
                    </label>
                  ))}
                </div>
              )}
              {form.selected_student_ids.length === 0 && form.school && (
                <p style={styles.schoolHint}>Leave empty to allow all school students to join (legacy mode).</p>
              )}
            </Field>
          )}

          {/* Date & Time */}
          <Field label="Date & Time *" error={errors.scheduled_at}>
            <input
              type="datetime-local"
              style={errors.scheduled_at ? styles.inputError : styles.input}
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            />
          </Field>

          {/* Duration */}
          <Field label="Duration">
            <select
              style={styles.input}
              value={form.duration_mins}
              onChange={(e) => setForm({ ...form, duration_mins: Number(e.target.value) })}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>{d} minutes</option>
              ))}
            </select>
          </Field>

          {/* Recurring */}
          <div style={styles.checkRow}>
            <input
              type="checkbox"
              id="recurring"
              checked={form.is_recurring}
              onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
            />
            <label htmlFor="recurring" style={styles.checkLabel}>Recurring class</label>
          </div>

          {form.is_recurring && (
            <Field label="Repeat on *" error={errors.recurrence_days}>
              <div style={styles.dayPicker}>
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    style={form.recurrence_days.includes(day) ? styles.dayBtnActive : styles.dayBtn}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* Permissions */}
          <div style={styles.permissionsSection}>
            <p style={styles.sectionLabel}>Session Options</p>
            <ToggleRow
              label="Enable Recording"
              hint="Students can watch the class after it ends"
              checked={form.recording_enabled}
              onChange={(v) => setForm({ ...form, recording_enabled: v })}
            />
            <ToggleRow
              label="Enable Chat"
              hint="Students can send text messages during class"
              checked={form.chat_enabled}
              onChange={(v) => setForm({ ...form, chat_enabled: v })}
            />
            <ToggleRow
              label="Allow Student Screen Share"
              hint="Students can share their screen during class"
              checked={form.screenshare_student_allowed}
              onChange={(v) => setForm({ ...form, screenshare_student_allowed: v })}
            />
          </div>

          {errors.submit && <p style={styles.submitError}>{errors.submit}</p>}

          <div style={styles.formActions}>
            <button
              type="button"
              onClick={() => navigate('/online-classes/teacher')}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={submitting ? styles.submitBtnDisabled : styles.submitBtn}>
              {submitting ? 'Saving…' : isEditing ? 'Update Class' : 'Schedule Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <div style={{ marginBottom: SPACING[4] }}>
    <label style={{
      display: 'block', fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium,
      color: COLORS.text.secondary, marginBottom: SPACING[1],
    }}>
      {label}
    </label>
    {children}
    {error && <p style={{ color: COLORS.status.error, fontSize: FONT_SIZES.xs, margin: `${SPACING[1]} 0 0` }}>{error}</p>}
  </div>
);

const ToggleRow = ({ label, hint, checked, onChange }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING[3]} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
    <div>
      <p style={{ margin: 0, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.text.primary }}>{label}</p>
      <p style={{ margin: 0, fontSize: FONT_SIZES.xs, color: COLORS.text.tertiary }}>{hint}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? COLORS.primary : COLORS.border.default,
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  </div>
);

const getStyles = () => ({
  page: { padding: SPACING[6], maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: SPACING[4] },
  backLink: {
    background: 'none', border: 'none', color: COLORS.primary, cursor: 'pointer',
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, padding: 0, alignSelf: 'flex-start',
  },
  card: {
    background: '#fff', borderRadius: BORDER_RADIUS.xl, padding: SPACING[8],
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.primary, margin: `0 0 ${SPACING[6]}` },
  input: {
    width: '100%', padding: `${SPACING[3]} ${SPACING[4]}`, border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm, color: COLORS.text.primary,
    background: '#fff', boxSizing: 'border-box', outline: 'none',
  },
  inputError: {
    width: '100%', padding: `${SPACING[3]} ${SPACING[4]}`, border: `1px solid ${COLORS.status.error}`,
    borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm, color: COLORS.text.primary,
    background: '#fff', boxSizing: 'border-box', outline: 'none',
  },
  textarea: {
    width: '100%', padding: `${SPACING[3]} ${SPACING[4]}`, border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm, color: COLORS.text.primary,
    background: '#fff', boxSizing: 'border-box', resize: 'vertical', outline: 'none',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: SPACING[2], marginBottom: SPACING[4] },
  checkLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.text.primary, cursor: 'pointer' },
  dayPicker: { display: 'flex', gap: SPACING[2], flexWrap: 'wrap' },
  dayBtn: {
    padding: `${SPACING[1]} ${SPACING[3]}`, borderRadius: BORDER_RADIUS.full,
    border: `1px solid ${COLORS.border.default}`, background: '#fff',
    fontSize: FONT_SIZES.sm, cursor: 'pointer', color: COLORS.text.secondary,
  },
  dayBtnActive: {
    padding: `${SPACING[1]} ${SPACING[3]}`, borderRadius: BORDER_RADIUS.full,
    border: `1px solid ${COLORS.primary}`, background: COLORS.primary,
    fontSize: FONT_SIZES.sm, cursor: 'pointer', color: '#fff', fontWeight: FONT_WEIGHTS.semibold,
  },
  permissionsSection: { marginBottom: SPACING[6] },
  sectionLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.secondary, marginBottom: SPACING[2] },
  formActions: { display: 'flex', gap: SPACING[3], marginTop: SPACING[6] },
  cancelBtn: {
    flex: 1, padding: `${SPACING[3]} ${SPACING[4]}`, background: 'none',
    border: `1px solid ${COLORS.border.default}`, borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm, cursor: 'pointer', color: COLORS.text.secondary,
  },
  submitBtn: {
    flex: 2, padding: `${SPACING[3]} ${SPACING[4]}`, background: COLORS.primary,
    border: 'none', borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold, color: '#fff', cursor: 'pointer',
  },
  submitBtnDisabled: {
    flex: 2, padding: `${SPACING[3]} ${SPACING[4]}`, background: COLORS.border.light,
    border: 'none', borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary, cursor: 'not-allowed',
  },
  schoolHint: {
    margin: `${SPACING[1]} 0 0`,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
  },
  studentList: {
    border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[3],
    maxHeight: 220,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING[2],
  },
  studentCheckRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING[2],
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.primary,
    cursor: 'pointer',
  },
  studentId: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.tertiary,
    marginLeft: SPACING[1],
  },
  submitError: { color: COLORS.status.error, fontSize: FONT_SIZES.sm, textAlign: 'center' },
});

export default CreateClassPage;
