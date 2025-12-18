// ============================================
// DESIGN CONSTANTS - Figma Design System
// ============================================
// Location: src/utils/designConstants.js

/**
 * Color palette based on Figma design
 */
export const COLORS = {
  // Primary Colors
  primary: '#B061CE',
  primaryDark: '#9A4FB8',
  primaryLight: '#C87FDD',
  
  // Background Colors
  background: {
    white: '#FFFFFF',
    gray: '#F2F2F7',
    lightGray: '#F9FAFB',
  },
  
  // Text Colors
  text: {
    primary: '#000000',
    secondary: '#666666',
    tertiary: '#9CA3AF',
    light: '#D1D5DB',
  },
  
  // Border Colors
  border: {
    default: '#D2D2D2',
    light: '#E5E7EB',
    dark: '#9CA3AF',
  },
  
  // Status Colors
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  
  // Class Colors (for lesson calendar)
  classes: {
    'Class 1': '#F59E0B',
    'Class 2': '#10B981',
    'Class 3': '#3B82F6',
    'Class 4': '#8B5CF6',
    'Class 5': '#EC4899',
  },
};

/**
 * Typography system
 */
export const FONTS = {
  primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  heading: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  body: 'Poly, Georgia, serif',
};

/**
 * Font sizes
 */
export const FONT_SIZES = {
  xs: '10px',
  sm: '12px',
  base: '14px',
  md: '15px',
  lg: '16px',
  xl: '18px',
  '2xl': '20px',
  '3xl': '26px',
  '4xl': '30px',
};

/**
 * Font weights
 */
export const FONT_WEIGHTS = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

/**
 * Spacing system (based on 8px grid)
 */
export const SPACING = {
  xs: '0.5rem',   // 8px
  sm: '1rem',     // 16px
  md: '1.5rem',   // 24px
  lg: '2rem',     // 32px
  xl: '3rem',     // 48px
  '2xl': '4rem',  // 64px
  
  // Layout-specific
  sidebar: '257px',
  contentPadding: '2rem',
  sectionGap: '2rem',
};

/**
 * Border radius
 */
export const BORDER_RADIUS = {
  sm: '8px',
  md: '9px',
  lg: '16px',
  xl: '17px',
  full: '50%',
};

/**
 * Shadows
 */
export const SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
};

/**
 * Breakpoints for responsive design
 */
export const BREAKPOINTS = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px',
};

/**
 * Z-index layers
 */
export const Z_INDEX = {
  base: 1,
  dropdown: 10,
  sticky: 100,
  modal: 1000,
  popover: 1010,
  tooltip: 1020,
};

/**
 * Transition durations
 */
export const TRANSITIONS = {
  fast: '0.15s',
  normal: '0.2s',
  slow: '0.3s',
  slower: '0.5s',
};

/**
 * Layout dimensions from Figma
 */
export const LAYOUT = {
  sidebar: {
    width: '257px',
    backgroundColor: COLORS.primary,
  },
  header: {
    height: '142px',
    padding: '2rem 3rem',
  },
  avatar: {
    size: '101px',
    borderRadius: BORDER_RADIUS.full,
  },
  progressChart: {
    size: '173px',
    strokeWidth: '20px',
  },
  lessonGrid: {
    width: '1165px',
    height: '568px',
    classLabelWidth: '125px',
    cellHeight: '92px',
  },
};

/**
 * Helper function to get class color
 */
export const getClassColor = (className) => {
  return COLORS.classes[className] || COLORS.status.info;
};

/**
 * Helper function to get completion rate color
 */
export const getCompletionRateColor = (rate) => {
  if (rate >= 80) return COLORS.status.success;
  if (rate >= 50) return COLORS.status.warning;
  return COLORS.status.error;
};

/**
 * Common style mixins
 */
export const MIXINS = {
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: COLORS.background.white,
    borderRadius: BORDER_RADIUS.lg,
    boxShadow: SHADOWS.md,
    padding: SPACING.lg,
  },
  button: {
    padding: '0.5rem 1rem',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal} ease`,
    border: 'none',
    fontFamily: FONTS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  input: {
    padding: '0.5rem 1rem',
    borderRadius: BORDER_RADIUS.sm,
    border: `1px solid ${COLORS.border.default}`,
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.base,
  },
};

export default {
  COLORS,
  FONTS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  BREAKPOINTS,
  Z_INDEX,
  TRANSITIONS,
  LAYOUT,
  MIXINS,
  getClassColor,
  getCompletionRateColor,
};