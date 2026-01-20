// ============================================
// ADMIN SERVICE - API calls for Admin Profile
// UPDATED: With localStorage caching for faster page loads
// Location: frontend/src/services/adminService.js
// ============================================

import axios from 'axios';
import { API_URL, getAuthHeaders, getJsonHeaders, getMultipartHeaders } from '../api';

// Cache configuration
const CACHE_KEY = 'admin_profile';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached data if still valid
 */
const getCachedData = (cacheKey) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Admin profile cache expired (age: ${Math.round(age / 1000)}s)`);
      return null;
    }

    console.log(`⚡ Admin profile cache hit (age: ${Math.round(age / 1000)}s)`);
    return data;
  } catch (error) {
    console.error('❌ Error reading admin profile cache:', error);
    return null;
  }
};

/**
 * Save data to cache
 */
const setCachedData = (cacheKey, data) => {
  try {
    const cacheObject = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    console.log('💾 Admin profile cached');
  } catch (error) {
    console.error('❌ Error caching admin profile:', error);
  }
};

/**
 * Clear admin profile cache
 */
export const clearAdminProfileCache = () => {
  localStorage.removeItem(CACHE_KEY);
  console.log('🗑️ Admin profile cache cleared');
};

/**
 * Get current admin's profile (WITH CACHING)
 * @param {boolean} bypassCache - Force fresh fetch
 * @returns {Promise} Admin profile data
 */
export const getAdminProfile = async (bypassCache = false) => {
  // Try cache first (unless bypassed)
  if (!bypassCache) {
    const cached = getCachedData(CACHE_KEY);
    if (cached !== null) {
      return cached;
    }
  }

  try {
    console.log('🌐 Fetching admin profile from API...');
    const response = await axios.get(
      `${API_URL}/employees/admin/profile/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Admin profile loaded:', response.data);

    // Cache the response
    setCachedData(CACHE_KEY, response.data);

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching admin profile:', error);
    throw error;
  }
};

/**
 * Update current admin's profile
 * @param {Object} profileData - Updated profile data
 * @returns {Promise} Updated profile data
 */
export const updateAdminProfile = async (profileData) => {
  try {
    const response = await axios.put(
      `${API_URL}/employees/admin/profile/`,
      profileData,
      {
        headers: getJsonHeaders(),
      }
    );

    console.log('✅ Admin profile updated:', response.data);

    // Update cache with new data
    setCachedData(CACHE_KEY, response.data);

    return response.data;
  } catch (error) {
    console.error('❌ Error updating admin profile:', error);
    throw error;
  }
};

/**
 * Upload admin profile photo
 * @param {File} photoFile - Image file to upload
 * @returns {Promise} Updated profile with photo URL
 */
export const uploadAdminPhoto = async (photoFile) => {
  try {
    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await axios.post(
      `${API_URL}/employees/admin/profile/photo/`,
      formData,
      {
        headers: getMultipartHeaders(),
      }
    );

    console.log('✅ Admin photo uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading admin photo:', error);
    throw error;
  }
};

/**
 * Delete admin profile photo
 * @returns {Promise} Success message
 */
export const deleteAdminPhoto = async () => {
  try {
    const response = await axios.delete(
      `${API_URL}/employees/admin/profile/photo/delete/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ Admin photo deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting admin photo:', error);
    throw error;
  }
};

const adminService = {
  getAdminProfile,
  updateAdminProfile,
  uploadAdminPhoto,
  deleteAdminPhoto,
  clearAdminProfileCache,
};

export default adminService;