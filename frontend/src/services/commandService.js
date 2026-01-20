// ============================================
// STAFF COMMANDS SERVICE
// API service for Staff Commands feature
// Location: frontend/src/services/commandService.js
// ============================================

import axios from 'axios';
import { API_URL, getAuthHeaders, getJsonHeaders } from '../api';

// ============================================
// CACHE CONFIGURATION
// ============================================

const QUICK_ACTIONS_CACHE_KEY = 'staff_quick_actions';
const COMMAND_HISTORY_CACHE_KEY = 'staff_command_history';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// ============================================
// CACHE UTILITIES
// ============================================

const getCachedData = (cacheKey, duration = CACHE_DURATION) => {
    try {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const isValid = Date.now() - timestamp < duration;

        if (isValid) {
            console.log(`📦 Using cached data for: ${cacheKey}`);
            return data;
        }

        localStorage.removeItem(cacheKey);
        return null;
    } catch (error) {
        console.error(`❌ Cache read error for ${cacheKey}:`, error);
        localStorage.removeItem(cacheKey);
        return null;
    }
};

const setCachedData = (cacheKey, data) => {
    try {
        localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        console.log(`💾 Cached data for: ${cacheKey}`);
    } catch (error) {
        console.error(`❌ Cache write error for ${cacheKey}:`, error);
    }
};

const clearCache = (cacheKey = null) => {
    if (cacheKey) {
        localStorage.removeItem(cacheKey);
    } else {
        localStorage.removeItem(QUICK_ACTIONS_CACHE_KEY);
        localStorage.removeItem(COMMAND_HISTORY_CACHE_KEY);
    }
    console.log('🗑️ Cache cleared');
};

// ============================================
// COMMAND EXECUTION
// ============================================

/**
 * Execute a staff command
 * @param {string} command - Natural language command text
 * @returns {Promise<Object>} Command execution result
 *
 * Response structure:
 * {
 *   success: boolean,
 *   message: string,
 *   data: object,
 *   toast: { type: 'success'|'error'|'info', message: string },
 *   needs_clarification: boolean,
 *   clarification: { field, message, options },
 *   command_id: number
 * }
 */
