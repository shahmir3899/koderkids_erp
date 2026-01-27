// ============================================
// APPROVAL QUEUE WIDGET - Minimalistic Admin Component
// ============================================
// Location: src/components/admin/ApprovalQueueWidget.js

import React, { useState, useEffect } from 'react';
import { reportRequestService } from '../../services/reportRequestService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';

/**
 * ApprovalQueueWidget Component
 * Minimalistic widget showing pending approval requests count
 * with a button to open the approval modal
 *
 * @param {Object} props
 * @param {Function} props.onOpenModal - Callback to open approval modal with requests
 */
export const ApprovalQueueWidget = ({ onOpenModal }) => {
  const [stats, setStats] = useState({ pending: 0 });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Fetch stats and pending requests
  useEffect(() => {
    const fetchData = async (silent = false) => {
      try {
        if (!silent) setIsLoading(true);
        const [statsData, pendingData] = await Promise.all([
          reportRequestService.fetchStats({ silent }),
          reportRequestService.fetchPendingRequests({ silent }),
        ]);
        setStats(statsData);
        setPendingRequests(pendingData.results || []);
      } catch (error) {
        console.error('Error fetching approval data:', error);
      } finally {
        if (!silent) setIsLoading(false);
      }
    };

    // Initial fetch with loader
    fetchData(false);

    // Background polling every 30 seconds (silent - no loader)
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    if (onOpenModal && pendingRequests.length > 0) {
      onOpenModal(pendingRequests);
    }
  };

  // Don't render if no pending requests
  if (!isLoading && stats.pending === 0) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading || stats.pending === 0}
      style={{
        ...styles.container,
        ...(isHovered && stats.pending > 0 ? styles.containerHover : {}),
        ...(isLoading ? styles.loading : {}),
      }}
      title={`${stats.pending} pending approval${stats.pending !== 1 ? 's' : ''}`}
    >
      {/* Icon */}
      <div style={styles.iconWrapper}>
        <svg
          style={styles.icon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {/* Badge */}
        {stats.pending > 0 && (
          <span style={styles.badge}>
            {stats.pending > 9 ? '9+' : stats.pending}
          </span>
        )}
      </div>

      {/* Label */}
      <span style={styles.label}>
        {isLoading ? 'Loading...' : `${stats.pending} Pending`}
      </span>
    </button>
  );
};

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal} ease`,
    fontFamily: 'Inter, sans-serif',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: '#FBBF24',
  },
  containerHover: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderColor: 'rgba(251, 191, 36, 0.5)',
    transform: 'translateY(-1px)',
  },
  loading: {
    opacity: 0.7,
    cursor: 'default',
  },
  iconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: '18px',
    height: '18px',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-8px',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    backgroundColor: COLORS.status.warning,
    color: '#000',
    fontSize: '10px',
    fontWeight: FONT_WEIGHTS.bold,
    borderRadius: BORDER_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    whiteSpace: 'nowrap',
  },
};

export default ApprovalQueueWidget;
