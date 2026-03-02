import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useResponsive } from '../hooks/useResponsive';
import { ToggleSwitch } from '../components/common/ui/ToggleSwitch';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
  TRANSITIONS,
} from '../utils/designConstants';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../services/notificationSettingsService';

const NOTIFICATION_CONFIG = [
  {
    section: 'Email Notifications',
    icon: '📧',
    description: 'Emails sent via SMTP to users',
    items: [
      { field: 'email_lead_assignment', label: 'Lead Assignment', desc: 'Email to BDM when a lead is assigned' },
      { field: 'email_lead_reassignment', label: 'Lead Reassignment', desc: 'Email to new BDM when lead is reassigned' },
      { field: 'email_bulk_lead_assignment', label: 'Bulk Lead Assignment', desc: 'Email to each BDM in bulk assignment' },
      { field: 'email_activity_scheduled', label: 'Activity Scheduled', desc: 'Email to BDM when an activity is scheduled' },
      { field: 'email_task_assignment', label: 'Task Assignment', desc: 'Email to assignee when a task is created' },
      { field: 'email_bulk_task_assignment', label: 'Bulk Task Assignment', desc: 'Email to each assignee in bulk task creation' },
      { field: 'email_welcome', label: 'Welcome Email', desc: 'Email to newly created users with login credentials' },
      { field: 'email_password_reset', label: 'Password Reset', desc: 'Email when admin resets a user password' },
      { field: 'email_school_assignment', label: 'School Assignment', desc: 'Email to teacher when assigned to schools' },
      { field: 'email_account_update', label: 'Account Update', desc: 'Email when admin updates a user account' },
      { field: 'email_student_progress', label: 'Student Progress', desc: 'Email to student with session progress image' },
    ],
  },
  {
    section: 'Auto-Scheduled',
    icon: '⏰',
    description: 'Automated notifications on a schedule',
    items: [
      { field: 'email_aging_lead_alert', label: 'Aging Lead Alert (Daily 9 AM)', desc: 'Email to BDMs about stale leads with no recent activity' },
      { field: 'inapp_monthly_report_reminder', label: 'Monthly Report Reminder (28th)', desc: 'In-app reminder to all teachers to submit reports' },
    ],
  },
  {
    section: 'In-App Notifications',
    icon: '🔔',
    description: 'Notifications shown in the bell dropdown',
    items: [
      { field: 'inapp_bdm_creates_lead', label: 'BDM Creates Lead', desc: 'Notify all admins when a BDM creates a new lead' },
      { field: 'inapp_bdm_updates_lead', label: 'BDM Updates Lead', desc: 'Notify all admins when a BDM updates or adds activity to a lead' },
      { field: null, label: 'Manual Notification', desc: 'Admin sends directly via bell icon (always active)', alwaysOn: true },
    ],
  },
];

const NotificationSettingsPage = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getNotificationSettings();
      setSettings(data);
    } catch (error) {
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field, newValue) => {
    const oldValue = settings[field];
    setSettings(prev => ({ ...prev, [field]: newValue }));
    try {
      await updateNotificationSettings({ [field]: newValue });
      toast.success('Setting updated', { autoClose: 1500 });
    } catch (error) {
      setSettings(prev => ({ ...prev, [field]: oldValue }));
      toast.error('Failed to update setting');
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: COLORS.background.gradient,
      padding: isMobile ? SPACING.md : SPACING.xl,
    },
    container: {
      maxWidth: '800px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.xl,
    },
    backButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: BORDER_RADIUS.md,
      color: COLORS.text.white,
      padding: `${SPACING.xs} ${SPACING.sm}`,
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      transition: `background ${TRANSITIONS.normal}`,
    },
    title: {
      fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
      fontWeight: FONT_WEIGHTS.bold,
      color: COLORS.text.white,
      margin: 0,
    },
    subtitle: {
      fontSize: FONT_SIZES.sm,
      color: 'rgba(255, 255, 255, 0.7)',
      margin: 0,
    },
    section: {
      ...MIXINS.glassmorphicCard,
      borderRadius: BORDER_RADIUS.xl,
      padding: isMobile ? SPACING.md : SPACING.lg,
      marginBottom: SPACING.lg,
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
      paddingBottom: SPACING.sm,
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    },
    sectionIcon: {
      fontSize: FONT_SIZES.xl,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semiBold,
      color: COLORS.text.white,
      margin: 0,
    },
    sectionDesc: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(255, 255, 255, 0.5)',
      margin: 0,
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      marginBottom: SPACING.xs,
      transition: `background ${TRANSITIONS.normal}`,
      gap: SPACING.md,
    },
    rowInfo: {
      flex: 1,
      minWidth: 0,
    },
    rowLabel: {
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      color: COLORS.text.white,
      margin: 0,
    },
    rowDesc: {
      fontSize: FONT_SIZES.xs,
      color: 'rgba(255, 255, 255, 0.5)',
      margin: 0,
      marginTop: '2px',
    },
    alwaysOnBadge: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.status.success,
      fontWeight: FONT_WEIGHTS.medium,
      whiteSpace: 'nowrap',
    },
    loadingText: {
      textAlign: 'center',
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: FONT_SIZES.md,
      padding: SPACING['2xl'],
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p style={styles.loadingText}>Loading notification settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p style={styles.loadingText}>Failed to load settings. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => navigate('/settings')}
            onMouseEnter={e => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            ← Back
          </button>
          <div>
            <h1 style={styles.title}>Notification Settings</h1>
            <p style={styles.subtitle}>Control which notifications are sent</p>
          </div>
        </div>

        {NOTIFICATION_CONFIG.map((group) => (
          <div key={group.section} style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>{group.icon}</span>
              <div>
                <h2 style={styles.sectionTitle}>{group.section}</h2>
                <p style={styles.sectionDesc}>{group.description}</p>
              </div>
            </div>

            {group.items.map((item) => (
              <div
                key={item.field || item.label}
                style={styles.row}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              >
                <div style={styles.rowInfo}>
                  <p style={styles.rowLabel}>{item.label}</p>
                  <p style={styles.rowDesc}>{item.desc}</p>
                </div>
                {item.alwaysOn ? (
                  <span style={styles.alwaysOnBadge}>Always On</span>
                ) : (
                  <ToggleSwitch
                    checked={settings[item.field] ?? true}
                    onChange={(val) => handleToggle(item.field, val)}
                    label={item.label}
                    size="medium"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
