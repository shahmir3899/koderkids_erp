// frontend/src/components/teacher/OnlineStudentsTab.js
// Displays the teacher's online students grouped by time slot.
// Used inside TeacherDashboardFigma under the "My Online Students" collapsible.

import React, { useState, useEffect } from 'react';
import { getMyOnlineStudents } from '../../services/teacherOnlineStudentsService';

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '12px',
  border: '1px solid rgba(255,255,255,0.12)',
};

const BADGE_STYLE = (color) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: color,
  color: '#fff',
  marginLeft: '6px',
});

const feeColor = (status) => {
  if (status === 'Paid') return '#22c55e';
  if (status === 'Overdue') return '#ef4444';
  if (status === 'Pending') return '#f59e0b';
  return '#6b7280';
};

export const OnlineStudentsTab = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMyOnlineStudents()
      .then((data) => { if (mounted) { setStudents(data); setLoading(false); } })
      .catch((err) => { if (mounted) { setError(err.message); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div style={{ color: 'rgba(255,255,255,0.6)', padding: '24px', textAlign: 'center' }}>Loading online students…</div>;
  }
  if (error) {
    return <div style={{ color: '#ef4444', padding: '16px' }}>Error: {error}</div>;
  }
  if (students.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.5)', padding: '24px', textAlign: 'center' }}>
        No online students assigned to your time slots yet.
      </div>
    );
  }

  // Group students by time slot
  const groups = students.reduce((acc, student) => {
    const key = student.time_slot_id || 'unslotted';
    const label = student.time_slot_label || 'No Time Slot';
    if (!acc[key]) acc[key] = { label, students: [] };
    acc[key].students.push(student);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(groups).map(([slotKey, group]) => (
        <div key={slotKey} style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#67e8f9', fontSize: '14px', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.05em' }}>
            🕐 {group.label}
            <span style={BADGE_STYLE('#0e7490')}>{group.students.length} student{group.students.length !== 1 ? 's' : ''}</span>
          </h3>
          {group.students.map((student) => (
            <div key={student.id} style={CARD_STYLE}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{student.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginLeft: '8px' }}>#{student.reg_num}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginLeft: '6px' }}>· {student.school_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={BADGE_STYLE(feeColor(student.fee_status))}>{student.fee_status}</span>
                  <span style={{ color: '#facc15', fontSize: '12px', fontWeight: 600 }}>🔥 {student.streak}d streak</span>
                </div>
              </div>

              {/* Books Progress */}
              {student.enrolled_books.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {student.enrolled_books.map((book) => (
                    <div key={book.enrollment_id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 10px', minWidth: '150px' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', fontWeight: 600 }}>
                        📚 {book.book_title}
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${book.progress_percentage}%`, background: '#22d3ee', borderRadius: '2px', transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>{book.progress_percentage}%</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Quizzes */}
              {student.recent_quizzes.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {student.recent_quizzes.slice(0, 3).map((quiz, i) => (
                    <span key={i} style={{ fontSize: '11px', background: quiz.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: quiz.passed ? '#86efac' : '#fca5a5', borderRadius: '6px', padding: '2px 8px', border: `1px solid ${quiz.passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      {quiz.quiz_title}: {quiz.score}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default OnlineStudentsTab;
