// ============================================
// BOOKS CONTEXT - Global Books Cache with Individual Book Details
// ============================================
// Location: src/contexts/BooksContext.js
//
// PURPOSE: Cache books list AND individual book details (with topics)
// BENEFIT: Eliminates slow book API calls, especially for full book data

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthHeaders } from '../api';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheUtils';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL;

// Create Context
const BooksContext = createContext();

/**
 * BooksProvider Component
 * Provides books list and individual book details with caching
 */
export const BooksProvider = ({ children }) => {
  const [booksList, setBooksList] = useState([]);
  const [booksDetails, setBooksDetails] = useState({}); // Map: { bookId: fullBookData }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadBooksList = async () => {
      // Check authentication
      const token = localStorage.getItem('access');
      if (!token) {
        console.log('⏸️ BooksContext: No auth token, skipping fetch');
        if (isMounted) {
          setLoading(false);
          setBooksList([]);
        }
        return;
      }

      console.log('📚 BooksContext: Loading books list...');

      // Try cache first
      const cachedBooks = getCachedData('booksList');

      if (cachedBooks !== null) {
        console.log('⚡ BooksContext: Using cached books list');
        if (isMounted) {
          setBooksList(cachedBooks);
          setLoading(false);
        }
        return;
      }

      // Cache miss - fetch from API
      setLoading(true);
      setError(null);

      try {
        console.log('🌐 BooksContext: Fetching fresh books list from API...');
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/api/books/books/`, { headers });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          console.log('✅ BooksContext: Books list loaded:', data.length);
          setBooksList(Array.isArray(data) ? data : []);
          setLoading(false);

          // Save to cache (1 hour - books rarely change)
          setCachedData('booksList', data);
        }
      } catch (err) {
        if (isMounted) {
          if (err.response?.status === 401 || err.message.includes('401')) {
            console.log('🔒 BooksContext: Unauthorized');
            setBooksList([]);
            setLoading(false);
            return;
          }

          const errorMessage = err.message || 'Failed to fetch books';
          console.error('❌ BooksContext: Error loading books:', errorMessage);
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    loadBooksList();

    // Listen for storage events (logout)
    const handleStorageChange = () => {
      const token = localStorage.getItem('access');
      if (!token && isMounted) {
        console.log('🚪 BooksContext: User logged out, clearing books');
        setBooksList([]);
        setBooksDetails({});
        setLoading(false);
        clearCache('booksList');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Fetch full book details (with topics) by ID
   * This is the SLOW operation - we cache it aggressively
   */
  const fetchBookDetails = async (bookId) => {
    // Check if already in memory
    if (booksDetails[bookId]) {
      console.log(`⚡ BooksContext: Using cached book details for ${bookId}`);
      return booksDetails[bookId];
    }

    // Check localStorage cache
    const cacheKey = `bookDetails_${bookId}`;
    const cachedBookDetails = getCachedData(cacheKey);

    if (cachedBookDetails !== null) {
      console.log(`⚡ BooksContext: Using localStorage cached book ${bookId}`);
      // Update memory cache
      setBooksDetails(prev => ({ ...prev, [bookId]: cachedBookDetails }));
      return cachedBookDetails;
    }

    // Cache miss - fetch from API
    console.log(`🌐 BooksContext: Fetching full book details for ${bookId}...`);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/api/books/books/${bookId}/`, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const fullBookData = await response.json();

      console.log(`✅ BooksContext: Book ${bookId} loaded with ${fullBookData.topics?.length || 0} topics`);

      // Save to memory cache
      setBooksDetails(prev => ({ ...prev, [bookId]: fullBookData }));

      // Save to localStorage cache (1 hour)
      setCachedData(cacheKey, fullBookData);

      return fullBookData;
    } catch (err) {
      console.error(`❌ BooksContext: Error loading book ${bookId}:`, err);
      throw err;
    }
  };

  /**
   * Refetch books list (bypasses cache)
   */
  const refetchBooksList = async (bypassCache = true) => {
    const token = localStorage.getItem('access');
    if (!token) {
      console.log('⏸️ BooksContext: No auth token, cannot refetch');
      return;
    }

    console.log('🔄 BooksContext: Refetching books list...');

    if (bypassCache) {
      clearCache('booksList');
    }

    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/api/books/books/`, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log('✅ BooksContext: Books list refetched:', data.length);
      setBooksList(Array.isArray(data) ? data : []);
      setLoading(false);

      // Update cache
      setCachedData('booksList', data);
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch books';
      console.error('❌ BooksContext: Error refetching books:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
    }
  };

  /**
   * Clear all book caches (useful when books are updated)
   */
  const clearAllBooksCache = () => {
    console.log('🗑️ BooksContext: Clearing all books cache');
    clearCache('booksList');
    setBooksDetails({});
    // Clear individual book detail caches
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bookDetails_')) {
        localStorage.removeItem(key);
      }
    });
  };

  const value = {
    booksList,
    booksDetails,
    loading,
    error,
    fetchBookDetails,
    refetchBooksList,
    clearAllBooksCache,
  };

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>;
};

/**
 * useBooks Hook
 * Access books list and fetch book details
 */
export const useBooks = () => {
  const context = useContext(BooksContext);

  if (!context) {
    throw new Error('useBooks must be used within BooksProvider');
  }

  return context;
};

export default BooksContext;
