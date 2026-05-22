import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, getAuthHeaders } from '../../api';
import {
  createOnlineLessonPlan,
  getOnlineLessonPlan,
  getOnlineLessonPlanRange,
  updateOnlinePlannedTopic,
  deleteOnlineLessonPlan,
} from '../../services/onlineClassService';
import LessonPlanWizard from '../../components/lessons/LessonPlanWizard';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';

const OnlineLessonPlansPage = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const role = localStorage.getItem('role') || '';

  const [schools, setSchools] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    school_id: '',
    time_slot_id: '',
    session_date: '',
    planned_topic: '',
  });
  const [existingPlan, setExistingPlan] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const [rangeFilter, setRangeFilter] = useState({
    school_id: '',
    time_slot_id: '',
    start_date: '',
    end_date: '',
  });
  const [rangeSlots, setRangeSlots] = useState([]);
  const [loadingRangeSlots, setLoadingRangeSlots] = useState(false);
  const [rangeRows, setRangeRows] = useState([]);
  const [loadingRangeRows, setLoadingRangeRows] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editedTopic, setEditedTopic] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const normalizeSchoolList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.schools)) return data.schools;
    return [];
  };

  useEffect(() => {
    const loadSchools = async () => {
      setLoadingSchools(true);
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
        if (schoolList.length === 1) {
          setForm((prev) => ({ ...prev, school_id: String(schoolList[0].id) }));
        }
      } catch {
        setSchools([]);
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, [role]);

  useEffect(() => {
    if (!form.school_id) {
      setTimeSlots([]);
      setForm((prev) => ({ ...prev, time_slot_id: '' }));
      return;
    }

    setLoadingSlots(true);
    fetch(`${API_URL}/api/time-slots/?school_id=${form.school_id}`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setTimeSlots(list);
      })
      .catch(() => setTimeSlots([]))
      .finally(() => setLoadingSlots(false));

    setForm((prev) => ({ ...prev, time_slot_id: '' }));
  }, [form.school_id]);

  useEffect(() => {
    if (!form.school_id || !form.time_slot_id || !form.session_date) {
      setExistingPlan(null);
      return;
    }

    setLoadingExisting(true);
    getOnlineLessonPlan({
      school_id: form.school_id,
      time_slot_id: form.time_slot_id,
      session_date: form.session_date,
    })
      .then((res) => {
        const list = Array.isArray(res?.lessons) ? res.lessons : [];
        setExistingPlan(list[0] || null);
      })
      .catch(() => setExistingPlan(null))
      .finally(() => setLoadingExisting(false));
  }, [form.school_id, form.time_slot_id, form.session_date]);

  useEffect(() => {
    if (!rangeFilter.school_id) {
      setRangeSlots([]);
      setRangeFilter((prev) => ({ ...prev, time_slot_id: '' }));
      return;
    }

    setLoadingRangeSlots(true);
    fetch(`${API_URL}/api/time-slots/?school_id=${rangeFilter.school_id}`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setRangeSlots(list);
      })
      .catch(() => setRangeSlots([]))
      .finally(() => setLoadingRangeSlots(false));

    setRangeFilter((prev) => ({ ...prev, time_slot_id: '' }));
  }, [rangeFilter.school_id]);

  const fetchRangeRows = async () => {
    setRangeError('');
    if (!rangeFilter.school_id || !rangeFilter.start_date || !rangeFilter.end_date) {
      setRangeError('School, start date, and end date are required to fetch lesson plans.');
      return;
    }

    setLoadingRangeRows(true);
    try {
      const data = await getOnlineLessonPlanRange({
        school_id: rangeFilter.school_id,
        start_date: rangeFilter.start_date,
        end_date: rangeFilter.end_date,
        ...(rangeFilter.time_slot_id ? { time_slot_id: rangeFilter.time_slot_id } : {}),
      });
      setRangeRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRangeRows([]);
      setRangeError(err.message || 'Failed to fetch online lesson plans.');
    } finally {
      setLoadingRangeRows(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditedTopic(row.planned_topic || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedTopic('');
  };

  const saveEdit = async (rowId) => {
    if (!editedTopic.trim()) {
      setRangeError('Planned topic cannot be empty.');
      return;
    }

    setSavingId(rowId);
    setRangeError('');
    try {
      await updateOnlinePlannedTopic(rowId, editedTopic.trim());
      setRangeRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, planned_topic: editedTopic.trim() } : r)));
      setEditingId(null);
      setEditedTopic('');
      setMessage('Online lesson plan updated successfully.');
    } catch (err) {
      setRangeError(err.message || 'Failed to update online lesson plan.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (row) => {
    const ok = window.confirm(`Delete online lesson plan for ${row.session_date}${row.time_slot_label ? ` (${row.time_slot_label})` : ''}?`);
    if (!ok) return;

    setDeletingId(row.id);
    setRangeError('');
    try {
      await deleteOnlineLessonPlan(row.id);
      setRangeRows((prev) => prev.filter((r) => r.id !== row.id));
      setMessage('Online lesson plan deleted successfully.');
    } catch (err) {
      setRangeError(err.message || 'Failed to delete online lesson plan.');
    } finally {
      setDeletingId(null);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.school_id || !form.time_slot_id || !form.session_date || !form.planned_topic.trim()) {
      setError('School, time slot, date, and lesson topic are required.');
      return;
    }

    setSaving(true);
    try {
      await createOnlineLessonPlan({
        school_id: form.school_id,
        time_slot_id: form.time_slot_id,
        session_date: form.session_date,
        planned_topic: form.planned_topic.trim(),
      });
      setMessage('Online lesson plan saved successfully.');
      setForm((prev) => ({ ...prev, planned_topic: '' }));
    } catch (err) {
      setError(err.message || 'Failed to save online lesson plan.');
    } finally {
      setSaving(false);
    }
  };

  const styles = getStyles({ isCompact });

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <button onClick={() => navigate('/online-classes/teacher')} style={styles.backBtn}>
          Back to Online Classes
        </button>
        <div style={styles.headerActions}>
          <button onClick={() => setWizardOpen(true)} style={styles.linkBtn}>
            Open Unified Lesson Wizard
          </button>
          <button onClick={() => navigate('/online-classes/teacher/create')} style={styles.linkBtn}>
            Quick Schedule Class
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Online Lesson Plans</h2>
        <p style={styles.subtitle}>Plan lesson content by school, date, and time slot for ONLINE class groups.</p>

        <form onSubmit={onSubmit}>
          <div style={styles.grid}>
            <div>
              <label style={styles.label}>School</label>
              <select
                style={styles.select}
                value={form.school_id}
                disabled={loadingSchools}
                onChange={(e) => setForm((prev) => ({ ...prev, school_id: e.target.value }))}
              >
                <option value="" style={styles.selectOption}>Select school</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id} style={styles.selectOption}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Time Slot</label>
              <select
                style={styles.select}
                value={form.time_slot_id}
                disabled={!form.school_id || loadingSlots}
                onChange={(e) => setForm((prev) => ({ ...prev, time_slot_id: e.target.value }))}
              >
                <option value="" style={styles.selectOption}>Select time slot</option>
                {timeSlots.map((slot) => (
                  <option key={slot.id} value={slot.id} style={styles.selectOption}>
                    {slot.label}{slot.days ? ` · ${slot.days}` : ''}{slot.start_time ? ` · ${slot.start_time}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Session Date</label>
              <input
                type="date"
                style={styles.input}
                value={form.session_date}
                onChange={(e) => setForm((prev) => ({ ...prev, session_date: e.target.value }))}
              />
            </div>
          </div>

          <div style={styles.topicWrap}>
            <label style={styles.label}>Planned Topic</label>
            <textarea
              style={styles.textarea}
              rows={5}
              value={form.planned_topic}
              onChange={(e) => setForm((prev) => ({ ...prev, planned_topic: e.target.value }))}
              placeholder="Write key topics for this online slot..."
            />
          </div>

          <button type="submit" style={saving ? styles.submitBtnDisabled : styles.submitBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save Online Lesson Plan'}
          </button>
        </form>

        {loadingExisting && <p style={styles.info}>Checking existing plan...</p>}
        {!loadingExisting && existingPlan && (
          <div style={styles.existingBox}>
            <p style={styles.existingTitle}>Existing plan found for this date and slot:</p>
            <p style={styles.existingBody}>{existingPlan.planned_topic || 'No planned topic text saved.'}</p>
          </div>
        )}

        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Manage Online Lesson Plans</h3>
        <p style={styles.subtitle}>Filter by date range and update or delete existing online lesson plans.</p>

        <div style={styles.grid}>
          <div>
            <label style={styles.label}>School</label>
            <select
              style={styles.select}
              value={rangeFilter.school_id}
              disabled={loadingSchools}
              onChange={(e) => setRangeFilter((prev) => ({ ...prev, school_id: e.target.value }))}
            >
              <option value="" style={styles.selectOption}>Select school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id} style={styles.selectOption}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Time Slot (optional)</label>
            <select
              style={styles.select}
              value={rangeFilter.time_slot_id}
              disabled={!rangeFilter.school_id || loadingRangeSlots}
              onChange={(e) => setRangeFilter((prev) => ({ ...prev, time_slot_id: e.target.value }))}
            >
              <option value="" style={styles.selectOption}>All time slots</option>
              {rangeSlots.map((slot) => (
                <option key={slot.id} value={slot.id} style={styles.selectOption}>{slot.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Start Date</label>
            <input
              type="date"
              style={styles.input}
              value={rangeFilter.start_date}
              onChange={(e) => setRangeFilter((prev) => ({ ...prev, start_date: e.target.value }))}
            />
          </div>

          <div>
            <label style={styles.label}>End Date</label>
            <input
              type="date"
              style={styles.input}
              value={rangeFilter.end_date}
              onChange={(e) => setRangeFilter((prev) => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
        </div>

        <div style={styles.actionsRow}>
          <button
            type="button"
            style={loadingRangeRows ? styles.submitBtnDisabled : styles.submitBtn}
            disabled={loadingRangeRows}
            onClick={fetchRangeRows}
          >
            {loadingRangeRows ? 'Fetching...' : 'Fetch Online Lesson Plans'}
          </button>
        </div>

        {rangeError && <p style={styles.error}>{rangeError}</p>}

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Time Slot</th>
                <th style={styles.th}>Planned Topic</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rangeRows.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={4}>No online lesson plans found for selected filter.</td>
                </tr>
              ) : (
                rangeRows.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.td}>{row.session_date}</td>
                    <td style={styles.td}>{row.time_slot_label || '-'}</td>
                    <td style={styles.td}>
                      {editingId === row.id ? (
                        <textarea
                          style={styles.editTextarea}
                          rows={4}
                          value={editedTopic}
                          onChange={(e) => setEditedTopic(e.target.value)}
                        />
                      ) : (
                        <div style={styles.topicText}>{row.planned_topic || '(No topic planned)'}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        {editingId === row.id ? (
                          <>
                            <button
                              type="button"
                              style={styles.smallBtn}
                              disabled={savingId === row.id}
                              onClick={() => saveEdit(row.id)}
                            >
                              {savingId === row.id ? 'Saving...' : 'Save'}
                            </button>
                            <button type="button" style={styles.smallBtnGhost} onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" style={styles.smallBtn} onClick={() => startEdit(row)}>Edit</button>
                        )}
                        <button
                          type="button"
                          style={styles.smallBtnDanger}
                          disabled={deletingId === row.id}
                          onClick={() => deleteRow(row)}
                        >
                          {deletingId === row.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {wizardOpen && (
        <LessonPlanWizard
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onSuccess={() => setMessage('Lesson plans created from unified wizard.')}
          initialTargetMode="online"
          allowTargetToggle={true}
        />
      )}
    </div>
  );
};

const getStyles = ({ isCompact = false } = {}) => {
  const s2 = SPACING[2] || '0.75rem';
  const s3 = SPACING[3] || '1rem';
  const s4 = SPACING[4] || '1.5rem';

  return {
    page: {
      maxWidth: 980,
      margin: '0 auto',
      padding: isCompact ? s3 : s4,
      paddingTop: isCompact ? '4rem' : s4,
    },
    headerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: s2,
      marginBottom: s3,
      flexWrap: 'wrap',
    },
    headerActions: {
      display: 'flex',
      gap: s2,
      flexWrap: 'wrap',
    },
    backBtn: {
      border: 'none',
      background: 'transparent',
      color: COLORS.primary,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      padding: 0,
    },
    linkBtn: {
      border: `1px solid ${COLORS.primary}`,
      background: 'transparent',
      color: COLORS.primary,
      borderRadius: BORDER_RADIUS.full,
      padding: `${s2} ${s3}`,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
    },
    card: {
      ...MIXINS.glassmorphicCard,
      borderRadius: BORDER_RADIUS.xl,
      padding: s4,
    },
    title: {
      margin: 0,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.xl,
      fontWeight: FONT_WEIGHTS.bold,
    },
    subtitle: {
      marginTop: s2,
      marginBottom: s4,
      color: COLORS.text.whiteSubtle,
      fontSize: FONT_SIZES.sm,
    },
    sectionTitle: {
      margin: 0,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold,
    },
    grid: {
      display: 'grid',
      gap: s3,
      gridTemplateColumns: isCompact ? '1fr' : 'repeat(3, minmax(0, 1fr))',
    },
    label: {
      display: 'block',
      marginBottom: s2,
      fontSize: FONT_SIZES.sm,
      color: COLORS.text.white,
      fontWeight: FONT_WEIGHTS.medium,
    },
    input: {
      width: '100%',
      minHeight: 42,
      borderRadius: BORDER_RADIUS.lg,
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.08)',
      color: COLORS.text.white,
      padding: `0 ${s2}`,
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      minHeight: 42,
      borderRadius: BORDER_RADIUS.lg,
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.12)',
      color: '#f2f5ff',
      padding: `0 ${s2}`,
      boxSizing: 'border-box',
      appearance: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      backgroundImage: 'linear-gradient(45deg, transparent 50%, rgba(230,236,255,0.95) 50%), linear-gradient(135deg, rgba(230,236,255,0.95) 50%, transparent 50%)',
      backgroundPosition: 'calc(100% - 18px) calc(50% - 2px), calc(100% - 12px) calc(50% - 2px)',
      backgroundSize: '6px 6px, 6px 6px',
      backgroundRepeat: 'no-repeat',
      paddingRight: 38,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      colorScheme: 'dark',
    },
    selectOption: {
      background: '#2a2152',
      color: '#f2f5ff',
    },
    topicWrap: {
      marginTop: s3,
    },
    textarea: {
      width: '100%',
      borderRadius: BORDER_RADIUS.lg,
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.08)',
      color: COLORS.text.white,
      padding: s2,
      boxSizing: 'border-box',
      resize: 'vertical',
    },
    submitBtn: {
      marginTop: s3,
      border: 'none',
      borderRadius: BORDER_RADIUS.lg,
      background: COLORS.primary,
      color: '#fff',
      padding: `${s2} ${s4}`,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
      minHeight: 44,
    },
    submitBtnDisabled: {
      marginTop: s3,
      border: 'none',
      borderRadius: BORDER_RADIUS.lg,
      background: COLORS.border.light,
      color: COLORS.text.tertiary,
      padding: `${s2} ${s4}`,
      cursor: 'not-allowed',
      fontSize: FONT_SIZES.sm,
      minHeight: 44,
    },
    actionsRow: {
      marginTop: s3,
      marginBottom: s3,
      display: 'flex',
      gap: s2,
      flexWrap: 'wrap',
    },
    tableWrap: {
      marginTop: s2,
      overflowX: 'auto',
      border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: BORDER_RADIUS.lg,
      background: 'rgba(255,255,255,0.04)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: 720,
    },
    th: {
      textAlign: 'left',
      padding: `${s2} ${s3}`,
      fontSize: FONT_SIZES.xs,
      color: COLORS.text.whiteSubtle,
      borderBottom: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
    },
    td: {
      padding: `${s2} ${s3}`,
      fontSize: FONT_SIZES.sm,
      color: COLORS.text.white,
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      verticalAlign: 'top',
    },
    topicText: {
      whiteSpace: 'pre-wrap',
      color: COLORS.text.whiteSubtle,
    },
    editTextarea: {
      width: '100%',
      borderRadius: BORDER_RADIUS.md,
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.1)',
      color: COLORS.text.white,
      padding: s2,
      boxSizing: 'border-box',
      resize: 'vertical',
      minHeight: 110,
    },
    actionBtns: {
      display: 'flex',
      gap: s2,
      flexWrap: 'wrap',
    },
    smallBtn: {
      border: `1px solid ${COLORS.primary}`,
      background: COLORS.primary,
      color: '#fff',
      borderRadius: BORDER_RADIUS.md,
      padding: `${s2} ${s2}`,
      fontSize: FONT_SIZES.xs,
      cursor: 'pointer',
    },
    smallBtnGhost: {
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'transparent',
      color: COLORS.text.white,
      borderRadius: BORDER_RADIUS.md,
      padding: `${s2} ${s2}`,
      fontSize: FONT_SIZES.xs,
      cursor: 'pointer',
    },
    smallBtnDanger: {
      border: `1px solid ${COLORS.status.error}`,
      background: 'transparent',
      color: COLORS.status.error,
      borderRadius: BORDER_RADIUS.md,
      padding: `${s2} ${s2}`,
      fontSize: FONT_SIZES.xs,
      cursor: 'pointer',
    },
    existingBox: {
      marginTop: s3,
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: BORDER_RADIUS.lg,
      padding: s3,
      background: 'rgba(255,255,255,0.06)',
    },
    existingTitle: {
      margin: 0,
      color: COLORS.text.white,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
    },
    existingBody: {
      margin: `${s2} 0 0`,
      color: COLORS.text.whiteSubtle,
      fontSize: FONT_SIZES.sm,
      whiteSpace: 'pre-wrap',
    },
    info: {
      marginTop: s3,
      color: COLORS.text.whiteSubtle,
      fontSize: FONT_SIZES.xs,
    },
    success: {
      marginTop: s3,
      color: COLORS.status.success,
      fontSize: FONT_SIZES.sm,
    },
    error: {
      marginTop: s3,
      color: COLORS.status.error,
      fontSize: FONT_SIZES.sm,
    },
  };
};

export default OnlineLessonPlansPage;
