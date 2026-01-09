import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api/tasks';

// Configure axios with auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('access');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// Task API service
export const taskAPI = {
    // Get all tasks (admin) or user's tasks (employee)
    getTasks: async () => {
        try {
            const response = await axios.get(API_BASE_URL, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    },

    // Get current user's assigned tasks
    getMyTasks: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/my_tasks/`, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching my tasks:', error);
            throw error;
        }
    },

    // Get task statistics (admin only)
    getTaskStats: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/stats/`, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching task stats:', error);
            throw error;
        }
    },

    // Create a new task
    createTask: async (taskData) => {
        try {
            const response = await axios.post(API_BASE_URL, taskData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    },

    // Assign task to all active employees (admin only)
    assignToAll: async (taskData) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/assign_to_all/`, taskData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error assigning task to all:', error);
            throw error;
        }
    },

    // Get single task details
    getTask: async (taskId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/${taskId}/`, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching task:', error);
            throw error;
        }
    },

    // Update task details
    updateTask: async (taskId, taskData) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/${taskId}/`, taskData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    },

    // Partial update task
    patchTask: async (taskId, taskData) => {
        try {
            const response = await axios.patch(`${API_BASE_URL}/${taskId}/`, taskData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error patching task:', error);
            throw error;
        }
    },

    // Update task status and completion answer
    updateTaskStatus: async (taskId, statusData) => {
        try {
            const response = await axios.patch(`${API_BASE_URL}/${taskId}/update_status/`, statusData, {
                headers: getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    },

    // Delete task
    deleteTask: async (taskId) => {
        try {
            await axios.delete(`${API_BASE_URL}/${taskId}/`, {
                headers: getAuthHeaders()
            });
            return true;
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }
};

// Helper functions for task management
export const taskHelpers = {
    // Get status color for UI
    getStatusColor: (status) => {
        const colors = {
            'pending': '#6B7280',
            'in_progress': '#3B82F6',
            'completed': '#10B981',
            'overdue': '#EF4444'
        };
        return colors[status] || '#6B7280';
    },

    // Get priority color for UI
    getPriorityColor: (priority) => {
        const colors = {
            'low': '#10B981',
            'medium': '#3B82F6',
            'high': '#F59E0B',
            'urgent': '#EF4444'
        };
        return colors[priority] || '#6B7280';
    },

    // Format date for display
    formatDate: (dateString) => {
        if (!dateString) return 'No due date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Check if task is overdue
    isOverdue: (dueDate, status) => {
        if (!dueDate || status === 'completed') return false;
        return new Date(dueDate) < new Date();
    },

    // Get status options for dropdown
    getStatusOptions: () => [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'overdue', label: 'Overdue' }
    ],

    // Get priority options for dropdown
    getPriorityOptions: () => [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
    ],

    // Get task type options for dropdown
    getTaskTypeOptions: () => [
        { value: 'general', label: 'General' },
        { value: 'academic', label: 'Academic' },
        { value: 'administrative', label: 'Administrative' }
    ]
};

export default taskAPI;