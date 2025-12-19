// ============================================
// CACHE UTILITIES - Client-Side Caching
// ============================================
// Location: src/utils/cacheUtils.js
//
// PURPOSE: Cache API responses in localStorage to reduce server calls
// BENEFIT: Subsequent page loads are INSTANT

/**
 * Cache Configuration
 * Adjust these values based on how frequently your data changes
 */
const CACHE_DURATIONS = {
  schools: 60 * 60 * 1000,        // 1 hour (schools rarely change)
  profile: 30 * 60 * 1000,        // 30 minutes (profile changes occasionally)
  lessons: 5 * 60 * 1000,         // 5 minutes (lessons change more frequently)
  inventory: 10 * 60 * 1000,      // 10 minutes
  notifications: 2 * 60 * 1000,   // 2 minutes (check frequently)
};

/**
 * Get cached data if still valid
 * @param {string} key - Cache key
 * @param {number} maxAge - Maximum age in milliseconds (optional)
 * @returns {any|null} - Cached data or null if expired/missing
 */
export const getCachedData = (key, maxAge = null) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    
    // Use provided maxAge or default from CACHE_DURATIONS
    const cacheExpiry = maxAge || CACHE_DURATIONS[key] || 5 * 60 * 1000;

    if (age > cacheExpiry) {
      // Cache expired, remove it
      localStorage.removeItem(key);
      console.log(`🗑️ Cache expired for: ${key} (age: ${Math.round(age / 1000)}s)`);
      return null;
    }

    console.log(`✅ Cache hit for: ${key} (age: ${Math.round(age / 1000)}s)`);
    return data;
  } catch (error) {
    console.error('❌ Error reading cache:', error);
    return null;
  }
};

/**
 * Save data to cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export const setCachedData = (key, data) => {
  try {
    const cacheObject = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheObject));
    console.log(`💾 Cached: ${key}`);
  } catch (error) {
    console.error('❌ Error saving to cache:', error);
  }
};

/**
 * Clear specific cache or all caches
 * @param {string|null} key - Cache key to clear, or null to clear all
 */
export const clearCache = (key = null) => {
  if (key) {
    localStorage.removeItem(key);
    console.log(`🗑️ Cleared cache: ${key}`);
  } else {
    // Clear all cache keys (preserve auth tokens)
    const keysToPreserve = ['access', 'refresh', 'role', 'username', 'fullName'];
    Object.keys(localStorage).forEach(k => {
      if (!keysToPreserve.includes(k)) {
        localStorage.removeItem(k);
      }
    });
    console.log('🗑️ Cleared all caches');
  }
};

/**
 * Fetch data with automatic caching
 * @param {string} cacheKey - Cache key
 * @param {Function} fetchFunction - Async function that fetches the data
 * @param {number} maxAge - Optional custom cache duration
 * @returns {Promise<any>} - Cached or fresh data
 */
export const fetchWithCache = async (cacheKey, fetchFunction, maxAge = null) => {
  // Try to get from cache first
  const cached = getCachedData(cacheKey, maxAge);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh data
  console.log(`🌐 Fetching fresh data for: ${cacheKey}`);
  const freshData = await fetchFunction();
  
  // Save to cache
  setCachedData(cacheKey, freshData);
  
  return freshData;
};

/**
 * Clear cache on logout
 * Call this in your logout function
 */
export const clearCacheOnLogout = () => {
  clearCache(); // Clears all except auth tokens
  console.log('🗑️ Cache cleared on logout');
};

export default {
  getCachedData,
  setCachedData,
  clearCache,
  fetchWithCache,
  clearCacheOnLogout,
  CACHE_DURATIONS,
};