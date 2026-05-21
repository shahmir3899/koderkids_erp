// ============================================
// AXIOS INTERCEPTOR - Page-Navigation Loading Approach
// ============================================
// ERP loader only shows on page navigation (route changes).
// In-page API calls (filters, refresh) do NOT trigger ERP loader.
// Component-level spinners handle in-page loading states.
//
// How it works:
// 1. App.js sets isNavigating=true on route change → ERP loader shows
// 2. Track number of active requests
// 3. ERP loader only shown when isNavigating === true AND first request starts
// 4. Hide loader with debounce when last request finishes (counter 1→0)
//    also resets isNavigating to false
// 5. Subsequent in-page requests: counter tracked but ERP loader NOT triggered
//
// Benefits:
// ✅ ERP loader only on page changes — not on every API call
// ✅ In-page fetches use component spinners only
// ✅ Handles parallel requests (Promise.all)
// ✅ Handles sequential requests (one after another)
// ✅ Zero changes needed to page-level components

import axios from 'axios';

// ============================================
// CONFIGURATION
// ============================================

let interceptorsSet = false;

// Request tracking
let activeRequests = 0;
let debounceTimeout = null;

// ============================================
// PAGE NAVIGATION MODE
// ============================================
// When true: ERP loader will show/hide with requests (page is loading for the first time)
// When false: requests run silently — component spinners handle in-page loading
let isNavigating = false;
let navigationFallbackTimeout = null;
let _setLoading = null; // stored ref so setNavigating can call it for the fallback

/**
 * Called by App.js when the route changes.
 * Arms the interceptor so the next batch of API requests will show the ERP loader.
 * Starts a 600ms fallback timer: if no API requests start within that window
 * (e.g. login page, cached page), ERP loader auto-hides instead of hanging forever.
 */
export const setNavigating = (val) => {
  isNavigating = val;

  // Clear any existing fallback
  if (navigationFallbackTimeout) {
    clearTimeout(navigationFallbackTimeout);
    navigationFallbackTimeout = null;
  }

  if (val && _setLoading) {
    // Auto-hide if no API call fires within 600ms after navigation
    navigationFallbackTimeout = setTimeout(() => {
      if (isNavigating) {
        _setLoading(false);
        isNavigating = false;
        navigationFallbackTimeout = null;
        logDebug('⏰ Fallback: no requests started after navigation — ERP loader auto-hidden');
      }
    }, 600);
  }

  logDebug(val ? '🚀 Page navigation started — ERP loader armed' : '🏁 Navigation mode cleared');
};

// ============================================
// REQUEST DEDUPLICATION - Prevents duplicate API calls
// ============================================
// Stores pending requests to prevent duplicate simultaneous calls
const pendingRequests = new Map();

/**
 * Generate a unique key for each request based on method, URL, and params
 */
const generateRequestKey = (config) => {
  const params = config.params ? JSON.stringify(config.params) : '';
  const data = config.data ? JSON.stringify(config.data) : '';
  return `${config.method}:${config.url}:${params}:${data}`;
};

// Configuration
const DEBOUNCE_DELAY = 200; // milliseconds - delay before hiding loader
const DEBUG = process.env.NODE_ENV === 'development'; // Enable debug logs in dev
const LOADER_EXCLUDED_ROUTES = ['/ai-gala/manage'];

const isLoaderExcludedRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = (window.location.pathname || '').toLowerCase();
  return LOADER_EXCLUDED_ROUTES.some((route) => path.startsWith(route));
};

// ============================================
// DEBUG LOGGING (Development Only)
// ============================================

const logDebug = (message, data = {}) => {
  if (DEBUG) {
    console.log(`[AxiosInterceptor] ${message}`, {
      activeRequests,
      ...data,
    });
  }
};

// ============================================
// SETUP INTERCEPTORS
// ============================================

