// ============================================
// useBooks Hook - Uses Global Books Context
// ============================================
// Location: src/hooks/useBooks.js
//
// PURPOSE: Provides easy access to books list and book details
// BENEFIT: Eliminates slow repeated book API calls

import { useContext } from 'react';
import BooksContext from '../contexts/BooksContext';

/**
 * Custom hook to access books from global context
 * @returns {Object} Books data and functions
 * @returns {Array} booksList - List of all books (id, title only)
 * @returns {Object} booksDetails - Map of full book data by ID
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message if any
 * @returns {Function} fetchBookDetails - Fetch full book data (with topics) by ID
 * @returns {Function} refetchBooksList - Force refresh books list
 * @returns {Function} clearAllBooksCache - Clear all books cache
 */
export const useBooks = () => {
  const context = useContext(BooksContext);

  if (!context) {
    throw new Error('useBooks must be used within BooksProvider');
  }

  return context;
};

export default useBooks;
