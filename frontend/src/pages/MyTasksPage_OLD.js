import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { taskAPI, taskHelpers } from '../api/tasks';
import { getAuthUser } from '../api';

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
        const stats = {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            in_progress: tasks.filter(t => t.status === 'in_progress').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            overdue: tasks.filter(t => t.is_overdue).length,
        };
        return stats;
    };

    const stats = getTaskStats();

    if (!user) {
        return (
            <Container className="mt-4">
                <Alert variant="info">
                    Loading user information...
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            <Row className="mb-4">
                <Col>
                    <h2>My Tasks</h2>
                    <p className="text-muted">View and manage your assigned tasks</p>
                </Col>
            </Row>

            {/* Statistics Cards */}
            <Row className="mb-4">
                <Col md={2}>
                    <Card className="text-center">
                        <Card.Body>
                            <h3 className="text-primary">{stats.total}</h3>
                            <p className="mb-0">Total</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2}>
                    <Card className="text-center">
                        <Card.Body>
                            <h3 className="text-warning">{stats.pending}</h3>
                            <p className="mb-0">Pending</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2}>
                    <Card className="text-center">
                        <Card.Body>
                            <h3 className="text-info">{stats.in_progress}</h3>
                            <p className="mb-0">In Progress</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2}>
                    <Card className="text-center">
                        <Card.Body>
                            <h3 className="text-success">{stats.completed}</h3>
                            <p className="mb-0">Completed</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2}>
                    <Card className="text-center">
                        <Card.Body>
                            <h3 className="text-danger">{stats.overdue}</h3>
                            <p className="mb-0">Overdue</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={2}>
                    <Card className="text-center">
                        <Card.Body>
                            <h3 className="text-secondary">
                                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                            </h3>
                            <p className="mb-0">Completion</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Row className="mb-3">
                <Col md={4}>
                    <Form.Control
                        type="text"
                        placeholder="Search tasks..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                </Col>
                <Col md={3}>
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
                </Col>
                <Col md={3}>
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
                </Col>
                <Col md={2}>
                    <Button variant="outline-secondary" onClick={() => setFilters({ status: '', priority: '', search: '' })}>
                        Clear Filters
                    </Button>
                </Col>
            </Row>

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Tasks List */}
            <Row>
                {filteredTasks.map(task => (
                    <Col md={6} lg={4} key={task.id} className="mb-3">
                        <Card className={`h-100 ${task.is_overdue ? 'border-danger' : ''}`}>
                            <Card.Header className="bg-white">
                                <div className="d-flex justify-content-between align-items-center">
                                    <Badge 
                                        bg="" 
                                        style={{ backgroundColor: taskHelpers.getPriorityColor(task.priority) }}
                                    >
                                        {task.priority}
                                    </Badge>
                                    <Badge 
                                        bg="" 
                                        style={{ backgroundColor: taskHelpers.getStatusColor(task.status) }}
                                    >
                                        {task.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <h5 className="card-title">{task.title}</h5>
                                
                                {task.description && (
                                    <p className="text-muted small mb-3">{task.description}</p>
                                )}
                                
                                <div className="mb-2">
                                    <i className="bi bi-person-fill me-2"></i>
                                    <strong>Assigned by:</strong> {task.assigned_by_name}
                                </div>
                                
                                <div className="mb-2">
                                    <i className="bi bi-calendar-event me-2"></i>
                                    <strong>Due:</strong> {taskHelpers.formatDate(task.due_date)}
                                </div>
                                
                                <div className="mb-2">
                                    <i className="bi bi-tag me-2"></i>
                                    <strong>Type:</strong> {task.task_type}
                                </div>
                                
                                {task.completed_date && (
                                    <div className="mb-2">
                                        <i className="bi bi-check-circle me-2"></i>
                                        <strong>Completed:</strong> {taskHelpers.formatDate(task.completed_date)}
                                    </div>
                                )}
                                
                                {task.is_overdue && (
                                    <Alert variant="danger" className="py-1 px-2 small">
                                        <i className="bi bi-exclamation-triangle-fill"></i> Overdue Task!
                                    </Alert>
                                )}
                                
                                {task.completion_answer && (
                                    <div className="mt-2 p-2 bg-light rounded">
                                        <small>
                                            <strong>Answer:</strong> {task.completion_answer}
                                        </small>
                                    </div>
                                )}
                            </Card.Body>
                            <Card.Footer className="bg-transparent">
                                <Button 
                                    variant={task.status === 'completed' ? 'outline-secondary' : 'primary'}
                                    size="sm" 
                                    className="w-100"
                                    onClick={() => openCompleteModal(task)}
                                    disabled={loading}
                                >
                                    {task.status === 'completed' ? 'View Details' : 'Update Status'}
                                </Button>
                            </Card.Footer>
                        </Card>
                    </Col>
                ))}
            </Row>

            {filteredTasks.length === 0 && !loading && (
                <Row>
                    <Col className="text-center py-5">
                        <i className="bi bi-clipboard-x display-1 text-muted"></i>
                        <h4 className="mt-3 text-muted">No tasks found</h4>
                        <p className="text-muted">
                            {tasks.length === 0 ? 'You haven\'t been assigned any tasks yet.' : 'No tasks match your current filters.'}
                        </p>
                    </Col>
                </Row>
            )}

            {/* Task Completion Modal */}
            <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)} size="lg" style={{ zIndex: 1050 }}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {selectedTask?.status === 'completed' ? 'Task Details' : 'Update Task Status'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleStatusUpdate}>
                    <Modal.Body>
                        {selectedTask && (
                            <>
                                <div className="mb-3">
                                    <h5>{selectedTask.title}</h5>
                                    <p className="text-muted">{selectedTask.description}</p>
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <strong>Priority:</strong> {selectedTask.priority}
                                    </div>
                                    <div className="col-md-6">
                                        <strong>Type:</strong> {selectedTask.task_type}
                                    </div>
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <strong>Due Date:</strong> {taskHelpers.formatDate(selectedTask.due_date)}
                                    </div>
                                    <div className="col-md-6">
                                        <strong>Assigned by:</strong> {selectedTask.assigned_by_name}
                                    </div>
                                </div>

                                <hr />

                                {selectedTask.status !== 'completed' && (
                                    <>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Status *</Form.Label>
                                            <Form.Select
                                                required
                                                value={completionForm.status}
                                                onChange={(e) => setCompletionForm({...completionForm, status: e.target.value})}
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
                                                <Form.Label>Completion Answer/Notes</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={4}
                                                    placeholder="Please provide details about how you completed this task..."
                                                    value={completionForm.completion_answer}
                                                    onChange={(e) => setCompletionForm({...completionForm, completion_answer: e.target.value})}
                                                />
                                                <Form.Text className="text-muted">
                                                    Describe how you completed this task or provide any relevant notes.
                                                </Form.Text>
                                            </Form.Group>
                                        )}
                                    </>
                                )}

                                {selectedTask.status === 'completed' && selectedTask.completion_answer && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Completion Answer</Form.Label>
                                        <div className="p-3 bg-light rounded">
                                            {selectedTask.completion_answer}
                                        </div>
                                    </Form.Group>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
                            Close
                        </Button>
                        {selectedTask?.status !== 'completed' && (
                            <Button type="primary" disabled={loading}>
                                {loading ? 'Updating...' : 'Update Status'}
                            </Button>
                        )}
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default MyTasksPage;