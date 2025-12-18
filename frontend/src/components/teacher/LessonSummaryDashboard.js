// ============================================
// LESSON SUMMARY DASHBOARD - Combined View
// ============================================
// Location: src/components/teacher/LessonSummaryDashboard.js

import React, { useMemo } from 'react';

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
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#7C3AED"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease'
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
    gap: '1.5rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6B7280',
    fontSize: '1rem',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6B7280',
    fontSize: '1rem',
  },
  // Overview Card
  overviewCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '2rem',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
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
    fontSize: '1.8rem',
    fontWeight: '700',
  },
  overviewDonutLabel: {
    fontSize: '0.75rem',
    opacity: 0.9,
  },
  overviewStats: {
    display: 'flex',
    gap: '3rem',
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
  },
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.9,
  },
  // Schools Grid
  schoolsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
  },
  schoolCard: {
    border: '2px solid #E5E7EB',
    borderRadius: '12px',
    padding: '1.5rem',
    backgroundColor: '#FFFFFF',
  },
  schoolHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
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
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#7C3AED',
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: '1.1rem',
    color: '#1F2937',
    marginBottom: '0.25rem',
    fontWeight: '600',
  },
  schoolStats: {
    fontSize: '0.85rem',
    color: '#6B7280',
    margin: 0,
  },
  // Progress Bars
  progressBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  progressBarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  progressBarLabel: {
    width: '70px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#4B5563',
  },
  progressBarTrack: {
    flex: 1,
    height: '24px',
    background: '#F3F4F6',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(to right, #7C3AED, #A78BFA)',
    transition: 'width 0.5s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '0.5rem',
    minWidth: '50px', // Ensure label is always visible
  },
  progressBarPercent: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'white',
  },
};

export default LessonSummaryDashboard;