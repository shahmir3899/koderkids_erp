import React, { useState, useEffect, useRef } from "react";

// Helper: ordinal suffix
const getOrdinalSuffix = (day) => {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

// Helper: format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const suffix = getOrdinalSuffix(day);
  return date
    .toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      weekday: "long",
      timeZone: "UTC",
    })
    .replace(String(day), `${day}${suffix}`);
};

// Convert a 'YYYY-MM-DD' string to the backend's weekday convention
// (0=Monday ... 6=Sunday), matching School.assigned_days / School.is_working_day().
const toSchoolWeekday = (dateStr) => {
  const jsDay = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun
};

const isScheduledDay = (dateStr, workingDays) =>
  Array.isArray(workingDays) && workingDays.includes(toSchoolWeekday(dateStr));

/**
 * DateGrid - Step 2 of the lesson plan wizard.
 *
 * `workingDays` (0=Mon..6=Sun, from the selected School.assigned_days) is used
 * to pre-check the school's regular class days for the chosen month. Every
 * other date stays freely selectable/deselectable - teachers can add makeup
 * sessions on non-scheduled days, or uncheck a scheduled day that's skipped.
 * Nothing here restricts which dates can be chosen; it only sets sensible
 * defaults and flags the difference visually.
 */
const DateGrid = ({ selectedMonth, selectedDates, onDatesChange, error, workingDays = [] }) => {
  const [allDates, setAllDates] = useState([]);
  const autoFilledKeyRef = useRef(null);
  const workingDaysKey = JSON.stringify([...workingDays].sort());

  // Generate all dates for the selected month
  useEffect(() => {
    if (!selectedMonth) {
      setAllDates([]);
      return;
    }

    const [year, month] = selectedMonth.split("-").map(Number);
    const dates = [];
    const date = new Date(Date.UTC(year, month - 1, 1));

    while (date.getUTCMonth() === month - 1) {
      dates.push(date.toISOString().split("T")[0]);
      date.setUTCDate(date.getUTCDate() + 1);
    }

    setAllDates(dates);

    // Pre-check the school's scheduled class days, once per month+school
    // combination, and only while nothing has been picked yet - so this
    // never overwrites dates the teacher has already toggled by hand.
    const key = `${selectedMonth}|${workingDaysKey}`;
    if (autoFilledKeyRef.current !== key) {
      autoFilledKeyRef.current = key;
      if (workingDays.length > 0 && selectedDates.length === 0) {
        const scheduled = dates.filter((d) => isScheduledDay(d, workingDays));
        if (scheduled.length > 0) {
          onDatesChange(scheduled);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, workingDaysKey]);

  const toggleDate = (dateStr) => {
    if (selectedDates.includes(dateStr)) {
      onDatesChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      onDatesChange([...selectedDates, dateStr]);
    }
  };

  return (
    <div style={styles.container}>
      {selectedMonth && workingDays.length === 0 && (
        <div style={styles.warningBanner}>
          ⚠️ This school has no working days configured, so no dates were pre-selected.
          Choose session dates manually below, or set the school's schedule in School settings.
        </div>
      )}

      {selectedMonth && workingDays.length > 0 && (
        <div style={styles.infoBanner}>
          ✅ Regular class days for this school are pre-checked and tagged{" "}
          <strong>Class day</strong>. You can still uncheck any of them or add extra dates
          (e.g. makeup classes) — they'll be tagged <strong>Makeup</strong>.
        </div>
      )}

      {allDates.length === 0 ? (
        <div style={styles.emptyState}>
          No dates available for the selected month
        </div>
      ) : (
        <>
          <div style={styles.grid}>
            {allDates.map((dateStr) => {
              const scheduled = isScheduledDay(dateStr, workingDays);
              const checked = selectedDates.includes(dateStr);
              return (
                <label
                  key={dateStr}
                  style={{
                    ...styles.dateItem,
                    ...(scheduled ? styles.dateItemScheduled : {}),
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDate(dateStr)}
                    style={styles.checkbox}
                  />
                  <span style={styles.dateLabel}>{formatDate(dateStr)}</span>
                  {scheduled && <span style={styles.scheduledTag}>Class day</span>}
                  {checked && !scheduled && <span style={styles.makeupTag}>Makeup</span>}
                </label>
              );
            })}
          </div>

          <div style={styles.selectionCount}>
            {selectedDates.length} date(s) selected
          </div>
        </>
      )}

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },

  dateItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #e5e7eb',
  },

  dateItemScheduled: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },

  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },

  dateLabel: {
    fontSize: '14px',
    color: '#374151',
    flex: 1,
  },

  scheduledTag: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
    padding: '2px 8px',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
  },

  makeupTag: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '2px 8px',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
  },

  selectionCount: {
    marginTop: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#3b82f6',
    textAlign: 'center',
  },

  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },

  warningBanner: {
    marginBottom: '12px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    lineHeight: 1.5,
  },

  infoBanner: {
    marginBottom: '12px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    lineHeight: 1.5,
  },

  error: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#dc2626',
  },
};

export default DateGrid;
