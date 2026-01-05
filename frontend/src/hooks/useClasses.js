// ============================================
// useClasses Hook - Uses Global Classes Context
// ============================================
// Location: src/hooks/useClasses.js
//
// PURPOSE: Provides easy access to classes data cached by school
// BENEFIT: Eliminates repeated classes API calls for the same school

import { useContext } from 'react';
import ClassesContext from '../contexts/ClassesContext';

/**
 * Custom hook to access classes from global context
 * @returns {Object} Classes data and functions
 * @returns {Object} classesCache - Map of classes by school ID
 * @returns {Object} loading - Loading states by school ID
 * @returns {string|null} error - Error message if any
 * @returns {Function} fetchClassesBySchool - Fetch classes for a school (uses cache)
 * @returns {Function} getCachedClasses - Get cached classes synchronously
 * @returns {Function} clearSchoolCache - Clear cache for a specific school
 * @returns {Function} clearAllCache - Clear all classes cache
 * @returns {Function} prefetchClasses - Prefetch classes for multiple schools
 */
export const useClasses = () => {
  const context = useContext(ClassesContext);

  if (!context) {
    throw new Error('useClasses must be used within ClassesProvider');
  }

  return context;
};

export default useClasses;
