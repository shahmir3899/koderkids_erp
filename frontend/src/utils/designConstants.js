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

  // Transaction-specific colors
  transaction: {
    income: '#10B981',      // Green - matches status.success
    expense: '#EF4444',     // Red - matches status.error
    transfer: '#3B82F6',    // Blue - matches status.info
    incomeBg: '#D1FAE5',    // Light green background
    expenseBg: '#FEE2E2',   // Light red background
    transferBg: '#DBEAFE',  // Light blue background
  },

  // Interactive states
  interactive: {
    primary: '#1E40AF',         // Deep blue for primary actions
    primaryHover: '#1E3A8A',    // Darker blue for hover
    primaryActive: '#1D4ED8',   // Active state
    disabled: '#9CA3AF',        // Gray for disabled state
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

  // Responsive font sizes (mobile, tablet, desktop)
  responsive: {
    h1: { mobile: '1.75rem', tablet: '2.25rem', desktop: '2.5rem' },
    h2: { mobile: '1.5rem', tablet: '1.75rem', desktop: '2rem' },
    h3: { mobile: '1.25rem', tablet: '1.375rem', desktop: '1.5rem' },
    h4: { mobile: '1.125rem', tablet: '1.25rem', desktop: '1.25rem' },
    body: { mobile: '0.875rem', tablet: '0.9375rem', desktop: '1rem' },
    small: { mobile: '0.75rem', tablet: '0.8125rem', desktop: '0.875rem' },
  },
};

/**
 * Get responsive font size
 * @param {string} type - Font type (h1, h2, h3, h4, body, small)
 * @param {string} breakpoint - Current breakpoint
 */
export const getResponsiveFontSize = (type, breakpoint = 'desktop') => {
  const fontType = FONT_SIZES.responsive[type];
  if (!fontType) return FONT_SIZES.base;
  return fontType[breakpoint] || fontType.desktop;
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
  '3xl': '3rem',  // 48px
  '4xl': '4rem',  // 64px

  // Layout-specific
  sidebar: '257px',
  contentPadding: '2rem',
  sectionGap: '2rem',

  // Responsive spacing (use with getResponsiveSpacing helper)
  responsive: {
    pagePadding: { mobile: '1rem', tablet: '1.5rem', desktop: '2rem' },
    sectionGap: { mobile: '1rem', tablet: '1.5rem', desktop: '2rem' },
    cardPadding: { mobile: '0.75rem', tablet: '1rem', desktop: '1.5rem' },
    containerPadding: { mobile: '1rem', tablet: '1.5rem', desktop: '2rem' },
  },
};

/**
 * Responsive spacing values - returns CSS value based on breakpoint
 * @param {string} type - Type of spacing (pagePadding, sectionGap, etc.)
 * @param {string} breakpoint - Current breakpoint (mobile, tablet, desktop)
 */
