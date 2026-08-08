// ============================================
// RETRY ELIGIBILITY HELPER
// ============================================
// Location: src/utils/retryUtils.js
//
// A single automatic retry after a transient failure (backend cold-start,
// brief network blip) is worth it. Retrying a 4xx (bad request, unauthorized,
// forbidden, not found) is not — the request will fail identically every
// time, so retrying just doubles load for no benefit.

/**
 * Whether a failed request is worth a single automatic retry.
 * Retryable: network errors / timeouts (no response) and 5xx server errors.
 * Not retryable: 4xx client errors (401/403/404/etc).
 *
 * Handles both axios errors (`error.response.status`) and the plain
 * `Error` thrown by this codebase's `fetch`-based services, which attach
 * a `status` property directly (see services' `handleResponse` helpers).
 *
 * @param {*} error
 * @returns {boolean}
 */
export const isRetryableError = (error) => {
  const status = error?.response?.status ?? error?.status;
  return !status || status >= 500;
};
