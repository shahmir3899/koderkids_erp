import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faCalendar, faCheck, faBook, faEdit } from "@fortawesome/free-solid-svg-icons";
import BookTreeSelect from "../BookTreeSelect";
import { ClipLoader } from "react-spinners";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from "../../utils/designConstants";

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
  const [tempCustomText, setTempCustomText] = useState('');
  const [tempMode, setTempMode] = useState('book'); // 'book' or 'custom'

  const openTopicSelector = (dateStr) => {
    setEditingDate(dateStr);
    const existingData = sessionTopics[dateStr];
    // Restore previous mode and data
    if (existingData?.mode === 'custom') {
      setTempMode('custom');
      setTempCustomText(existingData.customText || '');
      setTempSelectedTopics([]);
    } else {
      setTempMode('book');
      setTempSelectedTopics(existingData?.topicIds || []);
      setTempCustomText('');
    }
    setShowTopicModal(true);
  };

  const confirmTopicSelection = () => {
    if (editingDate) {
      if (tempMode === 'custom') {
        // Custom mode: send text
        onTopicsUpdate(editingDate, [], tempMode, tempCustomText);
      } else {
        // Book mode: send topic IDs
        onTopicsUpdate(editingDate, tempSelectedTopics, tempMode, '');
      }
    }
    setShowTopicModal(false);
    setEditingDate(null);
    setTempSelectedTopics([]);
    setTempCustomText('');
    setTempMode('book');
  };

  const cancelTopicSelection = () => {
    setShowTopicModal(false);
    setEditingDate(null);
    setTempSelectedTopics([]);
    setTempCustomText('');
    setTempMode('book');
  };

  const getTopicStatus = (dateStr) => {
    const data = sessionTopics[dateStr];

    // Check if custom mode with text
    if (data?.mode === 'custom' && data.customText?.trim()) {
      return {
        text: 'Custom topic set',
        icon: faEdit,
        color: COLORS.status.success,
        mode: 'custom',
      };
    }

    // Check if book mode with topics
    if (data?.topicIds?.length > 0) {
      return {
        text: `${data.topicIds.length} topic(s) selected`,
        icon: faBook,
        color: COLORS.status.success,
        mode: 'book',
      };
    }

    // Not selected
    return {
      text: 'Not selected',
      icon: null,
      color: COLORS.status.error,
      mode: null,
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
                  status.mode
                    ? styles.editButton
                    : styles.selectButton
                }
              >
                {status.mode ? 'Edit Topic' : 'Set Topic'}
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
              Set Topic for {formatDate(editingDate)}
            </h3>

            {/* Mode Toggle */}
            <div style={styles.modeToggleContainer}>
              <button
                onClick={() => setTempMode('book')}
                style={tempMode === 'book' ? styles.modeButtonActive : styles.modeButton}
              >
                <FontAwesomeIcon icon={faBook} style={{ marginRight: '8px' }} />
                From Book
              </button>
              <button
                onClick={() => setTempMode('custom')}
                style={tempMode === 'custom' ? styles.modeButtonActive : styles.modeButton}
              >
                <FontAwesomeIcon icon={faEdit} style={{ marginRight: '8px' }} />
                Custom Topic
              </button>
            </div>

            {/* Book Mode: Topic Tree */}
            {tempMode === 'book' && (
              <>
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
              </>
            )}

            {/* Custom Mode: Text Input */}
            {tempMode === 'custom' && (
              <div style={styles.customInputContainer}>
                <label style={styles.customLabel}>Enter your custom topic:</label>
                <textarea
                  value={tempCustomText}
                  onChange={(e) => setTempCustomText(e.target.value)}
                  placeholder="Describe the topic you'll be teaching in this session..."
                  style={styles.customTextarea}
                  rows={5}
                />
                <p style={styles.customHint}>
                  Use this option when teaching content not from the selected book.
                </p>
              </div>
            )}

            <div style={styles.modalFooter}>
              <button
                onClick={confirmTopicSelection}
                style={styles.confirmButton}
                disabled={
                  tempMode === 'book'
                    ? tempSelectedTopics.length === 0
                    : !tempCustomText.trim()
                }
              >
                {tempMode === 'book'
                  ? `Confirm (${tempSelectedTopics.length} selected)`
                  : 'Confirm Custom Topic'
                }
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
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: `1px solid ${COLORS.status.info}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    marginBottom: SPACING.lg,
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: SPACING.md,
  },

  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    margin: 0,
  },

  sessionsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: SPACING.md,
    maxHeight: '500px',
    overflowY: 'auto',
    padding: SPACING.xs,
  },

  sessionCard: {
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.lg,
    transition: `all ${TRANSITIONS.normal}`,
  },

  sessionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  calendarIcon: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.status.info,
  },

  sessionDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  sessionStatus: {
    marginBottom: SPACING.md,
    minHeight: '24px',
  },

  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },

  selectButton: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.info,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
  },

  editButton: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
  },

  error: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: '#FCA5A5',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: BORDER_RADIUS.md,
  },

  // Modal Styles - Glassmorphic
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },

  modalContent: {
    background: COLORS.background.gradient,
    borderRadius: BORDER_RADIUS.xl,
    width: '90%',
    maxWidth: '700px',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    background: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.white,
    cursor: 'pointer',
    zIndex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${TRANSITIONS.normal}`,
  },

  modalTitle: {
    padding: `${SPACING.xl} ${SPACING.xl} ${SPACING.md}`,
    margin: 0,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.05)',
  },

  // Mode Toggle Styles
  modeToggleContainer: {
    display: 'flex',
    gap: SPACING.sm,
    padding: `${SPACING.md} ${SPACING.xl}`,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    background: 'rgba(255, 255, 255, 0.03)',
  },

  modeButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeButtonActive: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.info,
    border: `1px solid ${COLORS.status.info}`,
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookInfo: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  treeContainer: {
    flex: 1,
    overflow: 'auto',
    padding: `${SPACING.lg} ${SPACING.xl}`,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },

  // Custom Input Styles
  customInputContainer: {
    padding: `${SPACING.lg} ${SPACING.xl}`,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },

  customLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
  },

  customTextarea: {
    width: '100%',
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    resize: 'vertical',
    minHeight: '120px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
  },

  customHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    margin: 0,
    fontStyle: 'italic',
  },

  modalFooter: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    display: 'flex',
    gap: SPACING.sm,
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.05)',
  },

  confirmButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: COLORS.status.info,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
  },

  cancelButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
  },
};

export default SessionTopicAssigner;
