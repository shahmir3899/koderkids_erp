// ============================================
// TEACHER SERVICE - API Functions for Teacher (FIXED URLs)
// ============================================
// Location: src/services/teacherService.js

import axios from 'axios';
import { getAuthHeaders, API_URL } from '../api';

// Base URL for employees endpoints
const EMPLOYEES_URL = `${API_URL}/employees`;

// ============================================
// TEACHER PROFILE API
// ============================================

/**
 * Get the current teacher's profile
 * @returns {Promise<Object>} Teacher profile data
 */
export const getTeacherProfile = async () => {
  try {
    console.log('📡 Fetching teacher profile...');
    const response = await axios.get(`${EMPLOYEES_URL}/teacher/profile/`, {
      headers: getAuthHeaders(),
    });
    console.log('✅ Teacher profile fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching teacher profile:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update the current teacher's profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated profile data
 */
export const updateTeacherProfile = async (profileData) => {
  try {
    console.log('📡 Updating teacher profile:', profileData);
    const response = await axios.put(`${EMPLOYEES_URL}/teacher/profile/`, profileData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });
    console.log('✅ Teacher profile updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating teacher profile:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Upload profile photo
 * @param {File} photoFile - The photo file to upload
 * @returns {Promise<Object>} Response with photo URL
 */
export const uploadProfilePhoto = async (photoFile) => {
  try {
    console.log('📡 Uploading profile photo...');
    
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    const response = await axios.post(`${EMPLOYEES_URL}/teacher/profile/photo/`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('✅ Profile photo uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading profile photo:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Delete profile photo
 * @returns {Promise<Object>} Response message
 */
export const deleteProfilePhoto = async () => {
  try {
    console.log('📡 Deleting profile photo...');
    const response = await axios.delete(`${EMPLOYEES_URL}/teacher/profile/photo/delete/`, {
      headers: getAuthHeaders(),
    });
    console.log('✅ Profile photo deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting profile photo:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all teacher dashboard data in one call
 * @returns {Promise<Object>} Dashboard data including profile, notifications, etc.
 */
export const getTeacherDashboardData = async () => {
  try {
    console.log('📡 Fetching teacher dashboard data...');
    const response = await axios.get(`${EMPLOYEES_URL}/teacher/dashboard-data/`, {
      headers: getAuthHeaders(),
    });
    console.log('✅ Dashboard data fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error.response?.data || error.message);
    throw error;
  }
};

// ============================================
// NOTIFICATIONS API
// ============================================

/**
 * Get all notifications for the current user
 * @returns {Promise<Array>} List of notifications
 */
export const getNotifications = async () => {
  try {
    console.log('📡 Fetching notifications...');
    const response = await axios.get(`${EMPLOYEES_URL}/notifications/`, {
      headers: getAuthHeaders(),
    });
    console.log('✅ Notifications fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get unread notification count
 * @returns {Promise<number>} Count of unread notifications
 */
export const getUnreadNotificationCount = async () => {
  try {
    const response = await axios.get(`${EMPLOYEES_URL}/notifications/unread-count/`, {
      headers: getAuthHeaders(),
    });
    return response.data.unread_count;
  } catch (error) {
    console.error('❌ Error fetching unread count:', error.response?.data || error.message);
    return 0;
  }
};

/**
 * Mark a notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Response message
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await axios.post(
      `${EMPLOYEES_URL}/notifications/${notificationId}/read/`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Error marking notification as read:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @returns {Promise<Object>} Response message
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await axios.post(
      `${EMPLOYEES_URL}/notifications/mark-all-read/`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error.response?.data || error.message);
    throw error;
  }
};

// ============================================
// EARNINGS & DEDUCTIONS API
// ============================================

/**
 * Get teacher's earnings
 * @returns {Promise<Array>} List of earnings
 */
export const getTeacherEarnings = async () => {
  try {
    const response = await axios.get(`${EMPLOYEES_URL}/teacher/earnings/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching earnings:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get teacher's deductions
 * @returns {Promise<Array>} List of deductions
 */
export const getTeacherDeductions = async () => {
  try {
    const response = await axios.get(`${EMPLOYEES_URL}/teacher/deductions/`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching deductions:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  getTeacherProfile,
  updateTeacherProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  getTeacherDashboardData,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getTeacherEarnings,
  getTeacherDeductions,
};