export const setupAxiosInterceptors = ({ setLoading, debounceDelay = DEBOUNCE_DELAY }) => {
  // Prevent duplicate interceptors
  if (interceptorsSet) {
    logDebug('⚠️ Interceptors already set, skipping setup');
    return;
  }
  interceptorsSet = true;
  _setLoading = setLoading; // store ref for fallback timer in setNavigating

  logDebug('✅ Setting up axios interceptors', { debounceDelay });

  // ============================================
  // REQUEST INTERCEPTOR
  // ============================================
  axios.interceptors.request.use(
    (config) => {
      // ============================================
      // SILENT MODE - Skip loader for background/polling requests
      // ============================================
      // Usage: axios.get(url, { silent: true })
      // This prevents the ERPLoader from showing for background polling
      const isSilent = config.silent === true;
      const isExcludedRoute = isLoaderExcludedRoute();
      config._isSilent = isSilent || isExcludedRoute; // Store for response interceptor

      if (config._isSilent) {
        logDebug('🔇 Silent/excluded request (no loader)', {
          url: config.url,
          method: config.method,
          isSilent,
          isExcludedRoute,
        });
        return config; // Skip all loader logic
      }

      // ============================================
      // REQUEST DEDUPLICATION (DISABLED)
      // ============================================
      // NOTE: Simple deduplication by cancelling duplicates causes issues
      // because the cancelled request doesn't receive the original's response.
      // Proper deduplication requires promise sharing (implemented in React Query).
      // Re-enable in Phase 2 when migrating to React Query.
      //
      // For now, we only track requests for debugging purposes.
      if (config.method?.toLowerCase() === 'get') {
        const requestKey = generateRequestKey(config);

        // Log duplicate requests for debugging (but don't cancel them)
        if (pendingRequests.has(requestKey)) {
          logDebug('⚠️ Duplicate request detected (allowing both)', {
            url: config.url,
            key: requestKey,
          });
        }

        // Track this request
        pendingRequests.set(requestKey, (pendingRequests.get(requestKey) || 0) + 1);
        config._requestKey = requestKey;

        logDebug('📝 Request tracked', {
          url: config.url,
          key: requestKey,
          count: pendingRequests.get(requestKey),
        });
      }

      // Increment active request counter
      activeRequests++;

      logDebug('📤 Request started', {
        url: config.url,
        method: config.method,
      });

      // Clear any pending hide timeout
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
        logDebug('⏸️ Cancelled pending hide timeout');
      }

      // Cancel the navigation fallback timer — a real request has started
      if (navigationFallbackTimeout) {
        clearTimeout(navigationFallbackTimeout);
        navigationFallbackTimeout = null;
        logDebug('✅ Navigation fallback cancelled — request started in time');
      }

      // Show ERP loader only for the FIRST request AND only during page navigation
      if (activeRequests === 1) {
        if (isNavigating) {
          setLoading(true, 'LOADING ERP');
          logDebug('🔵 Loader SHOWN (first request, page navigation mode)');
        } else {
          logDebug('⏭️ In-page request — ERP loader suppressed (not navigating)');
        }
      } else {
        logDebug('⏭️ Loader already visible or in-page request, keeping state');
      }

      return config;
    },
    (error) => {
      // If request setup fails, decrement counter
      activeRequests = Math.max(0, activeRequests - 1);

      logDebug('❌ Request setup failed', {
        error: error.message,
      });

      // Hide loader if no active requests
      if (activeRequests === 0) {
        setLoading(false);
        logDebug('⚪ Loader HIDDEN (request setup error)');
      }

      return Promise.reject(error);
    }
  );

  // ============================================
  // RESPONSE INTERCEPTOR (Success + Error)
  // ============================================
  axios.interceptors.response.use(
    // SUCCESS HANDLER
    (response) => {
      // Skip loader logic for silent requests
      if (response.config._isSilent) {
        logDebug('🔇 Silent request completed (no loader update)', {
          url: response.config.url,
        });
        return response;
      }

      // Clean up deduplication tracking
      if (response.config._requestKey) {
        const count = pendingRequests.get(response.config._requestKey) || 1;
        if (count <= 1) {
          pendingRequests.delete(response.config._requestKey);
        } else {
          pendingRequests.set(response.config._requestKey, count - 1);
        }
        logDebug('🧹 Request completed', {
          key: response.config._requestKey,
          remainingCount: pendingRequests.get(response.config._requestKey) || 0,
        });
      }

      // Decrement active request counter (with protection against negative)
      activeRequests = Math.max(0, activeRequests - 1);

      logDebug('✅ Request completed successfully', {
        url: response.config.url,
        status: response.status,
      });

      // Hide loader with debounce when ALL requests complete
      if (activeRequests === 0) {
        // Debounce the hide - if new request comes within delay, it will cancel this
        debounceTimeout = setTimeout(() => {
          setLoading(false);
          isNavigating = false; // Page load complete — disarm navigation mode
          logDebug('⚪ Loader HIDDEN (debounced - all requests complete, navigation cleared)');
        }, debounceDelay);

        logDebug('⏱️ Scheduled loader hide', {
          delay: `${debounceDelay}ms`,
        });
      } else {
        logDebug('⏭️ Requests still active, keeping loader visible');
      }

      return response;
    },

    // ERROR HANDLER
    (error) => {
      // Skip loader logic for silent requests
      if (error.config?._isSilent) {
        logDebug('🔇 Silent request failed (no loader update)', {
          url: error.config?.url,
        });
        return Promise.reject(error);
      }

      // Clean up deduplication tracking (even on error)
      if (error.config?._requestKey) {
        const count = pendingRequests.get(error.config._requestKey) || 1;
        if (count <= 1) {
          pendingRequests.delete(error.config._requestKey);
        } else {
          pendingRequests.set(error.config._requestKey, count - 1);
        }
        logDebug('🧹 Request failed', {
          key: error.config._requestKey,
          remainingCount: pendingRequests.get(error.config._requestKey) || 0,
        });
      }

      // Handle cancelled requests gracefully
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        logDebug('⏭️ Request was cancelled');
        return Promise.reject(error);
      }

      // Decrement active request counter (with protection against negative)
      activeRequests = Math.max(0, activeRequests - 1);

      logDebug('❌ Request failed', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      });

      // Hide loader with debounce when ALL requests complete
      if (activeRequests === 0) {
        debounceTimeout = setTimeout(() => {
          setLoading(false);
          isNavigating = false; // Page load complete — disarm navigation mode
          logDebug('⚪ Loader HIDDEN (debounced - error, all requests complete, navigation cleared)');
        }, debounceDelay);

        logDebug('⏱️ Scheduled loader hide after error', {
          delay: `${debounceDelay}ms`,
        });
      } else {
        logDebug('⏭️ Requests still active after error, keeping loader visible');
      }

      return Promise.reject(error);
    }
  );

  logDebug('✅ Axios interceptors setup complete');
};

// ============================================
// UTILITY: Reset State (for testing/debugging)
// ============================================

export const resetInterceptorState = () => {
  activeRequests = 0;
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
  pendingRequests.clear();
  logDebug('🔄 Interceptor state reset');
};

// ============================================
// UTILITY: Get Current State (for debugging)
// ============================================

export const getInterceptorState = () => ({
  activeRequests,
  hasDebounceTimeout: debounceTimeout !== null,
  interceptorsSet,
  pendingRequestsCount: pendingRequests.size,
});
