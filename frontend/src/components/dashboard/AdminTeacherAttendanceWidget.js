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
import { useResponsive } from '../../hooks/useResponsive';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
});

const AdminTeacherAttendanceWidget = () => {
  const { isMobile } = useResponsive();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayDate, setTodayDate] = useState('');
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'today'
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
        `${API_BASE_URL}/api/auth/teacher-attendance/admin/`,
        {
          params: { year, month },
          headers: getAuthHeaders(),
        }
      );
      setAttendanceData(response.data.teachers || []);
      setTodayDate(response.data.today || '');
      setError(null);
    } catch (err) {
      console.error('Error fetching teacher attendance:', err);
      setError('Failed to load teacher attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceRateColor = (rate) => {
    if (rate >= 80) return COLORS.status.success;
    if (rate >= 60) return COLORS.status.warning;
    return COLORS.status.error;
  };

  const getStatusIndicator = (rate) => {
    if (rate >= 80) return '🟢';
    if (rate >= 60) return '🟡';
    return '🔴';
  };

  // Get today's status display info
  const getTodayStatusInfo = (status) => {
    switch (status) {
      case 'present':
        return { label: 'Present', color: COLORS.status.success, icon: '✓' };
      case 'out_of_range':
        return { label: 'Out of Range', color: COLORS.status.warning, icon: '⚠' };
      case 'location_unavailable':
        return { label: 'No Location', color: COLORS.status.info, icon: '📍' };
      case 'not_logged_in':
      default:
        return { label: 'Not Logged In', color: COLORS.status.error, icon: '✗' };
    }
  };

  // Format login time
  const formatLoginTime = (isoTime) => {
    if (!isoTime) return '-';
    const date = new Date(isoTime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Teacher Attendance Overview</h3>
        </div>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading teacher attendance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Teacher Attendance Overview</h3>
        </div>
        <div style={styles.errorContainer}>
          <span style={styles.errorText}>{error}</span>
        </div>
      </div>
    );
  }

  // Group by attendance rate for summary
  const excellent = attendanceData.filter((t) => t.attendance_rate >= 80).length;
  const moderate = attendanceData.filter((t) => t.attendance_rate >= 60 && t.attendance_rate < 80).length;
  const poor = attendanceData.filter((t) => t.attendance_rate < 60).length;

  // Today's stats
  const todayPresent = attendanceData.filter((t) => t.today_status === 'present').length;
  const todayOutOfRange = attendanceData.filter((t) => t.today_status === 'out_of_range').length;
  const todayNotLogged = attendanceData.filter((t) => t.today_status === 'not_logged_in').length;

  return (
    <div style={{ ...styles.container, padding: isMobile ? SPACING.md : SPACING.xl }}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={{ ...styles.title, fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg }}>Teacher Attendance Overview</h3>
        <div style={styles.headerControls}>
          {/* View Mode Toggle */}
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'today' ? styles.toggleButtonActive : {}),
              }}
              onClick={() => setViewMode('today')}
            >
              Today
            </button>
            <button
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'month' ? styles.toggleButtonActive : {}),
              }}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
          {viewMode === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ ...styles.monthInput, width: isMobile ? '100%' : 'auto' }}
            />
          )}
        </div>
      </div>

      {/* Summary Cards - Different for Today vs Month view */}
      {viewMode === 'today' ? (
        <div style={styles.summaryRow}>
          <div style={{ ...styles.summaryCard, borderLeftColor: COLORS.status.success }}>
            <span style={styles.summaryValue}>{todayPresent}</span>
            <span style={styles.summaryLabel}>Present Today</span>
          </div>
          <div style={{ ...styles.summaryCard, borderLeftColor: COLORS.status.warning }}>
            <span style={styles.summaryValue}>{todayOutOfRange}</span>
            <span style={styles.summaryLabel}>Out of Range</span>
          </div>
          <div style={{ ...styles.summaryCard, borderLeftColor: COLORS.status.error }}>
            <span style={styles.summaryValue}>{todayNotLogged}</span>
            <span style={styles.summaryLabel}>Not Logged In</span>
          </div>
        </div>
      ) : (
        <div style={styles.summaryRow}>
          <div style={{ ...styles.summaryCard, borderLeftColor: COLORS.status.success }}>
            <span style={styles.summaryValue}>{excellent}</span>
            <span style={styles.summaryLabel}>Excellent (≥80%)</span>
          </div>
          <div style={{ ...styles.summaryCard, borderLeftColor: COLORS.status.warning }}>
            <span style={styles.summaryValue}>{moderate}</span>
            <span style={styles.summaryLabel}>Moderate (60-80%)</span>
          </div>
          <div style={{ ...styles.summaryCard, borderLeftColor: COLORS.status.error }}>
            <span style={styles.summaryValue}>{poor}</span>
            <span style={styles.summaryLabel}>Needs Attention (&lt;60%)</span>
          </div>
        </div>
      )}

      {/* Teacher List */}
      {attendanceData.length === 0 ? (
        <div style={styles.noData}>
          <span>No teacher attendance data for this month</span>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Teacher</th>
                <th style={styles.tableHeader}>Today's School</th>
                <th style={styles.tableHeader}>Today's Status</th>
                <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Present</th>
                <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Out of Range</th>
                <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Absent</th>
                <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((teacher) => {
                const todayInfo = getTodayStatusInfo(teacher.today_status);
                return (
                  <tr key={teacher.teacher_id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <span style={styles.statusIndicator}>
                        {getStatusIndicator(teacher.attendance_rate)}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.teacherName}>{teacher.teacher_name}</span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.schoolName}>
                        {teacher.today_school_name || '-'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.todayStatusContainer}>
                        <span
                          style={{
                            ...styles.todayStatusBadge,
                            backgroundColor: `${todayInfo.color}20`,
                            color: todayInfo.color,
                            borderColor: `${todayInfo.color}40`,
                          }}
                        >
                          {todayInfo.icon} {todayInfo.label}
                        </span>
                        {teacher.today_login_time && (
                          <span style={styles.loginTime}>
                            {formatLoginTime(teacher.today_login_time)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                      <span style={{ color: COLORS.status.success, fontWeight: FONT_WEIGHTS.semibold }}>
                        {teacher.present_days}/{teacher.total_working_days}
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                      <span style={{ color: COLORS.status.warning }}>
                        {teacher.out_of_range_days}
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                      <span style={{ color: COLORS.status.error }}>
                        {teacher.absent_days}
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                      <span
                        style={{
                          ...styles.rateValue,
                          color: getAttendanceRateColor(teacher.attendance_rate),
                        }}
                      >
                        {teacher.attendance_rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span>🟢</span>
          <span style={styles.legendText}>≥80% Excellent</span>
        </div>
        <div style={styles.legendItem}>
          <span>🟡</span>
          <span style={styles.legendText}>60-80% Moderate</span>
        </div>
        <div style={styles.legendItem}>
          <span>🔴</span>
          <span style={styles.legendText}>&lt;60% Needs Attention</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    ...MIXINS.glassmorphicCard,
    background: 'rgba(255, 255, 255, 0.5)', // Lighter background for better text visibility
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
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    padding: '2px',
  },
  toggleButton: {
    padding: `${SPACING.xs} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.sm,
    border: 'none',
    backgroundColor: 'transparent',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    color: '#312e81',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#1e1b4b',
    margin: 0,
  },
  monthInput: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.md,
    border: '1px solid rgba(99, 102, 241, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    color: '#1e1b4b',
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
    color: '#4b5563',
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
    color: '#4b5563',
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    ...MIXINS.glassmorphicSubtle,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeft: '4px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#1e1b4b',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: '#4b5563',
    textAlign: 'center',
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: SPACING.md,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
  },
  tableHeader: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    textAlign: 'left',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    borderBottom: `1px solid rgba(255, 255, 255, 0.05)`,
    transition: 'background-color 0.2s ease',
  },
  tableCell: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    fontSize: FONT_SIZES.sm,
    color: '#1e1b4b',
  },
  statusIndicator: {
    fontSize: FONT_SIZES.md,
  },
  teacherName: {
    fontWeight: FONT_WEIGHTS.medium,
  },
  schoolName: {
    color: '#4b5563',
    fontSize: FONT_SIZES.sm,
  },
  todayStatusContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  todayStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  loginTime: {
    fontSize: FONT_SIZES.xs,
    color: '#6b7280',
  },
  rateValue: {
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
    borderTop: '1px solid rgba(99, 102, 241, 0.2)',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    color: '#4b5563',
  },
};

// Add keyframes for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-admin-teacher-attendance-styles]')) {
  styleSheet.setAttribute('data-admin-teacher-attendance-styles', '');
  document.head.appendChild(styleSheet);
}

export default AdminTeacherAttendanceWidget;
