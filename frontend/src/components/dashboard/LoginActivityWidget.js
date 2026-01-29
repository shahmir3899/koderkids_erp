// ============================================
// LOGIN ACTIVITY WIDGET - Daily Login Stats with School Breakdown
// Shows student and teacher login counts for last 3 days
// Today (top), Yesterday (middle), Previous (bottom)
// Each day shows school-wise breakdown
// ============================================

import React, { useState } from 'react';
import { useLoginActivity } from '../../hooks/queries/useDashboardQuery';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
} from '../../utils/designConstants';

const LoginActivityWidget = () => {
  const { data: loginData, isLoading, error } = useLoginActivity();

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Login Activity (Last 3 Days)</h3>
        </div>
        <div style={styles.loadingContainer}>
          <LoadingSpinner size="small" message="Loading login activity..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Login Activity (Last 3 Days)</h3>
        </div>
        <div style={styles.errorContainer}>
          <span style={styles.errorIcon}>!</span>
          <span>Failed to load login activity</span>
        </div>
      </div>
    );
  }

  if (!loginData || !loginData.totals) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Login Activity (Last 3 Days)</h3>
        </div>
        <div style={styles.emptyContainer}>
          <span style={styles.emptyIcon}>-</span>
          <span>No login data available</span>
        </div>
      </div>
    );
  }

  const { today, yesterday, previous, totals } = loginData;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Login Activity (Last 3 Days)</h3>
        <div style={styles.totalBadge}>
          <span style={styles.totalItem}>
            <span style={styles.studentIconSmall}>S</span>
            <span>{totals.student_logins}</span>
          </span>
          <span style={styles.divider}>|</span>
          <span style={styles.totalItem}>
            <span style={styles.teacherIconSmall}>T</span>
            <span>{totals.teacher_logins}</span>
          </span>
        </div>
      </div>

      <div style={styles.rowsContainer}>
        {/* Today Row */}
        <DayRow
          label={today.label}
          date={today.date}
          studentLogins={today.student_logins}
          teacherLogins={today.teacher_logins}
          schools={today.schools || []}
          isToday={true}
          defaultExpanded={true}
        />

        {/* Yesterday Row */}
        <DayRow
          label={yesterday.label}
          date={yesterday.date}
          studentLogins={yesterday.student_logins}
          teacherLogins={yesterday.teacher_logins}
          schools={yesterday.schools || []}
          isToday={false}
          defaultExpanded={false}
        />

        {/* Previous Day Row */}
        <DayRow
          label={previous.label}
          date={previous.date}
          studentLogins={previous.student_logins}
          teacherLogins={previous.teacher_logins}
          schools={previous.schools || []}
          isToday={false}
          defaultExpanded={false}
        />
      </div>
    </div>
  );
};

