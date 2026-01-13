// ============================================
// LESSON SUMMARY DASHBOARD - Combined View
// ============================================
// Location: src/components/teacher/LessonSummaryDashboard.js

import React, { useMemo } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
} from '../../utils/designConstants';

/**
 * LessonSummaryDashboard Component
 * Combined dashboard with overview metrics and detailed progress
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of lesson summary objects from API
 * @param {boolean} props.loading - Loading state
 */
export const LessonSummaryDashboard = ({ data = [], loading = false }) => {
  
  // Calculate overview metrics
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalLessons: 0,
        averageCompletion: 0,
        schoolsCount: 0,
        classesCount: 0
      };
    }

    // Debug: Log first item to see field names
    console.log('📊 LessonSummaryDashboard - Sample data item:', data[0]);
    console.log('📊 All field names:', Object.keys(data[0]));

    const totalLessons = data.reduce((sum, item) => {
      // Handle different possible field names from API
      const lessons = item.lessons_planned || item.lessonsPlanned || item.planned_lessons || 0;
      return sum + lessons;
    }, 0);
    const averageCompletion = data.reduce((sum, item) => sum + (item.completion_rate || 0), 0) / data.length;
    const schoolsCount = new Set(data.map(item => item.school_name)).size;
    const classesCount = data.length;

    return {
      totalLessons,
      averageCompletion: Math.round(averageCompletion),
      schoolsCount,
      classesCount
    };
  }, [data]);

  // Group data by school
  const schoolData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const grouped = {};
    
    data.forEach(item => {
      const schoolName = item.school_name || 'Unknown School';
      if (!grouped[schoolName]) {
        grouped[schoolName] = [];
      }
      grouped[schoolName].push(item);
    });

    // Calculate school averages
    return Object.keys(grouped).map(schoolName => {
      const classes = grouped[schoolName];
      const totalLessons = classes.reduce((sum, c) => {
        const lessons = c.lessons_planned || c.lessonsPlanned || c.planned_lessons || 0;
        return sum + lessons;
      }, 0);
      const avgCompletion = classes.reduce((sum, c) => sum + (c.completion_rate || 0), 0) / classes.length;
      
      return {
        schoolName,
        classes,
        totalLessons,
        avgCompletion: Math.round(avgCompletion)
      };
    });
  }, [data]);

  // SVG Circle Progress Component
  const CircleProgress = ({ percentage, size = 100, strokeWidth = 10 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.background.offWhite}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: `stroke-dashoffset ${TRANSITIONS.slower} ease`
          }}
        />
      </svg>
    );
  };

  if (loading) {
    return <div style={styles.loading}>Loading lesson summary...</div>;
  }

  if (!data || data.length === 0) {
    return <div style={styles.empty}>No lesson data available</div>;
  }

  return (
    <div style={styles.container}>
      {/* Overview Card */}
      <div style={styles.overviewCard}>
        <div style={styles.overviewDonut}>
          <CircleProgress percentage={metrics.averageCompletion} size={120} strokeWidth={15} />
          <div style={styles.overviewDonutText}>
            <div style={styles.overviewDonutPercent}>{metrics.averageCompletion}%</div>
            <div style={styles.overviewDonutLabel}>Average</div>
          </div>
        </div>
        
        <div style={styles.overviewStats}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{metrics.totalLessons}</div>
            <div style={styles.statLabel}>Total Lessons</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{metrics.schoolsCount}</div>
            <div style={styles.statLabel}>Schools</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{metrics.classesCount}</div>
            <div style={styles.statLabel}>Classes</div>
          </div>
        </div>
      </div>

      {/* Schools Grid */}
      <div style={styles.schoolsGrid}>
        {schoolData.map((school, idx) => (
          <div key={idx} style={styles.schoolCard}>
            {/* School Header */}
            <div style={styles.schoolHeader}>
              <div style={styles.schoolDonut}>
                <CircleProgress percentage={school.avgCompletion} size={80} strokeWidth={10} />
                <div style={styles.schoolDonutText}>{school.avgCompletion}%</div>
              </div>
              <div style={styles.schoolInfo}>
                <h3 style={styles.schoolName}>{school.schoolName}</h3>
                <p style={styles.schoolStats}>
                  {school.totalLessons} lessons planned • {school.avgCompletion}% average progress
                </p>
              </div>
            </div>

            {/* Progress Bars */}
            <div style={styles.progressBars}>
              {school.classes.map((classItem, classIdx) => (
                <div key={classIdx} style={styles.progressBarItem}>
                  <div style={styles.progressBarLabel}>
                    Class {classItem.student_class || classItem.class}
                  </div>
                  <div style={styles.progressBarTrack}>
                    <div 
                      style={{
                        ...styles.progressBarFill,
                        width: `${classItem.completion_rate}%`
                      }}
                    >
                      <span style={styles.progressBarPercent}>
                        {Math.round(classItem.completion_rate)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  loading: {
    textAlign: 'center',
    padding: SPACING['2xl'],
    color: COLORS.text.secondary,
    fontSize: FONT_SIZES.base,
  },
  empty: {
    textAlign: 'center',
    padding: SPACING['2xl'],
    color: COLORS.text.secondary,
    fontSize: FONT_SIZES.base,
  },
  // Overview Card
  overviewCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xl,
    color: COLORS.text.white,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    boxShadow: SHADOWS.md,
  },
  overviewDonut: {
    position: 'relative',
    width: '120px',
    height: '120px',
  },
  overviewDonutText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  overviewDonutPercent: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
  },
  overviewDonutLabel: {
    fontSize: FONT_SIZES.xs,
    opacity: 0.9,
  },
  overviewStats: {
    display: 'flex',
    gap: SPACING['2xl'],
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES['4xl'],
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    opacity: 0.9,
  },
  // Schools Grid
  schoolsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: SPACING.lg,
  },
  schoolCard: {
    border: `2px solid ${COLORS.border.light}`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.background.white,
  },
  schoolHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  schoolDonut: {
    position: 'relative',
    width: '80px',
    height: '80px',
    flexShrink: 0,
  },
  schoolDonutText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  schoolStats: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    margin: 0,
  },
  // Progress Bars
  progressBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  progressBarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBarLabel: {
    width: '70px',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
  },
  progressBarTrack: {
    flex: 1,
    height: '24px',
    background: COLORS.background.offWhite,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(to right, #7C3AED, #A78BFA)',
    transition: `width ${TRANSITIONS.slower} ease`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: SPACING.xs,
    minWidth: '50px',
  },
  progressBarPercent: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
};

export default LessonSummaryDashboard;