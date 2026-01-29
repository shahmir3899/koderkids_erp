// ============================================
// TIMEZONE-SAFE DATE UTILITIES
// ============================================
// These functions use LOCAL timezone instead of UTC
// to avoid date shifting issues (e.g., Jan 1 becoming Dec 31)

/**
 * Format a Date object as YYYY-MM-DD in LOCAL timezone
 * Use this instead of date.toISOString().split('T')[0]
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatLocalDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object as YYYY-MM in LOCAL timezone
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM format
 */
export function formatLocalMonth(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get today's date as YYYY-MM-DD in LOCAL timezone
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getTodayLocal() {
  return formatLocalDate(new Date());
}

/**
 * Get current month as YYYY-MM in LOCAL timezone
 * @returns {string} Current month in YYYY-MM format
 */
export function getCurrentMonthLocal() {
  return formatLocalMonth(new Date());
}

// ============================================
// DISPLAY FORMATTERS
// ============================================

// Format date with ordinal suffix (e.g., 1st April 2025)
export function formatDateWithOrdinal(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  const ordinal = (day % 10 === 1 && day !== 11) ? "st" :
                  (day % 10 === 2 && day !== 12) ? "nd" :
                  (day % 10 === 3 && day !== 13) ? "rd" : "th";
  return `${day}${ordinal} ${month} ${year}`;
}

// Get month and year from date (e.g., "April 2025")
export function getMonthYear(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}