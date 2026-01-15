// ============================================
// LESSON GRID - Simple Table Layout
// ============================================
// Location: src/components/teacher/LessonGrid.js

import React, { useMemo } from 'react';
import moment from 'moment';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { useResponsive } from '../../hooks/useResponsive';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
} from '../../utils/designConstants';

/**
 * LessonGrid Component - Table-based layout
 * Simple table structure with proper alignment
 * 
 * @param {Object} props
 * @param {Array} props.lessons - Array of lesson objects
 * @param {boolean} props.loading - Loading state
 * @param {string} props.selectedMonth - Selected month for display
 */
export const LessonGrid = ({ lessons = [], loading = false, selectedMonth }) => {
  const { isMobile, isTablet } = useResponsive();

  // Generate days based on screen size - fewer days on mobile
  const numberOfDays = isMobile ? 2 : (isTablet ? 3 : 4);

  // Generate next N days
  const dates = useMemo(() => {
    return Array.from({ length: numberOfDays }, (_, i) =>
      moment().add(i, 'days')
    );
  }, [numberOfDays]);

  // DYNAMIC: Extract unique classes from lessons data
  const displayClasses = useMemo(() => {
    if (!lessons || lessons.length === 0) {
      // Fallback to default if no lessons
      return ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'];
    }

    // Extract unique class names from lessons
    const uniqueClasses = new Set();
    lessons.forEach(lesson => {
      const className = lesson.class_name || lesson.student_class || lesson.class || '';
      if (className) {
        // Normalize: "1" -> "Class 1"
        const normalized = className.includes('Class') ? className : `Class ${className}`;
        uniqueClasses.add(normalized);
      }
    });

    // Convert Set to Array and sort numerically
    const classArray = Array.from(uniqueClasses).sort((a, b) => {
      const numA = parseInt(a.replace('Class ', ''));
      const numB = parseInt(b.replace('Class ', ''));
      return numA - numB;
    });

    //console.log('📋 Dynamic classes extracted:', classArray);
    return classArray.length > 0 ? classArray : ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'];
  }, [lessons]);

  // Group lessons by class and date
  const lessonsByClassAndDate = useMemo(() => {
    const grouped = {};
    
    // Initialize structure for display classes only
    displayClasses.forEach(className => {
      grouped[className] = {};
      dates.forEach(date => {
        const dateKey = date.format('YYYY-MM-DD');
        grouped[className][dateKey] = [];
      });
    });

    // Populate with lessons
    lessons.forEach(lesson => {
      const className = lesson.class_name || lesson.student_class || lesson.class || '';
      const dateKey = moment(lesson.session_date).format('YYYY-MM-DD');
      
      // Normalize class name
      let normalizedClass = className;
      if (className && !className.includes('Class')) {
        normalizedClass = `Class ${className}`;
      }
      
      //console.log(`📚 Lesson: ${normalizedClass} on ${dateKey}`, lesson);
      
      if (grouped[normalizedClass] && grouped[normalizedClass][dateKey]) {
        grouped[normalizedClass][dateKey].push(lesson);
      }
    });

    //console.log('📊 Grouped lessons:', grouped);
    return grouped;
  }, [lessons, dates, displayClasses]);

  // Get school name for each date (assumes one school per day)
  const schoolsByDate = useMemo(() => {
    const schools = {};
    dates.forEach(date => {
      const dateKey = date.format('YYYY-MM-DD');
      // Find first lesson for this date to get school name
      const lessonForDate = lessons.find(l => 
        moment(l.session_date).format('YYYY-MM-DD') === dateKey
      );
      schools[dateKey] = lessonForDate?.school_name || '';
    });
    return schools;
  }, [lessons, dates]);

  // Get responsive styles
  const styles = getStyles(isMobile, isTablet);

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading lesson schedule..." />;
  }

  // Mobile card view - show lessons as cards instead of table
  if (isMobile) {
    return (
      <div style={styles.container}>
        <div style={styles.mobileHeader}>
          <span style={styles.mobileDateNav}>📅 Next {numberOfDays} Days</span>
        </div>
        {dates.map((date, dateIdx) => {
          const dateKey = date.format('YYYY-MM-DD');
          const schoolName = schoolsByDate[dateKey];

          return (
            <div key={dateIdx} style={styles.mobileDaySection}>
              <div style={styles.mobileDayHeader}>
                <div style={styles.mobileDayName}>{date.format('dddd')}</div>
                <div style={styles.mobileDayDate}>{date.format('DD MMM')}</div>
                {schoolName && <div style={styles.mobileSchoolName}>{schoolName}</div>}
              </div>
              <div style={styles.mobileClassList}>
                {displayClasses.map((className) => {
                  const lessonsForCell = lessonsByClassAndDate[className]?.[dateKey] || [];
                  if (lessonsForCell.length === 0) return null;

                  return (
                    <div key={className} style={styles.mobileClassCard}>
                      <div style={styles.mobileClassLabel}>{className}</div>
                      {lessonsForCell.map((lesson, lessonIdx) => (
                        <div key={lessonIdx} style={styles.mobileLessonText}>
                          {lesson.topic}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {/* Show empty state if no lessons for this day */}
                {displayClasses.every(className =>
                  (lessonsByClassAndDate[className]?.[dateKey] || []).length === 0
                ) && (
                  <div style={styles.mobileEmptyDay}>No lessons scheduled</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Tablet/Desktop table view
  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          {/* Row 1: Day Names */}
          <tr>
            <th style={styles.emptyHeaderCell}></th>
            {dates.map((date, idx) => (
              <th key={`day-${idx}`} style={styles.dayHeader}>
                {isTablet ? date.format('ddd') : date.format('dddd')}
              </th>
            ))}
          </tr>
          {/* Row 2: Dates + School Names */}
          <tr>
            <th style={styles.emptyHeaderCell}></th>
            {dates.map((date, idx) => {
              const dateKey = date.format('YYYY-MM-DD');
              const schoolName = schoolsByDate[dateKey];

              return (
                <th key={`date-${idx}`} style={styles.dateHeader}>
                  <div style={styles.dateText}>{date.format('DD-MMM')}</div>
                  {schoolName && (
                    <div style={styles.schoolHeaderText}>
                      {isTablet && schoolName.length > 15
                        ? schoolName.substring(0, 15) + '...'
                        : schoolName
                      }
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayClasses.map((className, rowIdx) => (
            <tr key={className}>
              {/* Class Column (First Column) */}
              <td style={styles.classCell}>
                <div style={styles.classLabel}>{className}</div>
              </td>

              {/* Lesson Cells */}
              {dates.map((date, colIdx) => {
                const dateKey = date.format('YYYY-MM-DD');
                const lessonsForCell = lessonsByClassAndDate[className][dateKey] || [];

                return (
                  <td
                    key={`${className}-${colIdx}`}
                    style={styles.lessonCell}
                  >
                    {lessonsForCell.map((lesson, lessonIdx) => (
                      <div key={lessonIdx} style={styles.lessonCard}>
                        <div style={styles.lessonText}>
                          {lesson.topic}
                        </div>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Responsive Styles Generator
const getStyles = (isMobile, isTablet) => ({
  // Container
  container: {
    width: '100%',
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
  },
  table: {
    width: '100%',
    minWidth: isTablet ? '500px' : '700px', // Ensure table doesn't collapse too small
    borderCollapse: 'collapse',
    backgroundColor: 'transparent',
  },

  // HEADER STYLES - Responsive widths
  emptyHeaderCell: {
    width: isTablet ? '80px' : '100px',
    minWidth: isTablet ? '80px' : '100px',
    backgroundColor: 'transparent',
    border: 'none',
    padding: SPACING.xs,
  },
  dayHeader: {
    minWidth: isTablet ? '120px' : '180px',
    backgroundColor: 'transparent',
    border: 'none',
    padding: SPACING.xs,
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: isTablet ? FONT_SIZES.xs : FONT_SIZES.sm,
    color: COLORS.text.white,
    fontFamily: 'Inter, sans-serif',
  },
  dateHeader: {
    minWidth: isTablet ? '120px' : '180px',
    backgroundColor: 'transparent',
    border: 'none',
    padding: `${SPACING.xs} ${SPACING.xs} ${SPACING.sm}`,
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: isTablet ? FONT_SIZES.xs : FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    fontFamily: 'Inter, sans-serif',
  },
  dateText: {
    fontSize: isTablet ? FONT_SIZES.xs : FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteMedium,
    marginBottom: SPACING.xs,
  },
  schoolHeaderText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accent.cyan,
    marginTop: SPACING.xs,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // CLASS COLUMN (First Column)
  classCell: {
    width: isTablet ? '80px' : '100px',
    minWidth: isTablet ? '80px' : '100px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRight: `1px solid ${COLORS.border.whiteTransparent}`,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    padding: isTablet ? SPACING.xs : SPACING.sm,
    verticalAlign: 'top',
  },
  classLabel: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.sm,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    fontSize: isTablet ? FONT_SIZES.xs : FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    textAlign: 'center',
    lineHeight: '1.4',
  },

  // LESSON CELLS (Day Columns)
  lessonCell: {
    minWidth: isTablet ? '120px' : '180px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRight: `1px solid ${COLORS.border.whiteTransparent}`,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    padding: isTablet ? SPACING.xs : SPACING.sm,
    verticalAlign: 'top',
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteMedium,
    fontFamily: 'Inter, sans-serif',
  },
  lessonCard: {
    marginBottom: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs,
  },
  lessonText: {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    lineHeight: '1.5',
    fontSize: FONT_SIZES.xs,
  },

  // MOBILE CARD VIEW STYLES
  mobileHeader: {
    padding: SPACING.md,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    textAlign: 'center',
  },
  mobileDateNav: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  mobileDaySection: {
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  mobileDayHeader: {
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mobileDayName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  mobileDayDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
  },
  mobileSchoolName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.accent.cyan,
    width: '100%',
  },
  mobileClassList: {
    padding: SPACING.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  mobileClassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  mobileClassLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accent.purple,
    marginBottom: SPACING.xs,
  },
  mobileLessonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    lineHeight: '1.5',
  },
  mobileEmptyDay: {
    padding: SPACING.md,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
});

export default LessonGrid;