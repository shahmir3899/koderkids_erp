// ============================================
// TASK PANEL - Tasks Dropdown for Header
// ============================================
// Location: src/components/common/ui/TaskPanel.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApiService } from '../../../utils/taskApi';
import { useResponsive } from '../../../hooks/useResponsive';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
  MIXINS,
  TOUCH_TARGETS,
} from '../../../utils/designConstants';

/**
 * TaskPanel Component
 * Displays a dropdown with user's assigned tasks
 */
export const TaskPanel = ({ onTaskClick }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef(null);
  const { isMobile } = useResponsive();

  // Fetch pending count on mount
  useEffect(() => {
    fetchPendingCount();

    // Poll for new tasks every 5 minutes
    const interval = setInterval(fetchPendingCount, 300000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch pending/in_progress count
  const fetchPendingCount = async () => {
    try {
      const data = await taskApiService.getMyTasks();
      const pendingTasks = data.filter(t =>
        t.status === 'pending' || t.status === 'in_progress' || t.status === 'overdue'
      );
      setPendingCount(pendingTasks.length);
    } catch (error) {
      console.error('Error fetching task count:', error);
    }
  };

  // Fetch tasks when panel opens
  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await taskApiService.getMyTasks();
      // Sort by priority and due date, show most urgent first
      const sorted = data.sort((a, b) => {
        // Overdue first
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        // Then by priority
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      });
      setTasks(sorted.slice(0, 10)); // Show top 10
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle panel
  const togglePanel = () => {
    if (!isOpen) {
      fetchTasks();
    }
    setIsOpen(!isOpen);
  };

  // Handle task click
  const handleTaskClick = async (task) => {
    setIsOpen(false);
    if (onTaskClick) {
      onTaskClick(task);
    }
    // Navigate to my-tasks page
    navigate('/my-tasks');
  };

  // Handle view all click
  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/my-tasks');
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#EAB308';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'overdue': return '⚠️';
      case 'pending': return '⏳';
      default: return '📋';
    }
  };

  // Format due date
  const formatDueDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days < 7) return `Due in ${days} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get responsive styles
  const styles = getStyles(isMobile);

  return (
    <div ref={panelRef} style={styles.container}>
      {/* Task Button */}
      <button
        onClick={togglePanel}
        style={styles.taskButton}
        aria-label={`Tasks ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}`}
        className="profile-icon-button"
      >
        <svg style={styles.taskIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>

        {/* Badge */}
        {pendingCount > 0 && (
          <span style={styles.badge}>
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          {isMobile && (
            <div
              style={styles.mobileBackdrop}
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
          )}
          <div style={styles.panel}>
            {/* Panel Header */}
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>My Tasks</h3>
              <div style={styles.headerActions}>
                {pendingCount > 0 && (
                  <span style={styles.pendingBadge}>
                    {pendingCount} pending
                  </span>
                )}
                {isMobile && (
                  <button
                    onClick={() => setIsOpen(false)}
                    style={styles.closeButton}
                    aria-label="Close tasks"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Tasks List */}
            <div style={styles.taskList}>
              {isLoading ? (
                <div style={styles.loadingState}>
                  <div style={styles.spinner} />
                  <span>Loading tasks...</span>
                </div>
              ) : tasks.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={{ fontSize: '2rem' }}>🎉</span>
                  <span>No pending tasks!</span>
                  <span style={styles.emptySubtext}>You're all caught up</span>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      ...styles.taskItem,
                      borderLeft: `3px solid ${getPriorityColor(task.priority)}`,
                    }}
                    onClick={() => handleTaskClick(task)}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={styles.taskIcon2}>
                      {getStatusIcon(task.status)}
                    </div>
                    <div style={styles.taskContent}>
                      <p style={styles.taskTitle}>{task.title}</p>
                      <div style={styles.taskMeta}>
                        <span style={{
                          ...styles.priorityBadge,
                          backgroundColor: `${getPriorityColor(task.priority)}20`,
                          color: getPriorityColor(task.priority),
                        }}>
                          {task.priority}
                        </span>
                        <span style={{
                          ...styles.dueDateText,
                          color: task.status === 'overdue' ? COLORS.status.error : COLORS.text.whiteSubtle,
                        }}>
                          {formatDueDate(task.due_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Panel Footer */}
            <div style={styles.panelFooter}>
              <button style={styles.viewAllButton} onClick={handleViewAll}>
                View all tasks →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Responsive Styles Generator
const getStyles = (isMobile) => ({
  container: {
    position: 'relative',
  },
  taskButton: {
    position: 'relative',
    padding: isMobile ? SPACING.sm : SPACING.xs,
    background: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.9)',
    transition: `all ${TRANSITIONS.normal} ease`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: isMobile ? TOUCH_TARGETS.minimum : 'auto',
    minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
  },
  taskIcon: {
    width: isMobile ? '28px' : '32px',
    height: isMobile ? '28px' : '32px',
  },
  badge: {
    position: 'absolute',
    top: isMobile ? '2px' : SPACING.xs,
    right: isMobile ? '2px' : SPACING.xs,
    minWidth: SPACING.md,
    height: SPACING.md,
    padding: `0 ${SPACING.xs}`,
    backgroundColor: COLORS.status.warning,
    color: '#000',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    borderRadius: BORDER_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: Z_INDEX.popover - 1,
  },
  panel: {
    position: isMobile ? 'fixed' : 'absolute',
    top: isMobile ? 0 : '100%',
    left: isMobile ? 0 : 'auto',
    right: 0,
    bottom: isMobile ? 0 : 'auto',
    width: isMobile ? '100%' : '380px',
    maxWidth: isMobile ? '100%' : '380px',
    maxHeight: isMobile ? '100vh' : '500px',
    ...MIXINS.glassmorphicCard,
    borderRadius: isMobile ? 0 : BORDER_RADIUS.md,
    overflow: 'hidden',
    zIndex: Z_INDEX.popover,
    marginTop: isMobile ? 0 : SPACING.xs,
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? SPACING.md : SPACING.sm,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    flexShrink: 0,
    paddingTop: isMobile ? `max(${SPACING.md}, env(safe-area-inset-top))` : SPACING.sm,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  panelTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: 0,
  },
  pendingBadge: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    color: '#EAB308',
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  closeButton: {
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    cursor: 'pointer',
    minWidth: TOUCH_TARGETS.minimum,
    minHeight: TOUCH_TARGETS.minimum,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    maxHeight: isMobile ? 'none' : '380px',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: isMobile ? SPACING.md : SPACING.sm,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    cursor: 'pointer',
    transition: `background-color ${TRANSITIONS.fast} ease`,
    position: 'relative',
    minHeight: isMobile ? TOUCH_TARGETS.large : 'auto',
    backgroundColor: 'transparent',
  },
  taskIcon2: {
    flexShrink: 0,
    fontSize: isMobile ? '1.2rem' : '1rem',
    marginTop: '2px',
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: isMobile ? FONT_SIZES.md : FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    margin: 0,
    marginBottom: SPACING.xs,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  taskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    padding: `2px ${SPACING.xs}`,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    textTransform: 'capitalize',
  },
  dueDateText: {
    fontSize: FONT_SIZES.xs,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    color: COLORS.text.whiteSubtle,
    gap: SPACING.sm,
    flex: 1,
  },
  spinner: {
    width: SPACING.lg,
    height: SPACING.lg,
    border: `2px solid ${COLORS.border.whiteTransparent}`,
    borderTopColor: COLORS.accent.cyan,
    borderRadius: BORDER_RADIUS.full,
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    color: COLORS.text.whiteSubtle,
    gap: SPACING.sm,
    flex: 1,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  panelFooter: {
    padding: isMobile ? SPACING.md : SPACING.sm,
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    textAlign: 'center',
    flexShrink: 0,
    paddingBottom: isMobile ? `max(${SPACING.md}, env(safe-area-inset-bottom))` : SPACING.sm,
  },
  viewAllButton: {
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: COLORS.accent.cyan,
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `background-color ${TRANSITIONS.fast} ease`,
    minHeight: isMobile ? TOUCH_TARGETS.minimum : 'auto',
    width: isMobile ? '100%' : 'auto',
  },
});

export default TaskPanel;
