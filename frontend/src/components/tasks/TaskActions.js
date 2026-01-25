/**
 * Task Actions Component - Glassmorphism Design System
 * Location: frontend/src/components/tasks/TaskActions.js
 * Refactored to remove Bootstrap dependencies
 */

import { useState } from 'react';
import { TASK_STATUSES, taskConstants, taskErrorHandling, taskApiService } from '../../utils/taskApi';

// Design Constants
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    BORDER_RADIUS,
    SHADOWS,
    TRANSITIONS,
} from '../../utils/designConstants';

const TaskActions = ({ task, onUpdate, onShowBulkModal, onShowEditModal }) => {
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [assigningToAll, setAssigningToAll] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionAnswer, setCompletionAnswer] = useState('');

    /**
     * Handle task status update
     */
    const handleStatusUpdate = async (newStatus, completionAnswerText = '') => {
        taskErrorHandling.setLoading(setUpdating, true);

        try {
            await taskApiService.updateTaskStatus(task.id, {
                status: newStatus,
                completion_answer: completionAnswerText
            });

            taskErrorHandling.handleSuccess('Task status updated successfully');

            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            taskErrorHandling.handleTaskError(error);
        } finally {
            taskErrorHandling.setLoading(setUpdating, false);
        }
    };

    /**
     * Handle task deletion
     */
    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }

        taskErrorHandling.setLoading(setDeleting, true);

        try {
            await taskApiService.deleteTask(task.id);

            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            taskErrorHandling.handleTaskError(error);
        } finally {
            taskErrorHandling.setLoading(setDeleting, false);
        }
    };

    /**
     * Get status label and color
     */
    const getStatusInfo = (status) => {
        const label = taskConstants.statusLabels[status] || status;
        const colorMap = {
            [taskConstants.statuses.PENDING]: { bg: '#F3F4F6', text: '#374151' },
            [taskConstants.statuses.IN_PROGRESS]: { bg: '#DBEAFE', text: '#1E40AF' },
            [taskConstants.statuses.COMPLETED]: { bg: '#D1FAE5', text: '#065F46' },
            [taskConstants.statuses.OVERDUE]: { bg: '#FEE2E2', text: '#991B1B' }
        };
        return { label, colors: colorMap[status] || { bg: '#F3F4F6', text: '#374151' } };
    };

    /**
     * Get priority label and color
     */
    const getPriorityInfo = (priority) => {
        const label = taskConstants.priorityLabels[priority] || priority;
        const colorMap = {
            [taskConstants.priorities.LOW]: { bg: '#D1FAE5', text: '#065F46' },
            [taskConstants.priorities.MEDIUM]: { bg: '#FEF3C7', text: '#92400E' },
            [taskConstants.priorities.HIGH]: { bg: '#FEE2E2', text: '#991B1B' },
            [taskConstants.priorities.URGENT]: { bg: '#EDE9FE', text: '#5B21B6' }
        };
        return { label, colors: colorMap[priority] || { bg: '#F3F4F6', text: '#374151' } };
    };

    const statusInfo = getStatusInfo(task.status);
    const priorityInfo = getPriorityInfo(task.priority);
    const isOverdue = task.is_overdue;

    return (
        <div style={styles.taskCard}>
            {/* Task Header with Title and Badges */}
            <div style={styles.taskHeader}>
                <div style={styles.taskTitleSection}>
                    <h4 style={styles.taskTitle}>{task.title}</h4>
                    {task.description && (
                        <p style={styles.taskDescription}>{task.description}</p>
                    )}
                </div>
                <div style={styles.badgesContainer}>
                    {/* Status Badge */}
                    <span style={{
                        ...styles.badge,
                        backgroundColor: isOverdue ? '#FEE2E2' : statusInfo.colors.bg,
                        color: isOverdue ? '#991B1B' : statusInfo.colors.text
                    }}>
                        {statusInfo.label}
                    </span>
                    {/* Priority Badge */}
                    <span style={{
                        ...styles.badge,
                        backgroundColor: priorityInfo.colors.bg,
                        color: priorityInfo.colors.text
                    }}>
                        {priorityInfo.label}
                    </span>
                </div>
            </div>

            {/* Task Details */}
            <div style={styles.taskDetails}>
                {task.assigned_to_name && (
                    <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>👤</span>
                        <span><strong>Assigned to:</strong> {task.assigned_to_name}{task.assigned_to_role && ` (${task.assigned_to_role})`}</span>
                    </div>
                )}
                {task.assigned_by_name && (
                    <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>👨‍💼</span>
                        <span><strong>Created by:</strong> {task.assigned_by_name}{task.assigned_by_role && ` (${task.assigned_by_role})`}</span>
                    </div>
                )}
                {task.task_type && (
                    <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>🏷️</span>
                        <span><strong>Type:</strong> {task.task_type}</span>
                    </div>
                )}
                {task.due_date && (
                    <div style={styles.detailItem}>
                        <span style={styles.detailIcon}>📅</span>
                        <span><strong>Due:</strong> {new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={styles.actionsContainer}>
                {/* Start Task Button */}
                {task.status === taskConstants.statuses.PENDING && (
                    <button
                        onClick={() => handleStatusUpdate(TASK_STATUSES.IN_PROGRESS)}
                        disabled={updating || deleting}
                        style={{
                            ...styles.actionButton,
                            ...styles.buttonBlue,
                            ...(updating ? styles.buttonDisabled : {})
                        }}
                    >
                        {updating ? 'Updating...' : 'Start Task'}
                    </button>
                )}

                {/* Mark Complete Button */}
                {task.status === taskConstants.statuses.IN_PROGRESS && (
                    <button
                        onClick={() => setShowCompletionModal(true)}
                        disabled={updating || deleting}
                        style={{
                            ...styles.actionButton,
                            ...styles.buttonGreen,
                            ...(updating ? styles.buttonDisabled : {})
                        }}
                    >
                        {updating ? 'Completing...' : 'Mark Complete'}
                    </button>
                )}

                {/* Edit Button */}
                <button
                    onClick={() => {
                        if (onShowEditModal) {
                            onShowEditModal(task);
                        }
                    }}
                    disabled={updating || deleting}
                    style={{
                        ...styles.actionButton,
                        ...styles.buttonBlue,
                        ...(updating || deleting ? styles.buttonDisabled : {})
                    }}
                >
                    Edit
                </button>

                {/* Delete Button */}
                <button
                    onClick={handleDelete}
                    disabled={updating || deleting || assigningToAll}
                    style={{
                        ...styles.actionButton,
                        ...styles.buttonRed,
                        ...(deleting || updating || assigningToAll ? styles.buttonDisabled : {})
                    }}
                >
                    {deleting ? 'Deleting...' : 'Delete'}
                </button>

                {/* Assign to All Button - Admin Only */}
                {task.assigned_by_role === 'Admin' && (
                    <button
                        onClick={() => {
                            if (onShowBulkModal) {
                                onShowBulkModal(task);
                            }
                        }}
                        disabled={updating || deleting || assigningToAll}
                        style={{
                            ...styles.actionButton,
                            ...styles.buttonPurple,
                            ...(assigningToAll || updating || deleting ? styles.buttonDisabled : {})
                        }}
                    >
                        {assigningToAll ? 'Assigning...' : 'Assign to All'}
                    </button>
                )}
            </div>

            {/* Loading Overlay */}
            {(updating || deleting || assigningToAll) && (
                <div style={styles.loadingOverlay}>
                    <div style={styles.loadingText}>
                        {updating && 'Updating task...'}
                        {deleting && 'Deleting task...'}
                        {assigningToAll && 'Assigning to all employees...'}
                    </div>
                </div>
            )}

            {/* Completion Modal */}
            {showCompletionModal && (
                <div style={styles.modalOverlay} onClick={() => setShowCompletionModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Complete Task</h3>
                            <button
                                style={styles.modalCloseBtn}
                                onClick={() => setShowCompletionModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Completion Answer *</label>
                                <textarea
                                    rows={4}
                                    value={completionAnswer}
                                    onChange={(e) => setCompletionAnswer(e.target.value)}
                                    placeholder="Describe what you accomplished or provide completion details"
                                    maxLength={500}
                                    style={styles.textarea}
                                />
                                <span style={styles.charCount}>
                                    {completionAnswer.length}/500 characters
                                </span>
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button
                                style={styles.buttonSecondary}
                                onClick={() => setShowCompletionModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                style={{
                                    ...styles.buttonPrimary,
                                    ...(!completionAnswer.trim() || updating ? styles.buttonDisabled : {})
                                }}
                                disabled={!completionAnswer.trim() || updating}
                                onClick={() => {
                                    handleStatusUpdate(taskConstants.statuses.COMPLETED, completionAnswer);
                                    setCompletionAnswer('');
                                    setShowCompletionModal(false);
                                }}
                            >
                                {updating ? 'Completing...' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// STYLES - Glassmorphism Design System
// ============================================
const styles = {
    // Task Card - Glassmorphic
    taskCard: {
        position: 'relative',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        marginBottom: SPACING.md,
    },

    // Task Header
    taskHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
        gap: SPACING.md,
    },
    taskTitleSection: {
        flex: 1,
        minWidth: 0,
        overflow: 'visible',
    },
    taskTitle: {
        margin: `0 0 ${SPACING.sm} 0`,
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.white,
        wordBreak: 'break-word',
        overflow: 'visible',
        textOverflow: 'clip',
        whiteSpace: 'normal',
    },
    taskDescription: {
        margin: 0,
        fontSize: FONT_SIZES.base,
        color: 'rgba(255, 255, 255, 0.85)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflow: 'visible',
    },

    // Badges
    badgesContainer: {
        display: 'flex',
        gap: SPACING.sm,
        flexWrap: 'wrap',
        flexShrink: 0,
    },
    badge: {
        padding: `${SPACING.xs} ${SPACING.md}`,
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
    },

    // Task Details
    taskDetails: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACING.lg,
        marginBottom: SPACING.lg,
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    detailItem: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    detailIcon: {
        fontSize: FONT_SIZES.base,
    },

    // Actions
    actionsContainer: {
        display: 'flex',
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    actionButton: {
        padding: `${SPACING.sm} ${SPACING.md}`,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        border: 'none',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
    },
    buttonBlue: {
        backgroundColor: COLORS.status.info,
        color: COLORS.text.white,
    },
    buttonGreen: {
        backgroundColor: COLORS.status.success,
        color: COLORS.text.white,
    },
    buttonRed: {
        backgroundColor: COLORS.status.error,
        color: COLORS.text.white,
    },
    buttonPurple: {
        backgroundColor: '#8B5CF6',
        color: COLORS.text.white,
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },

    // Loading Overlay
    loadingOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.lg,
    },
    loadingText: {
        color: COLORS.text.white,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
    },

    // Modal
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: SPACING.xl,
    },
    modalContent: {
        background: COLORS.background.white,
        borderRadius: BORDER_RADIUS.xl,
        width: '100%',
        maxWidth: '500px',
        boxShadow: SHADOWS.xl,
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        borderBottom: `1px solid ${COLORS.border.default}`,
    },
    modalTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.primary,
        margin: 0,
    },
    modalCloseBtn: {
        background: 'none',
        border: 'none',
        fontSize: FONT_SIZES['2xl'],
        color: COLORS.text.muted,
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1,
    },
    modalBody: {
        padding: SPACING.lg,
    },
    modalFooter: {
        display: 'flex',
        gap: SPACING.md,
        padding: SPACING.lg,
        borderTop: `1px solid ${COLORS.border.default}`,
    },

    // Form Elements
    formGroup: {
        marginBottom: SPACING.md,
    },
    formLabel: {
        display: 'block',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    textarea: {
        width: '100%',
        padding: SPACING.md,
        fontSize: FONT_SIZES.base,
        border: `1px solid ${COLORS.border.default}`,
        borderRadius: BORDER_RADIUS.lg,
        background: COLORS.background.white,
        color: COLORS.text.primary,
        outline: 'none',
        resize: 'vertical',
        minHeight: '100px',
        fontFamily: 'inherit',
    },
    charCount: {
        display: 'block',
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.muted,
        marginTop: SPACING.xs,
        textAlign: 'right',
    },

    // Modal Buttons
    buttonPrimary: {
        flex: 1,
        padding: `${SPACING.md} ${SPACING.lg}`,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        background: COLORS.status.success,
        color: COLORS.text.white,
        cursor: 'pointer',
    },
    buttonSecondary: {
        flex: 1,
        padding: `${SPACING.md} ${SPACING.lg}`,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        border: `1px solid ${COLORS.border.default}`,
        borderRadius: BORDER_RADIUS.lg,
        background: COLORS.background.white,
        color: COLORS.text.secondary,
        cursor: 'pointer',
    },
};

export default TaskActions;
