// ============================================
// TASK MANAGEMENT PAGE - Glassmorphism Design System
// ============================================
// Location: src/pages/TaskManagementPage.js
// Refactored to remove Bootstrap dependencies

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthUser } from '../api';
import taskApiService, { taskErrorHandling, taskValidation } from '../utils/taskApi';
import { toast } from 'react-toastify';
import BulkTaskModal from '../components/tasks/BulkTaskModal';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskActions from '../components/tasks/TaskActions';

// Design Constants
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    BORDER_RADIUS,
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
const StatCard = ({ icon, value, label, valueColor }) => {
    const [isHovered, setIsHovered] = React.useState(false);

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
        </div>
    );
};

// ============================================
// HOVER BUTTON COMPONENT
// ============================================
const HoverButton = ({ onClick, children, variant = 'primary', disabled = false, style = {} }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const getVariantStyles = () => {
        switch (variant) {
            case 'success':
                return {
                    bg: COLORS.status.success,
                    hoverBg: '#059669',
                    shadow: `0 4px 12px ${COLORS.status.success}40`,
                };
            case 'secondary':
                return {
                    bg: 'rgba(255, 255, 255, 0.1)',
                    hoverBg: 'rgba(255, 255, 255, 0.2)',
                    shadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
                };
            case 'clear':
                return {
                    bg: 'rgba(255, 255, 255, 0.1)',
                    hoverBg: 'rgba(255, 255, 255, 0.15)',
                    shadow: 'none',
                };
            default:
                return {
                    bg: COLORS.status.success,
                    hoverBg: '#059669',
                    shadow: `0 2px 8px ${COLORS.status.success}40`,
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
                padding: variant === 'clear' ? `${SPACING.md} ${SPACING.xl}` : `${SPACING.sm} ${SPACING.xl}`,
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                border: variant === 'secondary' || variant === 'clear' ? `1px solid ${COLORS.border.whiteTransparent}` : 'none',
                borderRadius: BORDER_RADIUS.lg,
                background: isHovered && !disabled ? variantStyles.hoverBg : variantStyles.bg,
                color: COLORS.text.white,
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: isHovered && !disabled ? variantStyles.shadow : 'none',
                transition: `all ${TRANSITIONS.normal}`,
                transform: isHovered && !disabled ? 'translateY(-2px)' : 'translateY(0)',
                opacity: disabled ? 0.5 : 1,
                whiteSpace: 'nowrap',
                ...style,
            }}
        >
            {children}
        </button>
    );
};