export const executeCommand = async (command) => {
    try {
        console.log('📡 Executing command:', command);

        const response = await axios.post(
            `${API_URL}/api/commands/execute/`,
            { command },
            { headers: getJsonHeaders() }
        );

        console.log('✅ Command executed:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Command execution error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Continue a command with clarification selection
 * @param {number} commandId - ID of command awaiting clarification
 * @param {Object} clarification - Selected clarification option
 * @returns {Promise<Object>} Command execution result
 */
export const continueCommand = async (commandId, clarification) => {
    try {
        console.log('📡 Continuing command with clarification:', { commandId, clarification });

        const response = await axios.post(
            `${API_URL}/api/commands/execute/`,
            {
                command_id: commandId,
                clarification
            },
            { headers: getJsonHeaders() }
        );

        console.log('✅ Command continued:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Command continuation error:', error.response?.data || error.message);
        throw error;
    }
};

// ============================================
// QUICK ACTIONS
// ============================================

/**
 * Fetch quick actions for user's role
 * @param {boolean} bypassCache - Skip cache if true
 * @returns {Promise<Array>} Array of quick action objects
 */
export const getQuickActions = async (bypassCache = false) => {
    if (!bypassCache) {
        const cached = getCachedData(QUICK_ACTIONS_CACHE_KEY);
        if (cached) return cached;
    }

    try {
        console.log('📡 Fetching quick actions...');

        const response = await axios.get(
            `${API_URL}/api/commands/quick-actions/`,
            { headers: getAuthHeaders() }
        );

        const data = response.data.results || response.data;
        setCachedData(QUICK_ACTIONS_CACHE_KEY, data);

        console.log('✅ Quick actions fetched:', data.length, 'items');
        return data;
    } catch (error) {
        console.error('❌ Quick actions fetch error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Get quick actions grouped by agent
 * @returns {Promise<Object>} Quick actions grouped by agent type
 */
export const getQuickActionsByAgent = async () => {
    const actions = await getQuickActions();

    return actions.reduce((grouped, action) => {
        const agent = action.agent || 'other';
        if (!grouped[agent]) {
            grouped[agent] = [];
        }
        grouped[agent].push(action);
        return grouped;
    }, {});
};

// ============================================
// COMMAND HISTORY
// ============================================

/**
 * Fetch command history for current user
 * @param {Object} options - Filter options
 * @param {string} options.status - Filter by status (success, failed, pending)
 * @param {string} options.agent - Filter by agent type
 * @param {number} options.limit - Maximum number of results
 * @param {boolean} bypassCache - Skip cache if true
 * @returns {Promise<Array>} Array of command history objects
 */
export const getCommandHistory = async (options = {}, bypassCache = false) => {
    const cacheKey = `${COMMAND_HISTORY_CACHE_KEY}_${JSON.stringify(options)}`;

    if (!bypassCache) {
        const cached = getCachedData(cacheKey, 5 * 60 * 1000); // 5 min cache for history
        if (cached) return cached;
    }

    try {
        console.log('📡 Fetching command history with options:', options);

        const params = {};
        if (options.status) params.status = options.status;
        if (options.agent) params.agent = options.agent;
        if (options.limit) params.limit = options.limit;

        const response = await axios.get(
            `${API_URL}/api/commands/history/`,
            {
                headers: getAuthHeaders(),
                params
            }
        );

        const data = response.data.results || response.data;
        setCachedData(cacheKey, data);

        console.log('✅ Command history fetched:', data.length, 'items');
        return data;
    } catch (error) {
        console.error('❌ Command history fetch error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Get command details by ID
 * @param {number} commandId - Command ID
 * @returns {Promise<Object>} Command details
 */
export const getCommandById = async (commandId) => {
    try {
        console.log('📡 Fetching command details:', commandId);

        const response = await axios.get(
            `${API_URL}/api/commands/history/${commandId}/`,
            { headers: getAuthHeaders() }
        );

        console.log('✅ Command details fetched:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Command details fetch error:', error.response?.data || error.message);
        throw error;
    }
};

// ============================================
// COMMAND SUGGESTIONS
// ============================================

/**
 * Get command suggestions based on partial input
 * @param {string} partialText - Partial command text
 * @returns {Promise<Array>} Array of suggestion strings
 */
export const getCommandSuggestions = async (partialText) => {
    if (!partialText || partialText.length < 2) {
        return [];
    }

    try {
        const response = await axios.get(
            `${API_URL}/api/commands/history/suggestions/`,
            {
                headers: getAuthHeaders(),
                params: { q: partialText }
            }
        );

        return response.data.suggestions || [];
    } catch (error) {
        console.error('❌ Suggestions fetch error:', error.response?.data || error.message);
        // Return empty array on error - don't throw for suggestions
        return [];
    }
};

// ============================================
// AVAILABLE COMMANDS
// ============================================

/**
 * Get list of available command patterns
 * @returns {Promise<Object>} Available commands by agent
 */
export const getAvailableCommands = async () => {
    try {
        const response = await axios.get(
            `${API_URL}/api/commands/history/available_commands/`,
            { headers: getAuthHeaders() }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Available commands fetch error:', error.response?.data || error.message);
        throw error;
    }
};

// ============================================
// COMMAND STATISTICS
// ============================================

/**
 * Get command usage statistics
 * @returns {Promise<Object>} Stats object with counts by agent, status, etc.
 */
export const getCommandStats = async () => {
    try {
        const response = await axios.get(
            `${API_URL}/api/commands/history/stats/`,
            { headers: getAuthHeaders() }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Stats fetch error:', error.response?.data || error.message);
        throw error;
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format command result for display
 * @param {Object} result - Command execution result
 * @returns {Object} Formatted display data
 */
export const formatCommandResult = (result) => {
    if (!result) return { type: 'error', message: 'No result received' };

    return {
        type: result.success ? 'success' : 'error',
        message: result.message || (result.success ? 'Command executed' : 'Command failed'),
        data: result.data,
        items: result.data?.results || [],
        count: result.data?.count || 0,
        toast: result.toast
    };
};

/**
 * Get agent display info
 * @param {string} agent - Agent type (inventory, broadcast, finance, hr)
 * @returns {Object} Agent display info (icon, color, label)
 */
export const getAgentInfo = (agent) => {
    const agents = {
        inventory: {
            icon: '📦',
            color: '#10B981',
            label: 'Inventory',
            description: 'Manage inventory items, categories, and status'
        },
        broadcast: {
            icon: '📢',
            color: '#3B82F6',
            label: 'Broadcast',
            description: 'Send notifications to parents and teachers'
        },
        finance: {
            icon: '💰',
            color: '#F59E0B',
            label: 'Finance',
            description: 'View fee summaries and pending payments'
        },
        hr: {
            icon: '👥',
            color: '#8B5CF6',
            label: 'HR',
            description: 'Manage attendance and substitutes'
        }
    };

    return agents[agent] || {
        icon: '🤖',
        color: '#6B7280',
        label: agent || 'Unknown',
        description: 'Unknown agent type'
    };
};

/**
 * Get status display info
 * @param {string} status - Command status
 * @returns {Object} Status display info (icon, color, label)
 */
export const getStatusInfo = (status) => {
    const statuses = {
        success: { icon: '✅', color: '#10B981', label: 'Success' },
        failed: { icon: '❌', color: '#EF4444', label: 'Failed' },
        pending: { icon: '⏳', color: '#F59E0B', label: 'Pending' },
        processing: { icon: '⚙️', color: '#3B82F6', label: 'Processing' },
        awaiting_clarification: { icon: '❓', color: '#8B5CF6', label: 'Needs Clarification' }
    };

    return statuses[status] || { icon: '❔', color: '#6B7280', label: status };
};

// ============================================
// EXPORTS
// ============================================

const commandService = {
    // Execution
    executeCommand,
    continueCommand,

    // Quick Actions
    getQuickActions,
    getQuickActionsByAgent,

    // History
    getCommandHistory,
    getCommandById,

    // Suggestions
    getCommandSuggestions,
    getAvailableCommands,

    // Stats
    getCommandStats,

    // Helpers
    formatCommandResult,
    getAgentInfo,
    getStatusInfo,

    // Cache
    clearCache
};

export default commandService;
