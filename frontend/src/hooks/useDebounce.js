// ============================================
// useDebounce Hook - Delays value updates
// ============================================
// Use this hook to debounce rapidly changing values like search inputs
// or filter changes to prevent excessive API calls.
//
// Usage:
//   const debouncedSearch = useDebounce(searchTerm, 300);
//   useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounces a value - returns the value only after it stops changing for the specified delay
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {any} - The debounced value
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Debounces an object of values (useful for filter objects)
 * @param {Object} values - Object containing values to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Object} - The debounced object
 */
export const useDebouncedObject = (values, delay = 300) => {
  const [debouncedValues, setDebouncedValues] = useState(values);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValues(values);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [values, delay]);

  return debouncedValues;
};

/**
 * Returns a debounced callback function
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {Function} - The debounced function
 */
export const useDebouncedCallback = (callback, delay = 300) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  return debouncedCallback;
};

export default useDebounce;
