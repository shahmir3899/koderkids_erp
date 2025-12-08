// ============================================
// INVENTORY SERVICE - With RBAC Support
// ============================================
// Location: src/services/inventoryService.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Auth headers helper
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

// ============================================
// USER CONTEXT (RBAC)
// ============================================

/**
 * Fetch current user's inventory access context
 * Returns role info, allowed schools, permissions
 */
export const fetchUserInventoryContext = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/user-context/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user context:', error);
    throw error;
  }
};

// ============================================
// INVENTORY ITEMS CRUD
// ============================================

export const fetchInventoryItems = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.locationId) params.append('school', filters.locationId);
    if (filters.categoryId) params.append('category', filters.categoryId);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters.location) params.append('location', filters.location);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/inventory/items/${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
};

export const fetchInventoryItem = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/items/${id}/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    throw error;
  }
};

export const createInventoryItem = async (itemData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/inventory/items/`, itemData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
};

export const updateInventoryItem = async (id, itemData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/inventory/items/${id}/`, itemData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/api/inventory/items/${id}/`, {
      headers: getAuthHeaders(),
    });
    return true;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

// ============================================
// BULK CREATE
// ============================================

export const bulkCreateItems = async (itemData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/inventory/bulk-create/`, itemData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error bulk creating items:', error);
    throw error;
  }
};

// ============================================
// EMPLOYEES & USERS
// ============================================

/**
 * Fetch list of employees from TeacherProfile
 */
export const fetchEmployees = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/employees/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

/**
 * Fetch users available for assignment (role-filtered)
 */
export const fetchAvailableUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/assigned-users/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching available users:', error);
    return [];
  }
};

/**
 * Fetch schools the current user can access (role-filtered)
 */
export const fetchAllowedSchools = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/allowed-schools/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching allowed schools:', error);
    return [];
  }
};

// ============================================
// INVENTORY HISTORY
// ============================================

export const fetchInventoryHistory = async (itemId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/items/${itemId}/`, {
      headers: getAuthHeaders(),
    });
    
    const item = response.data;
    const history = [];
    
    if (item.notes) {
      const lines = item.notes.split('\n');
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('[')) {
          const dateMatch = trimmed.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\]/);
          const date = dateMatch ? dateMatch[1] : null;
          const description = trimmed.replace(/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/, '');
          
          history.push({
            id: index,
            date: date,
            description: description,
            type: description.toLowerCase().includes('transfer') ? 'transfer' : 'note',
          });
        }
      });
    }
    
    if (item.created_at) {
      history.push({
        id: 'created',
        date: item.created_at,
        description: 'Item created',
        type: 'created',
      });
    }
    
    history.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
    
    return history;
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    throw error;
  }
};

// ============================================
// TRANSFERS & REPORTS
// ============================================

export const transferInventoryItems = async (payload) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/inventory/reports/transfer-receipt/`,
      payload,
      {
        headers: getAuthHeaders(),
        responseType: 'blob',
        timeout: 60000,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error transferring items:', error);
    if (error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const json = JSON.parse(text);
        error.response.data = json;
      } catch (e) {
        // Not JSON
      }
    }
    throw error;
  }
};

export const generateInventoryListReport = async (options) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/inventory/reports/inventory-list/`,
      options,
      {
        headers: getAuthHeaders(),
        responseType: 'blob',
        timeout: 60000,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error generating inventory report:', error);
    if (error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const json = JSON.parse(text);
        error.response.data = json;
      } catch (e) {
        // Not JSON
      }
    }
    throw error;
  }
};

export const generateItemDetailReport = async (itemId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/inventory/reports/item-detail/${itemId}/`,
      {
        headers: getAuthHeaders(),
        responseType: 'blob',
        timeout: 30000,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error generating item detail report:', error);
    throw error;
  }
};

// ============================================
// DASHBOARD & STATISTICS
// ============================================

export const fetchInventorySummary = async (locationId, location) => {
  try {
    const params = new URLSearchParams();
    if (locationId) params.append('school', locationId);
    if (location) params.append('location', location);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/inventory/summary/${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    throw error;
  }
};

export const fetchInventoryStats = async (locationId) => {
  return fetchInventorySummary(locationId);
};

// ============================================
// CATEGORIES
// ============================================

export const fetchCategories = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/categories/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const createCategory = async (categoryData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/inventory/categories/`, categoryData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const updateCategory = async (id, categoryData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/inventory/categories/${id}/`, categoryData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/api/inventory/categories/${id}/`, {
      headers: getAuthHeaders(),
    });
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// ============================================
// LOCATIONS (Schools) - Legacy support
// ============================================

export const fetchLocations = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/schools/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
};

// ============================================
// BULK OPERATIONS
// ============================================

export const bulkUpdateStatus = async (itemIds, newStatus) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/inventory/bulk-update-status/`, {
      item_ids: itemIds,
      status: newStatus,
    }, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error('Error bulk updating status:', error);
    throw error;
  }
};

export const bulkAssign = async (itemIds, userId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/inventory/bulk-assign/`, {
      item_ids: itemIds,
      assigned_to: userId,
    }, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error('Error bulk assigning:', error);
    throw error;
  }
};

// ============================================
// EXPORT
// ============================================

export const exportInventory = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.locationId) params.append('school', filters.locationId);
    if (filters.categoryId) params.append('category', filters.categoryId);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.location) params.append('location', filters.location);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/inventory/items/export_csv/${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      responseType: 'blob', // Important for file download
    });

    // Create download link
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    return true;
  } catch (error) {
    console.error('Error exporting inventory:', error);
    throw error;
  }
};

// ============================================
// DEFAULT EXPORT
// ============================================

const inventoryService = {
  fetchUserInventoryContext,
  fetchInventoryItems,
  fetchInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  bulkCreateItems,
  fetchEmployees,
  fetchAvailableUsers,
  fetchAllowedSchools,
  fetchInventoryHistory,
  transferInventoryItems,
  generateInventoryListReport,
  generateItemDetailReport,
  fetchInventorySummary,
  fetchInventoryStats,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchLocations,
  bulkUpdateStatus,
  bulkAssign,
  exportInventory,
};

export default inventoryService;