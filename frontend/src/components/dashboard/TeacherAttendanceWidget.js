import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
} from '../../utils/designConstants';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
});

const TeacherAttendanceWidget = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const response = await axios.get(
        `${API_BASE_URL}/api/auth/teacher-attendance/`,
        {
          params: { year, month },
          headers: getAuthHeaders(),
        }
      );
      setAttendanceData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return COLORS.status.success;
      case 'out_of_range':
        return COLORS.status.warning;
      case 'location_unavailable':
        return '#9ca3af'; // gray
      case 'absent':
        return COLORS.status.error;
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return '✓';
      case 'out_of_range':
        return '⚠';
      case 'location_unavailable':
        return '?';
      case 'absent':
        return '✗';
      default:
        return '-';
    }
  };

  const getAttendanceRateColor = (rate) => {
    if (rate >= 80) return COLORS.status.success;
    if (rate >= 60) return COLORS.status.warning;
    return COLORS.status.error;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>My Attendance</h3>
        </div>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading attendance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>My Attendance</h3>
        </div>
        <div style={styles.errorContainer}>
          <span style={styles.errorText}>{error}</span>
        </div>
      </div>
    );
  }

  const summary = attendanceData?.summary?.schools || [];

  return (
    <div style={styles.container}>
      {/* Header with Month Selector */}
      <div style={styles.header}>
        <h3 style={styles.title}>My Attendance</h3>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={styles.monthInput}
        />
      </div>

      {/* Summary Cards per School */}
      {summary.length === 0 ? (
        <div style={styles.noData}>
          <span>No attendance data for this month</span>
        </div>
      ) : (
        <div style={styles.schoolsContainer}>
          {summary.map((school) => (
            <div key={school.school_id} style={styles.schoolCard}>
              <div style={styles.schoolHeader}>
                <span style={styles.schoolName}>{school.school_name}</span>
                <span
                  style={{
                    ...styles.attendanceRate,
                    color: getAttendanceRateColor(school.attendance_rate),
                  }}
                >
                  {school.attendance_rate}%
                </span>
              </div>

              {/* Stats Row */}
              <div style={styles.statsRow}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{school.total_working_days}</span>
                  <span style={styles.statLabel}>Working Days</span>
                </div>
                <div style={styles.statItem}>
                  <span style={{ ...styles.statValue, color: COLORS.status.success }}>
                    {school.present_days}
                  </span>
                  <span style={styles.statLabel}>Present</span>
                </div>
                <div style={styles.statItem}>
                  <span style={{ ...styles.statValue, color: COLORS.status.warning }}>
                    {school.out_of_range_days}
                  </span>
                  <span style={styles.statLabel}>Out of Range</span>
                </div>
                <div style={styles.statItem}>
                  <span style={{ ...styles.statValue, color: COLORS.status.error }}>
                    {school.absent_days}
                  </span>
                  <span style={styles.statLabel}>Absent</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={styles.progressBarContainer}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${school.attendance_rate}%`,
                    backgroundColor: getAttendanceRateColor(school.attendance_rate),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Records */}
      {attendanceData?.records?.length > 0 && (
        <div style={styles.recentSection}>
          <h4 style={styles.recentTitle}>Recent Records</h4>
          <div style={styles.recordsList}>
            {attendanceData.records.slice(0, 5).map((record) => (
              <div key={record.id} style={styles.recordItem}>
                <div style={styles.recordDate}>
                  {new Date(record.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div style={styles.recordSchool}>{record.school_name}</div>
                <div
                  style={{
                    ...styles.recordStatus,
                    backgroundColor: getStatusColor(record.status),
                  }}
                >
                  {getStatusIcon(record.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: COLORS.status.success }} />
          <span style={styles.legendText}>Present</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: COLORS.status.warning }} />
          <span style={styles.legendText}>Out of Range</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: '#9ca3af' }} />
          <span style={styles.legendText}>No Location</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: COLORS.status.error }} />
          <span style={styles.legendText}>Absent</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    ...MIXINS.glassmorphicCard,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  monthInput: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: COLORS.accent.cyan,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  errorContainer: {
    padding: SPACING.lg,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.status.error,
    fontSize: FONT_SIZES.sm,
  },
  noData: {
    padding: SPACING.xl,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
  },
  schoolsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  schoolCard: {
    ...MIXINS.glassmorphicSubtle,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  schoolHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  schoolName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  attendanceRate: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '1 1 60px',
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
    transition: 'width 0.3s ease',
  },
  recentSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  recentTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.md,
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  recordItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
  },
  recordDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    minWidth: '100px',
  },
  recordSchool: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  recordStatus: {
    width: '24px',
    height: '24px',
    borderRadius: BORDER_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.bold,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: BORDER_RADIUS.full,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
};

// Add keyframes for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-teacher-attendance-styles]')) {
  styleSheet.setAttribute('data-teacher-attendance-styles', '');
  document.head.appendChild(styleSheet);
}

export default TeacherAttendanceWidget;
