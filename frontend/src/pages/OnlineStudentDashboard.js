// ============================================
// ONLINE STUDENT DASHBOARD
// Dedicated dashboard for ONLINE subtype students
// Focused on book progress, LMS activity, and fees
// ============================================

import React, { useEffect, useState } from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../utils/designConstants';
import { useResponsive } from '../hooks/useResponsive';
import { getOnlineDashboard } from '../services/onlineStudentDashboardService';

// Online dashboard components
import OnlineDashboardHeader from '../components/students/online-dashboard/OnlineDashboardHeader';
import ContinueLearningBanner from '../components/students/online-dashboard/ContinueLearningBanner';
import BookProgressCard from '../components/students/online-dashboard/BookProgressCard';
import LearningStreakCard from '../components/students/online-dashboard/LearningStreakCard';
import RecentActivityList from '../components/students/online-dashboard/RecentActivityList';
import QuizScoresCard from '../components/students/online-dashboard/QuizScoresCard';

// Reuse existing components from the ONSITE dashboard
import FeesStatusCard from '../components/students/dashboard/FeesStatusCard';
import AchievementsBadges from '../components/students/dashboard/AchievementsBadges';

const OnlineStudentDashboard = () => {
  const { isMobile, isTablet } = useResponsive();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getOnlineDashboard()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Online dashboard error:', err);
        setError('Failed to load your dashboard. Please try again.');
        setLoading(false);
      });
  }, []);

  const styles = getStyles(isMobile, isTablet);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.centered}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.page}>
        <div style={styles.centered}>
          <p style={styles.errorText}>{error || 'No data available.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Decorative background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.container}>
        {/* Header */}
        <OnlineDashboardHeader student={data.student} isMobile={isMobile} />

        {/* Continue Learning Banner - full width */}
        <ContinueLearningBanner continueLearning={data.continue_learning} />

        {/* Main grid: left column + right column */}
        <div style={styles.grid}>
          {/* Left column */}
          <div style={styles.leftCol}>
            <BookProgressCard books={data.enrolled_books} isMobile={isMobile} />
            <RecentActivityList activities={data.recent_activity} />
          </div>

          {/* Right column */}
          <div style={styles.rightCol}>
            <LearningStreakCard learningStreak={data.learning_streak} isMobile={isMobile} />
            <QuizScoresCard quizzes={data.recent_quizzes} />
            <FeesStatusCard fees={data.fees} isMobile={isMobile} />
            <AchievementsBadges badges={data.badges} isMobile={isMobile} />
          </div>
        </div>
      </div>
    </div>
  );
};

const getStyles = (isMobile, isTablet) => ({
  page: {
    minHeight: '100vh',
    background: COLORS.background.gradient,
    padding: isMobile ? SPACING.md : `${SPACING.xl} ${SPACING.xl}`,
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: { display: 'none' },
  orb2: { display: 'none' },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: SPACING.md,
    position: 'relative',
    zIndex: 1,
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #6366f1',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text?.whiteSubtle || 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  errorText: {
    fontSize: FONT_SIZES.base,
    color: '#f87171',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: isMobile || isTablet ? '1fr' : '1fr 360px',
    gap: isMobile ? SPACING.md : SPACING.xl,
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  spacer: {
    height: SPACING.lg,
  },
});

export default OnlineStudentDashboard;
