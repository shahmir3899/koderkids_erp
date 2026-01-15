// ============================================
// MY TASKS PAGE - Glassmorphism Design System
// ============================================
// Location: src/pages/MyTasksPage.js
// Refactored to remove Bootstrap dependencies

import React, { useState, useEffect } from 'react';
import { taskAPI, taskHelpers } from '../api/tasks';
import { getAuthUser } from '../api';

// Design Constants
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    BORDER_RADIUS,
    SHADOWS,
    TRANSITIONS,
    MIXINS,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Common Components
import { LoadingSpinner } from '../components/common/ui/LoadingSpinner';
import { PageHeader } from '../components/common/PageHeader';

// ============================================
// STAT CARD COMPONENT WITH HOVER
// ============================================
const StatCard = ({ icon, value, label, valueColor, children }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            style={{
                ...MIXINS.glassmorphicCard,
                borderRadius: BORDER_RADIUS.xl,
                padding: SPACING.xl,
                textAlign: 'center',
                transition: `all ${TRANSITIONS.normal}`,
                transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
                boxShadow: isHovered ? '0 12px 40px rgba(0, 0, 0, 0.25)' : '0 4px 24px rgba(0, 0, 0, 0.12)',
                background: isHovered ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.12)',
                cursor: 'default',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span style={{
                fontSize: FONT_SIZES['2xl'],
                marginBottom: SPACING.sm,
                display: 'block',
                transition: `all ${TRANSITIONS.normal}`,
                transform: isHovered ? 'scale(1.2)' : 'scale(1)',
            }}>{icon}</span>
            <div style={{
                fontSize: FONT_SIZES['3xl'],
                fontWeight: FONT_WEIGHTS.bold,
                margin: `${SPACING.sm} 0`,
                lineHeight: 1,
                color: valueColor,
                transition: `all ${TRANSITIONS.normal}`,
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            }}>{value}</div>
            <div style={{
                fontSize: FONT_SIZES.sm,
                color: COLORS.text.whiteSubtle,
                fontWeight: FONT_WEIGHTS.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
            }}>{label}</div>
            {children}
        </div>
    );
};

