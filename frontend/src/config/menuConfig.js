// ============================================
// MENU CONFIGURATION - Role-Based Navigation
// ============================================
// Location: src/config/menuConfig.js

import {
  faTachometerAlt,
  faUsers,
  faUser,
  faSchool,
  faChartLine,
  faChalkboardUser,
  faFileAlt,
  faFileInvoiceDollar,
  faExchangeAlt,
  faBoxesPacking,
  faChartBar,
  faWallet,
  faCog,
  faTasks,
  faClipboardCheck,
  faRobot,
  faBriefcase,
  faBook,
  faGraduationCap,
  faClipboardQuestion,
  faStar,
  faImages,
  faClipboardList,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { isStudentFeatureEnabled } from '../constants/studentSubtypePolicy';

/**
 * Menu sections organized by functionality
 * Each section has:
 * - id: unique identifier
 * - label: section header text
 * - roles: which roles can see this section
 * - items: array of menu items
 */
export const MENU_SECTIONS = {
  MAIN: {
    id: 'main',
    label: 'Main',
    roles: ['Admin', 'Teacher', 'Student', 'BDM'],
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: faTachometerAlt,
        path: (role) => {
          const routes = {
            'Admin': '/admindashboard',
            'Teacher': '/teacherdashboard',
            'Student': '/student-dashboard',
            'BDM': '/crm/dashboard',
          };
          return routes[role] || '/publicdashboard';
        },
        roles: ['Admin', 'Teacher', 'Student', 'BDM'],
      },
    ],
  },

  STUDENTS_FEE: {
    id: 'students-fee',
    label: 'Students & Fee',
    roles: ['Admin', 'Teacher', 'BDM'],
    items: [
      {
        id: 'students-dropdown',
        label: 'Students & Fee',
        icon: faUsers,
        dropdown: true,
        roles: ['Admin', 'Teacher'],
        subItems: [
          {
            id: 'students',
            label: 'Students',
            icon: faUsers,
            path: '/students',
          },
          {
            id: 'fee',
            label: 'Fee',
            icon: faFileInvoiceDollar,
            path: '/fee',
          },
        ],
      },
      {
        id: 'schools',
        label: 'School Data',
        icon: faSchool,
        path: '/schools',
        roles: ['Admin', 'Teacher', 'BDM'],
      },
      {
        id: 'students-data-dropdown',
        label: 'Students Data',
        icon: faChartLine,
        dropdown: true,
        roles: ['Admin', 'Teacher'],
        subItems: [
          {
            id: 'progress',
            label: 'Progress',
            icon: faChartLine,
            path: '/progress',
          },
          {
            id: 'lessons',
            label: 'Lesson',
            icon: faChalkboardUser,
            path: '/lessons',
          },
          {
            id: 'reports',
            label: 'Report',
            icon: faChartBar,
            path: '/reports',
          },
        ],
      },
      {
        id: 'inventory',
        label: 'Inventory Dashboard',
        icon: faBoxesPacking,
        path: '/inventory-dashboard',
        roles: ['Admin', 'Teacher', 'BDM'],
      },
      {
        id: 'book-management',
        label: 'Book Management',
        icon: faBook,
        path: '/book-management',
        roles: ['Admin'],
      },
      {
        id: 'online-students',
        label: 'Online Students',
        icon: faGraduationCap,
        path: '/online-students',
        roles: ['Admin'],
      },
    ],
  },

  FINANCE: {
    id: 'finance',
    label: 'Finance',
    roles: ['Admin'],
    items: [
      {
        id: 'finance-dropdown',
        label: 'Finance',
        icon: faWallet,
        dropdown: true,
        roles: ['Admin'],
        subItems: [
          {
            id: 'fin-dashboard',
            label: 'Fin Dashboard',
            icon: faChartBar,
            path: '/finance',
          },
          {
            id: 'transactions',
            label: 'Transactions',
            icon: faExchangeAlt,
            path: '/finance/transactions',
          },
        ],
      },
      {
        id: 'custom-dropdown',
        label: 'Custom',
        icon: faFileAlt,
        dropdown: true,
        roles: ['Admin', 'BDM'],
        subItems: [
          {
            id: 'salary-slip',
            label: 'Salary Slip Generator',
            icon: faFileInvoiceDollar,
            path: '/salary-slip',
          },
          {
            id: 'custom-report',
            label: 'Custom Report',
            icon: faFileAlt,
            path: '/custom-report',
          },
        ],
      },
    ],
  },

  CRM: {
    id: 'crm',
    label: 'CRM',
    roles: ['Admin', 'BDM'],
    items: [
      {
        id: 'crm-dropdown',
        label: 'CRM',
        icon: faUsers,
        dropdown: true,
        roles: ['Admin'],
        subItems: [
          {
            id: 'crm-admin',
            label: 'Admin Dashboard',
            icon: faChartBar,
            path: '/crm/admin-dashboard',
          },
          {
            id: 'crm-leads',
            label: 'Leads',
            icon: faUsers,
            path: '/crm/leads',
          },
          {
            id: 'crm-activities',
            label: 'Activities',
            icon: faTasks,
            path: '/crm/activities',
          },
          {
            id: 'crm-proposals',
            label: 'Proposal Generator',
            icon: faFileAlt,
            path: '/crm/proposals',
          },
        ],
      },
      // BDM sees these as direct links (not in dropdown)
      {
        id: 'bdm-leads',
        label: 'Leads',
        icon: faUsers,
        path: '/crm/leads',
        roles: ['BDM'],
      },
      {
        id: 'bdm-activities',
        label: 'Activities',
        icon: faTasks,
        path: '/crm/activities',
        roles: ['BDM'],
      },
      {
        id: 'bdm-proposals',
        label: 'Proposals',
        icon: faFileAlt,
        path: '/crm/proposals',
        roles: ['BDM'],
      },
    ],
  },

  MONITORING: {
    id: 'monitoring',
    label: 'Monitoring',
    roles: ['Admin', 'BDM', 'Teacher'],
    items: [
      {
        id: 'monitoring-visits',
        label: 'School Monitoring',
        icon: faClipboardList,
        path: '/monitoring',
        roles: ['Admin', 'BDM'],
      },
      {
        id: 'monitoring-templates',
        label: 'Eval Templates',
        icon: faClipboardList,
        path: '/monitoring/templates',
        roles: ['Admin'],
      },
      {
        id: 'monitoring-evaluations',
        label: 'Evaluation History',
        icon: faChartBar,
        path: '/monitoring/evaluations',
        roles: ['Admin', 'Teacher'],
      },
    ],
  },

  TASKS: {
    id: 'tasks',
    label: 'Tasks',
    roles: ['Admin'],  // Teachers & BDMs access via header TaskPanel
    items: [
      {
        id: 'tasks-dropdown',
        label: 'Tasks',
        icon: faTasks,
        dropdown: true,
        roles: ['Admin'],
        subItems: [
          {
            id: 'manage-tasks',
            label: 'Manage Tasks',
            icon: faCog,
            path: '/task-management',
            roles: ['Admin'],
          },
          {
            id: 'my-tasks',
            label: 'My Tasks',
            icon: faClipboardCheck,
            path: '/my-tasks',
            roles: ['Admin'],
          },
        ],
      },
    ],
  },

  SELF_SERVICES: {
    id: 'self-services',
    label: 'Self Services',
    roles: ['Teacher', 'BDM'],
    items: [
      {
        id: 'self-services',
        label: 'Self Services',
        icon: faBriefcase,
        path: '/self-services',
        roles: ['Teacher', 'BDM'],
      },
    ],
  },

  SUPPORT: {
    id: 'support',
    label: 'Support',
    roles: ['Admin', 'Teacher', 'BDM'],
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: faCog,
        path: '/settings',
        roles: ['Admin'],
      },
      {
        id: 'robot-chat',
        label: 'Robot Chat',
        icon: faRobot,
        path: '/robot-chat',
        roles: ['Admin', 'Teacher', 'BDM'],
      },
    ],
  },

  // Student-specific section
  STUDENT: {
    id: 'student',
    label: 'Student',
    roles: ['Student'],
    items: [
      {
        id: 'student-progress',
        label: 'Progress',
        icon: faChartLine,
        path: '/student-progress',
        roles: ['Student'],
        studentFeature: 'progressEnabled',
      },
    ],
  },

  // LMS - Learning Management System (Students see "My Lessons", Admin/Teacher for testing)
  LMS: {
    id: 'lms',
    label: 'Learning',
    roles: ['Student', 'Admin', 'Teacher'],
    items: [
      {
        id: 'my-lessons',
        label: 'My Lessons',
        icon: faBook,
        path: '/lms/my-courses',
        roles: ['Student', 'Admin', 'Teacher'],
        studentFeature: 'lmsEnabled',
      },
      {
        id: 'lms-guidelines',
        label: 'Guidelines',
        icon: faClipboardList,
        path: '/lms/guidelines',
        roles: ['Student', 'Admin', 'Teacher'],
        studentFeature: 'lmsEnabled',
      },
      {
        id: 'quiz-management',
        label: 'Manage Quizzes',
        icon: faClipboardQuestion,
        path: '/lms/quiz-manage',
        roles: ['Admin', 'Teacher'],
      },
      {
        id: 'create-quiz',
        label: 'Create Quiz',
        icon: faClipboardCheck,
        path: '/lms/quiz-builder',
        roles: ['Admin', 'Teacher'],
      },
    ],
  },

  // AI Gala - Monthly creative AI projects with voting
  AI_GALA: {
    id: 'ai-gala',
    label: 'AI Gala',
    roles: ['Student', 'Admin', 'Teacher'],
    items: [
      {
        id: 'ai-gala-gallery',
        label: 'AI Gala',
        icon: faStar,
        path: '/ai-gala',
        roles: ['Student', 'Admin', 'Teacher'],
        studentFeature: 'aiGalaEnabled',
      },
      {
        id: 'ai-gala-manage',
        label: 'Manage Galas',
        icon: faImages,
        path: '/ai-gala/manage',
        roles: ['Admin', 'Teacher'],
      },
    ],
  },

  // Online Classes - Live video sessions for online/hybrid students
  ONLINE_CLASSES: {
    id: 'online-classes',
    label: 'Online Classes',
    roles: ['Student', 'Teacher', 'Admin'],
    items: [
      {
        id: 'online-classes-student',
        label: 'My Classes',
        icon: faVideo,
        path: '/online-classes',
        roles: ['Student'],
        studentFeature: 'onlineClassesEnabled',
      },
      {
        id: 'online-classes-teacher',
        label: 'Online Classes',
        icon: faVideo,
        path: '/online-classes/teacher',
        roles: ['Teacher', 'Admin'],
      },
    ],
  },
};

