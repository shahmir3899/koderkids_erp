// ============================================
// RECONCILE SERVICE
// API calls for the guided bank-statement reconciliation
// Location: frontend/src/services/reconcileService.js
// ============================================

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Same silent client idea as aiService: no global loader while the user reviews lines.
const client = axios.create({ baseURL: API_URL });

const authHeaders = () => {
  const token = localStorage.getItem('access');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const errorMessage = (error, fallback) =>
  error.response?.data?.error || error.response?.data?.detail || fallback;

const call = async (request, fallback) => {
  try {
    const response = await request();
    return { ok: true, data: response.data };
  } catch (error) {
    return { ok: false, error: errorMessage(error, fallback) };
  }
};

export const startReconciliation = (file, accountId) => {
  const form = new FormData();
  form.append('file', file);
  form.append('account_id', accountId);
  return call(
    () => client.post('/api/ai/reconcile/start/', form, { headers: authHeaders() }),
    'Could not read the statement'
  );
};

export const getOpenReconciliation = (accountId) =>
  call(
    () => client.get('/api/ai/reconcile/open/', { params: { account_id: accountId }, headers: authHeaders() }),
    'Could not check for an unfinished reconciliation'
  );

export const getReconciliation = (id) =>
  call(() => client.get(`/api/ai/reconcile/${id}/`, { headers: authHeaders() }), 'Could not load the reconciliation');

export const reconcileLineAction = (id, lineId, action, body = {}) =>
  call(
    () => client.post(`/api/ai/reconcile/${id}/lines/${lineId}/${action}/`, body, { headers: authHeaders() }),
    `Could not ${action} this line`
  );

export const adjustReconciliation = (id, expectedDifference) =>
  call(
    () =>
      client.post(
        `/api/ai/reconcile/${id}/adjust/`,
        { confirm: true, expected_difference: String(expectedDifference) },
        { headers: authHeaders() }
      ),
    'Could not create the adjustment'
  );

export const completeReconciliation = (id) =>
  call(() => client.post(`/api/ai/reconcile/${id}/complete/`, {}, { headers: authHeaders() }), 'Could not finish');

const reconcileService = {
  startReconciliation,
  getOpenReconciliation,
  getReconciliation,
  reconcileLineAction,
  adjustReconciliation,
  completeReconciliation,
};

export default reconcileService;
