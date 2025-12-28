// ============================================
// USE CACHE HOOK - Reusable Caching Logic
// ============================================
// Provides caching functionality to prevent redundant API calls
// Usage: const { getCachedData, setCachedData, clearCache } = useCache();
// ============================================

import { useRef, useCallback } from 'react';

class CacheManager {
  constructor(defaultDuration = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultDuration = defaultDuration;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > item.duration) {
      this.cache.delete(key);
      console.log('🗑️ Cache EXPIRED:', key);
      return null;
    }
    
    console.log('📦 Cache HIT:', key);
    return item.data;
  }

  set(key, data, duration) {
    console.log('💾 Cache SET:', key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration: duration || this.defaultDuration,
    });
  }

  delete(key) {
    this.cache.delete(key);
    console.log('🗑️ Cache DELETED:', key);
  }

  clear() {
    this.cache.clear();
    console.log('🗑️ Cache CLEARED - All entries removed');
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (Date.now() - item.timestamp > item.duration) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instance (shared across all hook instances)
const globalCache = new CacheManager();

/**
 * useCache Hook
 * 
 * @param {number} cacheDuration - Duration in milliseconds (default: 5 minutes)
 * @returns {object} Cache methods
 * 
 * @example
 * const { getCachedData, setCachedData, clearCache } = useCache();
 * 
 * // Try to get from cache first
 * const cached = getCachedData('students-list');
 * if (cached) {
 *   setStudents(cached);
 *   return;
 * }
 * 
 * // Fetch from API and cache
 * const data = await fetchStudents();
 * setCachedData('students-list', data);
 */
export const useCache = (cacheDuration = 5 * 60 * 1000) => {
  const cacheRef = useRef(globalCache);

  // Get data from cache
  const getCachedData = useCallback((key) => {
    return cacheRef.current.get(key);
  }, []);

  // Set data in cache
  const setCachedData = useCallback((key, data, customDuration) => {
    cacheRef.current.set(key, data, customDuration || cacheDuration);
  }, [cacheDuration]);

  // Delete specific cache entry
  const deleteCacheEntry = useCallback((key) => {
    cacheRef.current.delete(key);
  }, []);

  // Clear all cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Check if key exists in cache
  const hasCachedData = useCallback((key) => {
    return cacheRef.current.has(key);
  }, []);

  // Get cache size
  const getCacheSize = useCallback(() => {
    return cacheRef.current.size();
  }, []);

  return {
    getCachedData,
    setCachedData,
    deleteCacheEntry,
    clearCache,
    hasCachedData,
    getCacheSize,
  };
};

export default useCache;