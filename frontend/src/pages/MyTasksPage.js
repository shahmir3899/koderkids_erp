import React, { useState, useEffect } from 'react';
import { Container, Form, Modal, Button } from 'react-bootstrap';
import { taskAPI, taskHelpers } from '../api/tasks';
import { getAuthUser } from '../api';
import styles from './TaskPages.module.css';

const MyTasksPage = () => {
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
            <Container className="mt-4">
                <div className={styles.loadingSpinner}>
                    <div className={styles.spinner}></div>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            {/* Page Header */}
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>
                    <span>📋</span> My Tasks
                </h1>
                <p className={styles.pageSubtitle}>View and manage your assigned tasks</p>
            </div>

            {/* Statistics Cards */}
            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.total}`}>
                    <span className={styles.statIcon}>📊</span>
                    <div className={styles.statValue}>{stats.total}</div>
                    <div className={styles.statLabel}>Total</div>
                </div>
                <div className={`${styles.statCard} ${styles.pending}`}>
                    <span className={styles.statIcon}>⏳</span>
                    <div className={styles.statValue}>{stats.pending}</div>
                    <div className={styles.statLabel}>Pending</div>
                </div>
                <div className={`${styles.statCard} ${styles.inProgress}`}>
                    <span className={styles.statIcon}>🚀</span>
                    <div className={styles.statValue}>{stats.in_progress}</div>
                    <div className={styles.statLabel}>In Progress</div>
                </div>
                <div className={`${styles.statCard} ${styles.completed}`}>
                    <span className={styles.statIcon}>✅</span>
                    <div className={styles.statValue}>{stats.completed}</div>
                    <div className={styles.statLabel}>Completed</div>
                </div>
                <div className={`${styles.statCard} ${styles.overdue}`}>
                    <span className={styles.statIcon}>⚠️</span>
                    <div className={styles.statValue}>{stats.overdue}</div>
                    <div className={styles.statLabel}>Overdue</div>
                </div>
                <div className={`${styles.statCard} ${styles.completion}`}>
                    <span className={styles.statIcon}>📈</span>
                    <div className={styles.statValue}>{completionRate}%</div>
                    <div className={styles.statLabel}>Completion</div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${completionRate}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filtersSection}>
                <div className={styles.filtersGrid}>
                    <div className={styles.searchInput}>
                        <span className={styles.searchIcon}>🔍</span>
                        <Form.Control
                            type="text"
                            placeholder="Search tasks..."
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                        />
                    </div>
                    <Form.Select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                        <option value="">All Statuses</option>
                        {taskHelpers.getStatusOptions().map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Form.Select>
                    <Form.Select
                        value={filters.priority}
                        onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    >
                        <option value="">All Priorities</option>
                        {taskHelpers.getPriorityOptions().map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Form.Select>
                    <button
                        className={styles.clearFiltersBtn}
                        onClick={() => setFilters({ status: '', priority: '', search: '' })}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                </div>
            )}

            {/* Loading State */}
            {loading && tasks.length === 0 && (
                <div className={styles.loadingSpinner}>
                    <div className={styles.spinner}></div>
                </div>
            )}

            {/* Tasks Grid */}
            {!loading && filteredTasks.length > 0 && (
                <div className={styles.tasksGrid}>
                    {filteredTasks.map(task => (
                        <div
                            key={task.id}
                            className={`${styles.taskCard} ${task.is_overdue ? styles.overdue : ''}`}
                        >
                            <div className={styles.taskCardHeader}>
                                <div className={styles.taskBadges}>
                                    <span
                                        className={styles.taskBadge}
                                        style={{
                                            backgroundColor: taskHelpers.getPriorityColor(task.priority),
                                            color: 'white'
                                        }}
                                    >
                                        {task.priority}
                                    </span>
                                    <span
                                        className={styles.taskBadge}
                                        style={{
                                            backgroundColor: taskHelpers.getStatusColor(task.status),
                                            color: 'white'
                                        }}
                                    >
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.taskCardBody}>
                                <h3 className={styles.taskTitle}>{task.title}</h3>

                                {task.description && (
                                    <p className={styles.taskDescription}>{task.description}</p>
                                )}

                                <div className={styles.taskMeta}>
                                    <div className={styles.taskMetaItem}>
                                        <span className={styles.taskMetaIcon}>👤</span>
                                        <span><strong>Assigned by:</strong> {task.assigned_by_name}</span>
                                    </div>

                                    <div className={styles.taskMetaItem}>
                                        <span className={styles.taskMetaIcon}>📅</span>
                                        <span><strong>Due:</strong> {taskHelpers.formatDate(task.due_date)}</span>
                                    </div>

                                    <div className={styles.taskMetaItem}>
                                        <span className={styles.taskMetaIcon}>🏷️</span>
                                        <span><strong>Type:</strong> {task.task_type}</span>
                                    </div>

                                    {task.completed_date && (
                                        <div className={styles.taskMetaItem}>
                                            <span className={styles.taskMetaIcon}>✅</span>
                                            <span><strong>Completed:</strong> {taskHelpers.formatDate(task.completed_date)}</span>
                                        </div>
                                    )}
                                </div>

                                {task.is_overdue && (
                                    <div className={styles.overdueAlert}>
                                        <span>⚠️</span>
                                        <span>Overdue Task!</span>
                                    </div>
                                )}

                                {task.completion_answer && (
                                    <div className={styles.taskAnswer}>
                                        <strong>Answer:</strong>
                                        <p>{task.completion_answer}</p>
                                    </div>
                                )}
                            </div>

                            <div className={styles.taskCardFooter}>
                                <button
                                    className={`${styles.taskButton} ${task.status === 'completed' ? styles.secondary : styles.primary}`}
                                    onClick={() => openCompleteModal(task)}
                                    disabled={loading}
                                >
                                    {task.status === 'completed' ? 'View Details' : 'Update Status'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredTasks.length === 0 && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>📭</div>
                    <h3 className={styles.emptyStateTitle}>No tasks found</h3>
                    <p className={styles.emptyStateText}>
                        {tasks.length === 0
                            ? "You haven't been assigned any tasks yet."
                            : "No tasks match your current filters."}
                    </p>
                </div>
            )}

            {/* Update Status Modal */}
            <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Update Task Status</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleStatusUpdate}>
                        <Form.Group className="mb-3">
                            <Form.Label>Status *</Form.Label>
                            <Form.Select
                                value={completionForm.status}
                                onChange={(e) => setCompletionForm({...completionForm, status: e.target.value})}
                                required
                            >
                                <option value="">Select Status</option>
                                {taskHelpers.getStatusOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        {completionForm.status === 'completed' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Completion Answer</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    value={completionForm.completion_answer}
                                    onChange={(e) => setCompletionForm({...completionForm, completion_answer: e.target.value})}
                                    placeholder="Describe how you completed this task..."
                                />
                            </Form.Group>
                        )}

                        <div className="d-flex gap-2 justify-content-end">
                            <Button
                                variant="secondary"
                                onClick={() => setShowCompleteModal(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Updating...' : 'Update Status'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default MyTasksPage;
