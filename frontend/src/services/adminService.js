// ============================================
// ADMIN SERVICE - API calls for Admin Profile
// NEW FILE: frontend/src/services/adminService.js
// ============================================

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Get current admin's profile
 * @returns {Promise} Admin profile data
 */
export const getAdminProfile = async () => {
  try {
    const token = localStorage.getItem('access');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${API_BASE_URL}/employees/admin/profile/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Admin profile loaded:', response.data);
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
    const token = localStorage.getItem('access');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      `${API_BASE_URL}/employees/admin/profile/`,
      profileData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Admin profile updated:', response.data);
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
    const token = localStorage.getItem('access');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await axios.post(
      `${API_BASE_URL}/employees/admin/profile/photo/`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
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
    const token = localStorage.getItem('access');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(
      `${API_BASE_URL}/employees/admin/profile/photo/delete/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Admin photo deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting admin photo:', error);
    throw error;
  }
};

export default {
  getAdminProfile,
  updateAdminProfile,
  uploadAdminPhoto,
  deleteAdminPhoto,
};