// ============================================
// TASK CARD COMPONENT WITH HOVER
// ============================================
const TaskCard = ({ task, onUpdateClick, loading, taskHelpers }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            style={{
                ...MIXINS.glassmorphicCard,
                borderRadius: BORDER_RADIUS.xl,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: `all ${TRANSITIONS.normal}`,
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered ? '0 12px 40px rgba(0, 0, 0, 0.25)' : '0 4px 24px rgba(0, 0, 0, 0.12)',
                background: isHovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.12)',
                ...(task.is_overdue ? { borderLeft: `4px solid ${COLORS.status.error}` } : {}),
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{
                padding: SPACING.lg,
                background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
                transition: `all ${TRANSITIONS.normal}`,
            }}>
                <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' }}>
                    <span style={{
                        backgroundColor: taskHelpers.getPriorityColor(task.priority),
                        color: COLORS.text.white,
                        padding: `${SPACING.xs} ${SPACING.md}`,
                        borderRadius: BORDER_RADIUS.full,
                        fontSize: FONT_SIZES.xs,
                        fontWeight: FONT_WEIGHTS.semibold,
                        textTransform: 'capitalize',
                    }}>
                        {task.priority}
                    </span>
                    <span style={{
                        backgroundColor: taskHelpers.getStatusColor(task.status),
                        color: COLORS.text.white,
                        padding: `${SPACING.xs} ${SPACING.md}`,
                        borderRadius: BORDER_RADIUS.full,
                        fontSize: FONT_SIZES.xs,
                        fontWeight: FONT_WEIGHTS.semibold,
                        textTransform: 'capitalize',
                    }}>
                        {task.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            <div style={{ padding: SPACING.xl, flex: 1 }}>
                <h3 style={{
                    fontSize: FONT_SIZES.lg,
                    fontWeight: FONT_WEIGHTS.semibold,
                    color: COLORS.text.white,
                    marginBottom: SPACING.md,
                    lineHeight: 1.4,
                }}>{task.title}</h3>

                {task.description && (
                    <p style={{
                        fontSize: FONT_SIZES.sm,
                        color: COLORS.text.whiteSubtle,
                        marginBottom: SPACING.lg,
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}>{task.description}</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, fontSize: FONT_SIZES.sm, color: COLORS.text.whiteMedium }}>
                        <span style={{ minWidth: '1.25rem' }}>👤</span>
                        <span><strong>Assigned by:</strong> {task.assigned_by_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, fontSize: FONT_SIZES.sm, color: COLORS.text.whiteMedium }}>
                        <span style={{ minWidth: '1.25rem' }}>📅</span>
                        <span><strong>Due:</strong> {taskHelpers.formatDate(task.due_date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, fontSize: FONT_SIZES.sm, color: COLORS.text.whiteMedium }}>
                        <span style={{ minWidth: '1.25rem' }}>🏷️</span>
                        <span><strong>Type:</strong> {task.task_type}</span>
                    </div>
                    {task.completed_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, fontSize: FONT_SIZES.sm, color: COLORS.text.whiteMedium }}>
                            <span style={{ minWidth: '1.25rem' }}>✅</span>
                            <span><strong>Completed:</strong> {taskHelpers.formatDate(task.completed_date)}</span>
                        </div>
                    )}
                </div>

                {task.is_overdue && (
                    <div style={{
                        marginTop: SPACING.lg,
                        padding: `${SPACING.sm} ${SPACING.md}`,
                        background: `${COLORS.status.error}20`,
                        borderLeft: `3px solid ${COLORS.status.error}`,
                        borderRadius: BORDER_RADIUS.sm,
                        display: 'flex',
                        alignItems: 'center',
                        gap: SPACING.sm,
                        fontSize: FONT_SIZES.sm,
                        color: COLORS.status.errorLight,
                        fontWeight: FONT_WEIGHTS.semibold,
                    }}>
                        <span>⚠️</span>
                        <span>Overdue Task!</span>
                    </div>
                )}

                {task.completion_answer && (
                    <div style={{
                        marginTop: SPACING.lg,
                        padding: SPACING.md,
                        background: `${COLORS.status.info}15`,
                        borderLeft: `3px solid ${COLORS.status.info}`,
                        borderRadius: BORDER_RADIUS.sm,
                    }}>
                        <strong>Answer:</strong>
                        <p style={{ margin: `${SPACING.xs} 0 0 0` }}>{task.completion_answer}</p>
                    </div>
                )}
            </div>

            <div style={{
                padding: SPACING.lg,
                background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                borderTop: `1px solid ${COLORS.border.whiteSubtle}`,
                transition: `all ${TRANSITIONS.normal}`,
            }}>
                <HoverButton
                    onClick={() => onUpdateClick(task)}
                    variant={task.status === 'completed' ? 'secondary' : 'primary'}
                    disabled={loading}
                >
                    {task.status === 'completed' ? 'View Details' : 'Update Status'}
                </HoverButton>
            </div>
        </div>
    );
};

// ============================================
// HOVER BUTTON COMPONENT
// ============================================
const HoverButton = ({ onClick, children, variant = 'primary', disabled = false }) => {
    const [isHovered, setIsHovered] = useState(false);

    const getVariantStyles = () => {
        switch (variant) {
            case 'secondary':
                return {
                    bg: 'rgba(255, 255, 255, 0.1)',
                    hoverBg: 'rgba(255, 255, 255, 0.2)',
                    border: `1px solid ${COLORS.border.whiteTransparent}`,
                };
            case 'clear':
                return {
                    bg: 'rgba(255, 255, 255, 0.1)',
                    hoverBg: 'rgba(255, 255, 255, 0.15)',
                    border: `1px solid ${COLORS.border.whiteTransparent}`,
                };
            default:
                return {
                    bg: COLORS.status.info,
                    hoverBg: '#2563EB',
                    border: 'none',
                };
        }
    };

    const variantStyles = getVariantStyles();

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                width: '100%',
                padding: `${SPACING.md} ${SPACING.lg}`,
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                border: variantStyles.border,
                borderRadius: BORDER_RADIUS.lg,
                background: isHovered && !disabled ? variantStyles.hoverBg : variantStyles.bg,
                color: COLORS.text.white,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: `all ${TRANSITIONS.normal}`,
                transform: isHovered && !disabled ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered && !disabled ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            {children}
        </button>
    );
};

