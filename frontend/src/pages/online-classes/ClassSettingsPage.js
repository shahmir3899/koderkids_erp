// frontend/src/pages/online-classes/ClassSettingsPage.js
// Teacher default preferences for online classes

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../utils/designConstants';

const STORAGE_KEY = 'onlineclass_teacher_prefs';

const loadPrefs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const ClassSettingsPage = () => {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({
    default_recording: false,
    default_chat: true,
    default_screenshare: false,
    default_duration: 60,
    notify_email: true,
    notify_whatsapp: true,
    reminder_minutes: 30,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = loadPrefs();
    if (stored) setPrefs((prev) => ({ ...prev, ...stored }));
  }, []);

  const handleChange = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const styles = getStyles();

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/online-classes/teacher')} style={styles.backLink}>
        ← Back to Classes
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>Class Preferences</h2>
        <p style={styles.subtitle}>These defaults are applied when you create a new class.</p>

        <Section title="Default Session Options">
          <ToggleRow
            label="Enable Recording by Default"
            hint="New classes will have recording turned on"
            checked={prefs.default_recording}
            onChange={(v) => handleChange('default_recording', v)}
          />
          <ToggleRow
            label="Enable Chat by Default"
            hint="New classes will have live chat turned on"
            checked={prefs.default_chat}
            onChange={(v) => handleChange('default_chat', v)}
          />
          <ToggleRow
            label="Allow Student Screen Share by Default"
            hint="Students can share their screen in new classes"
            checked={prefs.default_screenshare}
            onChange={(v) => handleChange('default_screenshare', v)}
          />
        </Section>

        <Section title="Default Duration">
          <div style={styles.selectRow}>
            <label style={styles.fieldLabel}>Default class duration</label>
            <select
              style={styles.select}
              value={prefs.default_duration}
              onChange={(e) => handleChange('default_duration', Number(e.target.value))}
            >
              {[30, 45, 60, 90, 120].map((d) => (
                <option key={d} value={d}>{d} minutes</option>
              ))}
            </select>
          </div>
        </Section>

        <Section title="Notifications">
          <ToggleRow
            label="Email reminders"
            hint="Send an email reminder to enrolled students"
            checked={prefs.notify_email}
            onChange={(v) => handleChange('notify_email', v)}
          />
          <ToggleRow
            label="WhatsApp reminders"
            hint="Send a WhatsApp message to enrolled students"
            checked={prefs.notify_whatsapp}
            onChange={(v) => handleChange('notify_whatsapp', v)}
          />
          <div style={styles.selectRow}>
            <label style={styles.fieldLabel}>Remind students before class</label>
            <select
              style={styles.select}
              value={prefs.reminder_minutes}
              onChange={(e) => handleChange('reminder_minutes', Number(e.target.value))}
            >
              {[10, 15, 30, 60].map((m) => (
                <option key={m} value={m}>{m} minutes before</option>
              ))}
            </select>
          </div>
        </Section>

        <div style={styles.footer}>
          {saved && <span style={styles.savedMsg}>✅ Preferences saved</span>}
          <button onClick={handleSave} style={styles.saveBtn}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div style={{ marginBottom: SPACING[6] }}>
    <p style={{
      fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold,
      color: COLORS.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em',
      margin: `0 0 ${SPACING[3]}`,
    }}>
      {title}
    </p>
    <div style={{ border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

const ToggleRow = ({ label, hint, checked, onChange }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: `${SPACING[4]} ${SPACING[4]}`,
    borderBottom: `1px solid ${COLORS.border.light}`,
  }}>
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
        position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: SPACING[4],
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
  page: { padding: SPACING[6], maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: SPACING[4] },
  backLink: {
    background: 'none', border: 'none', color: COLORS.primary, cursor: 'pointer',
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, padding: 0, alignSelf: 'flex-start',
  },
  card: {
    background: '#fff', borderRadius: BORDER_RADIUS.xl, padding: SPACING[8],
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.primary, margin: 0 },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.text.secondary, margin: `${SPACING[1]} 0 ${SPACING[6]}` },
  selectRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING[3]} ${SPACING[4]}` },
  fieldLabel: { fontSize: FONT_SIZES.sm, color: COLORS.text.primary },
  select: {
    padding: `${SPACING[2]} ${SPACING[3]}`, border: `1px solid ${COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.lg, fontSize: FONT_SIZES.sm, outline: 'none',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: SPACING[4] },
  savedMsg: { fontSize: FONT_SIZES.sm, color: COLORS.status.success },
  saveBtn: {
    background: COLORS.primary, border: 'none', borderRadius: BORDER_RADIUS.lg,
    color: '#fff', padding: `${SPACING[3]} ${SPACING[6]}`,
    fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.sm, cursor: 'pointer',
  },
});

export default ClassSettingsPage;
