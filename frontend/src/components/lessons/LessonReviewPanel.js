import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";

// Helper: ordinal suffix
const getOrdinalSuffix = (day) => {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

// Helper: format date (short version for table)
const formatDateShort = (dateString) => {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const suffix = getOrdinalSuffix(day);
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const year = date.toLocaleDateString("en-US", { year: "2-digit", timeZone: "UTC" });
  const weekday = date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${day}${suffix} ${month} '${year}, ${weekday}`;
};

const LessonReviewPanel = ({
  wizardData,
  onWizardDataChange,
  onEditSession,
  schools,
  classes,
  errors,
}) => {
  const handleQuickEdit = (field, value) => {
    onWizardDataChange({ ...wizardData, [field]: value });
  };

  const getTotalTopics = () => {
    return Object.values(wizardData.sessionTopics).reduce(
      (sum, session) => sum + (session?.topicIds?.length || 0),
      0
    );
  };

  return (
    <div style={styles.container}>
      {/* Quick Edit Section */}
      <div style={styles.quickEditSection}>
        <h4 style={styles.sectionTitle}>Quick Edit</h4>
        <div style={styles.quickEditGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>School</label>
            <select
              style={styles.select}
              value={wizardData.selectedSchool || ''}
              onChange={(e) => handleQuickEdit('selectedSchool', e.target.value)}
            >
              <option value="">-- Select School --</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.selectedSchool && (
              <div style={styles.error}>{errors.selectedSchool}</div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Class</label>
            <select
              style={styles.select}
              value={wizardData.selectedClass || ''}
              onChange={(e) => handleQuickEdit('selectedClass', e.target.value)}
            >
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.selectedClass && (
              <div style={styles.error}>{errors.selectedClass}</div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Month</label>
            <input
              type="month"
              style={styles.input}
              value={wizardData.selectedMonth}
              onChange={(e) => handleQuickEdit('selectedMonth', e.target.value)}
            />
            {errors.selectedMonth && (
              <div style={styles.error}>{errors.selectedMonth}</div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.summarySection}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>{wizardData.selectedDates.length}</div>
          <div style={styles.summaryLabel}>Sessions</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>{getTotalTopics()}</div>
          <div style={styles.summaryLabel}>Total Topics</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>
            {wizardData.selectedBookData?.title || 'N/A'}
          </div>
          <div style={styles.summaryLabel}>Book</div>
        </div>
      </div>

      {/* Lessons Table */}
      <div style={styles.tableSection}>
        <h4 style={styles.sectionTitle}>
          Planned Lessons ({wizardData.selectedDates.length} sessions)
        </h4>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Topics</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wizardData.selectedDates.map((dateStr, index) => {
                const topics = wizardData.sessionTopics[dateStr];
                const topicCount = topics?.topicIds?.length || 0;

                return (
                  <tr key={dateStr} style={styles.tr}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>{formatDateShort(dateStr)}</td>
                    <td style={styles.td}>
                      {topicCount > 0 ? (
                        <span style={styles.topicCount}>
                          {topicCount} topic{topicCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={styles.noTopics}>Not assigned</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => onEditSession(dateStr)}
                        style={styles.editButton}
                      >
                        <FontAwesomeIcon icon={faEdit} style={{ marginRight: '6px' }} />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },

  quickEditSection: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '24px',
  },

  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },

  quickEditGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },

  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },

  select: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1f2937',
    outline: 'none',
  },

  input: {
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1f2937',
    outline: 'none',
  },

  error: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#dc2626',
  },

  summarySection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },

  summaryCard: {
    padding: '20px',
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    textAlign: 'center',
  },

  summaryNumber: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '8px',
  },

  summaryLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#3b82f6',
    textTransform: 'uppercase',
  },

  tableSection: {
    marginBottom: '16px',
  },

  tableContainer: {
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
  },

  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#3b82f6',
    borderBottom: '2px solid #2563eb',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },

  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
  },

  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
  },

  topicCount: {
    display: 'inline-block',
    padding: '4px 10px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#059669',
    backgroundColor: '#d1fae5',
    borderRadius: '12px',
  },

  noTopics: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },

  editButton: {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default LessonReviewPanel;
