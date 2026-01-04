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

    const response = await axios.get(`${API_URL}/employees/admin/profile/`, {
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
      `${API_URL}/employees/admin/profile/`,
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

export default {
  getBDMProfile,
  updateBDMProfile,
};
