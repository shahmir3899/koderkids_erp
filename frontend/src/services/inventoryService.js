// ============================================
// INVENTORY SERVICE - FIXED ENDPOINTS
// ============================================
// Location: src/services/inventoryService.js
//
// CRITICAL FIX: All item CRUD operations use /api/inventory/items/
// NOT /api/inventory/

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Auth headers helper
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

// ============================================
// INVENTORY ITEMS CRUD - FIXED ENDPOINTS
// ============================================

/**
 * Fetch all inventory items with optional filters
 * FIXED: Uses /api/inventory/items/ endpoint
 */
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
    
    console.log('📦 Fetching items from:', url);
    
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
    });
    
    console.log('📦 Items response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching inventory items:', error);
    throw error;
  }
};

/**
 * Fetch a single inventory item by ID
 * FIXED: Uses /api/inventory/items/{id}/ endpoint
 */
export const fetchInventoryItem = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/items/${id}/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching inventory item:', error);
    throw error;
  }
};

/**
 * Create a new inventory item
 * FIXED: Uses /api/inventory/items/ endpoint with POST
 */
export const createInventoryItem = async (itemData) => {
  try {
    console.log('➕ Creating item at:', `${API_BASE_URL}/api/inventory/items/`);
    console.log('➕ Payload:', itemData);
    
    const response = await axios.post(`${API_BASE_URL}/api/inventory/items/`, itemData, {
      headers: getAuthHeaders(),
    });
    
    console.log('✅ Item created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating inventory item:', error);
    console.error('❌ Response:', error.response?.data);
    throw error;
  }
};

/**
 * Update an inventory item
 * FIXED: Uses /api/inventory/items/{id}/ endpoint with PUT
 */
export const updateInventoryItem = async (id, itemData) => {
  try {
    console.log('✏️ Updating item at:', `${API_BASE_URL}/api/inventory/items/${id}/`);
    
    const response = await axios.put(`${API_BASE_URL}/api/inventory/items/${id}/`, itemData, {
      headers: getAuthHeaders(),
    });
    
    console.log('✅ Item updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating inventory item:', error);
    throw error;
  }
};

/**
 * Delete an inventory item
 * FIXED: Uses /api/inventory/items/{id}/ endpoint with DELETE
 */
export const deleteInventoryItem = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/api/inventory/items/${id}/`, {
      headers: getAuthHeaders(),
    });
    return true;
  } catch (error) {
    console.error('❌ Error deleting inventory item:', error);
    throw error;
  }
};

// ============================================
// DASHBOARD & STATISTICS
// ============================================

/**
 * Fetch inventory summary/dashboard data
 * Endpoint: /api/inventory/summary/
 */
export const fetchInventorySummary = async (locationId, location) => {
  try {
    const params = new URLSearchParams();
    if (locationId) params.append('school', locationId);
    if (location) params.append('location', location);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/inventory/summary/${queryString ? `?${queryString}` : ''}`;
    
    console.log('📊 Fetching summary from:', url);
    
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
    });
    
    console.log('📊 Summary response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching inventory summary:', error);
    throw error;
  }
};

/**
 * Fetch inventory statistics (extended) - alias for summary
 */
export const fetchInventoryStats = async (locationId) => {
  return fetchInventorySummary(locationId);
};

// ============================================
// CATEGORIES
// ============================================

/**
 * Fetch all categories
 * Endpoint: /api/inventory/categories/
 */
export const fetchCategories = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/categories/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    throw error;
  }
};

/**
 * Create a new category
 */
export const createCategory = async (categoryData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/inventory/categories/`, categoryData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error creating category:', error);
    throw error;
  }
};

/**
 * Update a category
 */
export const updateCategory = async (id, categoryData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/inventory/categories/${id}/`, categoryData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error updating category:', error);
    throw error;
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/api/inventory/categories/${id}/`, {
      headers: getAuthHeaders(),
    });
    return true;
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    throw error;
  }
};

// ============================================
// LOCATIONS (Schools)
// ============================================

/**
 * Fetch all locations (schools)
 * This typically comes from your schools API
 */
export const fetchLocations = async () => {
  try {
    // Adjust this endpoint based on your actual schools API
    const response = await axios.get(`${API_BASE_URL}/api/schools/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    // Return empty array on error to prevent crashes
    return [];
  }
};

// ============================================
// USERS FOR ASSIGNMENT
// ============================================

/**
 * Fetch users available for inventory assignment
 * Endpoint: /api/inventory/assigned-users/
 */
export const fetchAvailableUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/assigned-users/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching available users:', error);
    return [];
  }
};

// ============================================
// HISTORY / AUDIT LOG
// ============================================

/**
 * Fetch history for an inventory item
 * Endpoint: /api/inventory/items/{id}/history/
 */
export const fetchInventoryHistory = async (itemId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/items/${itemId}/history/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching inventory history:', error);
    return [];
  }
};

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk update status for multiple items
 * Endpoint: /api/inventory/bulk-update-status/
 */
export const bulkUpdateStatus = async (itemIds, newStatus) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/inventory/bulk-update-status/`, {
      item_ids: itemIds,
      status: newStatus,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error bulk updating status:', error);
    throw error;
  }
};

/**
 * Bulk assign items to a user
 * Endpoint: /api/inventory/bulk-assign/
 */
export const bulkAssign = async (itemIds, userId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/inventory/bulk-assign/`, {
      item_ids: itemIds,
      assigned_to: userId,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error bulk assigning:', error);
    throw error;
  }
};

// ============================================
// EXPORT
// ============================================

/**
 * Export inventory data
 * This is a placeholder - implement based on your backend
 */
export const exportInventory = async (filters = {}, format = 'csv') => {
  try {
    const params = new URLSearchParams();
    if (filters.locationId) params.append('school', filters.locationId);
    if (filters.categoryId) params.append('category', filters.categoryId);
    if (filters.status) params.append('status', filters.status);
    params.append('format', format);

    const response = await axios.get(`${API_BASE_URL}/api/inventory/items/?${params.toString()}`, {
      headers: getAuthHeaders(),
    });

    // Convert to CSV
    const items = response.data;
    if (!items.length) {
      throw new Error('No items to export');
    }

    const headers = ['Name', 'Unique ID', 'Category', 'Location', 'Status', 'Value', 'Purchase Date', 'Assigned To'];
    const rows = items.map(item => [
      item.name,
      item.unique_id,
      item.category_name || 'Uncategorized',
      item.location,
      item.status,
      item.purchase_value,
      item.purchase_date || 'N/A',
      item.assigned_to_name || 'Unassigned',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    return true;
  } catch (error) {
    console.error('❌ Error exporting inventory:', error);
    throw error;
  }
};

// ============================================
// DEFAULT EXPORT
// ============================================

const inventoryService = {
  // Items
  fetchInventoryItems,
  fetchInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  
  // Dashboard
  fetchInventorySummary,
  fetchInventoryStats,
  
  // Categories
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Locations
  fetchLocations,
  
  // Users
  fetchAvailableUsers,
  
  // History
  fetchInventoryHistory,
  
  // Bulk
  bulkUpdateStatus,
  bulkAssign,
  
  // Export
  exportInventory,
};

export default inventoryService;