/**
 * Helper function to get menu items filtered by role
 * @param {string} role - User role (Admin, Teacher, Student, BDM)
 * @returns {object} Filtered menu sections
 */
export const getMenuForRole = (role, studentSubtype = '') => {
  const sections = {};

  Object.entries(MENU_SECTIONS).forEach(([key, section]) => {
    // Check if section is visible for this role
    if (section.roles.includes(role)) {
      // Filter items based on role without mutating MENU_SECTIONS.
      const filteredItems = section.items
        .map((item) => {
          // If item has specific roles, check them.
          if (item.roles && !item.roles.includes(role)) {
            return null;
          }

          if (
            role === 'Student' &&
            item.studentFeature &&
            !isStudentFeatureEnabled(studentSubtype, item.studentFeature)
          ) {
            return null;
          }

          // If item has dropdown with subItems, filter subItems immutably.
          if (item.dropdown && item.subItems) {
            const filteredSubItems = item.subItems.filter((subItem) => {
              if (subItem.roles && !subItem.roles.includes(role)) {
                return false;
              }

              if (
                role === 'Student' &&
                subItem.studentFeature &&
                !isStudentFeatureEnabled(studentSubtype, subItem.studentFeature)
              ) {
                return false;
              }

              return true;
            });

            // Only include dropdown if it has visible subItems.
            if (filteredSubItems.length === 0) {
              return null;
            }

            return {
              ...item,
              subItems: filteredSubItems,
            };
          }

          return item;
        })
        .filter(Boolean);

      // Only include section if it has visible items
      if (filteredItems.length > 0) {
        sections[key] = {
          ...section,
          items: filteredItems,
        };
      }
    }
  });

  return sections;
};

/**
 * Helper function to check if a path is active
 * @param {string} currentPath - Current router path
 * @param {string} itemPath - Menu item path
 * @param {string} itemId - Menu item id
 * @returns {boolean} Whether the item is active
 */
export const isPathActive = (currentPath, itemPath, itemId) => {
  if (currentPath === itemPath) return true;
  if (currentPath.startsWith(itemPath) && itemPath !== '/') return true;
  if (currentPath.includes(itemId)) return true;
  return false;
};

/**
 * Helper function to get dashboard path based on role
 * @param {string} role - User role
 * @returns {string} Dashboard path
 */
export const getDashboardPath = (role) => {
  const routes = {
    'Admin': '/admindashboard',
    'Teacher': '/teacherdashboard',
    'Student': '/student-dashboard',
    'BDM': '/crm/dashboard',
  };
  return routes[role] || '/publicdashboard';
};

export default {
  MENU_SECTIONS,
  getMenuForRole,
  isPathActive,
  getDashboardPath,
};

