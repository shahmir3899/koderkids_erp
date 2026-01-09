/**
 * Task Actions Component with loading states and error handling
 * Following SendNotificationModal.js patterns
 * Location: frontend/src/components/tasks/TaskActions.js
 */

import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { TASK_PRIORITIES, TASK_TYPES, TASK_STATUSES, taskConstants, taskErrorHandling, taskApiService } from '../../utils/taskApi';

const TaskActions = ({ task, onUpdate, onShowBulkModal, onShowEditModal }) => {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigningToAll, setAssigningToAll] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionAnswer, setCompletionAnswer] = useState('');

  /**
   * Handle task status update
   * @param {string} newStatus - New status value
   */
  const handleStatusUpdate = async (newStatus, completionAnswer = '') => {
    // SendNotificationModal.js loading pattern
    taskErrorHandling.setLoading(setUpdating, true);
    
    try {
      await taskApiService.updateTaskStatus(task.id, {
        status: newStatus,
        completion_answer: completionAnswer
      });
      
      // SendNotificationModal.js success pattern
      taskErrorHandling.handleSuccess('Task status updated successfully');
      
      // Callback to refresh parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      // SendNotificationModal.js error pattern
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
   * Handle bulk task assignment (Admin only)
   */
  const handleAssignToAll = async () => {
    if (!window.confirm('Create similar task for all active employees?')) {
      return;
    }

    taskErrorHandling.setLoading(setAssigningToAll, true);
    
    try {
      const bulkTaskData = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        task_type: task.task_type,
        due_date: task.due_date
      };

      await taskApiService.assignToAll(bulkTaskData);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      taskErrorHandling.handleTaskError(error);
    } finally {
      taskErrorHandling.setLoading(setAssigningToAll, false);
    }
  };

  /**
   * Get status label and color
   */
  const getStatusInfo = (status) => {
    const label = taskConstants.statusLabels[status] || status;
    const color = {
      [taskConstants.statuses.PENDING]: 'gray',
      [taskConstants.statuses.IN_PROGRESS]: 'blue',
      [taskConstants.statuses.COMPLETED]: 'green',
      [taskConstants.statuses.OVERDUE]: 'red'
    }[status] || 'gray';
    
    return { label, color };
  };

  /**
   * Get priority label and color
   */
  const getPriorityInfo = (priority) => {
    const label = taskConstants.priorityLabels[priority] || priority;
    const color = {
      [taskConstants.priorities.LOW]: 'green',
      [taskConstants.priorities.MEDIUM]: 'yellow',
      [taskConstants.priorities.HIGH]: 'red',
      [taskConstants.priorities.URGENT]: 'purple'
    }[priority] || 'gray';
    
    return { label, color };
  };

  const statusInfo = getStatusInfo(task.status);
  const priorityInfo = getPriorityInfo(task.priority);
  const isOverdue = task.is_overdue;

  return (
    <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      padding: '1rem',
      background: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '0.5rem'
    }}>
      {/* Task Header with Title and Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600', color: '#1F2937' }}>
            {task.title}
          </h4>
          {task.description && (
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#6B7280', lineHeight: '1.5' }}>
              {task.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: '1rem' }}>
          {/* Status Badge */}
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: isOverdue ? '#FEE2E2' :
              statusInfo.color === 'green' ? '#D1FAE5' :
              statusInfo.color === 'blue' ? '#DBEAFE' :
              statusInfo.color === 'red' ? '#FEE2E2' : '#F3F4F6',
            color: isOverdue ? '#991B1B' :
              statusInfo.color === 'green' ? '#065F46' :
              statusInfo.color === 'blue' ? '#1E40AF' :
              statusInfo.color === 'red' ? '#991B1B' : '#374151'
          }}>
            {statusInfo.label}
          </span>
          {/* Priority Badge */}
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor:
              priorityInfo.color === 'green' ? '#D1FAE5' :
              priorityInfo.color === 'yellow' ? '#FEF3C7' :
              priorityInfo.color === 'red' ? '#FEE2E2' :
              priorityInfo.color === 'purple' ? '#EDE9FE' : '#F3F4F6',
            color:
              priorityInfo.color === 'green' ? '#065F46' :
              priorityInfo.color === 'yellow' ? '#92400E' :
              priorityInfo.color === 'red' ? '#991B1B' :
              priorityInfo.color === 'purple' ? '#5B21B6' : '#374151'
          }}>
            {priorityInfo.label}
          </span>
        </div>
      </div>

      {/* Task Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#4B5563' }}>
        {task.assigned_to_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#9CA3AF' }}>👤</span>
            <span><strong>Assigned to:</strong> {task.assigned_to_name}</span>
          </div>
        )}
        {task.assigned_by_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#9CA3AF' }}>👨‍💼</span>
            <span><strong>Created by:</strong> {task.assigned_by_name}</span>
          </div>
        )}
        {task.task_type && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#9CA3AF' }}>🏷️</span>
            <span><strong>Type:</strong> {task.task_type}</span>
          </div>
        )}
        {task.due_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#9CA3AF' }}>📅</span>
            <span><strong>Due:</strong> {new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Update Status Buttons */}
        {task.status === taskConstants.statuses.PENDING && (
          <button
            onClick={() => handleStatusUpdate(TASK_STATUSES.IN_PROGRESS)}
            disabled={updating || deleting}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              updating 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {updating ? 'Updating...' : 'Start Task'}
          </button>
        )}

        {task.status === taskConstants.statuses.IN_PROGRESS && (
          <button
            onClick={() => setShowCompletionModal(true)}
            disabled={updating || deleting}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              updating 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600 focus:ring-2 focus:ring-green-500'
            }`}
          >
            {updating ? 'Completing...' : 'Mark Complete'}
          </button>
        )}

        {/* Edit Button */}
        <button
          onClick={() => {
            console.log('🚀 TaskActions: Edit button clicked for task:', task);
            if (onShowEditModal) {
              onShowEditModal(task);
            }
          }}
          disabled={updating || deleting}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            updating || deleting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500'
          }`}
        >
          Edit
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={updating || deleting || assigningToAll}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            deleting || updating || assigningToAll
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-600 focus:ring-2 focus:ring-red-500'
          }`}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>

        {/* Assign to All Button - Admin Only */}
        {task.assigned_by_role === 'Admin' && (
          <button
            onClick={() => {
              console.log('🚀 TaskActions: Assign to All button clicked for task:', task);
              // Emit event to parent to show bulk modal
              if (onShowBulkModal) {
                onShowBulkModal(task);
              }
            }}
            disabled={updating || deleting || assigningToAll}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              assigningToAll || updating || deleting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-500 text-white hover:bg-purple-600 focus:ring-2 focus:ring-purple-500'
            }`}
          >
            {assigningToAll ? 'Assigning...' : 'Assign to All'}
          </button>
        )}
      </div>

      {/* Loading Overlay */}
      {(updating || deleting || assigningToAll) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-gray-600">
            {updating && 'Updating task...'}
            {deleting && 'Deleting task...'}
            {assigningToAll && 'Assigning to all employees...'}
          </div>
        </div>
      )}

      {/* Completion Modal */}
      <Modal show={showCompletionModal} onHide={() => setShowCompletionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Complete Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Completion Answer *</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={completionAnswer}
              onChange={(e) => setCompletionAnswer(e.target.value)}
              placeholder="Describe what you accomplished or provide completion details"
              maxLength={500}
            />
            <Form.Text className="text-muted">
              {completionAnswer.length}/500 characters
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCompletionModal(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            disabled={!completionAnswer.trim() || updating}
            onClick={() => {
              handleStatusUpdate(taskConstants.statuses.COMPLETED, completionAnswer);
              setCompletionAnswer('');
              setShowCompletionModal(false);
            }}
          >
            {updating ? 'Completing...' : 'Mark Complete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TaskActions;