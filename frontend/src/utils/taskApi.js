/**
 * Task API utilities and error handling following notification system patterns
 * Location: frontend/src/utils/taskApi.js
 */

import axios from 'axios';
import { API_URL, getAuthHeaders } from '../api';
import { toast } from 'react-toastify';

/**
 * Task error handling following SendNotificationModal.js pattern
 */
export const taskErrorHandling = {
  /**
   * Handle task API errors with user-friendly messages
   * @param {Object} error - Axios error object
   */
  handleTaskError: (error) => {
    console.error('Task API Error:', error);
    
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    } else if (error.response?.status === 404) {
      toast.error('Task not found');
    } else if (error.response?.status === 400) {
      const errorMessage = error.response.data?.error || 'Invalid data provided';
      toast.error(errorMessage);
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An error occurred while processing your request');
    }
  },

  /**
   * Handle success messages
   * @param {string} message - Success message
   */
  handleSuccess: (message) => {
    toast.success(message);
  },

  /**
   * Handle loading states
   * @param {Function} setFunction - State setter function
   * @param {boolean} value - Loading value
   */
  setLoading: (setFunction, value) => {
    setFunction(value);
  }
};

/**
 * Task validation following SendNotificationModal.js pattern
 */
export const taskValidation = {
  /**
   * Validate task creation form data
   * @param {Object} formData - Form data to validate
   * @returns {boolean} - True if valid
   */
  validateTaskForm: (formData) => {
    if (!formData.title || !formData.title.trim()) {
      toast.error('Title is required');
      return false;
    }

    if (formData.title.length > 200) {
      toast.error('Title must be less than 200 characters');
      return false;
    }

    if (formData.title.length < 3) {
      toast.error('Title must be at least 3 characters');
      return false;
    }

    if (formData.description && formData.description.length > 2000) {
      toast.error('Description must be less than 2000 characters');
      return false;
    }

    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const now = new Date();
      if (dueDate < now) {
        toast.error('Due date cannot be in the past');
        return false;
      }
    }

    if (!formData.priority) {
      toast.error('Priority is required');
      return false;
    }

    if (!formData.task_type) {
      toast.error('Task type is required');
      return false;
    }

    return true;
  },

  /**
   * Validate task status update
   * @param {Object} statusData - Status update data
   * @returns {boolean} - True if valid
   */
  validateStatusUpdate: (statusData) => {
    if (!statusData.status) {
      toast.error('Status is required');
      return false;
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'overdue'];
    if (!validStatuses.includes(statusData.status)) {
      toast.error('Invalid status value');
      return false;
    }

    if (statusData.status === 'completed' && !statusData.completion_answer) {
      toast.error('Completion answer is required when marking task as completed');
      return false;
    }

    return true;
  }
};

/**
 * Task API service functions
 */
export const taskApiService = {
  /**
   * Get authentication headers for task requests
   * @returns {Object} Headers object
   */
  getTaskHeaders: () => ({
    ...getAuthHeaders(),
    'Content-Type': 'application/json',
  }),

  /**
   * Make authenticated request to task API
   * @param {string} method - HTTP method
   * @param {string} url - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise} - API response
   */
  makeRequest: async (method, url, data = null) => {
    try {
      const config = {
        method,
        url: `${API_URL}${url}`,
        headers: taskApiService.getTaskHeaders(),
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      taskErrorHandling.handleTaskError(error);
      throw error;
    }
  },

  /**
   * Get all tasks for current user
   * @returns {Promise} - Tasks list
   */
  getTasks: async () => {
    return taskApiService.makeRequest('GET', '/api/tasks/');
  },

  /**
   * Get task details by ID
   * @param {number} taskId - Task ID
   * @returns {Promise} - Task details
   */
  getTask: async (taskId) => {
    return taskApiService.makeRequest('GET', `/api/tasks/${taskId}/`);
  },

  /**
   * Create new task
   * @param {Object} taskData - Task data
   * @returns {Promise} - Created task
   */
  createTask: async (taskData) => {
    if (!taskValidation.validateTaskForm(taskData)) {
      throw new Error('Validation failed');
    }
    return taskApiService.makeRequest('POST', '/api/tasks/', taskData);
  },

  /**
   * Update task
   * @param {number} taskId - Task ID
   * @param {Object} taskData - Updated task data
   * @returns {Promise} - Updated task
   */
  updateTask: async (taskId, taskData) => {
    return taskApiService.makeRequest('PATCH', `/api/tasks/${taskId}/`, taskData);
  },

  /**
   * Delete task
   * @param {number} taskId - Task ID
   * @returns {Promise} - Delete confirmation
   */
  deleteTask: async (taskId) => {
    const response = await taskApiService.makeRequest('DELETE', `/api/tasks/${taskId}/`);
    taskErrorHandling.handleSuccess('Task deleted successfully');
    return response;
  },

  /**
   * Get current user's tasks only
   * @returns {Promise} - User's tasks
   */
  getMyTasks: async () => {
    return taskApiService.makeRequest('GET', '/api/tasks/my_tasks/');
  },

  /**
   * Update task status
   * @param {number} taskId - Task ID
   * @param {Object} statusData - Status update data
   * @returns {Promise} - Updated task
   */
  updateTaskStatus: async (taskId, statusData) => {
    if (!taskValidation.validateStatusUpdate(statusData)) {
      throw new Error('Validation failed');
    }
    const response = await taskApiService.makeRequest('PATCH', `/api/tasks/${taskId}/update_status/`, statusData);
    taskErrorHandling.handleSuccess('Task status updated successfully');
    return response;
  },

  /**
   * Assign task to all active employees (Admin only)
   * @param {Object} bulkTaskData - Bulk task assignment data
   * @returns {Promise} - Bulk assignment response
   */
  assignToAll: async (bulkTaskData) => {
    if (!taskValidation.validateTaskForm(bulkTaskData)) {
      throw new Error('Validation failed');
    }
    
    const response = await taskApiService.makeRequest('POST', '/api/tasks/assign_to_all/', bulkTaskData);
    taskErrorHandling.handleSuccess(`Task assigned to ${response.count} employees successfully`);
    return response;
  },

  /**
   * Get task statistics (Admin only)
   * @returns {Promise} - Task statistics
   */
  getTaskStats: async () => {
    return taskApiService.makeRequest('GET', '/api/tasks/stats/');
  }
};

/**
 * Task status and priority utilities
 */
// Constants first, then exports to avoid circular dependency
export const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue'
};

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const TASK_TYPES = {
  GENERAL: 'general',
  ACADEMIC: 'academic',
  ADMINISTRATIVE: 'administrative'
};

export const taskConstants = {
  statuses: TASK_STATUSES,
  priorities: TASK_PRIORITIES,
  types: TASK_TYPES,

  statusLabels: {
    [TASK_STATUSES.PENDING]: 'Pending',
    [TASK_STATUSES.IN_PROGRESS]: 'In Progress',
    [TASK_STATUSES.COMPLETED]: 'Completed',
    [TASK_STATUSES.OVERDUE]: 'Overdue'
  },

  priorityLabels: {
    [TASK_PRIORITIES.LOW]: 'Low',
    [TASK_PRIORITIES.MEDIUM]: 'Medium',
    [TASK_PRIORITIES.HIGH]: 'High',
    [TASK_PRIORITIES.URGENT]: 'Urgent'
  },

  typeLabels: {
    [TASK_TYPES.GENERAL]: 'General',
    [TASK_TYPES.ACADEMIC]: 'Academic',
    [TASK_TYPES.ADMINISTRATIVE]: 'Administrative'
  }
};

export default taskApiService;