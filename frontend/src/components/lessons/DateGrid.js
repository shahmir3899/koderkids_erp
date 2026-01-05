import React, { useState, useEffect } from "react";

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

const DateGrid = ({ selectedMonth, selectedDates, onDatesChange, error }) => {
  const [allDates, setAllDates] = useState([]);

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
  }, [selectedMonth]);

  const toggleDate = (dateStr) => {
    if (selectedDates.includes(dateStr)) {
      onDatesChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      onDatesChange([...selectedDates, dateStr]);
    }
  };

  return (
    <div style={styles.container}>
      {allDates.length === 0 ? (
        <div style={styles.emptyState}>
          No dates available for the selected month
        </div>
      ) : (
        <>
          <div style={styles.grid}>
            {allDates.map((dateStr) => (
              <label key={dateStr} style={styles.dateItem}>
                <input
                  type="checkbox"
                  checked={selectedDates.includes(dateStr)}
                  onChange={() => toggleDate(dateStr)}
                  style={styles.checkbox}
                />
                <span style={styles.dateLabel}>{formatDate(dateStr)}</span>
              </label>
            ))}
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

  error: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#dc2626',
  },
};

export default DateGrid;
