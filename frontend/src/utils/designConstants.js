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
    offWhite: '#F3F4F6',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #2362ab 100%)',
    whiteVerySubtle: 'rgba(255, 255, 255, 0.05)',
    whiteSubtle: 'rgba(255, 255, 255, 0.08)',
    whiteMedium: 'rgba(255, 255, 255, 0.12)',
    whiteStrong: 'rgba(255, 255, 255, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text Colors
  text: {
    primary: '#000000',
    secondary: '#666666',
    tertiary: '#9CA3AF',
    muted: '#9CA3AF',
    light: '#D1D5DB',
    white: '#FFFFFF',
    whiteTransparent: 'rgba(255, 255, 255, 0.9)',
    whiteMedium: 'rgba(255, 255, 255, 0.8)',
    whiteSubtle: 'rgba(255, 255, 255, 0.7)',
  },
  
  // Border Colors
  border: {
    default: '#D2D2D2',
    light: '#E5E7EB',
    dark: '#9CA3AF',
    whiteTransparent: 'rgba(255, 255, 255, 0.18)',
    whiteSubtle: 'rgba(255, 255, 255, 0.1)',
    whiteMedium: 'rgba(255, 255, 255, 0.2)',
    whiteStrong: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Status Colors
  status: {
    success: '#10B981',
    successDark: '#059669',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningDark: '#D97706',
    warningDarker: '#B45309',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorDark: '#DC2626',
    errorDarker: '#B91C1C',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoDark: '#2563EB',
    infoDarker: '#1D4ED8',
    infoLight: '#DBEAFE',
  },
  
  // Class Colors (for lesson calendar)
  classes: {
    'Class 1': '#F59E0B',
    'Class 2': '#10B981',
    'Class 3': '#3B82F6',
    'Class 4': '#8B5CF6',
    'Class 5': '#EC4899',
  },

  // Accent Colors (brand colors for special UI elements)
  accent: {
    purple: '#B061CE',
    blue: '#2362ab',
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
  xs: '0.625rem',   // 10px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  md: '1.125rem',   // 18px
  lg: '1.25rem',    // 20px
  xl: '1.5rem',     // 24px
  '2xl': '1.875rem', // 30px
  '3xl': '2.25rem',  // 36px
  '4xl': '3rem',     // 48px
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
 * Spacing system (based on 4px grid)
 */
export const SPACING = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '0.75rem',  // 12px
  lg: '1rem',     // 16px
  xl: '1.5rem',   // 24px
  '2xl': '2rem',  // 32px

  // Layout-specific
  sidebar: '257px',
  contentPadding: '2rem',
  sectionGap: '2rem',
};

/**
 * Border radius
 */
export const BORDER_RADIUS = {
  xs: '0.25rem',   // 4px
  sm: '0.375rem',  // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  full: '9999px',  // Fully rounded
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
 * Sidebar-specific constants for new hybrid design
 */
export const SIDEBAR = {
  collapsedWidth: '80px',
  expandedWidth: '280px',
  headerHeight: '80px',
  footerHeight: '80px',
  iconSize: '24px',
  transitionDuration: '0.3s',
  transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
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

  // Glassmorphic design mixins for sidebar
  glassmorphic: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.1)',
  },

  glassmorphicWhite: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },

  // Glassmorphic cards for main content area
  glassmorphicCard: {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
  },

  // Glassmorphic table/subtle containers
  glassmorphicSubtle: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
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
  SIDEBAR,
  MIXINS,
  getClassColor,
  getCompletionRateColor,
};