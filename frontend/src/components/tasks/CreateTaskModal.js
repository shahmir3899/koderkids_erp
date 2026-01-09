/**
 * Create Task Modal - Extracted Component
 * Location: frontend/src/components/tasks/CreateTaskModal.js
 */

import React from 'react';
import { Form } from 'react-bootstrap';
import { FormModal } from '../common/modals/FormModal';
import { TypeSelector } from '../common/ui/TypeSelector';

const CreateTaskModal = ({
    show,
    onHide,
    onSubmit,
    taskForm,
    setTaskForm,
    employeeList,
    setSelectedEmployee,
    isLoading = false
}) => {
    // Priority options for TypeSelector
    const priorityOptions = [
        { value: 'low', label: 'Low', icon: '🟢', color: '#10B981' },
        { value: 'medium', label: 'Medium', icon: '🟡', color: '#F59E0B' },
        { value: 'high', label: 'High', icon: '🔴', color: '#EF4444' },
        { value: 'urgent', label: 'Urgent', icon: '🚨', color: '#DC2626' }
    ];

    // Task type options for TypeSelector
    const taskTypeOptions = [
        { value: 'general', label: 'General', icon: '📋', color: '#6B7280' },
        { value: 'academic', label: 'Academic', icon: '📚', color: '#3B82F6' },
        { value: 'administrative', label: 'Administrative', icon: '📝', color: '#8B5CF6' }
    ];

    return (
        <FormModal
            show={show}
            title="✨ Create New Task"
            onClose={onHide}
            onSubmit={onSubmit}
            isLoading={isLoading}
            submitText="Create Task"
            size="lg"
        >
            {/* Task Title */}
            <Form.Group className="mb-3">
                <Form.Label>Task Title *</Form.Label>
                <Form.Control
                    type="text"
                    name="title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                    placeholder="Enter task title"
                    maxLength={200}
                    disabled={isLoading}
                    required
                />
                <Form.Text className="text-muted text-end d-block">
                    {taskForm.title.length}/200 characters
                </Form.Text>
            </Form.Group>

            {/* Assigned To */}
            <Form.Group className="mb-3">
                <Form.Label>Assigned To *</Form.Label>
                <Form.Select
                    name="assigned_to"
                    value={taskForm.assigned_to}
                    onChange={(e) => {
                        const selectedEmployee = employeeList.find(emp => emp.id === parseInt(e.target.value));
                        setTaskForm({...taskForm, assigned_to: e.target.value});
                        setSelectedEmployee(selectedEmployee);
                    }}
                    required
                >
                    <option value="">Select Employee</option>
                    {employeeList.map(employee => (
                        <option key={employee.id} value={employee.id}>
                            {employee.first_name} {employee.last_name} ({employee.role})
                        </option>
                    ))}
                </Form.Select>
            </Form.Group>

            {/* Description */}
            <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                    as="textarea"
                    name="description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    placeholder="Enter task description"
                    rows={4}
                    maxLength={2000}
                    disabled={isLoading}
                />
                <Form.Text className="text-muted text-end d-block">
                    {taskForm.description.length}/2000 characters
                </Form.Text>
            </Form.Group>

            {/* Priority - Using TypeSelector */}
            <TypeSelector
                label="Priority"
                value={taskForm.priority}
                onChange={(value) => setTaskForm({...taskForm, priority: value})}
                options={priorityOptions}
                layout="grid"
                required
            />

            {/* Task Type - Using TypeSelector */}
            <TypeSelector
                label="Task Type"
                value={taskForm.task_type}
                onChange={(value) => setTaskForm({...taskForm, task_type: value})}
                options={taskTypeOptions}
                layout="grid"
                required
            />

            {/* Due Date */}
            <Form.Group className="mb-3">
                <Form.Label>Due Date</Form.Label>
                <Form.Control
                    type="datetime-local"
                    name="due_date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                    min={new Date().toISOString().slice(0, 16)}
                    disabled={isLoading}
                />
                <Form.Text className="text-muted">
                    Leave empty if no due date is required
                </Form.Text>
            </Form.Group>
        </FormModal>
    );
};

export default CreateTaskModal;
