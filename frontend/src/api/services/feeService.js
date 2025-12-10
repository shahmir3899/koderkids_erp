/**
 * Fee Service - API calls for fee management
 * Path: frontend/src/services/feeService.js
 * 
 * UPDATED: createSingleFee no longer sends totalFee (auto-fetched from backend)
 */

import axios from 'axios';
import { API_URL, getAuthHeaders } from '../api';

/**
 * Fetch all fees with optional filters
 */
export const fetchFees = async (filters = {}) => {
  const { schoolId, studentClass, month } = filters;
  
  const params = {
    school_id: schoolId || undefined,
    class: studentClass || undefined,
    month: month || undefined,
    sort: 'student_class',
  };

  Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

  const response = await axios.get(`${API_URL}/api/fees/`, {
    headers: getAuthHeaders(),
    params,
  });

  return response.data;
};

/**
 * Create monthly fee records for a school
 */
export const createMonthlyFees = async ({ schoolId, month, forceOverwrite = false }) => {
  const response = await axios.post(
    `${API_URL}/api/fees/create/`,
    { 
      school_id: schoolId, 
      month,
      force_overwrite: forceOverwrite,
    },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * Create a single fee record for a student
 * NOTE: totalFee is NOT sent - backend auto-fetches from student.monthly_fee
 */
export const createSingleFee = async ({ studentId, month, paidAmount = 0 }) => {
  console.log('📤 Creating single fee:', { studentId, month, paidAmount });
  
  const response = await axios.post(
    `${API_URL}/api/fees/create-single/`,
    {
      student_id: studentId,
      month,
      paid_amount: paidAmount,
      // totalFee removed - backend fetches from student.monthly_fee
    },
    { headers: getAuthHeaders() }
  );
  
  console.log('✅ Single fee created:', response.data);
  return response.data;
};

/**
 * Update fee records (single or bulk)
 */
export const updateFees = async (fees) => {
  const headers = getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('Authentication token missing');
  }

  const response = await axios.post(
    `${API_URL}/api/fees/update/`,
    { fees },
    { headers }
  );
  return response.data;
};

/**
 * Delete fee records
 */
export const deleteFees = async (feeIds) => {
  console.log('🗑️ Deleting fees:', feeIds);
  
  const response = await axios.post(
    `${API_URL}/api/fees/delete/`,
    { fee_ids: feeIds },
    { headers: getAuthHeaders() }
  );
  
  console.log('✅ Delete response:', response.data);
  return response.data;
};

/**
 * Fetch students for a school (for single fee creation)
 */
export const fetchStudentsBySchool = async (schoolId) => {
  const response = await axios.get(`${API_URL}/api/students/`, {
    headers: getAuthHeaders(),
    params: { school_id: schoolId },
  });
  return response.data;
};

/**
 * Format month for API (e.g., "Dec-2024")
 */
export const formatMonthForAPI = (date) => {
  if (!date) return null;
  return `${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear()}`;
};