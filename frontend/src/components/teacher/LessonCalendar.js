// ============================================
// LESSON CALENDAR - FullCalendar Wrapper
// ============================================

import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import moment from 'moment';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { CLASS_COLORS } from '../../utils/constants';

/**
 * LessonCalendar Component
 * @param {Object} props
 * @param {Array} props.lessons - Array of lesson objects
 * @param {boolean} props.loading - Loading state
 */
export const LessonCalendar = ({ lessons = [], loading = false }) => {
  // Transform lessons to calendar events
  const calendarEvents = useMemo(() => {
    if (!lessons || lessons.length === 0) return [];

    return lessons.map((lesson) => {
      const eventDate = lesson.session_date.split('T')[0];
      
      return {
        title: '', // Leave blank for custom content
        date: eventDate,
        allDay: true,
        extendedProps: {
          className: lesson.class_name,
          schoolName: lesson.school_name,
          topic: lesson.topic,
        },
        backgroundColor: CLASS_COLORS[lesson.class_name] || '#F59E0B',
        borderColor: 'transparent',
        textColor: '#FFFFFF',
      };
    });
  }, [lessons]);

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading lessons..." />;
  }

  if (calendarEvents.length === 0) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: '#9CA3AF',
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
        border: '2px dashed #E5E7EB',
      }}>
        <p style={{ margin: 0, fontSize: '1rem' }}>
          No lessons scheduled for the next 7 days.
        </p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF' }}>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridWeek"
        headerToolbar={false}
        height="auto"
        events={calendarEvents}
        initialDate={moment().format('YYYY-MM-DD')}
        validRange={{
          start: moment().startOf('day').toDate(),
          end: moment().add(7, 'days').endOf('day').toDate(),
        }}
        eventContent={(eventInfo) => (
          <div style={{
            padding: '0.5rem',
            fontSize: '0.75rem',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: '1.4',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {eventInfo.event.extendedProps.className}
            </div>
            <div style={{ opacity: 0.9 }}>
              {eventInfo.event.extendedProps.schoolName}
            </div>
            <div style={{ opacity: 0.8, marginTop: '0.25rem' }}>
              {eventInfo.event.extendedProps.topic}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default LessonCalendar;