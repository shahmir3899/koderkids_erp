// ============================================
// CONSTANTS - Centralized Configuration
// ============================================

// API Configuration
export const API_URL = process.env.REACT_APP_API_URL || 'https://koderkids-erp.onrender.com';

// User Roles
export const ROLES = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

// Status Options
export const STUDENT_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  GRADUATED: 'Graduated',
};

// Transaction Types
export const TRANSACTION_TYPES = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  TRANSFER: 'Transfer',
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD-MMM-YYYY',        // 29-Nov-2024
  API: 'YYYY-MM-DD',             // 2024-11-29
  MONTH: 'YYYY-MM',              // 2024-11
  FULL: 'DD-MMM-YYYY HH:mm',     // 29-Nov-2024 14:30
};

// Chart Colors (for FullCalendar, Charts, etc.)
export const CHART_COLORS = {
  PRIMARY: '#3B82F6',      // Blue
  SUCCESS: '#10B981',      // Green
  WARNING: '#F59E0B',      // Orange
  DANGER: '#EF4444',       // Red
  INFO: '#06B6D4',         // Cyan
  PURPLE: '#8B5CF6',       // Purple
  PINK: '#EC4899',         // Pink
};

// Class Colors for Calendar
export const CLASS_COLORS = {
  'Class A': '#10b981',    // Green
  'Class B': '#3b82f6',    // Blue
  'Class C': '#f59e0b',    // Orange
  'Class D': '#ef4444',    // Red
  'Class E': '#8b5cf6',    // Purple
  'Class F': '#ec4899',    // Pink
};

// Loading Messages
export const LOADING_MESSAGES = {
  FETCHING_DATA: 'Loading data...',
  SAVING: 'Saving...',
  DELETING: 'Deleting...',
  UPLOADING: 'Uploading...',
  PROCESSING: 'Processing...',
};

// Error Messages
export const ERROR_MESSAGES = {
  AUTH_FAILED: 'Authentication failed. Please log in again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'Data not found.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please fill in all required fields.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Data saved successfully!',
  UPDATED: 'Data updated successfully!',
  DELETED: 'Data deleted successfully!',
  UPLOADED: 'Upload successful!',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access',
  REFRESH_TOKEN: 'refresh',
  USER_ROLE: 'role',
  USERNAME: 'username',
  FULL_NAME: 'fullName',
  EMPLOYEE_ID: 'employee_id',
};

// API Endpoints (relative paths)
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/token/',
  REFRESH: '/api/token/refresh/',
  USER: '/api/user/',
  
  // Schools & Classes
  SCHOOLS: '/api/schools/',
  CLASSES: '/api/classes/',
  SCHOOLS_WITH_CLASSES: '/api/schools-with-classes/',
  SCHOOL_DETAILS: '/api/school-details/',
  
  // Students
  STUDENTS: '/api/students/',
  STUDENTS_ADD: '/api/students/add/',
  
  // Lessons
  LESSONS: '/api/lesson-plan/',
  TEACHER_LESSONS: '/api/teacher-upcoming-lessons/',
  LESSON_STATUS: '/api/teacher-lesson-status/',
  LESSONS_BY_SCHOOL: '/api/teacher-lessons-by-school/',
  
  // Finance
  FINANCE_SUMMARY: '/api/finance-summary/',
  LOAN_SUMMARY: '/api/loan-summary/',
  INCOME: '/api/income/',
  EXPENSE: '/api/expense/',
  TRANSFERS: '/api/transfers/',
  TRANSACTIONS: '/api/transactions/',
  FEE_SUMMARY: '/api/fee-summary/',
  FEE_PER_MONTH: '/api/fee-per-month/',
  
  // Reports
  STUDENTS_PER_SCHOOL: '/api/students-per-school/',
  NEW_REGISTRATIONS: '/api/new-registrations/',
  STUDENT_ATTENDANCE: '/api/student-attendance-counts/',
  STUDENT_TOPICS: '/api/student-achieved-topics-count/',
  STUDENT_IMAGES: '/api/student-image-uploads-count/',
  
  // Inventory
  INVENTORY: '/api/inventory/',
  CLASS_IMAGE_COUNT: '/api/class-image-count/',
  
  // Other
  ROBOT_REPLY: '/api/robot-reply/',
};

// Export all as default for convenience
export default {
  API_URL,
  ROLES,
  STUDENT_STATUS,
  TRANSACTION_TYPES,
  DATE_FORMATS,
  CHART_COLORS,
  CLASS_COLORS,
  LOADING_MESSAGES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
  STORAGE_KEYS,
  API_ENDPOINTS,
};