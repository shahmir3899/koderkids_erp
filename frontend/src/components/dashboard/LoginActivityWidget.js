// ============================================
// LOGIN ACTIVITY WIDGET - Horizontal Scrollable Cards
// Shows student and teacher login counts per school (last 3 working days)
// Working day = day where LessonPlan exists for that school
// ============================================

import React from 'react';
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
  const { data: loginData = [], isLoading, error } = useLoginActivity();

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Login Activity (Last 3 Working Days)</h3>
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
          <h3 style={styles.title}>Login Activity (Last 3 Working Days)</h3>
        </div>
        <div style={styles.errorContainer}>
          <span style={styles.errorIcon}>!</span>
          <span>Failed to load login activity</span>
        </div>
      </div>
    );
  }

  if (!loginData || loginData.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Login Activity (Last 3 Working Days)</h3>
        </div>
        <div style={styles.emptyContainer}>
          <span style={styles.emptyIcon}>-</span>
          <span>No active schools found</span>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totals = loginData.reduce(
    (acc, school) => ({
      students: acc.students + (school.student_logins_3d || 0),
      teachers: acc.teachers + (school.teacher_logins_3d || 0),
    }),
    { students: 0, teachers: 0 }
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Login Activity (Last 3 Days)</h3>
        <div style={styles.totalBadge}>
          <span style={styles.totalItem}>
            <span style={styles.studentIcon}>S</span>
            <span>{totals.students}</span>
          </span>
          <span style={styles.divider}>|</span>
          <span style={styles.totalItem}>
            <span style={styles.teacherIcon}>T</span>
            <span>{totals.teachers}</span>
          </span>
        </div>
      </div>

      <div style={styles.scrollContainer}>
        <div style={styles.cardsRow}>
          {loginData.map((school) => (
            <SchoolLoginCard
              key={school.school_id}
              schoolName={school.school_name}
              studentLogins={school.student_logins_3d}
              teacherLogins={school.teacher_logins_3d}
              isWorkingToday={school.is_working_today}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Individual school card component
const SchoolLoginCard = ({ schoolName, studentLogins, teacherLogins, isWorkingToday }) => {
  // Shorten school name for display
  const displayName = schoolName
    .replace(/School|Campus|System|Branch/gi, '')
    .trim()
    .substring(0, 15);

  const hasActivity = studentLogins > 0 || teacherLogins > 0;

  return (
    <div style={{
      ...styles.card,
      ...(isWorkingToday ? styles.cardGlowing : (hasActivity ? styles.cardActive : styles.cardInactive)),
    }} className={isWorkingToday ? 'glowing-card' : ''}>
      {isWorkingToday && (
        <div style={styles.todayBadge}>TODAY</div>
      )}
      <div style={styles.cardHeader}>
        <span style={styles.schoolName} title={schoolName}>
          {displayName || schoolName.substring(0, 12)}
        </span>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statItem}>
          <span style={styles.studentIcon}>S</span>
          <span style={{
            ...styles.statValue,
            color: studentLogins > 0 ? COLORS.accent.cyan : COLORS.text.whiteSubtle,
          }}>
            {studentLogins}
          </span>
        </div>

        <div style={styles.statItem}>
          <span style={styles.teacherIcon}>T</span>
          <span style={{
            ...styles.statValue,
            color: teacherLogins > 0 ? COLORS.accent.purple : COLORS.text.whiteSubtle,
          }}>
            {teacherLogins}
          </span>
        </div>
      </div>
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
    color: COLORS.text.whiteMedium,
  },
  totalItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  divider: {
    color: COLORS.text.whiteSubtle,
  },
  scrollContainer: {
    overflowX: 'auto',
    overflowY: 'hidden',
    marginLeft: `-${SPACING.sm}`,
    marginRight: `-${SPACING.sm}`,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.sm,
    paddingBottom: SPACING.sm,
    // Hide scrollbar but allow scrolling
    scrollbarWidth: 'thin',
    scrollbarColor: `${COLORS.text.whiteSubtle} transparent`,
  },
  cardsRow: {
    display: 'flex',
    gap: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  card: {
    minWidth: '120px',
    maxWidth: '140px',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default',
    flexShrink: 0,
  },
  cardActive: {
    ...MIXINS.glassmorphicSubtle,
    border: `1px solid rgba(96, 165, 250, 0.3)`,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  cardInactive: {
    ...MIXINS.glassmorphicSubtle,
    opacity: 0.6,
    border: `1px solid rgba(255, 255, 255, 0.1)`,
  },
  cardGlowing: {
    ...MIXINS.glassmorphicSubtle,
    border: `2px solid rgba(34, 211, 238, 0.6)`,
    boxShadow: '0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(34, 211, 238, 0.2), 0 4px 12px rgba(0, 0, 0, 0.2)',
    animation: 'glow-pulse 2s ease-in-out infinite',
    position: 'relative',
  },
  todayBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: COLORS.accent.cyan,
    color: '#0f172a',
    fontSize: '9px',
    fontWeight: FONT_WEIGHTS.bold,
    padding: '2px 6px',
    borderRadius: BORDER_RADIUS.full,
    letterSpacing: '0.5px',
    boxShadow: '0 2px 8px rgba(34, 211, 238, 0.5)',
  },
  cardHeader: {
    marginBottom: SPACING.sm,
    borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
    paddingBottom: SPACING.xs,
  },
  schoolName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: 'Inter, sans-serif',
  },
  studentIcon: {
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
  teacherIcon: {
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

// Add keyframes for glowing animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes glow-pulse {
    0%, 100% {
      box-shadow: 0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(34, 211, 238, 0.2), 0 4px 12px rgba(0, 0, 0, 0.2);
      border-color: rgba(34, 211, 238, 0.6);
    }
    50% {
      box-shadow: 0 0 30px rgba(34, 211, 238, 0.6), 0 0 60px rgba(34, 211, 238, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
      border-color: rgba(34, 211, 238, 0.8);
    }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-login-activity-styles]')) {
  styleSheet.setAttribute('data-login-activity-styles', '');
  document.head.appendChild(styleSheet);
}

export default LoginActivityWidget;
