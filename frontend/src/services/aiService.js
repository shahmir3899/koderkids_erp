// ============================================
// AI SERVICE
// Frontend service for AI Agent API calls
// Location: frontend/src/services/aiService.js
// ============================================

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create a silent axios instance that bypasses the global ERP loader
// This prevents the full-screen loader from showing during AI chat interactions
const silentAxios = axios.create({
    baseURL: API_URL,
});

// Get auth token from localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem('access');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Check AI service health
 * @returns {Promise<{status: string, ai_available: boolean, model: string, message: string}>}
 */
export const checkAIHealth = async () => {
    try {
        const response = await silentAxios.get('/api/ai/health/');
        return response.data;
    } catch (error) {
        console.error('AI health check failed:', error);
        return {
            status: 'degraded',
            ai_available: false,
            model: 'unknown',
            message: 'Could not connect to AI service'
        };
    }
};

/**
 * Execute an AI agent command
 * @param {Object} params
 * @param {string} params.message - Natural language message
 * @param {string} params.agent - Agent type: 'fee', 'inventory', 'hr', 'broadcast'
 * @param {Object} params.context - Context data (schools, students, etc.)
 * @param {Array} params.conversationHistory - Previous messages for multi-turn conversation
 * @returns {Promise<Object>} AI response
 */
export const executeAICommand = async ({ message, agent, context = {}, conversationHistory = [] }) => {
    try {
        const response = await silentAxios.post(
            '/api/ai/execute/',
            { message, agent, context, conversation_history: conversationHistory },
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error('AI execute error:', error);
        const errorMessage = error.response?.data?.error || error.message || 'AI service error';
        return {
            success: false,
            message: errorMessage,
            fallback_to_templates: true
        };
    }
};

/**
 * Confirm or cancel a pending destructive action
 * @param {string} confirmationToken - Token from needs_confirmation response
 * @param {boolean} confirmed - true to confirm, false to cancel
 * @returns {Promise<Object>} Confirmation result
 */
export const confirmAIAction = async (confirmationToken, confirmed = true) => {
    try {
        const response = await silentAxios.post(
            '/api/ai/confirm/',
            { confirmation_token: confirmationToken, confirmed },
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error('AI confirm error:', error);
        return {
            success: false,
            message: error.response?.data?.error || 'Confirmation failed'
        };
    }
};

/**
 * Execute a fee creation action with force_overwrite enabled
 * Used when user confirms they want to overwrite existing records
 * @param {Object} params
 * @param {string} params.action - Action name (e.g., 'CREATE_MONTHLY_FEES')
 * @param {Object} params.params - Action parameters
 * @returns {Promise<Object>} Execution result
 */
export const executeOverwrite = async ({ action, params }) => {
    try {
        const response = await silentAxios.post(
            '/api/ai/overwrite/',
            { action, params },
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error('AI overwrite error:', error);
        return {
            success: false,
            message: error.response?.data?.error || 'Overwrite failed'
        };
    }
};

/**
 * Get AI usage history for current user
 * @param {Object} params
 * @param {string} [params.agent] - Filter by agent type
 * @param {string} [params.status] - Filter by status
 * @param {number} [params.limit=20] - Max results
 * @returns {Promise<Object>} History results
 */
export const getAIHistory = async ({ agent, status, limit = 20 } = {}) => {
    try {
        const params = new URLSearchParams();
        if (agent) params.append('agent', agent);
        if (status) params.append('status', status);
        params.append('limit', limit.toString());

        const response = await silentAxios.get(
            `/api/ai/history/?${params.toString()}`,
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error('AI history error:', error);
        return { results: [], count: 0 };
    }
};

/**
 * Get AI usage statistics
 * @returns {Promise<Object>} Stats
 */
export const getAIStats = async () => {
    try {
        const response = await silentAxios.get(
            '/api/ai/stats/',
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error('AI stats error:', error);
        return {
            total_requests: 0,
            by_agent: {},
            by_status: {},
            avg_response_time_ms: 0
        };
    }
};

/**
 * Build context object for fee agent
 * @param {Array} schools - List of schools
 * @param {Array} students - List of students (optional)
 * @param {Array} feeCategories - Fee categories (optional)
 * @returns {Object} Context for AI
 */
export const buildFeeContext = (schools = [], students = [], feeCategories = []) => {
    const now = new Date();
    return {
        current_date: now.toISOString().split('T')[0],
        current_month: now.toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-'),
        schools: schools.map(s => ({
            id: s.id,
            name: s.name,
            short_name: s.short_name || s.name.substring(0, 10)
        })),
        students: students.slice(0, 100).map(s => ({
            id: s.id,
            name: s.name,
            school_id: s.school_id || s.school,
            class: s.student_class || s.class_name
        })),
        fee_categories: feeCategories.map(c => ({
            id: c.id,
            name: c.name
        }))
    };
};

/**
 * Build context object for inventory agent
 * @param {Array} schools - List of schools
 * @param {Array} categories - Inventory categories
 * @param {Array} users - List of users/teachers (optional)
 * @param {Number} currentUserId - Current user's ID (optional)
 * @param {Boolean} isAdmin - Whether current user is admin (optional)
 * @returns {Object} Context for AI
 */
export const buildInventoryContext = (schools = [], categories = [], users = [], currentUserId = null, isAdmin = false) => {
    const now = new Date();
    return {
        current_date: now.toISOString().split('T')[0],
        current_user_id: currentUserId,
        is_admin: isAdmin,
        schools: schools.map(s => ({
            id: s.id,
            name: s.name
        })),
        categories: categories.map(c => ({
            id: c.id,
            name: c.name
        })),
        users: users.map(u => ({
            id: u.id,
            name: u.name || u.username || `User ${u.id}`
        }))
    };
};

/**
 * Build context object for HR agent
 * @param {Array} schools - List of schools
 * @param {Array} employees - List of employees
 * @returns {Object} Context for AI
 */
export const buildHRContext = (schools = [], employees = []) => {
    const now = new Date();
    return {
        current_date: now.toISOString().split('T')[0],
        current_month: now.toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-'),
        schools: schools.map(s => ({
            id: s.id,
            name: s.name
        })),
        employees: employees.slice(0, 100).map(e => ({
            id: e.id,
            name: e.name,
            role: e.role,
            school_id: e.school_id || e.school
        }))
    };
};

/**
 * Build context object for broadcast agent
 * @param {Array} schools - List of schools
 * @param {Array} groups - Broadcast groups
 * @returns {Object} Context for AI
 */
export const buildBroadcastContext = (schools = [], groups = []) => {
    return {
        current_date: new Date().toISOString().split('T')[0],
        schools: schools.map(s => ({
            id: s.id,
            name: s.name
        })),
        groups: groups.map(g => ({
            id: g.id,
            name: g.name,
            type: g.type
        }))
    };
};

export default {
    checkAIHealth,
    executeAICommand,
    confirmAIAction,
    executeOverwrite,
    getAIHistory,
    getAIStats,
    buildFeeContext,
    buildInventoryContext,
    buildHRContext,
    buildBroadcastContext
};
