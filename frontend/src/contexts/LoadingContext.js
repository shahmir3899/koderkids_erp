import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setupAxiosInterceptors } from '../utils/axiosInterceptor';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('LOADING ERP');

  const setLoading = useCallback((loading, message = 'LOADING ERP') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  }, []);

  // Helper function to wrap async operations with loading
  const withLoading = useCallback(async (asyncFn, message = 'LOADING ERP') => {
    setIsLoading(true);
    setLoadingMessage(message);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup axios interceptors when context is created
  useEffect(() => {
    setupAxiosInterceptors({ setLoading });
  }, [setLoading]);

  const value = {
    isLoading,
    loadingMessage,
    setLoading,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};