// Individual day row component with expandable school breakdown
const DayRow = ({ label, date, studentLogins, teacherLogins, schools, isToday, defaultExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasActivity = studentLogins > 0 || teacherLogins > 0;
  const total = studentLogins + teacherLogins;
  const hasSchools = schools && schools.length > 0;

  // Format date for display (e.g., "Mon, Jan 27")
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Shorten school name for display
  const shortenSchoolName = (name) => {
    return name
      .replace(/School|Campus|System|Branch/gi, '')
      .trim()
      .substring(0, 18) || name.substring(0, 18);
  };

  return (
    <div style={{
      ...styles.dayRowWrapper,
      ...(isToday ? styles.dayRowWrapperToday : (hasActivity ? styles.dayRowWrapperActive : styles.dayRowWrapperInactive)),
    }}>
      {/* Main Row - Clickable to expand */}
      <div
        style={styles.dayRow}
        onClick={() => hasSchools && setIsExpanded(!isExpanded)}
      >
        {/* Day Label */}
        <div style={styles.dayLabelContainer}>
          <div style={styles.dayLabelRow}>
            {hasSchools && (
              <span style={{
                ...styles.expandIcon,
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}>
                ▶
              </span>
            )}
            <span style={{
              ...styles.dayLabel,
              ...(isToday ? styles.dayLabelToday : {}),
            }}>
              {label}
            </span>
          </div>
          <span style={styles.dayDate}>{formattedDate}</span>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          {/* Students */}
          <div style={styles.statBox}>
            <span style={styles.studentIcon}>S</span>
            <span style={{
              ...styles.statValue,
              color: studentLogins > 0 ? '#1e1b4b' : '#4b5563',
            }}>
              {studentLogins}
            </span>
          </div>

          {/* Teachers */}
          <div style={styles.statBox}>
            <span style={styles.teacherIcon}>T</span>
            <span style={{
              ...styles.statValue,
              color: teacherLogins > 0 ? '#1e1b4b' : '#4b5563',
            }}>
              {teacherLogins}
            </span>
          </div>

          {/* Total */}
          <div style={styles.statBoxTotal}>
            <span style={{
              ...styles.totalValue,
              color: total > 0 ? '#1e1b4b' : '#4b5563',
            }}>
              {total}
            </span>
            <span style={styles.statLabel}>Total</span>
          </div>
        </div>
      </div>

      {/* School Breakdown - Expandable */}
      {isExpanded && hasSchools && (
        <div style={styles.schoolsContainer}>
          {schools.map((school) => (
            <div key={school.school_id} style={styles.schoolRow}>
              <span style={styles.schoolName} title={school.school_name}>
                {shortenSchoolName(school.school_name)}
              </span>
              <div style={styles.schoolStats}>
                <span style={styles.schoolStatItem}>
                  <span style={styles.studentIconTiny}>S</span>
                  <span style={{
                    color: school.student_logins > 0 ? '#1e1b4b' : '#4b5563',
                    fontWeight: 600,
                  }}>
                    {school.student_logins}
                  </span>
                </span>
                <span style={styles.schoolStatItem}>
                  <span style={styles.teacherIconTiny}>T</span>
                  <span style={{
                    color: school.teacher_logins > 0 ? '#1e1b4b' : '#4b5563',
                    fontWeight: 600,
                  }}>
                    {school.teacher_logins}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  title: {
    margin: 0,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    fontFamily: 'Inter, sans-serif',
  },
  totalBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.xs} ${SPACING.md}`,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.sm,
    color: '#1e1b4b',
    fontWeight: FONT_WEIGHTS.semibold,
  },
  totalItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  divider: {
    color: COLORS.text.whiteSubtle,
  },
  rowsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  dayRowWrapper: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  dayRowWrapperToday: {
    ...MIXINS.glassmorphicSubtle,
    border: `2px solid rgba(34, 211, 238, 0.5)`,
    boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)',
  },
  dayRowWrapperActive: {
    ...MIXINS.glassmorphicSubtle,
    border: `1px solid rgba(96, 165, 250, 0.3)`,
  },
  dayRowWrapperInactive: {
    ...MIXINS.glassmorphicSubtle,
    opacity: 0.7,
    border: `1px solid rgba(255, 255, 255, 0.1)`,
  },
  dayRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  dayLabelContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: '120px',
  },
  dayLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  expandIcon: {
    fontSize: '10px',
    color: COLORS.text.whiteSubtle,
    transition: 'transform 0.2s ease',
  },
  dayLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  dayLabelToday: {
    color: COLORS.accent.cyan,
  },
  dayDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    marginLeft: '18px',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statBoxTotal: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '50px',
    paddingLeft: SPACING.md,
    borderLeft: `1px solid rgba(255, 255, 255, 0.1)`,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: 'Inter, sans-serif',
    minWidth: '30px',
    textAlign: 'center',
  },
  totalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: 'Inter, sans-serif',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  // School breakdown styles
  schoolsContainer: {
    borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
    padding: `${SPACING.sm} ${SPACING.md}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  schoolRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
  },
  schoolName: {
    color: COLORS.text.whiteMedium,
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  schoolStats: {
    display: 'flex',
    gap: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  schoolStatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  // Icons
  studentIcon: {
    width: '24px',
    height: '24px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    color: COLORS.accent.cyan,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  studentIconSmall: {
    width: '20px',
    height: '20px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    color: COLORS.accent.cyan,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  studentIconTiny: {
    width: '16px',
    height: '16px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    color: COLORS.accent.cyan,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: FONT_WEIGHTS.bold,
  },
  teacherIcon: {
    width: '24px',
    height: '24px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    color: COLORS.accent.purple,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  teacherIconSmall: {
    width: '20px',
    height: '20px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    color: COLORS.accent.purple,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  teacherIconTiny: {
    width: '16px',
    height: '16px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    color: COLORS.accent.purple,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: FONT_WEIGHTS.bold,
  },
  // Loading/Error/Empty states
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    color: COLORS.status.error,
    justifyContent: 'center',
  },
  errorIcon: {
    width: '24px',
    height: '24px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: FONT_WEIGHTS.bold,
  },
  emptyContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    color: COLORS.text.whiteSubtle,
    justifyContent: 'center',
  },
  emptyIcon: {
    width: '24px',
    height: '24px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default LoginActivityWidget;
