/**
 * Bulk Task Assignment Modal - Glassmorphism Design System
 * Location: frontend/src/components/tasks/BulkTaskModal.js
 * Refactored to remove Bootstrap dependencies
 */

import { useState, useEffect } from 'react';
import { FormModal } from '../common/modals/FormModal';
import { TypeSelector } from '../common/ui/TypeSelector';
import taskApiService, { taskErrorHandling, taskValidation } from '../../utils/taskApi';

// Design Constants
import {
    COLORS,
    SPACING,
    FONT_SIZES,
    FONT_WEIGHTS,
    BORDER_RADIUS,
    TRANSITIONS,
    TOUCH_TARGETS,
} from '../../utils/designConstants';

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
            <div style={styles.formGroup}>
                <label style={styles.formLabel}>Task Title *</label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter task title"
                    maxLength={200}
                    disabled={submitting}
                    required
                    style={styles.input}
                />
                <span style={styles.charCount}>
                    {formData.title.length}/200 characters
                </span>
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter task description"
                    rows={4}
                    maxLength={2000}
                    disabled={submitting}
                    style={styles.textarea}
                />
                <span style={styles.charCount}>
                    {formData.description.length}/2000 characters
                </span>
            </div>

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
            <div style={styles.formGroup}>
                <label style={styles.formLabel}>Due Date</label>
                <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    disabled={submitting}
                    min={new Date().toISOString().slice(0, 16)}
                    style={styles.input}
                />
                <span style={styles.helperText}>
                    Leave empty if no due date is required
                </span>
            </div>
        </FormModal>
    );
};

// ============================================
// STYLES - Glassmorphism Design System
// ============================================
const styles = {
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
        fontSize: FONT_SIZES.base, // 16px prevents iOS zoom
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: BORDER_RADIUS.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        outline: 'none',
        transition: `all ${TRANSITIONS.normal}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        minHeight: TOUCH_TARGETS.minimum,
    },
    textarea: {
        width: '100%',
        padding: SPACING.md,
        fontSize: FONT_SIZES.base, // 16px prevents iOS zoom
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: BORDER_RADIUS.lg,
        background: 'rgba(255, 255, 255, 0.1)',
        color: COLORS.text.white,
        outline: 'none',
        resize: 'vertical',
        minHeight: '100px',
        fontFamily: 'inherit',
        transition: `all ${TRANSITIONS.normal}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    },
    charCount: {
        display: 'block',
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.whiteSubtle,
        marginTop: SPACING.xs,
        textAlign: 'right',
    },
    helperText: {
        display: 'block',
        fontSize: FONT_SIZES.xs,
        color: COLORS.text.whiteSubtle,
        marginTop: SPACING.xs,
    },
};

export default BulkTaskModal;
