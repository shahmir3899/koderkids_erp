// ============================================
// STUDENT DASHBOARD - Koder Kids Design
// Engaging, colorful, gamified interface
// ============================================

import React, { useEffect, useState } from "react";
import axios from "axios";
// Dashboard Components
import {
  StudentDashboardHeader,
  StudentProfileCard,
  StatsRow,
  TodayILearned,
  LearningStreak,
  WeeklyLearning,
  WeeklyGoalCard,
  AttendanceCard,
  AchievementsBadges,
  TeacherNoteCard,
  AskMyRobotCard,
  FeesStatusCard,
  NextClassTimer,
  AnimatedCard,
} from '../components/students/dashboard';

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  LAYOUT,
  MIXINS,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

const StudentDashboard = () => {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();

  // Dashboard data (single API: /api/students/my-data/)
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single fetch — my-data has everything: profile + dashboard data
  useEffect(() => {
    axios.get(`${API_URL}/api/students/my-data/`, { headers: getAuthHeaders() })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Dashboard data error:', err);
        setError("Failed to load data");
        setLoading(false);
      });
  }, []);

  // Handle profile updates (from settings modal)
  const handleProfileUpdate = (updatedProfile) => {
    setData(prev => prev ? { ...prev, ...updatedProfile } : prev);
  };

  const isLoading = loading;

  // Get responsive styles
  const styles = getResponsiveStyles(isMobile, isTablet);

  if (isLoading) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header with Greeting, Logo, Profile, Settings */}
      <StudentDashboardHeader
        profile={data}
        onProfileUpdate={handleProfileUpdate}
        studentClass={data.class}
        isMobile={isMobile}
      />

      {/* Main Content Grid */}
      <div style={styles.mainGrid}>
        {/* Left Column: Profile Card */}
        <div style={styles.leftColumn}>
          <AnimatedCard>
            <StudentProfileCard profile={data} isMobile={isMobile} />
          </AnimatedCard>
        </div>

        {/* Right Column: Stats and Info */}
        <div style={styles.rightColumn}>
          {/* Stats Row: Progress, Activities, Badges */}
          <StatsRow data={data} isMobile={isMobile} />

          {/* Today I Learned + Learning Streak Row */}
          <div style={styles.rowGrid}>
            <AnimatedCard>
              <TodayILearned topics={data.today_learned || []} isMobile={isMobile} />
            </AnimatedCard>
            <AnimatedCard>
              <LearningStreak streakDays={data.learning_streak || 0} isMobile={isMobile} />
            </AnimatedCard>
          </div>
        </div>
      </div>

      {/* Second Section: Weekly Learning + Weekly Goal */}
      <div style={styles.sectionGrid}>
        <AnimatedCard>
          <WeeklyLearning weekData={data.this_week_learning || []} isMobile={isMobile} />
        </AnimatedCard>
        <AnimatedCard>
          <WeeklyGoalCard weeklyAttendance={data.weekly_attendance || {}} isMobile={isMobile} />
        </AnimatedCard>
      </div>

      {/* Third Section: Attendance, Achievements, Ask Robot */}
      <div style={styles.threeColumnGrid}>
        <div style={styles.twoColumnLeft}>
          <AnimatedCard>
            <AttendanceCard percentage={data.attendance_percentage || 0} isMobile={isMobile} />
          </AnimatedCard>
          <AnimatedCard>
            <AchievementsBadges badges={data.badges || []} isMobile={isMobile} />
          </AnimatedCard>
        </div>
        <AskMyRobotCard isMobile={isMobile} />
      </div>

      {/* Teacher Note */}
      <AnimatedCard>
        <TeacherNoteCard note={data.teacher_note} isMobile={isMobile} />
      </AnimatedCard>

      {/* Bottom Row: Fees Status + Next Class Timer */}
      <div style={styles.bottomGrid}>
        <AnimatedCard>
          <FeesStatusCard fees={data.fees || []} isMobile={isMobile} />
        </AnimatedCard>
        <AnimatedCard>
          <NextClassTimer nextClass={data.next_class} isMobile={isMobile} />
        </AnimatedCard>
      </div>
    </div>
  );
};

// ============================================
// RESPONSIVE STYLES GENERATOR
// ============================================
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
    paddingTop: isMobile ? '64px' : isTablet ? '64px' : SPACING.xl,
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
    minHeight: '100vh',
    background: COLORS.background.gradient,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['3xl'],
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `4px solid ${COLORS.primary}`,
    borderTopColor: 'transparent',
    borderRadius: BORDER_RADIUS.full,
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.base,
  },
  errorContainer: {
    padding: SPACING['2xl'],
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.status.error,
    fontSize: FONT_SIZES.base,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr',
    gap: isMobile ? SPACING.lg : SPACING.xl,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: SPACING.md,
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  threeColumnGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  twoColumnLeft: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: SPACING.md,
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginTop: SPACING.md,
  },
});

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default StudentDashboard;
