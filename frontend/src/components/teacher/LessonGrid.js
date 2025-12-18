// ============================================
// LESSON GRID - Simple Table Layout
// ============================================
// Location: src/components/teacher/LessonGrid.js

import React, { useMemo } from 'react';
import moment from 'moment';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

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
  // Debug: Log lessons data
  //console.log('🎓 LessonGrid received lessons:', lessons);
  
  // Generate next 4 days
  const dates = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => 
      moment().add(i, 'days')
    );
  }, []);

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

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading lesson schedule..." />;
  }

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          {/* Row 1: Day Names */}
          <tr>
            <th style={styles.emptyHeaderCell}></th>
            {dates.map((date, idx) => (
              <th key={`day-${idx}`} style={styles.dayHeader}>
                {date.format('dddd')}
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
                    <div style={styles.schoolHeaderText}>{schoolName}</div>
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

// Styles
const styles = {
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#FFFFFF',
  },
  // HEADER STYLES
  emptyHeaderCell: {
    width: '125px',
    backgroundColor: '#FFFFFF',
    border: 'none',
    padding: '0.5rem',
  },
  dayHeader: {
    width: '260px',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '0.5rem',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px',
    color: '#666666',
    fontFamily: 'Inter, sans-serif',
  },
  dateHeader: {
    width: '260px',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '0.5rem 0.5rem 1rem',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px',
    color: '#666666',
    fontFamily: 'Inter, sans-serif',
  },
  dateText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666666',
    marginBottom: '0.25rem',
  },
  schoolHeaderText: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: '0.25rem',
  },
  // CLASS COLUMN (First Column)
  classCell: {
    width: '125px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #D2D2D2',
    borderBottom: '1px solid #D2D2D2',
    padding: '1rem',
    verticalAlign: 'top',
  },
  classLabel: {
    backgroundColor: 'transparent',
    borderRadius: '9px',
    padding: '0.4rem 0.8rem',
    fontSize: '15px',
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  // LESSON CELLS (Day Columns)
  lessonCell: {
    width: '260px',
    backgroundColor: '#F9FAFB',
    borderRight: '1px solid #D2D2D2',
    borderBottom: '1px solid #D2D2D2',
    padding: '1rem 0.75rem',
    verticalAlign: 'top',
    fontSize: '10px',
    color: '#666666',
    fontFamily: 'Inter, sans-serif',
  },
  lessonCard: {
    marginBottom: '0.75rem',
    // Removed borderBottom - no lines between lessons
  },
  lessonText: {
    fontWeight: '600',
    color: '#666666',
    lineHeight: '1.5',
    fontSize: '10px',
  },
};

export default LessonGrid;