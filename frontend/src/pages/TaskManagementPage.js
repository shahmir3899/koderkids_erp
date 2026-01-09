// Fix for TaskManagementPage.js employee dropdown issue

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { getAuthUser } from '../api';
import taskApiService, { taskErrorHandling, taskValidation, taskConstants } from '../utils/taskApi';
import { toast } from 'react-toastify';
import BulkTaskModal from '../components/tasks/BulkTaskModal';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskActions from '../components/tasks/TaskActions';
import styles from './TaskPages.module.css';

const TaskManagementPage = () => {
    const navigate = useNavigate();
    // Error state for error messages
    const [error, setError] = useState(null);

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
    // ✅ FIXED: Use employeeList for proper state management
    const [employeeList, setEmployeeList] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

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

    // ✅ FIXED: Updated fetch function
    const fetchEmployeesForSelection = async () => {
        console.log('🔍 TaskManagementPage: Fetching employees for task creation');
        try {
            const data = await taskApiService.makeRequest('GET', '/employees/teachers/');
            console.log('✅ TaskManagementPage: Employees fetched successfully:', data);
            setEmployeeList(data);
        } catch (error) {
            console.error('❌ TaskManagementPage: Error fetching employees:', error);
            taskErrorHandling.handleTaskError(error);
        }
    };

    // ✅ FIXED: Updated useEffect with admin permission check
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

    // ✅ FIXED: Filter logic with proper state
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
        
        console.log('📝 TaskManagementPage: Starting task creation');
        console.log('🔍 TaskManagementPage: Form data:', taskForm);
        console.log('🔍 TaskManagementPage: Employee list length:', employeeList.length);
        console.log('🔍 TaskManagementPage: Selected employee:', selectedEmployee);
        
        if (!taskValidation.validateTaskForm(taskForm)) {
            console.log('❌ TaskManagementPage: Form validation failed');
            return;
        }

        taskErrorHandling.setLoading(setLoading, true);
        
        try {
            const createdTask = await taskApiService.createTask(taskForm);
            console.log('✅ TaskManagementPage: Task created successfully:', createdTask);
            
            resetTaskForm();
            setShowCreateModal(false);
            fetchTasks();
            fetchStats();
            
            taskErrorHandling.handleSuccess('Task created and assigned successfully');
        } catch (err) {
            console.error('❌ TaskManagementPage: Error creating task:', err);
            setError('Failed to create task');
            taskErrorHandling.handleTaskError(err);
        } finally {
            taskErrorHandling.setLoading(setLoading, false);
            console.log('✅ TaskManagementPage: Task creation process completed');
        }
    };

    // ✅ FIXED: Edit Task Modal implementation
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
            const updatedTask = await taskApiService.updateTask(editingTask.id, editForm);
            console.log('✅ Task updated:', updatedTask);
            
            setShowEditModal(false);
            setEditingTask(null);
            fetchTasks();
            fetchStats();
            
            taskErrorHandling.handleSuccess('Task updated successfully');
        } catch (err) {
            console.error('❌ Error updating task:', err);
            setError('Failed to update task');
            taskErrorHandling.handleTaskError(err);
        } finally {
            taskErrorHandling.setLoading(setLoading, false);
        }
    };

    const EditTaskModal = () => (
        <Modal
            show={showEditModal}
            onHide={() => setShowEditModal(false)}
            size="lg"
            style={{
                zIndex: 2000,
                left: window.innerWidth >= 1200 ? '16rem' : 0,
                width: window.innerWidth >= 1200 ? 'calc(100% - 16rem)' : '100%',
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                margin: 0,
                padding: 0,
                maxWidth: '100vw',
            }}
        >
            <Modal.Header closeButton>
                <Modal.Title>Edit Task</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {editingTask && (
                    <Form onSubmit={handleEditTask}>
                        <Form.Group className="mb-3">
                            <Form.Label>Task Title *</Form.Label>
                            <Form.Control
                                type="text"
                                name="title"
                                value={editForm.title}
                                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                placeholder="Enter task title"
                                maxLength={200}
                                disabled={loading}
                                required
                            />
                            <Form.Text className="text-muted">
                                {editForm.title.length}/200 characters
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                name="description"
                                value={editForm.description}
                                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                placeholder="Enter task description"
                                rows={4}
                                maxLength={2000}
                                disabled={loading}
                            />
                            <Form.Text className="text-muted">
                                {editForm.description.length}/2000 characters
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Priority *</Form.Label>
                            <div>
                                {[
                                    { value: 'low', label: 'Low' },
                                    { value: 'medium', label: 'Medium' },
                                    { value: 'high', label: 'High' },
                                    { value: 'urgent', label: 'Urgent' }
                                ].map(option => (
                                    <Form.Check
                                        key={option.value}
                                        type="radio"
                                        name="priority"
                                        id={`edit-priority-${option.value}`}
                                        value={option.value}
                                        checked={editForm.priority === option.value}
                                        onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                                    >
                                        <Badge bg={
                                            option.value === 'low' ? 'success' :
                                            option.value === 'medium' ? 'warning' :
                                            option.value === 'high' ? 'danger' :
                                            'dark'
                                        } className="me-2">
                                            {option.label}
                                        </Badge>
                                    </Form.Check>
                                ))}
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Task Type *</Form.Label>
                            <Form.Select
                                name="task_type"
                                value={editForm.task_type}
                                onChange={(e) => setEditForm({...editForm, task_type: e.target.value})}
                            >
                                <option value="general">General</option>
                                <option value="academic">Academic</option>
                                <option value="administrative">Administrative</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Due Date</Form.Label>
                            <Form.Control
                                type="datetime-local"
                                name="due_date"
                                value={editForm.due_date}
                                onChange={(e) => setEditForm({...editForm, due_date: e.target.value})}
                                min={new Date().toISOString().slice(0, 16)}
                            />
                            <Form.Text className="text-muted">
                                Leave empty if no due date is required
                            </Form.Text>
                        </Form.Group>

                        <div className="d-flex gap-2 justify-content-end">
                            <Button
                                variant="secondary"
                                onClick={() => setShowEditModal(false)}
                                disabled={loading}
                                className="px-4"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={loading || !editForm.title.trim()}
                                className="px-4"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </Form>
                )}
            </Modal.Body>
        </Modal>
    );


    return (
        <Container fluid className="mt-4">
            {user && user.role === 'Admin' ? (
                <>
                    {/* Page Header */}
                    <div className={styles.pageHeader}>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 className={styles.pageTitle}>
                                    <span>⚙️</span> Task Management
                                </h1>
                                <p className={styles.pageSubtitle}>Create, assign, and manage tasks for your team</p>
                            </div>
                            <Button
                                variant="success"
                                onClick={() => setShowBulkModal(true)}
                                size="lg"
                                style={{
                                    borderRadius: '8px',
                                    padding: '0.75rem 1.5rem',
                                    fontWeight: '500',
                                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                <i className="fas fa-users me-2"></i>
                                Assign to All Employees
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <Alert variant="danger">
                    Access denied. This page is for administrators only.
                </Alert>
            )}

            {/* Filters */}
            <div className={styles.filtersSection}>
                <div className={styles.filtersGrid}>
                    <div className={styles.searchInput}>
                        <span className={styles.searchIcon}>🔍</span>
                        <Form.Control
                            type="text"
                            placeholder="Search by title or description..."
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                        />
                    </div>
                    <Form.Select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="overdue">Overdue</option>
                    </Form.Select>
                    <Form.Select
                        value={filters.priority}
                        onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    >
                        <option value="">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </Form.Select>
                    <button
                        className={styles.clearFiltersBtn}
                        onClick={() => setFilters({status: '', priority: '', search: ''})}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && stats.status_stats && (
                <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.completed}`}>
                        <span className={styles.statIcon}>✅</span>
                        <div className={styles.statValue}>{stats.status_stats.completed || 0}</div>
                        <div className={styles.statLabel}>Completed</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.inProgress}`}>
                        <span className={styles.statIcon}>🚀</span>
                        <div className={styles.statValue}>{stats.status_stats.in_progress || 0}</div>
                        <div className={styles.statLabel}>In Progress</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.pending}`}>
                        <span className={styles.statIcon}>⏳</span>
                        <div className={styles.statValue}>{stats.status_stats.pending || 0}</div>
                        <div className={styles.statLabel}>Pending</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.overdue}`}>
                        <span className={styles.statIcon}>⚠️</span>
                        <div className={styles.statValue}>{stats.status_stats.overdue || 0}</div>
                        <div className={styles.statLabel}>Overdue</div>
                    </div>
                    {stats.priority_stats && (
                        <div className={`${styles.statCard} ${styles.total}`}>
                            <span className={styles.statIcon}>🎯</span>
                            <div className={styles.statValue}>
                                {(stats.priority_stats.low || 0) + (stats.priority_stats.medium || 0) +
                                 (stats.priority_stats.high || 0) + (stats.priority_stats.urgent || 0)}
                            </div>
                            <div className={styles.statLabel}>Total Tasks</div>
                        </div>
                    )}
                </div>
            )}

            {/* Tasks Section */}
            <Card style={{ border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <Card.Header style={{
                    background: 'white',
                    borderBottom: '1px solid #E5E7EB',
                    padding: '1.25rem',
                    borderRadius: '12px 12px 0 0'
                }} className="d-flex justify-content-between align-items-center">
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
                        📋 All Tasks
                    </h3>
                    <Button
                        variant="success"
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            borderRadius: '8px',
                            padding: '0.625rem 1.25rem',
                            fontWeight: '500',
                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Create New Task
                    </Button>
                </Card.Header>
                <Card.Body style={{ padding: '1.5rem' }}>
                    {loading ? (
                        <div className={styles.loadingSpinner}>
                            <div className={styles.spinner}></div>
                        </div>
                    ) : filteredTasks.length > 0 ? (
                        filteredTasks.map(task => (
                            <div key={task.id} className="mb-3">
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
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>📭</div>
                            <h3 className={styles.emptyStateTitle}>No tasks found</h3>
                            <p className={styles.emptyStateText}>
                                {filters.search || filters.status || filters.priority
                                    ? "No tasks match your current filters."
                                    : "Create your first task to get started!"}
                            </p>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* ✅ FIXED: Use CreateTaskModal as external component */}
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

            {/* ✅ FIXED: Use EditTaskModal with full implementation */}
            <EditTaskModal />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <nav className="mt-4 d-flex justify-content-center">
                    <ul className="pagination">
                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button
                                className="page-link"
                                onClick={() => {
                                    if (pagination.page > 1) {
                                        setPagination({...pagination, page: pagination.page - 1});
                                    }
                                }}
                                disabled={pagination.page === 1}
                            >
                                Previous
                            </button>
                        </li>
                        {Array.from({length: pagination.totalPages}, (_, i) => i + 1).map(page => (
                            <li key={page} className={`page-item ${pagination.page === page ? 'active' : ''}`}>
                                <button
                                    className="page-link"
                                    onClick={() => setPagination({...pagination, page})}
                                >
                                    {page}
                                </button>
                            </li>
                        ))}
                        <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                            <button
                                className="page-link"
                                onClick={() => {
                                    if (pagination.page < pagination.totalPages) {
                                        setPagination({...pagination, page: pagination.page + 1});
                                    }
                                }}
                                disabled={pagination.page === pagination.totalPages}
                            >
                                Next
                            </button>
                        </li>
                    </ul>
                </nav>
            )}

            {/* ✅ FIXED: Use BulkTaskModal with proper state */}
            {/* Responsive overlay for BulkTaskModal */}
            {showBulkModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: window.innerWidth >= 1200 ? '16rem' : 0,
                        width: window.innerWidth >= 1200 ? 'calc(100% - 16rem)' : '100%',
                        height: '100vh',
                        zIndex: 2100,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        maxWidth: '100vw',
                    }}
                >
                    <BulkTaskModal
                        show={showBulkModal}
                        onHide={() => setShowBulkModal(false)}
                        onSubmit={handleBulkTaskSubmit}
                        initialData={selectedBulkTask || {}}
                        isLoading={loading}
                    />
                </div>
            )}
        </Container>
    );
};

export default TaskManagementPage;