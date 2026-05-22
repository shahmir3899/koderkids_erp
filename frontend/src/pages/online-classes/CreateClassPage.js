// frontend/src/pages/online-classes/CreateClassPage.js
// Teacher: schedule a new session or edit an existing one

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';
import {
  createBulkSessions,
  createSession,
  getSession,
  updateSession,
  getEligibleStudents,
  getLessonSuggestion,
} from '../../services/onlineClassService';
import { API_URL, getAuthHeaders } from '../../api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];
const STANDARD_WIZARD_STEPS = ['Basics', 'Scheduling', 'Options'];
const BULK_WIZARD_STEPS = ['Basics', 'Scheduling', 'Preview', 'Options'];

const CreateClassPage = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams(); // set when editing
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const isEditing = Boolean(sessionId);
  const role = localStorage.getItem('role') || '';
  const [bulkMode, setBulkMode] = useState(false);

  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    school: '',
    teacher: '',
    time_slot: '',
    selected_student_ids: [],
    scheduled_at: '',
    duration_mins: 60,
    is_recurring: false,
    recurrence_days: [],
    recording_enabled: false,
    chat_enabled: true,
    screenshare_student_allowed: false,
    bulk_start_date: '',
    bulk_time: '',
    bulk_classes_count: 8,
    bulk_weekdays: ['Mon', 'Wed'],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolHint, setSchoolHint] = useState('');
  const [wizardStep, setWizardStep] = useState(1);
  const [bulkPreview, setBulkPreview] = useState({ loading: false, error: '', dates: [], count: 0 });
  const [titleTouched, setTitleTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [lessonSuggestion, setLessonSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const isBulkCreateMode = !isEditing && bulkMode;
  const wizardSteps = isBulkCreateMode ? BULK_WIZARD_STEPS : STANDARD_WIZARD_STEPS;

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

  // Admin-only: load teachers for selected school
  useEffect(() => {
    if (role !== 'Admin' || !form.school) {
      setTeachers([]);
      return;
    }

    setLoadingTeachers(true);
    fetch(`${API_URL}/api/users/?role=Teacher&school=${form.school}&is_active=true`, {
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setTeachers(list);
      })
      .catch(() => setTeachers([]))
      .finally(() => setLoadingTeachers(false));
  }, [role, form.school]);

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
          teacher: session.teacher || '',
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

  useEffect(() => {
    setWizardStep((prev) => Math.min(prev, wizardSteps.length));
  }, [wizardSteps.length]);

  useEffect(() => {
    if (!isBulkCreateMode) {
      setBulkPreview({ loading: false, error: '', dates: [], count: 0 });
    }
  }, [isBulkCreateMode]);

  const getSessionDateForSuggestion = () => {
    if (!form.school) return '';
    if (!bulkMode && form.scheduled_at) {
      return form.scheduled_at.slice(0, 10);
    }
    if (bulkMode && form.bulk_start_date) {
      return form.bulk_start_date;
    }
    return '';
  };

  const deriveSelectedStudentsClass = () => {
    if (!form.selected_student_ids.length || !students.length) return '';
    const selected = students.filter((s) => form.selected_student_ids.includes(s.id));
    if (!selected.length) return '';
    const classSet = new Set(selected.map((s) => (s.student_class || '').trim()).filter(Boolean));
    return classSet.size === 1 ? Array.from(classSet)[0] : '';
  };

  useEffect(() => {
    const sessionDate = getSessionDateForSuggestion();
    if (!form.school || !sessionDate) {
      setLessonSuggestion(null);
      return;
    }

    const studentClass = deriveSelectedStudentsClass();
    const params = {
      school_id: form.school,
      session_date: sessionDate,
      ...(form.time_slot ? { time_slot_id: form.time_slot } : {}),
      ...(studentClass ? { student_class: studentClass } : {}),
    };

    setLoadingSuggestion(true);
    getLessonSuggestion(params)
      .then((res) => {
        const suggestion = res?.suggestion || null;
        setLessonSuggestion(suggestion);

        if (!suggestion) return;
        setForm((prev) => ({
          ...prev,
          title: (!titleTouched && !prev.title.trim() && suggestion.title) ? suggestion.title : prev.title,
          description: (!descriptionTouched && !prev.description.trim() && suggestion.description) ? suggestion.description : prev.description,
        }));
      })
      .catch(() => setLessonSuggestion(null))
      .finally(() => setLoadingSuggestion(false));
  }, [
    form.school,
    form.time_slot,
    form.scheduled_at,
    form.bulk_start_date,
    form.selected_student_ids,
    students,
    bulkMode,
    titleTouched,
    descriptionTouched,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyLessonSuggestion = () => {
    if (!lessonSuggestion) return;
    setForm((prev) => ({
      ...prev,
      title: lessonSuggestion.title || prev.title,
      description: lessonSuggestion.description || prev.description,
    }));
  };

  const buildCommonPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    school: form.school,
    ...(role === 'Admin' && form.teacher ? { teacher: form.teacher } : {}),
    time_slot: form.time_slot || null,
    selected_student_ids: form.selected_student_ids,
    duration_mins: form.duration_mins,
    recording_enabled: form.recording_enabled,
    chat_enabled: form.chat_enabled,
    screenshare_student_allowed: form.screenshare_student_allowed,
  });

  const buildBulkPayload = (dryRun = false) => ({
    ...buildCommonPayload(),
    is_recurring: false,
    recurrence_rule: '',
    bulk_start_date: form.bulk_start_date,
    bulk_time: form.bulk_time,
    bulk_classes_count: Number(form.bulk_classes_count),
    bulk_weekdays: form.bulk_weekdays,
    ...(dryRun ? { dry_run: true } : {}),
  });

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.school) e.school = 'Please select a school';
    if (bulkMode && !isEditing) {
      if (!form.bulk_start_date) e.bulk_start_date = 'Start date is required';
      if (!form.bulk_time) e.bulk_time = 'Time is required';
      if (!form.bulk_classes_count || Number(form.bulk_classes_count) < 1) {
        e.bulk_classes_count = 'Classes count must be at least 1';
      }
      if (!form.bulk_weekdays || form.bulk_weekdays.length === 0) {
        e.bulk_weekdays = 'Select at least one weekday';
      }
    }
    if (!bulkMode && !form.scheduled_at) e.scheduled_at = 'Date and time is required';
    if (!bulkMode && form.is_recurring && form.recurrence_days.length === 0) {
      e.recurrence_days = 'Select at least one day';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep = (step) => {
    const e = {};

    if (step === 1) {
      if (!form.title.trim()) e.title = 'Title is required';
      if (!form.school) e.school = 'Please select a school';
    }

    if (step === 2) {
      if (bulkMode && !isEditing) {
        if (!form.bulk_start_date) e.bulk_start_date = 'Start date is required';
        if (!form.bulk_time) e.bulk_time = 'Time is required';
        if (!form.bulk_classes_count || Number(form.bulk_classes_count) < 1) {
          e.bulk_classes_count = 'Classes count must be at least 1';
        }
        if (!form.bulk_weekdays || form.bulk_weekdays.length === 0) {
          e.bulk_weekdays = 'Select at least one weekday';
        }
      }

      if (!bulkMode && !form.scheduled_at) e.scheduled_at = 'Date and time is required';
      if (!bulkMode && form.is_recurring && form.recurrence_days.length === 0) {
        e.recurrence_days = 'Select at least one day';
      }
    }

    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  };

  const handleNextStep = async () => {
    if (!validateStep(wizardStep)) return;

    if (isBulkCreateMode && wizardStep === 2) {
      setBulkPreview({ loading: true, error: '', dates: [], count: 0 });
      try {
        const preview = await createBulkSessions(buildBulkPayload(true));
        const generatedDates = Array.isArray(preview?.generated_dates) ? preview.generated_dates : [];
        setBulkPreview({
          loading: false,
          error: '',
          dates: generatedDates,
          count: Number(preview?.count || generatedDates.length || 0),
        });
      } catch (err) {
        setBulkPreview({ loading: false, error: err.message, dates: [], count: 0 });
        setErrors((prev) => ({ ...prev, submit: err.message }));
        return;
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.submit;
      return next;
    });

    setWizardStep((prev) => Math.min(prev + 1, wizardSteps.length));
  };

  const handlePrevStep = () => {
    setWizardStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      if (isBulkCreateMode) {
        await createBulkSessions(buildBulkPayload(false));
      } else {
        const parsedScheduledAt = new Date(form.scheduled_at);
        if (Number.isNaN(parsedScheduledAt.getTime())) {
          setErrors((prev) => ({ ...prev, scheduled_at: 'Date and time is required' }));
          setSubmitting(false);
          return;
        }

        const payload = {
          ...buildCommonPayload(),
          scheduled_at: parsedScheduledAt.toISOString(),
          is_recurring: form.is_recurring,
          recurrence_rule: form.is_recurring ? `weekly:${form.recurrence_days.join(',')}` : '',
        };

        if (isEditing) {
          await updateSession(sessionId, payload);
        } else {
          await createSession(payload);
        }
      }
      navigate('/online-classes/teacher');
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message }));
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

  const toggleBulkDay = (day) => {
    setForm((prev) => ({
      ...prev,
      bulk_weekdays: prev.bulk_weekdays.includes(day)
        ? prev.bulk_weekdays.filter((d) => d !== day)
        : [...prev.bulk_weekdays, day],
    }));
  };

  const styles = getStyles({ isMobile, isCompact });

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/online-classes/teacher')} style={styles.backLink}>
        ← Back to Classes
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>{isEditing ? 'Edit Class' : 'Schedule New Class'}</h2>

        <div style={styles.wizardHeader}>
          {wizardSteps.map((label, idx) => {
            const stepNum = idx + 1;
            const active = stepNum === wizardStep;
            const done = stepNum < wizardStep;

            return (
              <div key={label} style={styles.wizardStepWrap}>
                <div style={{ ...styles.wizardStepDot, ...(done ? styles.wizardStepDotDone : {}), ...(active ? styles.wizardStepDotActive : {}) }}>
                  {stepNum}
                </div>
                <span style={{ ...styles.wizardStepLabel, ...(active ? styles.wizardStepLabelActive : {}) }}>{label}</span>
              </div>
            );
          })}
        </div>
        <p style={styles.wizardMeta}>Step {wizardStep} of {wizardSteps.length}</p>

        {!isEditing && (
          <div style={styles.modeToggle}>
            <button
              type="button"
              onClick={() => setBulkMode(false)}
              style={bulkMode ? styles.modeBtn : styles.modeBtnActive}
            >
              Single Session
            </button>
            <button
              type="button"
              onClick={() => setBulkMode(true)}
              style={bulkMode ? styles.modeBtnActive : styles.modeBtn}
            >
              Bulk Monthly Plan
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {wizardStep === 1 && (
            <>
              <div style={styles.compactGrid}>
                <div>
                  <Field label="Class Title *" error={errors.title}>
                    <input
                      style={errors.title ? styles.inputError : styles.input}
                      value={form.title}
                      onChange={(e) => {
                        setTitleTouched(true);
                        setForm({ ...form, title: e.target.value });
                      }}
                      placeholder="e.g. Introduction to Python"
                      maxLength={200}
                    />
                  </Field>
                </div>

                <div>
                  <Field label="School *" error={errors.school}>
                    <select
                      style={errors.school ? styles.selectError : styles.select}
                      value={form.school}
                      onChange={(e) => setForm({ ...form, school: e.target.value })}
                      disabled={loadingSchools}
                    >
                      <option value="" style={styles.selectOption}>- Select School -</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id} style={styles.selectOption}>{s.name}</option>
                      ))}
                    </select>
                    {schoolHint ? <p style={styles.schoolHint}>{schoolHint}</p> : null}
                  </Field>
                </div>

                {role === 'Admin' && (
                  <div>
                    <Field label="Teacher (optional)">
                      <select
                        style={styles.select}
                        value={form.teacher}
                        onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                        disabled={!form.school || loadingTeachers}
                      >
                        <option value="" style={styles.selectOption}>- Keep session under my account -</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id} style={styles.selectOption}>
                            {(t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.username)}
                          </option>
                        ))}
                      </select>
                      {loadingTeachers && <p style={styles.schoolHint}>Loading teachers...</p>}
                    </Field>
                  </div>
                )}

                <div style={styles.gridFull}>
                  <Field label="Description">
                    <textarea
                      style={styles.textarea}
                      value={form.description}
                      onChange={(e) => {
                        setDescriptionTouched(true);
                        setForm({ ...form, description: e.target.value });
                      }}
                      placeholder="What will students learn in this class?"
                      rows={3}
                    />
                  </Field>
                  {loadingSuggestion && <p style={styles.schoolHint}>Checking lesson suggestion...</p>}
                  {!loadingSuggestion && lessonSuggestion && (
                    <div style={styles.suggestionBox}>
                      <p style={styles.suggestionText}>
                        Suggestion found from {lessonSuggestion.scope === 'ONLINE_TIMESLOT' ? 'online time-slot lesson plan' : 'class lesson plan'}.
                      </p>
                      <button type="button" style={styles.suggestionBtn} onClick={applyLessonSuggestion}>
                        Apply Lesson Suggestion
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <div style={styles.compactGrid}>
                <div>
                  <Field label="Time Slot">
                    <select
                      style={styles.select}
                      value={form.time_slot}
                      onChange={(e) => setForm({ ...form, time_slot: e.target.value, selected_student_ids: [] })}
                      disabled={loadingSlots || !form.school}
                    >
                      <option value="" style={styles.selectOption}>- Select Time Slot (optional) -</option>
                      {timeSlots.map((s) => (
                        <option key={s.id} value={s.id} style={styles.selectOption}>
                          {s.label}{s.days ? ` · ${s.days}` : ''}{s.start_time ? ` · ${s.start_time}` : ''}
                        </option>
                      ))}
                    </select>
                    {loadingSlots && <p style={styles.schoolHint}>Loading time slots...</p>}
                  </Field>
                </div>

                {!bulkMode && (
                  <div>
                    <Field label="Date & Time *" error={errors.scheduled_at}>
                      <input
                        type="datetime-local"
                        style={errors.scheduled_at ? styles.inputError : styles.input}
                        value={form.scheduled_at}
                        onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                      />
                    </Field>
                  </div>
                )}

                {bulkMode && !isEditing && (
                  <>
                    <div>
                      <Field label="Bulk Start Date *" error={errors.bulk_start_date}>
                        <input
                          type="date"
                          style={errors.bulk_start_date ? styles.inputError : styles.input}
                          value={form.bulk_start_date}
                          onChange={(e) => setForm({ ...form, bulk_start_date: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div>
                      <Field label="Class Time *" error={errors.bulk_time}>
                        <input
                          type="time"
                          style={errors.bulk_time ? styles.inputError : styles.input}
                          value={form.bulk_time}
                          onChange={(e) => setForm({ ...form, bulk_time: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div>
                      <Field label="Classes to Create *" error={errors.bulk_classes_count}>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          style={errors.bulk_classes_count ? styles.inputError : styles.input}
                          value={form.bulk_classes_count}
                          onChange={(e) => setForm({ ...form, bulk_classes_count: e.target.value })}
                        />
                      </Field>
                    </div>
                  </>
                )}

                <div>
                  <Field label="Duration">
                    <select
                      style={styles.select}
                      value={form.duration_mins}
                      onChange={(e) => setForm({ ...form, duration_mins: Number(e.target.value) })}
                    >
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d} value={d} style={styles.selectOption}>{d} minutes</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {form.school && (
                <Field label="Invite Students (Eligible subtypes)">
                  {loadingStudents ? (
                    <p style={styles.schoolHint}>Loading students...</p>
                  ) : students.length === 0 ? (
                    <p style={styles.schoolHint}>
                      {form.time_slot
                        ? 'No eligible students found in this time slot.'
                        : 'No active eligible students found for this school.'}
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

              {bulkMode && !isEditing && (
                <div style={styles.gridFull}>
                  <Field label="Repeat on Weekdays *" error={errors.bulk_weekdays}>
                    <div style={styles.dayPicker}>
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleBulkDay(day)}
                          style={form.bulk_weekdays.includes(day) ? styles.dayBtnActive : styles.dayBtn}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {!bulkMode && (
                <>
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
                </>
              )}
            </>
          )}

          {isBulkCreateMode && wizardStep === 3 && (
            <>
              <div style={styles.previewBox}>
                <p style={styles.reviewTitle}>Generated Sessions Preview</p>
                {bulkPreview.loading && <p style={styles.previewHint}>Generating preview...</p>}
                {!bulkPreview.loading && bulkPreview.error && (
                  <p style={styles.submitError}>{bulkPreview.error}</p>
                )}
                {!bulkPreview.loading && !bulkPreview.error && (
                  <>
                    <p style={styles.previewHint}>This will create {bulkPreview.count} sessions.</p>
                    {bulkPreview.dates.length > 0 ? (
                      <div style={styles.previewList}>
                        {bulkPreview.dates.map((iso) => (
                          <p key={iso} style={styles.previewItem}>
                            {new Date(iso).toLocaleString('en-PK', {
                              weekday: 'short', day: 'numeric', month: 'short',
                              year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p style={styles.previewHint}>No preview sessions generated.</p>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {wizardStep === wizardSteps.length && (
            <>
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

              <div style={styles.reviewBox}>
                <p style={styles.reviewTitle}>Quick Review</p>
                <p style={styles.reviewLine}><strong>Title:</strong> {form.title || '-'}</p>
                <p style={styles.reviewLine}><strong>School:</strong> {schools.find((s) => String(s.id) === String(form.school))?.name || '-'}</p>
                <p style={styles.reviewLine}><strong>Mode:</strong> {bulkMode ? 'Bulk Monthly Plan' : 'Single Session'}</p>
              </div>
            </>
          )}

          {errors.submit && <p style={styles.submitError}>{errors.submit}</p>}

          <div style={styles.formActions}>
            {wizardStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                style={styles.prevBtn}
              >
                Previous
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/online-classes/teacher')}
              style={styles.cancelBtn}
            >
              Cancel
            </button>

            {wizardStep < wizardSteps.length ? (
              <button type="button" onClick={handleNextStep} style={styles.nextBtn}>Next</button>
            ) : (
              <button type="submit" disabled={submitting} style={submitting ? styles.submitBtnDisabled : styles.submitBtn}>
                {submitting ? 'Saving...' : isEditing ? 'Update Class' : bulkMode ? 'Create Bulk Classes' : 'Schedule Class'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }) => {
  const s1 = SPACING[1] || SPACING.xs || '0.25rem';
  const s3 = SPACING[3] || SPACING.lg || '1rem';

  return (
  <div style={{ marginBottom: s3 }}>
    <label style={{
      display: 'block', fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium,
      color: 'rgba(238, 242, 255, 0.9)', marginBottom: s1,
    }}>
      {label}
    </label>
    {children}
    {error && <p style={{ color: COLORS.status.error, fontSize: FONT_SIZES.xs, margin: `${s1} 0 0` }}>{error}</p>}
  </div>
  );
};

const ToggleRow = ({ label, hint, checked, onChange }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      marginBottom: 8,
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.08)',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: '#f5f8ff' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: FONT_SIZES.xs, color: 'rgba(230,236,255,0.74)' }}>{hint}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.24)',
        cursor: 'pointer',
        background: checked
          ? 'linear-gradient(135deg, #bb74ea, #9a58cb)'
          : 'rgba(255,255,255,0.26)',
        position: 'relative',
        transition: 'all 0.18s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.18s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  </div>
);

const getStyles = ({ isMobile = false, isCompact = false } = {}) => {
  const s1 = SPACING[1] || SPACING.xs || '0.25rem';
  const s2 = SPACING[2] || SPACING.md || '0.75rem';
  const s3 = SPACING[3] || SPACING.lg || '1rem';
  const s4 = SPACING[4] || SPACING.xl || '1.5rem';
  const s6 = SPACING[6] || SPACING['2xl'] || '2rem';
  const s8 = SPACING[8] || SPACING['3xl'] || '3rem';

  return {
  page: {
    padding: isCompact ? s2 : s4,
    paddingTop: isCompact ? s8 : s4,
    maxWidth: 1080,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: s3,
  },
  backLink: {
    background: 'none', border: 'none', color: COLORS.primary, cursor: 'pointer',
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, padding: 0, alignSelf: 'flex-start',
  },
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isCompact ? s3 : s4,
    boxShadow: '0 14px 36px rgba(63, 46, 132, 0.14)',
  },
  title: {
    fontSize: isCompact ? FONT_SIZES.lg : FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: `0 0 ${s2}`,
  },
  wizardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s1,
    marginBottom: s1,
    padding: `${s1} ${s2}`,
    borderRadius: BORDER_RADIUS.lg,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.14)',
    overflowX: isCompact ? 'auto' : 'visible',
    WebkitOverflowScrolling: 'touch',
  },
  wizardStepWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: s1,
    minWidth: 0,
    flex: isCompact ? '0 0 auto' : 1,
  },
  wizardStepDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.2)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.75)',
    background: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  wizardStepDotActive: {
    border: `1px solid ${COLORS.primary}`,
    background: COLORS.primary,
    color: '#fff',
  },
  wizardStepDotDone: {
    border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(255,255,255,0.22)',
    color: '#fff',
  },
  wizardStepLabel: {
    fontSize: isCompact ? '11px' : FONT_SIZES.xs,
    color: 'rgba(235,240,255,0.68)',
    fontWeight: FONT_WEIGHTS.medium,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  wizardStepLabelActive: {
    color: '#fff',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  wizardMeta: {
    margin: `0 0 ${s3}`,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(230,236,255,0.72)',
  },
  compactGrid: {
    display: 'grid',
    gridTemplateColumns: isCompact ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: s2,
    alignItems: 'start',
  },
  gridFull: {
    gridColumn: '1 / -1',
  },
  modeToggle: {
    display: 'flex',
    gap: s2,
    marginBottom: s3,
    flexWrap: 'wrap',
    flexDirection: isMobile ? 'column' : 'row',
  },
  modeBtn: {
    padding: `${s1} ${s3}`,
    borderRadius: BORDER_RADIUS.full,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.08)',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    cursor: 'pointer',
    minHeight: 42,
    width: isMobile ? '100%' : 'auto',
  },
  modeBtnActive: {
    padding: `${s1} ${s3}`,
    borderRadius: BORDER_RADIUS.full,
    border: `1px solid ${COLORS.primary}`,
    background: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: FONT_WEIGHTS.semibold,
    minHeight: 42,
    width: isMobile ? '100%' : 'auto',
  },
  input: {
    width: '100%', padding: `${s2} ${s3}`, border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm, color: COLORS.text.white,
    background: 'rgba(255,255,255,0.1)', boxSizing: 'border-box', outline: 'none', minHeight: 44,
  },
  inputError: {
    width: '100%', padding: `${s2} ${s3}`, border: `1px solid ${COLORS.status.error}`,
    borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm, color: COLORS.text.white,
    background: 'rgba(255,255,255,0.1)', boxSizing: 'border-box', outline: 'none', minHeight: 44,
  },
  select: {
    width: '100%',
    padding: `${s2} ${s3}`,
    border: '1px solid rgba(255,255,255,0.24)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    color: '#f2f5ff',
    background: 'rgba(255,255,255,0.12)',
    boxSizing: 'border-box',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: 'linear-gradient(45deg, transparent 50%, rgba(230,236,255,0.95) 50%), linear-gradient(135deg, rgba(230,236,255,0.95) 50%, transparent 50%)',
    backgroundPosition: 'calc(100% - 18px) calc(50% - 2px), calc(100% - 12px) calc(50% - 2px)',
    backgroundSize: '6px 6px, 6px 6px',
    backgroundRepeat: 'no-repeat',
    paddingRight: 38,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    minHeight: 44,
  },
  selectError: {
    width: '100%',
    padding: `${s2} ${s3}`,
    border: `1px solid ${COLORS.status.error}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    color: '#f2f5ff',
    background: 'rgba(255,255,255,0.12)',
    boxSizing: 'border-box',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: 'linear-gradient(45deg, transparent 50%, rgba(230,236,255,0.95) 50%), linear-gradient(135deg, rgba(230,236,255,0.95) 50%, transparent 50%)',
    backgroundPosition: 'calc(100% - 18px) calc(50% - 2px), calc(100% - 12px) calc(50% - 2px)',
    backgroundSize: '6px 6px, 6px 6px',
    backgroundRepeat: 'no-repeat',
    paddingRight: 38,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    minHeight: 44,
  },
  selectOption: {
    background: '#2a2152',
    color: '#f2f5ff',
  },
  textarea: {
    width: '100%', padding: `${s2} ${s3}`, border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm, color: COLORS.text.white,
    background: 'rgba(255,255,255,0.1)', boxSizing: 'border-box', resize: 'vertical', outline: 'none',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: s2, marginBottom: s2, flexWrap: 'wrap' },
  checkLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.text.white, cursor: 'pointer' },
  dayPicker: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: s2,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  dayBtn: {
    minWidth: 52,
    padding: `${s1} ${s2}`,
    borderRadius: BORDER_RADIUS.full,
    border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)',
    fontSize: FONT_SIZES.sm, cursor: 'pointer', color: COLORS.text.whiteSubtle,
    textAlign: 'center',
    minHeight: 38,
  },
  dayBtnActive: {
    minWidth: 52,
    padding: `${s1} ${s2}`,
    borderRadius: BORDER_RADIUS.full,
    border: `1px solid ${COLORS.primary}`, background: COLORS.primary,
    fontSize: FONT_SIZES.sm, cursor: 'pointer', color: '#fff', fontWeight: FONT_WEIGHTS.semibold,
    textAlign: 'center',
    minHeight: 38,
  },
  permissionsSection: {
    marginTop: s3,
    marginBottom: s3,
    padding: `${s3} ${s3}`,
    borderRadius: BORDER_RADIUS.xl,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.06)',
  },
  previewBox: {
    marginTop: s3,
    marginBottom: s3,
    padding: `${s3} ${s3}`,
    borderRadius: BORDER_RADIUS.xl,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
  },
  previewHint: {
    margin: `${s1} 0 ${s2}`,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(230,236,255,0.78)',
  },
  previewList: {
    marginTop: s2,
    display: 'grid',
    gap: s1,
  },
  previewItem: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#f3f6ff',
    marginBottom: s2,
  },
  formActions: {
    display: 'flex',
    gap: s2,
    marginTop: s3,
    paddingTop: s3,
    borderTop: '1px solid rgba(255,255,255,0.16)',
    flexWrap: 'wrap',
    flexDirection: isCompact ? 'column' : 'row',
  },
  prevBtn: {
    flex: 1,
    padding: `${s3} ${s4}`,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    color: COLORS.text.white,
    minHeight: 48,
  },
  cancelBtn: {
    flex: 1, padding: `${s3} ${s4}`, background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)', borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm, cursor: 'pointer', color: COLORS.text.white, minHeight: 48,
  },
  nextBtn: {
    flex: 1,
    padding: `${s3} ${s4}`,
    background: 'linear-gradient(135deg, #bb74ea, #9a58cb)',
    border: '1px solid rgba(176,97,206,0.45)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
    cursor: 'pointer',
    minHeight: 48,
  },
  submitBtn: {
    flex: 1, padding: `${s3} ${s4}`, background: COLORS.primary,
    border: 'none', borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold, color: '#fff', cursor: 'pointer', minHeight: 48,
  },
  submitBtnDisabled: {
    flex: 1, padding: `${s3} ${s4}`, background: COLORS.border.light,
    border: 'none', borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary, cursor: 'not-allowed', minHeight: 48,
  },
  schoolHint: {
    margin: `${s1} 0 0`,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  suggestionBox: {
    marginTop: s2,
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.md,
    padding: `${s2} ${s3}`,
    background: 'rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s2,
    flexWrap: 'wrap',
  },
  suggestionText: {
    margin: 0,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.xs,
  },
  suggestionBtn: {
    border: `1px solid ${COLORS.primary}`,
    borderRadius: BORDER_RADIUS.full,
    padding: `${s1} ${s2}`,
    background: 'transparent',
    color: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    cursor: 'pointer',
    minHeight: 32,
  },
  studentList: {
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.lg,
    padding: s3,
    background: 'rgba(255,255,255,0.06)',
    maxHeight: 170,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: s2,
  },
  studentCheckRow: {
    display: 'flex',
    alignItems: 'center',
    gap: s2,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    cursor: 'pointer',
  },
  studentId: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginLeft: s1,
  },
  submitError: { color: COLORS.status.error, fontSize: FONT_SIZES.sm, textAlign: 'center' },
  reviewBox: {
    marginTop: s1,
    padding: s2,
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.08)',
  },
  reviewTitle: {
    margin: `0 0 ${s2}`,
    fontSize: FONT_SIZES.sm,
    color: '#f4f7ff',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  reviewLine: {
    margin: `${s1} 0`,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(235,240,255,0.84)',
  },
};
};

export default CreateClassPage;
