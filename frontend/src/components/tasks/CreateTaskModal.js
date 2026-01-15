/**
 * Create Task Modal - Glassmorphism Design System
 * Location: frontend/src/components/tasks/CreateTaskModal.js
 * Refactored to remove Bootstrap dependencies
 */

import { FormModal } from '../common/modals/FormModal';
import { TypeSelector } from '../common/ui/TypeSelector';

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
            title="Create New Task"
            onClose={onHide}
            onSubmit={onSubmit}
            isLoading={isLoading}
            submitText="Create Task"
            size="lg"
        >
            {/* Task Title */}
            <div style={styles.formGroup}>
                <label style={styles.formLabel}>Task Title *</label>
                <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                    placeholder="Enter task title"
                    maxLength={200}
                    disabled={isLoading}
                    required
                    style={styles.input}
                />
                <span style={styles.charCount}>
                    {taskForm.title.length}/200 characters
                </span>
            </div>

            {/* Assigned To */}
            <div style={styles.formGroup}>
                <label style={styles.formLabel}>Assigned To *</label>
                <select
                    value={taskForm.assigned_to}
                    onChange={(e) => {
                        const selectedEmp = employeeList.find(emp => emp.id === parseInt(e.target.value));
                        setTaskForm({...taskForm, assigned_to: e.target.value});
                        setSelectedEmployee(selectedEmp);
                    }}
                    required
                    style={styles.select}
                >
                    <option value="" style={styles.option}>Select Employee</option>
                    {employeeList.map(employee => (
                        <option key={employee.id} value={employee.id} style={styles.option}>
                            {employee.first_name} {employee.last_name} ({employee.role})
                        </option>
                    ))}
                </select>
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    placeholder="Enter task description"
                    rows={4}
                    maxLength={2000}
                    disabled={isLoading}
                    style={styles.textarea}
                />
                <span style={styles.charCount}>
                    {taskForm.description.length}/2000 characters
                </span>
            </div>

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
            <div style={styles.formGroup}>
                <label style={styles.formLabel}>Due Date</label>
                <input
                    type="datetime-local"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                    min={new Date().toISOString().slice(0, 16)}
                    disabled={isLoading}
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
    select: {
        width: '100%',
        padding: SPACING.md,
        fontSize: FONT_SIZES.base, // 16px prevents iOS zoom
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: BORDER_RADIUS.lg,
        background: '#1e1e2e',
        color: COLORS.text.white,
        outline: 'none',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        minHeight: TOUCH_TARGETS.minimum,
    },
    option: {
        backgroundColor: '#1e1e2e',
        color: '#ffffff',
        padding: SPACING.sm,
    },
    textarea: {
        width: '100%',
        padding: SPACING.md,
        fontSize: FONT_SIZES.base,
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

export default CreateTaskModal;