const TaskManagementPage = () => {
    // Responsive hook
    const { isMobile } = useResponsive();

    const navigate = useNavigate();
    const [employeeList, setEmployeeList] = useState([]);
    const [, setSelectedEmployee] = useState(null);

    // Form states
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        task_type: 'general',
        due_date: ''
    });

    const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        task_type: 'general',
        due_date: ''
    });
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedBulkTask, setSelectedBulkTask] = useState(null);

    const [user, setUser] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 10,
        totalPages: 1
    });

    // Fetch all tasks
    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskApiService.getTasks();
            setTasks(data);
        } catch (err) {
            setError('Failed to fetch tasks');
        } finally {
            setLoading(false);
        }
    };

    // Fetch task statistics
    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await taskApiService.getTaskStats();
            setStats(data);
        } catch (err) {
            setError('Failed to fetch stats');
        } finally {
            setLoading(false);
        }
    };

    // Show Bulk Modal for a specific task (or null for all)
    const handleShowBulkModal = (task = null) => {
        setSelectedBulkTask(task);
        setShowBulkModal(true);
    };

    // Handle Bulk Task Modal submit
    const handleBulkTaskSubmit = () => {
        fetchTasks();
        fetchStats();
        setSelectedBulkTask(null);
        setShowBulkModal(false);
    };

    // Fetch employees for task creation
    const fetchEmployeesForSelection = async () => {
        try {
            const data = await taskApiService.makeRequest('GET', '/employees/teachers/');
            setEmployeeList(data);
        } catch (error) {
            console.error('Error fetching employees:', error);
            taskErrorHandling.handleTaskError(error);
        }
    };

    // Initial data fetch
    useEffect(() => {
        const userData = getAuthUser();
        setUser(userData);

        // Check admin permission
        if (userData && userData.role !== 'Admin') {
            toast.error('Access denied. Admin only.');
            navigate('/');
            return;
        }

        fetchTasks();
        fetchStats();
        fetchEmployeesForSelection();
    }, [navigate]);

    // Filter logic
    const filteredTasks = tasks.filter(task => {
        const hasTitleMatch = !filters.status || task.status === filters.status;
        const hasPriorityMatch = !filters.priority || task.priority === filters.priority;
        const hasSearchMatch = !filters.search ||
            task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            task.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
            (task.assigned_to && task.assigned_to_name && task.assigned_to_name.toLowerCase().includes(filters.search.toLowerCase()));

        return hasTitleMatch && hasPriorityMatch && hasSearchMatch;
    });

    const resetTaskForm = () => {
        setTaskForm({
            title: '',
            description: '',
            assigned_to: '',
            priority: 'medium',
            task_type: 'general',
            due_date: ''
        });
        setSelectedEmployee(null);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();

        if (!taskValidation.validateTaskForm(taskForm)) {
            return;
        }

        taskErrorHandling.setLoading(setLoading, true);

        try {
            await taskApiService.createTask(taskForm);

            resetTaskForm();
            setShowCreateModal(false);
            fetchTasks();
            fetchStats();

            taskErrorHandling.handleSuccess('Task created and assigned successfully');
        } catch (err) {
            console.error('Error creating task:', err);
            setError('Failed to create task');
            taskErrorHandling.handleTaskError(err);
        } finally {
            taskErrorHandling.setLoading(setLoading, false);
        }
    };

    // Edit Task Modal implementation
    const handleEditClick = (task) => {
        setEditingTask(task);
        setEditForm({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            task_type: task.task_type,
            due_date: task.due_date ? task.due_date.slice(0, 16) : ''
        });
        setShowEditModal(true);
    };

    const handleEditTask = async (e) => {
        e.preventDefault();
        taskErrorHandling.setLoading(setLoading, true);

        try {
            await taskApiService.updateTask(editingTask.id, editForm);

            setShowEditModal(false);
            setEditingTask(null);
            fetchTasks();
            fetchStats();

            taskErrorHandling.handleSuccess('Task updated successfully');
        } catch (err) {
            console.error('Error updating task:', err);
            setError('Failed to update task');
            taskErrorHandling.handleTaskError(err);
        } finally {
            taskErrorHandling.setLoading(setLoading, false);
        }
    };

    // Priority options
    const priorityOptions = [
        { value: 'low', label: 'Low', color: COLORS.status.success },
        { value: 'medium', label: 'Medium', color: COLORS.status.warning },
        { value: 'high', label: 'High', color: COLORS.status.error },
        { value: 'urgent', label: 'Urgent', color: COLORS.primary }
    ];

    // Task type options
    const taskTypeOptions = [
        { value: 'general', label: 'General' },
        { value: 'academic', label: 'Academic' },
        { value: 'administrative', label: 'Administrative' }
    ];

    // Access denied state
    if (user && user.role !== 'Admin') {
        return (
            <div style={styles.pageContainer}>
                <div style={styles.contentWrapper}>
                    <div style={styles.accessDenied}>
                        <div style={styles.accessDeniedIcon}>🚫</div>
                        <h2 style={styles.accessDeniedTitle}>Access Denied</h2>
                        <p style={styles.accessDeniedText}>This page is for administrators only.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.pageContainer}>
            <div style={styles.contentWrapper}>
                {/* Page Header */}
                <PageHeader
                    icon="📝"
                    title="Task Management"
                    subtitle="Create, assign, and manage tasks for your team"
                    actions={
                        <HoverButton
                            variant="success"
                            onClick={() => setShowBulkModal(true)}
                            style={{ padding: `${SPACING.md} ${SPACING.xl}` }}
                        >
                            👥 Assign to All Employees
                        </HoverButton>
                    }
                />

                {/* Filters Section */}
                <div style={styles.filtersSection}>
                    <div style={styles.filtersGrid}>
                        <div style={styles.searchInputWrapper}>
                            <span style={styles.searchIcon}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search by title or description..."
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
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                        </select>
                        <select
                            value={filters.priority}
                            onChange={(e) => setFilters({...filters, priority: e.target.value})}
                            style={styles.select}
                        >
                            <option value="">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                        <HoverButton
                            variant="clear"
                            onClick={() => setFilters({status: '', priority: '', search: ''})}
                        >
                            Clear Filters
                        </HoverButton>
                    </div>
                </div>

                {/* Statistics Cards */}
                {stats && stats.status_stats && (
                    <div style={styles.statsGrid}>
                        <StatCard
                            icon="✅"
                            value={stats.status_stats.completed || 0}
                            label="Completed"
                            valueColor={COLORS.status.success}
                        />
                        <StatCard
                            icon="🚀"
                            value={stats.status_stats.in_progress || 0}
                            label="In Progress"
                            valueColor={COLORS.primary}
                        />
                        <StatCard
                            icon="⏳"
                            value={stats.status_stats.pending || 0}
                            label="Pending"
                            valueColor={COLORS.status.warning}
                        />
                        <StatCard
                            icon="⚠️"
                            value={stats.status_stats.overdue || 0}
                            label="Overdue"
                            valueColor={COLORS.status.error}
                        />
                        {stats.priority_stats && (
                            <StatCard
                                icon="🎯"
                                value={(stats.priority_stats.low || 0) + (stats.priority_stats.medium || 0) +
                                       (stats.priority_stats.high || 0) + (stats.priority_stats.urgent || 0)}
                                label="Total Tasks"
                                valueColor={COLORS.status.info}
                            />
                        )}
                    </div>
                )}

                {/* Tasks Section */}
                <div style={styles.tasksSection}>
                    <div style={styles.tasksSectionHeader}>
                        <h3 style={styles.tasksSectionTitle}>📋 All Tasks</h3>
                        <HoverButton
                            variant="success"
                            onClick={() => setShowCreateModal(true)}
                        >
                            ➕ Create New Task
                        </HoverButton>
                    </div>
                    <div style={styles.tasksSectionBody}>
                        {loading ? (
                            <div style={styles.loadingContainer}>
                                <LoadingSpinner />
                            </div>
                        ) : filteredTasks.length > 0 ? (
                            <div style={styles.tasksList}>
                                {filteredTasks.map(task => (
                                    <div key={task.id} style={styles.taskItem}>
                                        <TaskActions
                                            task={task}
                                            onUpdate={() => {
                                                fetchTasks();
                                                fetchStats();
                                            }}
                                            onShowBulkModal={handleShowBulkModal}
                                            onShowEditModal={handleEditClick}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyStateIcon}>📭</div>
                                <h3 style={styles.emptyStateTitle}>No tasks found</h3>
                                <p style={styles.emptyStateText}>
                                    {filters.search || filters.status || filters.priority
                                        ? "No tasks match your current filters."
                                        : "Create your first task to get started!"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div style={styles.paginationContainer}>
                        <div style={styles.pagination}>
                            <button
                                style={{
                                    ...styles.paginationButton,
                                    ...(pagination.page === 1 ? styles.paginationButtonDisabled : {})
                                }}
                                onClick={() => {
                                    if (pagination.page > 1) {
                                        setPagination({...pagination, page: pagination.page - 1});
                                    }
                                }}
                                disabled={pagination.page === 1}
                            >
                                Previous
                            </button>
                            {Array.from({length: pagination.totalPages}, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    style={{
                                        ...styles.paginationButton,
                                        ...(pagination.page === page ? styles.paginationButtonActive : {})
                                    }}
                                    onClick={() => setPagination({...pagination, page})}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                style={{
                                    ...styles.paginationButton,
                                    ...(pagination.page === pagination.totalPages ? styles.paginationButtonDisabled : {})
                                }}
                                onClick={() => {
                                    if (pagination.page < pagination.totalPages) {
                                        setPagination({...pagination, page: pagination.page + 1});
                                    }
                                }}
                                disabled={pagination.page === pagination.totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Create Task Modal */}
                <CreateTaskModal
                    show={showCreateModal}
                    onHide={() => setShowCreateModal(false)}
                    onSubmit={handleCreateTask}
                    taskForm={taskForm}
                    setTaskForm={setTaskForm}
                    employeeList={employeeList}
                    setSelectedEmployee={setSelectedEmployee}
                    isLoading={loading}
                />

                {/* Edit Task Modal */}
                {showEditModal && editingTask && (
                    <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}>Edit Task</h2>
                                <button
                                    style={styles.modalCloseBtn}
                                    onClick={() => setShowEditModal(false)}
                                >
                                    ×
                                </button>
                            </div>
                            <form onSubmit={handleEditTask}>
                                <div style={styles.modalBody}>
                                    {/* Task Title */}
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Task Title *</label>
                                        <input
                                            type="text"
                                            value={editForm.title}
                                            onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                            placeholder="Enter task title"
                                            maxLength={200}
                                            disabled={loading}
                                            required
                                            style={styles.input}
                                        />
                                        <span style={styles.charCount}>
                                            {editForm.title.length}/200 characters
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Description</label>
                                        <textarea
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                            placeholder="Enter task description"
                                            rows={4}
                                            maxLength={2000}
                                            disabled={loading}
                                            style={styles.textarea}
                                        />
                                        <span style={styles.charCount}>
                                            {editForm.description.length}/2000 characters
                                        </span>
                                    </div>

                                    {/* Priority */}
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Priority *</label>
                                        <div style={styles.priorityGrid}>
                                            {priorityOptions.map(option => (
                                                <label
                                                    key={option.value}
                                                    style={{
                                                        ...styles.priorityOption,
                                                        ...(editForm.priority === option.value ? {
                                                            borderColor: option.color,
                                                            background: `${option.color}20`
                                                        } : {})
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="priority"
                                                        value={option.value}
                                                        checked={editForm.priority === option.value}
                                                        onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                                                        style={styles.radioInput}
                                                    />
                                                    <span style={{
                                                        ...styles.priorityBadge,
                                                        backgroundColor: option.color
                                                    }}>
                                                        {option.label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Task Type */}
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Task Type *</label>
                                        <select
                                            value={editForm.task_type}
                                            onChange={(e) => setEditForm({...editForm, task_type: e.target.value})}
                                            style={styles.select}
                                        >
                                            {taskTypeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Due Date */}
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Due Date</label>
                                        <input
                                            type="datetime-local"
                                            value={editForm.due_date}
                                            onChange={(e) => setEditForm({...editForm, due_date: e.target.value})}
                                            min={new Date().toISOString().slice(0, 16)}
                                            style={styles.input}
                                        />
                                        <span style={styles.charCount}>
                                            Leave empty if no due date is required
                                        </span>
                                    </div>
                                </div>

                                <div style={styles.modalFooter}>
                                    <button
                                        type="button"
                                        style={styles.buttonSecondary}
                                        onClick={() => setShowEditModal(false)}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            ...styles.buttonPrimary,
                                            ...(loading || !editForm.title.trim() ? styles.buttonDisabled : {})
                                        }}
                                        disabled={loading || !editForm.title.trim()}
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Bulk Task Modal */}
                {showBulkModal && (
                    <div style={styles.bulkModalOverlay}>
                        <BulkTaskModal
                            show={showBulkModal}
                            onHide={() => setShowBulkModal(false)}
                            onSubmit={handleBulkTaskSubmit}
                            initialData={selectedBulkTask || {}}
                            isLoading={loading}
                        />
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
        minHeight: '300px',
    },

    // Page Header
    pageHeader: {
        marginBottom: SPACING['2xl'],
    },
    pageHeaderContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.lg,
    },
    pageTitle: {
        fontSize: FONT_SIZES['2xl'],
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.text.white,
        marginBottom: SPACING.xs,
    },
    pageSubtitle: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.text.whiteSubtle,
        margin: 0,
    },
    bulkAssignButton: {
        padding: `${SPACING.md} ${SPACING.xl}`,
        fontSize: FONT_SIZES.base,
        fontWeight: FONT_WEIGHTS.semibold,
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        background: COLORS.status.success,
        color: COLORS.text.white,
        cursor: 'pointer',
        boxShadow: `0 4px 12px ${COLORS.status.success}40`,
        transition: `all ${TRANSITIONS.normal}`,
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
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        borderRadius: BORDER_RADIUS.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        outline: 'none',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
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

    // Tasks Section
    tasksSection: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING['2xl'],
    },
    tasksSectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.xl,
        borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
        background: 'rgba(255, 255, 255, 0.05)',
    },
    tasksSectionTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.white,
        margin: 0,
    },
    createButton: {
        padding: `${SPACING.sm} ${SPACING.xl}`,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        border: 'none',
        borderRadius: BORDER_RADIUS.lg,
        background: COLORS.status.success,
        color: COLORS.text.white,
        cursor: 'pointer',
        boxShadow: `0 2px 8px ${COLORS.status.success}40`,
        transition: `all ${TRANSITIONS.normal}`,
    },
    tasksSectionBody: {
        padding: SPACING.xl,
    },
    tasksList: {
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.md,
    },
    taskItem: {
        // TaskActions component handles its own styling
    },

    // Empty State
    emptyState: {
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

    // Access Denied
    accessDenied: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        textAlign: 'center',
        padding: `${SPACING['2xl']} ${SPACING.xl}`,
    },
    accessDeniedIcon: {
        fontSize: '5rem',
        marginBottom: SPACING.lg,
    },
    accessDeniedTitle: {
        fontSize: FONT_SIZES['2xl'],
        color: COLORS.status.error,
        marginBottom: SPACING.sm,
    },
    accessDeniedText: {
        color: COLORS.text.whiteSubtle,
        fontSize: FONT_SIZES.base,
        margin: 0,
    },

    // Pagination
    paginationContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: SPACING.xl,
    },
    pagination: {
        display: 'flex',
        gap: SPACING.sm,
    },
    paginationButton: {
        padding: `${SPACING.sm} ${SPACING.lg}`,
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.medium,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        borderRadius: BORDER_RADIUS.md,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
    },
    paginationButtonActive: {
        background: COLORS.status.info,
        borderColor: COLORS.status.info,
    },
    paginationButtonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
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
    bulkModalOverlay: {
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
        zIndex: 1100,
        padding: SPACING.xl,
    },
    modalContent: {
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        width: '100%',
        maxWidth: '600px',
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
    input: {
        width: '100%',
        padding: SPACING.md,
        fontSize: FONT_SIZES.base,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        borderRadius: BORDER_RADIUS.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        outline: 'none',
        transition: `all ${TRANSITIONS.normal}`,
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
    charCount: {
        display: 'block',
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.whiteSubtle,
        marginTop: SPACING.xs,
        textAlign: 'right',
    },

    // Priority Selection
    priorityGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: SPACING.sm,
    },
    priorityOption: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        border: `1px solid ${COLORS.border.whiteTransparent}`,
        borderRadius: BORDER_RADIUS.lg,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
    },
    radioInput: {
        display: 'none',
    },
    priorityBadge: {
        padding: `${SPACING.xs} ${SPACING.md}`,
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.text.white,
    },

    // Buttons
    buttonPrimary: {
        flex: 1,
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
        flex: 1,
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
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
};

// Add responsive styles
if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    styles.filtersGrid.gridTemplateColumns = '1fr';
    styles.pageHeaderContent.flexDirection = 'column';
    styles.pageHeaderContent.alignItems = 'stretch';
    styles.priorityGrid.gridTemplateColumns = 'repeat(2, 1fr)';
}

export default TaskManagementPage;
