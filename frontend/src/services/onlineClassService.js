// frontend/src/services/onlineClassService.js
import { API_URL, getAuthHeaders } from '../api';

const BASE = `${API_URL}/api/onlineclasses`;

const handleResponse = async (response) => {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.detail || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
};

/**
 * List sessions.
 * @param {Object} params  Optional query params e.g. { status: 'scheduled' }
 */
export const listSessions = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${BASE}/sessions/?${qs}` : `${BASE}/sessions/`;
  const response = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse(response);
};

/**
 * Get a single session by ID.
 */
export const getSession = async (id) => {
  const response = await fetch(`${BASE}/sessions/${id}/`, { headers: getAuthHeaders() });
  return handleResponse(response);
};

/**
 * Create a new session (teacher only).
 * @param {Object} data  Session fields
 */
export const createSession = async (data) => {
  const response = await fetch(`${BASE}/sessions/`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

/**
 * Partially update a session (teacher/admin only).
 */
export const updateSession = async (id, data) => {
  const response = await fetch(`${BASE}/sessions/${id}/`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

/**
 * Delete a session.
 */
export const deleteSession = async (id) => {
  const response = await fetch(`${BASE}/sessions/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Get a LiveKit room token to join a session.
 * Returns { token, livekit_url, room_name }
 */
export const getRoomToken = async (sessionId) => {
  const response = await fetch(`${BASE}/sessions/${sessionId}/token/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Mark a session as LIVE (teacher only).
 */
export const startSession = async (id) => {
  const response = await fetch(`${BASE}/sessions/${id}/start/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * End a session (teacher only). Triggers auto-attendance.
 */
export const endSession = async (id) => {
  const response = await fetch(`${BASE}/sessions/${id}/end/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Get participants list for a session (teacher only).
 */
export const getParticipants = async (sessionId) => {
  const response = await fetch(`${BASE}/sessions/${sessionId}/participants/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * List recordings accessible to the current user.
 */
export const listRecordings = async () => {
  const response = await fetch(`${BASE}/recordings/`, { headers: getAuthHeaders() });
  return handleResponse(response);
};

/**
 * Get ONLINE students eligible for a session.
 * @param {Object} params  e.g. { school_id: 1, time_slot_id: 3 }
 */
export const getEligibleStudents = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${BASE}/eligible-students/?${qs}` : `${BASE}/eligible-students/`;
  const response = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse(response);
};