const MyTasksPage = () => {
    // Responsive hook
    const { isMobile } = useResponsive();

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
    const [user, setUser] = useState(null);

    // Form state for task completion
    const [completionForm, setCompletionForm] = useState({
        status: '',
        completion_answer: ''
    });

    useEffect(() => {
        const userData = getAuthUser();
        setUser(userData);
        fetchMyTasks();
    }, []);

    const fetchMyTasks = async () => {
        try {
            setLoading(true);
            const data = await taskAPI.getMyTasks();
            setTasks(data);
        } catch (err) {
            setError('Failed to fetch your tasks');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await taskAPI.updateTaskStatus(selectedTask.id, completionForm);
            setShowCompleteModal(false);
            setSelectedTask(null);
            setCompletionForm({ status: '', completion_answer: '' });
            fetchMyTasks();
        } catch (err) {
            setError('Failed to update task status');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openCompleteModal = (task) => {
        setSelectedTask(task);
        setCompletionForm({
            status: task.status,
            completion_answer: task.completion_answer || ''
        });
        setShowCompleteModal(true);
    };

    const filteredTasks = tasks.filter(task => {
        const matchesStatus = !filters.status || task.status === filters.status;
        const matchesPriority = !filters.priority || task.priority === filters.priority;
        const matchesSearch = !filters.search ||
            task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            task.description?.toLowerCase().includes(filters.search.toLowerCase());
        return matchesStatus && matchesPriority && matchesSearch;
    });

    const getTaskStats = () => {
        return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            overdue: tasks.filter(t => t.is_overdue).length,
        };
    };

    const stats = getTaskStats();
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    if (!user) {
        return (
            <div style={styles.pageContainer}>
                <div style={styles.loadingContainer}>
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div style={styles.pageContainer}>
            <div style={styles.contentWrapper}>
                {/* Page Header */}
                <PageHeader
                    icon="✅"
                    title="My Tasks"
                    subtitle="View and manage your assigned tasks"
                />

                {/* Statistics Cards */}
                <div style={styles.statsGrid}>
                    <StatCard icon="📊" value={stats.total} label="Total" valueColor={COLORS.status.info} />
                    <StatCard icon="⏳" value={stats.pending} label="Pending" valueColor={COLORS.status.warning} />
                    <StatCard icon="🚀" value={stats.in_progress} label="In Progress" valueColor={COLORS.primary} />
                    <StatCard icon="✅" value={stats.completed} label="Completed" valueColor={COLORS.status.success} />
                    <StatCard icon="⚠️" value={stats.overdue} label="Overdue" valueColor={COLORS.status.error} />
                    <StatCard icon="📈" value={`${completionRate}%`} label="Completion" valueColor={COLORS.text.secondary}>
                        <div style={styles.progressBar}>
                            <div style={{...styles.progressFill, width: `${completionRate}%`}}></div>
                        </div>
                    </StatCard>
                </div>

                {/* Filters Section */}
                <div style={styles.filtersSection}>
                    <div style={styles.filtersGrid}>
                        <div style={styles.searchInputWrapper}>
                            <span style={styles.searchIcon}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={filters.search}
                                onChange={(e) => setFilters({...filters, search: e.target.value})}
                                style={styles.searchInput}
                            />
                        </div>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                            style={styles.select}
                        >
                            <option value="" style={styles.option}>All Statuses</option>
                            {taskHelpers.getStatusOptions().map(option => (
                                <option key={option.value} value={option.value} style={styles.option}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.priority}
                            onChange={(e) => setFilters({...filters, priority: e.target.value})}
                            style={styles.select}
                        >
                            <option value="" style={styles.option}>All Priorities</option>
                            {taskHelpers.getPriorityOptions().map(option => (
                                <option key={option.value} value={option.value} style={styles.option}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <HoverButton
                            variant="clear"
                            onClick={() => setFilters({ status: '', priority: '', search: '' })}
                        >
                            Clear Filters
                        </HoverButton>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div style={styles.errorAlert}>
                        <span>{error}</span>
                        <button
                            style={styles.errorCloseBtn}
                            onClick={() => setError(null)}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && tasks.length === 0 && (
                    <div style={styles.loadingContainer}>
                        <LoadingSpinner />
                    </div>
                )}

                {/* Tasks Grid */}
                {!loading && filteredTasks.length > 0 && (
                    <div style={styles.tasksGrid}>
                        {filteredTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onUpdateClick={openCompleteModal}
                                loading={loading}
                                taskHelpers={taskHelpers}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredTasks.length === 0 && (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyStateIcon}>📭</div>
                        <h3 style={styles.emptyStateTitle}>No tasks found</h3>
                        <p style={styles.emptyStateText}>
                            {tasks.length === 0
                                ? "You haven't been assigned any tasks yet."
                                : "No tasks match your current filters."}
                        </p>
                    </div>
                )}

                {/* Update Status Modal */}
                {showCompleteModal && (
                    <div style={styles.modalOverlay} onClick={() => setShowCompleteModal(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}>Update Task Status</h2>
                                <button
                                    style={styles.modalCloseBtn}
                                    onClick={() => setShowCompleteModal(false)}
                                >
                                    ×
                                </button>
                            </div>
                            <form onSubmit={handleStatusUpdate}>
                                <div style={styles.modalBody}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Status *</label>
                                        <select
                                            value={completionForm.status}
                                            onChange={(e) => setCompletionForm({...completionForm, status: e.target.value})}
                                            style={styles.select}
                                            required
                                        >
                                            <option value="" style={styles.option}>Select Status</option>
                                            {taskHelpers.getStatusOptions().map(option => (
                                                <option key={option.value} value={option.value} style={styles.option}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {completionForm.status === 'completed' && (
                                        <div style={styles.formGroup}>
                                            <label style={styles.formLabel}>Completion Answer</label>
                                            <textarea
                                                rows={4}
                                                value={completionForm.completion_answer}
                                                onChange={(e) => setCompletionForm({...completionForm, completion_answer: e.target.value})}
                                                placeholder="Describe how you completed this task..."
                                                style={styles.textarea}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div style={styles.modalFooter}>
                                    <button
                                        type="button"
                                        style={styles.buttonSecondary}
                                        onClick={() => setShowCompleteModal(false)}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={styles.buttonPrimary}
                                        disabled={loading}
                                    >
                                        {loading ? 'Updating...' : 'Update Status'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// STYLES - Glassmorphism Design System
// ============================================
const styles = {
    // Page Layout
    pageContainer: {
        minHeight: '100vh',
        background: COLORS.background.gradient,
        padding: SPACING.xl,
    },
    contentWrapper: {
        maxWidth: '1400px',
        margin: '0 auto',
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
    },

    // Page Header
    pageHeader: {
        marginBottom: SPACING['2xl'],
        textAlign: 'center',
    },
    pageTitle: {
        fontSize: FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.white,
        marginBottom: SPACING.sm,
    },
    pageSubtitle: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.whiteSubtle,
        margin: 0,
    },

    // Statistics Grid
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: SPACING.lg,
        marginBottom: SPACING['2xl'],
    },
    statCard: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        textAlign: 'center',
        transition: `all ${TRANSITIONS.normal}`,
    },
    statIcon: {
        fontSize: FONT_SIZES['2xl'],
        marginBottom: SPACING.sm,
        display: 'block',
    },
    statValue: {
        fontSize: FONT_SIZES['3xl'],
        fontWeight: FONT_WEIGHTS.bold,
        margin: `${SPACING.sm} 0`,
        lineHeight: 1,
    },
    statLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.whiteSubtle,
        fontWeight: FONT_WEIGHTS.medium,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    progressBar: {
        width: '100%',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
        marginTop: SPACING.sm,
    },
    progressFill: {
        height: '100%',
        background: `linear-gradient(90deg, ${COLORS.status.info}, ${COLORS.status.success})`,
        transition: `width ${TRANSITIONS.slow}`,
        borderRadius: BORDER_RADIUS.full,
    },

    // Filters Section
    filtersSection: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING['2xl'],
    },
    filtersGrid: {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr auto',
        gap: SPACING.lg,
        alignItems: 'center',
    },
    searchInputWrapper: {
        position: 'relative',
    },
    searchIcon: {
        position: 'absolute',
        left: SPACING.md,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: FONT_SIZES.lg,
        pointerEvents: 'none',
    },
    searchInput: {
        width: '100%',
        padding: `${SPACING.md} ${SPACING.lg}`,
        paddingLeft: '2.5rem',
        fontSize: FONT_SIZES.base,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        borderRadius: BORDER_RADIUS.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        outline: 'none',
        transition: `all ${TRANSITIONS.normal}`,
    },
    select: {
        width: '100%',
        padding: `${SPACING.md} ${SPACING.lg}`,
        fontSize: FONT_SIZES.base,
        ...MIXINS.glassmorphicSelect,
        borderRadius: BORDER_RADIUS.lg,
        color: COLORS.text.white,
        outline: 'none',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
    },
    option: {
        ...MIXINS.selectOption,
    },
    clearFiltersBtn: {
        padding: `${SPACING.md} ${SPACING.xl}`,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        borderRadius: BORDER_RADIUS.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: `all ${TRANSITIONS.normal}`,
    },

    // Error Alert
    errorAlert: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        background: `${COLORS.status.error}20`,
        border: `1px solid ${COLORS.status.error}40`,
        borderRadius: BORDER_RADIUS.lg,
        color: COLORS.status.errorLight,
    },
    errorCloseBtn: {
        background: 'none',
        border: 'none',
        fontSize: FONT_SIZES.xl,
        color: COLORS.status.errorLight,
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1,
    },

    // Tasks Grid
    tasksGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: SPACING.xl,
        marginBottom: SPACING['2xl'],
    },

    // Task Card
    taskCard: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: `all ${TRANSITIONS.normal}`,
    },
    taskCardOverdue: {
        borderLeft: `4px solid ${COLORS.status.error}`,
    },
    taskCardHeader: {
        padding: SPACING.lg,
        background: 'rgba(255, 255, 255, 0.05)',
        borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
    },
    taskBadges: {
        display: 'flex',
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    badge: (backgroundColor) => ({
        backgroundColor,
        color: COLORS.text.white,
        padding: `${SPACING.xs} ${SPACING.md}`,
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
        textTransform: 'capitalize',
    }),
    taskCardBody: {
        padding: SPACING.xl,
        flex: 1,
    },
    taskTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.white,
        marginBottom: SPACING.md,
        lineHeight: 1.4,
    },
    taskDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.whiteSubtle,
        marginBottom: SPACING.lg,
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    taskMeta: {
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm,
    },
    taskMetaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        fontSize: FONT_SIZES.sm,
        color: COLORS.text.whiteMedium,
    },
    taskMetaIcon: {
        minWidth: '1.25rem',
    },
    overdueAlert: {
        marginTop: SPACING.lg,
        padding: `${SPACING.sm} ${SPACING.md}`,
        background: `${COLORS.status.error}20`,
        borderLeft: `3px solid ${COLORS.status.error}`,
        borderRadius: BORDER_RADIUS.sm,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        fontSize: FONT_SIZES.sm,
        color: COLORS.status.errorLight,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    taskAnswer: {
        marginTop: SPACING.lg,
        padding: SPACING.md,
        background: `${COLORS.status.info}15`,
        borderLeft: `3px solid ${COLORS.status.info}`,
        borderRadius: BORDER_RADIUS.sm,
    },
    taskCardFooter: {
        padding: SPACING.lg,
        background: 'rgba(255, 255, 255, 0.05)',
        borderTop: `1px solid ${COLORS.border.whiteSubtle}`,
    },

    // Buttons
    buttonPrimary: {
        width: '100%',
        padding: `${SPACING.md} ${SPACING.lg}`,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        background: COLORS.status.info,
        color: COLORS.text.white,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
    },
    buttonSecondary: {
        width: '100%',
        padding: `${SPACING.md} ${SPACING.lg}`,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        borderRadius: BORDER_RADIUS.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
    },

    // Empty State
    emptyState: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        textAlign: 'center',
        padding: `${SPACING['2xl']} ${SPACING.xl}`,
    },
    emptyStateIcon: {
        fontSize: '5rem',
        marginBottom: SPACING.lg,
        opacity: 0.6,
    },
    emptyStateTitle: {
        fontSize: FONT_SIZES.xl,
        color: COLORS.text.white,
        marginBottom: SPACING.sm,
    },
    emptyStateText: {
        color: COLORS.text.whiteSubtle,
        fontSize: FONT_SIZES.base,
        margin: 0,
    },

    // Modal
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: SPACING.xl,
    },
    modalContent: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.xl,
        borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
    },
    modalTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.white,
        margin: 0,
    },
    modalCloseBtn: {
        background: 'none',
        border: 'none',
        fontSize: FONT_SIZES['2xl'],
        color: COLORS.text.whiteSubtle,
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1,
    },
    modalBody: {
        padding: SPACING.xl,
    },
    modalFooter: {
        display: 'flex',
        gap: SPACING.md,
        padding: SPACING.xl,
        borderTop: `1px solid ${COLORS.border.whiteSubtle}`,
    },

    // Form Elements
    formGroup: {
        marginBottom: SPACING.xl,
    },
    formLabel: {
        display: 'block',
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.text.white,
        marginBottom: SPACING.sm,
    },
    textarea: {
        width: '100%',
        padding: SPACING.md,
        fontSize: FONT_SIZES.base,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        borderRadius: BORDER_RADIUS.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        outline: 'none',
        resize: 'vertical',
        minHeight: '100px',
        fontFamily: 'inherit',
    },
};

// Add responsive styles via CSS-in-JS media query workaround
if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    styles.filtersGrid.gridTemplateColumns = '1fr';
    styles.tasksGrid.gridTemplateColumns = '1fr';
}

export default MyTasksPage;
