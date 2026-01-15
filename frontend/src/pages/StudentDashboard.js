// ============================================
// STUDENT DASHBOARD - FIXED VERSION
// Separate loading states for dashboard data and profile
// ============================================

import React, { useEffect, useState } from "react";
import axios from "axios";
import { UnifiedProfileHeader } from '../components/common/UnifiedProfileHeader';
import { getCompleteStudentProfile } from '../services/studentService';

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
  TRANSITIONS,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

// Reusable StatCard with hover effect
const StatCard = ({ title, value, color = 'cyan', isMobile }) => {
  const [isHovered, setIsHovered] = useState(false);

  const colorMap = {
    cyan: COLORS.accent.cyan,
    green: COLORS.status.success,
    blue: COLORS.accent.blue,
    purple: COLORS.accent.purple,
  };

  return (
    <div
      style={{
        padding: isMobile ? SPACING.lg : SPACING.xl,
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.lg,
        borderLeft: `4px solid ${colorMap[color] || colorMap.cyan}`,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered ? '0 12px 40px rgba(0, 0, 0, 0.25)' : '0 4px 24px rgba(0, 0, 0, 0.12)',
        background: isHovered ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.12)',
        cursor: 'default',
        minHeight: isMobile ? '44px' : 'auto', // Touch-friendly
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 style={{
        fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.semibold,
        marginBottom: SPACING.sm,
        color: COLORS.text.whiteMedium,
      }}>{title}</h2>
      <p style={{
        fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
        color: COLORS.text.white,
        fontWeight: FONT_WEIGHTS.bold,
        margin: 0,
      }}>{value}</p>
    </div>
  );
};

// Reusable AttendanceCard with hover effect
const AttendanceCard = ({ date, status, isMobile }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isPresent = status === 'Present';

  return (
    <div
      style={{
        padding: isMobile ? SPACING.md : SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
        textAlign: 'center',
        ...MIXINS.glassmorphicSubtle,
        borderLeft: `3px solid ${isPresent ? COLORS.status.success : COLORS.status.error}`,
        color: COLORS.text.white,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
        boxShadow: isHovered ? '0 8px 24px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        background: isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
        cursor: 'default',
        minHeight: '44px', // Touch-friendly
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p style={{
        fontWeight: FONT_WEIGHTS.bold,
        marginBottom: SPACING.xs,
        color: COLORS.text.white,
        fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
      }}>{date}</p>
      <p style={{ margin: 0, fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base }}>{status}</p>
    </div>
  );
};

const StudentDashboard = () => {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();

  // Dashboard data states
  const [data, setData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true); // ← RENAMED
  const [error, setError] = useState(null);

  // Profile states (separate!)
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true); // ← SEPARATE

  // Fetch dashboard data (fees, attendance, etc.)
  useEffect(() => {
    console.log('📊 Fetching dashboard data...');
    setDashboardLoading(true);
    
    axios.get(`${API_URL}/api/students/my-data/`, { headers: getAuthHeaders() })
      .then((res) => {
        console.log('✅ Dashboard data loaded:', res.data);
        setData(res.data);
        setDashboardLoading(false);
      })
      .catch((err) => {
        console.error('❌ Dashboard data error:', err);
        setError("Failed to load data");
        setDashboardLoading(false);
      });
  }, []); // ← Empty array: fetch once

  // Fetch profile data (for header)
  useEffect(() => {
    const fetchProfile = async () => {
      console.log('👤 Fetching profile...');
      setProfileLoading(true);
      try {
        const data = await getCompleteStudentProfile();
        console.log('✅ Profile loaded:', data);
        setProfile(data);
      } catch (error) {
        console.error('❌ Profile error:', error);
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchProfile();
  }, []); // ← Empty array: fetch once

  // Handle profile updates (from settings modal)
  const handleProfileUpdate = (updatedProfile) => {
    console.log('📝 Updating profile:', updatedProfile);
    // ✅ CORRECT: Just merge, don't re-fetch
    setProfile(prev => ({ ...prev, ...updatedProfile }));
  };

  // Show loading if either is still loading
  const isLoading = dashboardLoading || profileLoading;

  // Get responsive styles
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);

  if (isLoading) {
    return (
      <div style={responsiveStyles.pageContainer}>
        <UnifiedProfileHeader
          role="Student"
          profile={profile}
          loading={profileLoading}
          onProfileUpdate={handleProfileUpdate}
        />
        <div style={styles.loadingText}>Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={responsiveStyles.pageContainer}>
        <UnifiedProfileHeader
          role="Student"
          profile={profile}
          loading={profileLoading}
          onProfileUpdate={handleProfileUpdate}
        />
        <div style={styles.errorText}>{error || "No data"}</div>
      </div>
    );
  }

  return (
    <div style={responsiveStyles.pageContainer}>
      {/* Profile Header */}
      <UnifiedProfileHeader
        role="Student"
        profile={profile}
        loading={profileLoading}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Dashboard Stats Cards */}
      <div style={responsiveStyles.statsGrid}>
        <StatCard title="School" value={data.school} color="cyan" isMobile={isMobile} />
        <StatCard title="Class" value={data.class} color="green" isMobile={isMobile} />
      </div>

      {/* Dashboard Content */}
      <div style={styles.contentContainer}>
        {/* Recent Fees Section */}
        <section>
          <h2 style={responsiveStyles.sectionTitle}>Recent Fees (Last 10)</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={responsiveStyles.tableHeaderCell}>Month</th>
                  <th style={responsiveStyles.tableHeaderCell}>Balance Due</th>
                  <th style={responsiveStyles.tableHeaderCell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.fees && data.fees.length > 0 ? (
                  data.fees.map((fee, i) => (
                    <tr key={i} style={styles.tableRow}>
                      <td style={responsiveStyles.tableCell}>{fee.month}</td>
                      <td style={{ ...responsiveStyles.tableCell, fontWeight: FONT_WEIGHTS.bold }}>
                        PKR {fee.balance_due}
                      </td>
                      <td style={responsiveStyles.tableCell}>
                        <span style={styles.statusBadge(fee.status === 'Paid')}>
                          {fee.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={styles.emptyState}>
                      No fee records available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Attendance Section */}
        <section>
          <h2 style={responsiveStyles.sectionTitle}>Recent Attendance (Last 30)</h2>
          <div style={responsiveStyles.attendanceGrid}>
            {data.attendance && data.attendance.length > 0 ? (
              data.attendance.map((att, i) => (
                <AttendanceCard
                  key={i}
                  date={att.session_date}
                  status={att.status}
                  isMobile={isMobile}
                />
              ))
            ) : (
              <div style={styles.emptyAttendance}>
                No attendance records available
              </div>
            )}
          </div>
        </section>
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
    maxWidth: LAYOUT.maxWidth.sm,
    margin: '0 auto',
    minHeight: '100vh',
    background: COLORS.background.gradient,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: isMobile ? SPACING.md : SPACING.xl,
    marginBottom: isMobile ? SPACING.lg : SPACING['2xl'],
  },
  attendanceGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile
      ? 'repeat(auto-fit, minmax(90px, 1fr))'
      : isTablet
      ? 'repeat(auto-fit, minmax(100px, 1fr))'
      : 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: isMobile ? SPACING.sm : SPACING.lg,
  },
  sectionTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: isMobile ? SPACING.md : SPACING.lg,
    color: COLORS.text.white,
  },
  tableHeaderCell: {
    padding: isMobile ? SPACING.sm : SPACING.md,
    textAlign: 'left',
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
  },
  tableCell: {
    padding: isMobile ? SPACING.sm : SPACING.md,
    color: COLORS.text.whiteMedium,
    fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,
  },
});

// ============================================
// STYLES - Glassmorphism design
// ============================================
const styles = {
  pageContainer: {
    padding: SPACING.xl,
    maxWidth: LAYOUT.maxWidth.sm,
    margin: '0 auto',
    minHeight: '100vh',
    background: COLORS.background.gradient,
  },
  loadingText: {
    textAlign: 'center',
    padding: SPACING['2xl'],
    color: COLORS.text.whiteSubtle,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
  },
  errorText: {
    color: COLORS.status.error,
    textAlign: 'center',
    padding: SPACING['2xl'],
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: SPACING.xl,
    marginBottom: SPACING['2xl'],
  },
  statCard: (bgColor) => ({
    padding: SPACING.xl,
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    borderLeft: `4px solid ${COLORS.accent.cyan}`,
  }),
  statTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
    color: COLORS.text.whiteMedium,
  },
  statValue: {
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.bold,
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.lg,
    color: COLORS.text.white,
  },
  tableWrapper: {
    overflowX: 'auto',
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
  },
  table: {
    width: '100%',
    backgroundColor: 'transparent',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tableHeaderCell: {
    padding: SPACING.md,
    textAlign: 'left',
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  tableRow: {
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    transition: `background-color ${TRANSITIONS.fast} ease`,
  },
  tableCell: {
    padding: SPACING.md,
    color: COLORS.text.whiteMedium,
  },
  statusBadge: (isPaid) => ({
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
    color: isPaid ? COLORS.status.success : COLORS.status.error,
  }),
  emptyState: {
    padding: SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
  },
  attendanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: SPACING.lg,
  },
  attendanceCard: (isPresent) => ({
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    textAlign: 'center',
    ...MIXINS.glassmorphicSubtle,
    borderLeft: `3px solid ${isPresent ? COLORS.status.success : COLORS.status.error}`,
    color: COLORS.text.white,
  }),
  attendanceDate: {
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
    color: COLORS.text.white,
  },
  emptyAttendance: {
    gridColumn: '1 / -1',
    padding: SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.md,
  },
};

export default StudentDashboard;