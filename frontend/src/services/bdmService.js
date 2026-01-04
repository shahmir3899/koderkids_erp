// ============================================
// BDM SERVICE - Profile Operations
// ============================================

import axios from 'axios';
import { API_URL } from '../utils/constants';
import { getAuthHeaders } from '../utils/authHelpers';

/**
 * Get BDM profile
 * @returns {Promise<Object>} BDM profile data
 */
export const getBDMProfile = async () => {
  try {
    console.log('📡 Fetching BDM profile...');

    const response = await axios.get(`${API_URL}/employees/bdm/profile/`, {
      headers: getAuthHeaders(),
    });

    console.log('✅ BDM profile loaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching BDM profile:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update BDM profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated profile data
 */
export const updateBDMProfile = async (profileData) => {
  try {
    console.log('📝 Updating BDM profile:', profileData);

    const response = await axios.put(
      `${API_URL}/employees/bdm/profile/`,
      profileData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ BDM profile updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating BDM profile:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Upload BDM profile photo
 * @param {File} photoFile - Photo file to upload
 * @returns {Promise<Object>} Upload response with photo URL
 */
export const uploadBDMPhoto = async (photoFile) => {
  try {
    console.log('📤 Uploading BDM photo...');

    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await axios.post(
      `${API_URL}/employees/admin/profile/photo/`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('✅ BDM photo uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading BDM photo:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Delete BDM profile photo
 * @returns {Promise<Object>} Delete response
 */
export const deleteBDMPhoto = async () => {
  try {
    console.log('🗑️ Deleting BDM photo...');

    const response = await axios.delete(
      `${API_URL}/employees/admin/profile/photo/delete/`,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log('✅ BDM photo deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting BDM photo:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  getBDMProfile,
  updateBDMProfile,
  uploadBDMPhoto,
  deleteBDMPhoto,
};
