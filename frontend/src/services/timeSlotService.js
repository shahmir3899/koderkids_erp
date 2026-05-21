// frontend/src/services/timeSlotService.js
import { API_URL, getAuthHeaders } from '../api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
};

/**
 * Fetch time slots.
 * Admin: all slots (optionally filtered by school_id).
 * Teacher: only their own slots.
 * @param {Object} params - { school_id? }
 */
export const getTimeSlots = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.school_id) query.append('school_id', params.school_id);
  const response = await fetch(
    `${API_URL}/api/time-slots/?${query.toString()}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(response);
};

/**
 * Create a new time slot.
 * Admin: can specify teacher. Teacher: auto-assigned as teacher.
 * @param {Object} data - { label, school, teacher?, days, start_time, end_time, is_active? }
 */
export const createTimeSlot = async (data) => {
  const response = await fetch(`${API_URL}/api/time-slots/`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

/**
 * Update a time slot.
 * @param {number} id - Time slot ID
 * @param {Object} data - Fields to update
 * @param {boolean} partial - Use PATCH if true (default), PUT if false
 */
export const updateTimeSlot = async (id, data, partial = true) => {
  const response = await fetch(`${API_URL}/api/time-slots/${id}/`, {
    method: partial ? 'PATCH' : 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

/**
 * Delete a time slot (Admin only).
 * @param {number} id - Time slot ID
 */
export const deleteTimeSlot = async (id) => {
  const response = await fetch(`${API_URL}/api/time-slots/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};
