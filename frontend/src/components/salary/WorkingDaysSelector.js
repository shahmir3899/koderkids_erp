import React from 'react';

// ============================================
// WORKING DAYS SELECTOR
// ============================================
// Renders the working days for a salary period (union of the teacher's
// assigned schools' weekly class days) as clickable chips defaulting to
// present. Clicking a chip toggles it to absent. Prorated salary is
// basic_salary * presentDays / totalWorkingDays.

export function WorkingDaysSelector({ workingDays, onToggle, onMarkAllPresent, readOnly = false }) {
  const total = workingDays.length;
  const present = workingDays.filter((d) => d.status === 'present').length;
  const absent = total - present;

  if (total === 0) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#FEF3C7', borderRadius: '0.5rem', color: '#92400E', fontSize: '0.9rem' }}>
        No working days found for this period. Check that the teacher's assigned schools have their weekly class days configured.
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <h3 style={{ fontWeight: 'bold', color: '#374151', margin: 0 }}>
          Working Days: {present} present / {absent} absent of {total}
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={onMarkAllPresent}
            style={{
              fontSize: '0.8rem',
              padding: '0.25rem 0.6rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Mark all present
          </button>
        )}
      </div>
      {!readOnly && (
        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.75rem' }}>
          Click a day to toggle it absent. All days default to present.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: '0.5rem' }}>
        {workingDays.map((day) => {
          const isPresent = day.status === 'present';
          return (
            <button
              key={day.date}
              type="button"
              disabled={readOnly}
              onClick={() => onToggle(day.date)}
              title={day.date}
              style={{
                padding: '0.5rem 0.25rem',
                borderRadius: '0.375rem',
                border: `1px solid ${isPresent ? '#A7F3D0' : '#FECACA'}`,
                backgroundColor: isPresent ? '#ECFDF5' : '#FEF2F2',
                color: isPresent ? '#047857' : '#B91C1C',
                fontSize: '0.75rem',
                textAlign: 'center',
                cursor: readOnly ? 'default' : 'pointer',
              }}
            >
              <div>{day.weekday}</div>
              <div>{new Date(day.date).getDate()}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
