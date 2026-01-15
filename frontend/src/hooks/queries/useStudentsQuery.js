// ============================================
// STUDENTS QUERY HOOKS - React Query Implementation
// ============================================
// Location: frontend/src/hooks/queries/useStudentsQuery.js
// Replaces manual useState/useEffect data fetching patterns

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStudents as fetchStudentsAPI,
  updateStudent as updateStudentAPI,
  deleteStudent as deleteStudentAPI,
} from '../../services/studentService';

// Query Keys - centralized for consistency
export const studentKeys = {
  all: ['students'],
  lists: () => [...studentKeys.all, 'list'],
  list: (filters) => [...studentKeys.lists(), filters],
  details: () => [...studentKeys.all, 'detail'],
  detail: (id) => [...studentKeys.details(), id],
};

/**
 * Hook to fetch all students with optional filters
 * @param {Object} filters - Filter options (schoolId, studentClass, status)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export const useStudents = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: studentKeys.list(filters),
    queryFn: () => fetchStudentsAPI(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch all active students (common use case)
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result
 */
export const useActiveStudents = (options = {}) => {
  return useStudents({ status: 'Active' }, options);
};

/**
 * Hook to update a student
 * Automatically invalidates student queries on success
 * @returns {Object} Mutation result with mutate, isLoading, error, etc.
 */
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, studentData }) => updateStudentAPI(studentId, studentData),
    onSuccess: () => {
      // Invalidate all student queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
};

/**
 * Hook to delete a student
 * Automatically invalidates student queries on success
 * @returns {Object} Mutation result
 */
export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId) => deleteStudentAPI(studentId),
    onSuccess: () => {
      // Invalidate all student queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
};

/**
 * Hook to prefetch students data
 * Useful for preloading data before navigation
 * @param {Object} filters - Filter options
 */
export const usePrefetchStudents = () => {
  const queryClient = useQueryClient();

  return (filters = {}) => {
    queryClient.prefetchQuery({
      queryKey: studentKeys.list(filters),
      queryFn: () => fetchStudentsAPI(filters),
      staleTime: 5 * 60 * 1000,
    });
  };
};

export default {
  useStudents,
  useActiveStudents,
  useUpdateStudent,
  useDeleteStudent,
  usePrefetchStudents,
  studentKeys,
};