export const getResponsiveSpacing = (type, breakpoint = 'desktop') => {
  const spacingType = SPACING.responsive[type];
  if (!spacingType) return SPACING.lg;
  return spacingType[breakpoint] || spacingType.desktop;
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
 * Breakpoints for responsive design (pixel values)
 */
export const BREAKPOINT_VALUES = {
  xs: 320,    // Small phones
  sm: 480,    // Large phones
  md: 768,    // Tablets
  lg: 1024,   // Small desktops
  xl: 1280,   // Large desktops
  xxl: 1536,  // Extra large screens
};

/**
 * Breakpoints for responsive design (string values)
 */
export const BREAKPOINTS = {
  xs: '320px',
  sm: '480px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
  // Legacy aliases
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px',
};

/**
 * Media query strings for use in CSS-in-JS
 */
export const MEDIA_QUERIES = {
  mobile: `@media (max-width: ${BREAKPOINT_VALUES.md - 1}px)`,
  tablet: `@media (min-width: ${BREAKPOINT_VALUES.md}px) and (max-width: ${BREAKPOINT_VALUES.lg - 1}px)`,
  desktop: `@media (min-width: ${BREAKPOINT_VALUES.lg}px)`,
  touch: '@media (hover: none) and (pointer: coarse)',
};

/**
 * Z-index layers
 */
export const Z_INDEX = {
  base: 1,
  dropdown: 10,
  sticky: 100,
  sidebar: 100,
  sidebarTooltip: 110,
  sidebarFlyout: 120,
  modal: 2000,
  modalOverlay: 1999,
  popover: 2010,
  tooltip: 2020,
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
 * Touch target sizes (WCAG guidelines recommend 44px minimum)
 */
export const TOUCH_TARGETS = {
  minimum: '44px',    // WCAG minimum
  small: '36px',      // Small but still accessible
  medium: '44px',     // Default recommended
  large: '48px',      // Comfortable touch target
  extraLarge: '56px', // Large touch target for important actions
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

  // Page max widths for consistent layouts
  maxWidth: {
    sm: '1000px',   // StudentDashboard
    md: '1400px',   // TransactionsPage, StudentsPage, FeePage
    lg: '1600px',   // InventoryDashboard
    full: '100%',   // Full width
  },

  // Responsive container max-widths
  container: {
    xs: '100%',
    sm: '540px',
    md: '720px',
    lg: '960px',
    xl: '1140px',
    xxl: '1320px',
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

  // Select/dropdown styling with solid background for proper option rendering
  glassmorphicSelect: {
    background: 'rgba(88, 60, 140, 0.95)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
  },

  // Select option styling (for inline use on <option> elements)
  selectOption: {
    background: '#4a3570',
    color: '#ffffff',
  },

  // Responsive mixins
  responsiveContainer: {
    width: '100%',
    maxWidth: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: '1rem',
    paddingRight: '1rem',
  },

  // Touch-friendly button
  touchButton: {
    minHeight: TOUCH_TARGETS.minimum,
    minWidth: TOUCH_TARGETS.minimum,
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    cursor: 'pointer',
  },

  // Responsive grid
  responsiveGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },

  // Stack on mobile, row on desktop
  responsiveFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  // Responsive table wrapper
  tableResponsive: {
    display: 'block',
    width: '100%',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },

  // Safe width (for modals, dropdowns)
  safeWidth: {
    width: 'min(90vw, 400px)',
  },
};

/**
 * Action Button Styles
 * Consistent button styles for action buttons across the app
 * Use with hover handlers for full effect
 */
export const BUTTON_STYLES = {
  // Base action button style (compact, for table rows and cards)
  actionBase: {
    padding: '0.375rem 0.75rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
  },

  // Primary action (View, Submit, Confirm)
  primary: {
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
  },
  primaryHover: {
    backgroundColor: COLORS.status.infoDark,
  },

  // Success action (Edit, Save, Approve)
  success: {
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
  },
  successHover: {
    backgroundColor: COLORS.status.successDark,
  },

  // Warning action (Assign, Transfer, Move)
  warning: {
    backgroundColor: COLORS.status.warning,
    color: COLORS.text.white,
  },
  warningHover: {
    backgroundColor: COLORS.status.warningDark,
  },

  // Danger action (Delete, Remove, Deactivate)
  danger: {
    backgroundColor: COLORS.status.errorDark,
    color: COLORS.text.white,
  },
  dangerHover: {
    backgroundColor: COLORS.status.errorDarker,
  },

  // Purple action (Special actions like Reset Password)
  purple: {
    backgroundColor: '#8B5CF6',
    color: COLORS.text.white,
  },
  purpleHover: {
    backgroundColor: '#7C3AED',
  },

  // Secondary/Ghost action (Cancel, Close)
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: `1px solid ${COLORS.border.whiteTransparent}`,
  },
  secondaryHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Disabled state
  disabled: {
    backgroundColor: '#9CA3AF',
    color: COLORS.text.white,
    cursor: 'not-allowed',
    opacity: 0.6,
  },

  // Full-width button variant (for modals, forms)
  fullWidth: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '0.5rem',
  },

  // Icon-only button (for compact table actions)
  iconOnly: {
    padding: '0.375rem',
    minWidth: '2rem',
    minHeight: '2rem',
  },
};

/**
 * Helper function to get button style with hover
 * Usage: getButtonStyle('primary', isHovered)
 */
export const getButtonStyle = (variant, isHovered = false, isDisabled = false) => {
  if (isDisabled) {
    return {
      ...BUTTON_STYLES.actionBase,
      ...BUTTON_STYLES.disabled,
    };
  }

  const baseVariant = BUTTON_STYLES[variant] || BUTTON_STYLES.primary;
  const hoverVariant = BUTTON_STYLES[`${variant}Hover`] || BUTTON_STYLES.primaryHover;

  return {
    ...BUTTON_STYLES.actionBase,
    ...baseVariant,
    ...(isHovered ? hoverVariant : {}),
  };
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
  BREAKPOINT_VALUES,
  MEDIA_QUERIES,
  Z_INDEX,
  TRANSITIONS,
  TOUCH_TARGETS,
  LAYOUT,
  SIDEBAR,
  MIXINS,
  BUTTON_STYLES,
  getClassColor,
  getCompletionRateColor,
  getButtonStyle,
  getResponsiveSpacing,
  getResponsiveFontSize,
};