// ============================================
// TEACHER DASHBOARD SERVICE - With Caching
// ============================================
// Location: src/services/teacherDashboardService.js
//
// PURPOSE: Cache teacher dashboard API responses to avoid calls on every page load
// CACHE DURATION: 5-10 minutes depending on data type

import axios from 'axios';
import { getAuthHeaders, API_URL } from '../api';

const API_BASE_URL = API_URL;

// Cache duration
const CACHE_DURATIONS = {
  lessons: 5 * 60 * 1000,      // 5 minutes (lessons change frequently)
  monthlyData: 10 * 60 * 1000, // 10 minutes
};

/**
 * Generate a cache key from endpoint and params
 */
const getCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `teacher_${endpoint}${sortedParams ? '_' + sortedParams : ''}`;
};

/**
 * Get cached data if still valid
 */
const getCachedData = (cacheKey, duration) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > duration) {
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Teacher dashboard cache expired: ${cacheKey}`);
      return null;
    }

    console.log(`⚡ Teacher dashboard cache hit: ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
    return data;
  } catch (error) {
    console.error('❌ Error reading teacher dashboard cache:', error);
    return null;
  }
};

/**
 * Save data to cache
 */
const setCachedData = (cacheKey, data) => {
  try {
    const cacheObject = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    console.log(`💾 Teacher dashboard cached: ${cacheKey}`);
  } catch (error) {
    console.error('❌ Error caching teacher dashboard data:', error);
  }
};

/**
 * Fetch with caching
 */
const fetchWithCache = async (endpoint, params, fetcher, duration) => {
  const cacheKey = getCacheKey(endpoint, params);

  // Try cache first
  const cached = getCachedData(cacheKey, duration);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh
  console.log(`🌐 Teacher dashboard fetching: ${endpoint}`);
  const data = await fetcher();

  // Cache the response
  setCachedData(cacheKey, data);

  return data;
};

export const teacherDashboardService = {
  // Upcoming Lessons (CACHED)
  getUpcomingLessons: async () => {
    return fetchWithCache('upcoming-lessons', {}, async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboards/teacher-upcoming-lessons/`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }, CACHE_DURATIONS.lessons);
  },

  // Lesson Status for a month (CACHED)
  getLessonStatus: async (month) => {
    return fetchWithCache('lesson-status', { month }, async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboards/teacher-lesson-status/?month=${month}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }, CACHE_DURATIONS.monthlyData);
  },

  // Lessons by School for a month (CACHED)
  getLessonsBySchool: async (month) => {
    return fetchWithCache('lessons-by-school', { month }, async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboards/teacher-lessons-by-school/?month=${month}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    }, CACHE_DURATIONS.monthlyData);
  },

  // Student Data (attendance, topics, images) - CACHED
  getStudentData: async (month, schoolId, className) => {
    return fetchWithCache('student-data', { month, schoolId, className }, async () => {
      const params = `month=${month}&school_id=${schoolId}&student_class=${className}`;

      const [attendanceRes, topicsRes, imagesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/attendance/student-counts/?${params}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_BASE_URL}/api/reports/student-achieved-topics-count/?${params}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_BASE_URL}/api/reports/student-image-uploads-count/?${params}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      return {
        attendance: attendanceRes.data,
        topics: topicsRes.data,
        images: imagesRes.data,
      };
    }, CACHE_DURATIONS.monthlyData);
  },

  // Inventory data for teacher (CACHED)
  getInventoryData: async (schoolIds, teacherName) => {
    // Build a cache key from school IDs
    const schoolIdsStr = Array.isArray(schoolIds) ? schoolIds.sort().join(',') : '';
    return fetchWithCache('inventory-data', { schools: schoolIdsStr }, async () => {
      // Extract school IDs (handle both objects and primitives)
      let parsedSchoolIds = [];
      if (Array.isArray(schoolIds)) {
        parsedSchoolIds = schoolIds.map(school => {
          if (typeof school === 'object' && school !== null) {
            return school.id || school.school_id;
          }
          return school;
        }).filter(id => id !== null && id !== undefined);
      }

      if (parsedSchoolIds.length === 0) {
        return {
          totalItems: 0,
          availableItems: 0,
          assignedToMe: 0,
          categoryBreakdown: [],
          categoriesCount: 0
        };
      }

      // Fetch data for all schools in PARALLEL
      const schoolRequests = parsedSchoolIds.map(schoolId =>
        Promise.all([
          axios.get(
            `${API_BASE_URL}/api/inventory/summary/`,
            {
              headers: getAuthHeaders(),
              params: { school: schoolId }
            }
          ).catch(err => {
            console.warn(`⚠️ Error fetching summary for school ${schoolId}:`, err.message);
            return { data: { total: 0, available_count: 0 } };
          }),
          axios.get(
            `${API_BASE_URL}/api/inventory/items/`,
            {
              headers: getAuthHeaders(),
              params: {
                school: schoolId,
                status: 'Assigned'
              }
            }
          ).catch(err => {
            console.warn(`⚠️ Error fetching items for school ${schoolId}:`, err.message);
            return { data: [] };
          })
        ]).then(([summaryResponse, itemsResponse]) => ({
          schoolId,
          summary: summaryResponse.data,
          items: itemsResponse.data.results || itemsResponse.data || []
        }))
      );

      const schoolResults = await Promise.all(schoolRequests);

      // Aggregate results
      let totalSummary = { total: 0, available_count: 0 };
      let allAssignedItems = [];

      schoolResults.forEach(({ summary, items }) => {
        totalSummary.total += summary.total || 0;
        totalSummary.available_count += summary.available_count || 0;
        if (Array.isArray(items)) {
          allAssignedItems = allAssignedItems.concat(items);
        }
      });

      // Filter to only items assigned to this teacher
      let teacherItems = [];
      if (teacherName && Array.isArray(allAssignedItems)) {
        teacherItems = allAssignedItems.filter(item => {
          const assignedToName = item.assigned_to_name || '';
          const teacherNameStr = String(teacherName || '').toLowerCase();
          const assignedNameStr = String(assignedToName).toLowerCase();
          return assignedNameStr.includes(teacherNameStr);
        });
      } else {
        teacherItems = allAssignedItems;
      }

      // Category breakdown (top 3 categories)
      const categoryMap = {};
      teacherItems.forEach(item => {
        const cat = item.category_name || item.category || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });

      const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      const categoriesCount = Object.keys(categoryMap).length;

      return {
        totalItems: totalSummary.total,
        availableItems: totalSummary.available_count,
        assignedToMe: teacherItems.length,
        categoryBreakdown: topCategories,
        categoriesCount
      };
    }, CACHE_DURATIONS.monthlyData);
  },

  // Clear all teacher dashboard caches
  clearCache: () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('teacher_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keysToRemove.length} teacher dashboard caches`);
  },
};

export default teacherDashboardService;
