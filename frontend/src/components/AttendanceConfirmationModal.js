import React from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../utils/designConstants';

/**
 * Attendance Confirmation Modal
 * Shows attendance status after teacher login with an OK button to dismiss
 */
const AttendanceConfirmationModal = ({ isOpen, onClose, attendanceData }) => {
  if (!isOpen || !attendanceData || !attendanceData.records || attendanceData.records.length === 0) {
    return null;
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'present':
        return {
          icon: '✅',
          color: COLORS.status.success,
          bgColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          label: 'Present',
        };
      case 'out_of_range':
        return {
          icon: '📍',
          color: COLORS.status.warning,
          bgColor: 'rgba(245, 158, 11, 0.1)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          label: 'Out of Range',
        };
      case 'location_unavailable':
        return {
          icon: '📍',
          color: COLORS.status.info || '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.3)',
          label: 'Location Unavailable',
        };
      default:
        return {
          icon: 'ℹ️',
          color: COLORS.text.secondary,
          bgColor: 'rgba(107, 114, 128, 0.1)',
          borderColor: 'rgba(107, 114, 128, 0.3)',
          label: status,
        };
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>📋</span>
          <h2 style={styles.title}>Attendance Status</h2>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {attendanceData.records.map((record, index) => {
            const config = getStatusConfig(record.status);
            const wasUpdated = record.updated;
            const alreadyMarked = record.already_marked && !record.updated;

            return (
              <div
                key={`${record.school_id}-${index}`}
                style={{
                  ...styles.recordCard,
                  backgroundColor: config.bgColor,
                  borderColor: config.borderColor,
                }}
              >
                <div style={styles.recordHeader}>
                  <span style={styles.statusIcon}>{config.icon}</span>
                  <div style={styles.recordInfo}>
                    <span style={styles.schoolName}>{record.school_name}</span>
                    <span style={{ ...styles.statusLabel, color: config.color }}>
                      {config.label}
                      {wasUpdated && ' (Updated)'}
                      {alreadyMarked && ' (Already Recorded)'}
                    </span>
                  </div>
                </div>

                {/* Additional details */}
                <div style={styles.recordDetails}>
                  {record.distance && (
                    <span style={styles.detailText}>
                      Distance: {Math.round(record.distance)}m from school
                    </span>
                  )}
                  {record.login_time && (
                    <span style={styles.detailText}>
                      Time: {new Date(record.login_time).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* Helpful message for location_unavailable */}
                {record.status === 'location_unavailable' && (
                  <p style={styles.helpText}>
                    Login again with location enabled to update your attendance.
                  </p>
                )}

                {/* Helpful message for out_of_range */}
                {record.status === 'out_of_range' && !alreadyMarked && (
                  <p style={styles.helpText}>
                    You can login again when at school to update to Present.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with OK button */}
        <div style={styles.footer}>
          <button style={styles.okButton} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
    padding: SPACING.md,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.xl,
    maxWidth: '420px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    animation: 'modalSlideIn 0.3s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: `${SPACING.lg} ${SPACING.xl}`,
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    background: 'linear-gradient(135deg, #b166cc 0%, #9a4fb8 100%)',
  },
  headerIcon: {
    fontSize: '28px',
  },
  title: {
    margin: 0,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#fff',
  },
  content: {
    padding: SPACING.xl,
    maxHeight: '50vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  recordCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid',
  },
  recordHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  statusIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  recordInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
    flex: 1,
  },
  schoolName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
  },
  statusLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  recordDetails: {
    marginTop: SPACING.sm,
    marginLeft: '36px',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.secondary,
  },
  helpText: {
    marginTop: SPACING.sm,
    marginLeft: '36px',
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    margin: `${SPACING.sm} 0 0 36px`,
  },
  footer: {
    padding: `${SPACING.md} ${SPACING.xl} ${SPACING.lg}`,
    display: 'flex',
    justifyContent: 'center',
  },
  okButton: {
    padding: `${SPACING.md} ${SPACING.xxl}`,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
    background: 'linear-gradient(135deg, #b166cc 0%, #9a4fb8 100%)',
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '120px',
  },
};

// Add keyframes for animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-attendance-modal-styles]')) {
  styleSheet.setAttribute('data-attendance-modal-styles', '');
  document.head.appendChild(styleSheet);
}

export default AttendanceConfirmationModal;
