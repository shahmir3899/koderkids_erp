/**
 * Bulk Task Assignment Modal - Refactored to use reusable components
 * Location: frontend/src/components/tasks/BulkTaskModal.js
 */

import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import { FormModal } from '../common/modals/FormModal';
import { TypeSelector } from '../common/ui/TypeSelector';
import taskApiService, { taskErrorHandling, taskValidation } from '../../utils/taskApi';

const BulkTaskModal = ({
    show,
    onHide,
    onSubmit,
    initialData = {},
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        task_type: initialData.task_type || 'general',
        due_date: initialData.due_date || ''
    });
    const [submitting, setSubmitting] = useState(false);

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

    useEffect(() => {
        setFormData({
            title: initialData.title || '',
            description: initialData.description || '',
            priority: initialData.priority || 'medium',
            task_type: initialData.task_type || 'general',
            due_date: initialData.due_date || ''
        });
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!taskValidation.validateTaskForm(formData)) {
            return;
        }

        setSubmitting(true);
        try {
            await taskApiService.assignToAll(formData);
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                task_type: 'general',
                due_date: ''
            });
            if (onSubmit) {
                onSubmit();
            }
            onHide();
        } catch (error) {
            taskErrorHandling.handleTaskError(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormModal
            show={show}
            title="Assign Task to All Employees"
            onClose={onHide}
            onSubmit={handleSubmit}
            isLoading={submitting}
            submitText="Assign to All Employees"
            size="lg"
        >
            {/* Task Title */}
            <Form.Group className="mb-3">
                <Form.Label>Task Title *</Form.Label>
                <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter task title"
                    maxLength={200}
                    disabled={submitting}
                    required
                />
                <Form.Text className="text-muted text-end d-block">
                    {formData.title.length}/200 characters
                </Form.Text>
            </Form.Group>

            {/* Description */}
            <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                    as="textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter task description"
                    rows={4}
                    maxLength={2000}
                    disabled={submitting}
                />
                <Form.Text className="text-muted text-end d-block">
                    {formData.description.length}/2000 characters
                </Form.Text>
            </Form.Group>

            {/* Priority - Using TypeSelector */}
            <TypeSelector
                label="Priority"
                value={formData.priority}
                onChange={(value) => setFormData({...formData, priority: value})}
                options={priorityOptions}
                layout="grid"
                required
            />

            {/* Task Type - Using TypeSelector */}
            <TypeSelector
                label="Task Type"
                value={formData.task_type}
                onChange={(value) => setFormData({...formData, task_type: value})}
                options={taskTypeOptions}
                layout="grid"
                required
            />

            {/* Due Date */}
            <Form.Group className="mb-3">
                <Form.Label>Due Date</Form.Label>
                <Form.Control
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    disabled={submitting}
                    min={new Date().toISOString().slice(0, 16)}
                />
                <Form.Text className="text-muted">
                    Leave empty if no due date is required
                </Form.Text>
            </Form.Group>
        </FormModal>
    );
};

export default BulkTaskModal;
