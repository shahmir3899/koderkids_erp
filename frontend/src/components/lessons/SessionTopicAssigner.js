import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faCalendar, faCheck } from "@fortawesome/free-solid-svg-icons";
import BookTreeSelect from "../BookTreeSelect";
import { ClipLoader } from "react-spinners";

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

const SessionTopicAssigner = ({
  selectedDates,
  selectedBookData,
  sessionTopics,
  onTopicsUpdate,
  error,
}) => {
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [tempSelectedTopics, setTempSelectedTopics] = useState([]);

  const openTopicSelector = (dateStr) => {
    setEditingDate(dateStr);
    setTempSelectedTopics(sessionTopics[dateStr]?.topicIds || []);
    setShowTopicModal(true);
  };

  const confirmTopicSelection = () => {
    if (editingDate) {
      onTopicsUpdate(editingDate, tempSelectedTopics);
    }
    setShowTopicModal(false);
    setEditingDate(null);
    setTempSelectedTopics([]);
  };

  const cancelTopicSelection = () => {
    setShowTopicModal(false);
    setEditingDate(null);
    setTempSelectedTopics([]);
  };

  const getTopicStatus = (dateStr) => {
    const topics = sessionTopics[dateStr];
    if (!topics || topics.topicIds.length === 0) {
      return {
        text: 'Not selected',
        icon: null,
        color: '#ef4444',
      };
    }
    return {
      text: `${topics.topicIds.length} topic(s) selected`,
      icon: faCheck,
      color: '#10b981',
    };
  };

  if (!selectedBookData) {
    return (
      <div style={styles.loadingContainer}>
        <ClipLoader size={40} color="#3b82f6" />
        <p style={styles.loadingText}>Loading book data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        <strong>Book:</strong> {selectedBookData.title}
      </div>

      <div style={styles.sessionsList}>
        {selectedDates.map((dateStr) => {
          const status = getTopicStatus(dateStr);
          return (
            <div key={dateStr} style={styles.sessionCard}>
              <div style={styles.sessionHeader}>
                <FontAwesomeIcon icon={faCalendar} style={styles.calendarIcon} />
                <div style={styles.sessionDate}>{formatDate(dateStr)}</div>
              </div>

              <div style={styles.sessionStatus}>
                <span style={{ ...styles.statusText, color: status.color }}>
                  {status.icon && <FontAwesomeIcon icon={status.icon} style={{ marginRight: '6px' }} />}
                  {status.text}
                </span>
              </div>

              <button
                onClick={() => openTopicSelector(dateStr)}
                style={
                  sessionTopics[dateStr]?.topicIds.length > 0
                    ? styles.editButton
                    : styles.selectButton
                }
              >
                {sessionTopics[dateStr]?.topicIds.length > 0 ? 'Edit Topics' : 'Select Topics'}
              </button>
            </div>
          );
        })}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Topic Selection Modal */}
      {showTopicModal && (
        <div style={styles.modalOverlay} onClick={cancelTopicSelection}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={cancelTopicSelection}
              style={styles.closeButton}
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <h3 style={styles.modalTitle}>
              Select Topics for {formatDate(editingDate)}
            </h3>

            <div style={styles.bookInfo}>
              <strong>Book:</strong> {selectedBookData.title}
            </div>

            <div style={styles.treeContainer}>
              <BookTreeSelect
                books={[selectedBookData]}
                selectedIds={tempSelectedTopics}
                onSelect={(ids) => setTempSelectedTopics(ids)}
              />
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={confirmTopicSelection}
                style={styles.confirmButton}
                disabled={tempSelectedTopics.length === 0}
              >
                Confirm ({tempSelectedTopics.length} selected)
              </button>

              <button onClick={cancelTopicSelection} style={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },

  info: {
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1e40af',
    marginBottom: '20px',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },

  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },

  sessionsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    maxHeight: '500px',
    overflowY: 'auto',
    padding: '4px',
  },

  sessionCard: {
    padding: '20px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },

  sessionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },

  calendarIcon: {
    fontSize: '20px',
    color: '#3b82f6',
  },

  sessionDate: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
  },

  sessionStatus: {
    marginBottom: '16px',
    minHeight: '24px',
  },

  statusText: {
    fontSize: '14px',
    fontWeight: '500',
  },

  selectButton: {
    width: '100%',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  editButton: {
    width: '100%',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  error: {
    marginTop: '16px',
    padding: '12px',
    fontSize: '14px',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },

  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },

  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    zIndex: 1,
  },

  modalTitle: {
    padding: '24px 24px 16px',
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    borderBottom: '1px solid #e5e7eb',
  },

  bookInfo: {
    padding: '12px 24px',
    backgroundColor: '#f9fafb',
    fontSize: '14px',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },

  treeContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '20px 24px',
  },

  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
  },

  confirmButton: {
    flex: 1,
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  cancelButton: {
    flex: 1,
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default SessionTopicAssigner;
