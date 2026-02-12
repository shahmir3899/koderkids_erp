// ============================================
// BOOK THEME - Light theme design system for Book Viewer
// ============================================
// Mimics the KoderKids PDF textbook visual style:
// colorful, kid-friendly, A4-proportioned pages

// ---- COLORS ----
export const BOOK_COLORS = {
  // Page
  pageBg: '#FFFFFF',
  pageAlt: '#FAFBFF',
  canvasBg: '#F0F2F8',

  // Text
  heading: '#6B21A8',        // Deep purple - main headings
  headingAlt: '#7C3AED',     // Lighter purple
  body: '#1E293B',           // Slate-900 body text
  bodyLight: '#475569',      // Slate-600 secondary text
  muted: '#94A3B8',          // Slate-400

  // Activity types (match PDF styling)
  classActivity: '#3B82F6',   // Blue
  homeActivity: '#10B981',    // Green
  challenge: '#EF4444',       // Red
  note: '#F59E0B',            // Amber/yellow
  funFact: '#FBBF24',         // Yellow
  reading: '#8B5CF6',         // Purple
  exercise: '#F97316',        // Orange

  // Step badges gradient palette
  stepBadges: ['#F97316', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'],

  // Bunting triangle colors (from the PDF)
  bunting: [
    '#EF4444', '#F97316', '#FBBF24', '#10B981',
    '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4',
  ],

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  locked: '#CBD5E1',

  // Borders & shadows
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowMd: 'rgba(0, 0, 0, 0.12)',
};

// ---- FONTS ----
export const BOOK_FONTS = {
  heading: "'Fredoka One', 'Montserrat', sans-serif",
  body: "'Nunito', 'Inter', sans-serif",
  handwritten: "'Patrick Hand', cursive",
};

// ---- FONT SIZES ----
export const BOOK_FONT_SIZES = {
  xs: '0.75rem',      // 12px - captions, labels
  sm: '0.875rem',     // 14px - small text
  base: '0.9375rem',  // 15px - body text (matches book)
  md: '1rem',         // 16px - slightly larger body
  lg: '1.125rem',     // 18px - sub-headings
  xl: '1.375rem',     // 22px - section titles
  '2xl': '1.625rem',  // 26px - topic headings
  '3xl': '2rem',      // 32px - chapter headings
  '4xl': '2.5rem',    // 40px - book title
};

// ---- SPACING ----
export const BOOK_SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '3rem',   // 48px
  page: '3rem',    // Page horizontal padding
  pageY: '2rem',   // Page vertical padding
};

// ---- BORDER RADIUS ----
export const BOOK_RADIUS = {
  sm: '0.375rem',  // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
};

// ---- PAGE DIMENSIONS ----
export const BOOK_PAGE = {
  maxWidth: '820px',
  minHeight: '600px',
  margin: '0 auto',
  padding: '2rem 3rem',
  paddingMobile: '1.25rem 1rem',
};

// ---- SHADOWS ----
export const BOOK_SHADOWS = {
  page: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
  card: '0 2px 8px rgba(0, 0, 0, 0.06)',
  cardHover: '0 4px 16px rgba(0, 0, 0, 0.1)',
  stepBadge: '0 2px 6px rgba(0, 0, 0, 0.15)',
};

// ---- TRANSITIONS ----
export const BOOK_TRANSITIONS = {
  fast: '0.15s ease',
  normal: '0.25s ease',
  slow: '0.4s ease',
  page: '0.35s cubic-bezier(0.4, 0, 0.2, 1)',
};

// ---- ACTIVITY TYPE CONFIGS ----
export const ACTIVITY_TYPES = {
  class_activity: {
    color: BOOK_COLORS.classActivity,
    bgLight: '#EFF6FF',
    border: '#BFDBFE',
    icon: 'faChalkboardTeacher',
    label: 'Class Activity',
  },
  home_activity: {
    color: BOOK_COLORS.homeActivity,
    bgLight: '#ECFDF5',
    border: '#A7F3D0',
    icon: 'faHome',
    label: 'Home Activity',
  },
  challenge: {
    color: BOOK_COLORS.challenge,
    bgLight: '#FEF2F2',
    border: '#FECACA',
    icon: 'faStar',
    label: 'Challenge',
  },
  note: {
    color: BOOK_COLORS.note,
    bgLight: '#FFFBEB',
    border: '#FDE68A',
    icon: 'faLightbulb',
    label: 'Fun Fact',
  },
  reading: {
    color: BOOK_COLORS.reading,
    bgLight: '#F5F3FF',
    border: '#DDD6FE',
    icon: 'faBookOpen',
    label: 'Reading',
  },
  exercise: {
    color: BOOK_COLORS.exercise,
    bgLight: '#FFF7ED',
    border: '#FED7AA',
    icon: 'faClipboardList',
    label: 'Exercise',
  },
};

// Helper: get activity config (handles both "class" and "class_activity" formats)
export const getActivityConfig = (type) => {
  const normalized = type?.toLowerCase().replace('_activity', '');
  const key = `${normalized}_activity`;
  return ACTIVITY_TYPES[key] || ACTIVITY_TYPES[type] || ACTIVITY_TYPES.note;
};
