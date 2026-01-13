// ============================================
// AXIOS INTERCEPTOR - Hybrid Loading Approach
// ============================================
// Prevents ERPLoader from flashing multiple times when pages make multiple API calls.
// Uses Request Counter + Debounce for smooth loading experience.
//
// How it works:
// 1. Track number of active requests
// 2. Show loader only when first request starts (counter 0→1)
// 3. Hide loader with debounce when last request finishes (counter 1→0)
// 4. If new request comes during debounce, cancel hide and keep loader visible
//
// Benefits:
// ✅ No flashing - loader shows once per page load
// ✅ Handles parallel requests (Promise.all)
// ✅ Handles sequential requests (one after another)
// ✅ Zero changes needed to page components

import axios from 'axios';

// ============================================
// CONFIGURATION
// ============================================

let interceptorsSet = false;

// Request tracking
let activeRequests = 0;
let debounceTimeout = null;

// Configuration
const DEBOUNCE_DELAY = 200; // milliseconds - delay before hiding loader
const DEBUG = process.env.NODE_ENV === 'development'; // Enable debug logs in dev

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

  logDebug('✅ Setting up axios interceptors', { debounceDelay });

  // ============================================
  // REQUEST INTERCEPTOR
  // ============================================
  axios.interceptors.request.use(
    (config) => {
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

      // Show loader only for the FIRST request
      if (activeRequests === 1) {
        setLoading(true, 'Loading...');
        logDebug('🔵 Loader SHOWN (first request)');
      } else {
        logDebug('⏭️ Loader already visible, keeping it on');
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
          logDebug('⚪ Loader HIDDEN (debounced - all requests complete)');
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
          logDebug('⚪ Loader HIDDEN (debounced - error, all requests complete)');
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
  logDebug('🔄 Interceptor state reset');
};

// ============================================
// UTILITY: Get Current State (for debugging)
// ============================================

export const getInterceptorState = () => ({
  activeRequests,
  hasDebounceTimeout: debounceTimeout !== null,
  interceptorsSet,
});
