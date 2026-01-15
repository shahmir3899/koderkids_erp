// ============================================
// RESPONSIVE BREAKPOINTS CONFIGURATION
// ============================================
// Location: src/utils/breakpoints.js
// Purpose: Centralized responsive breakpoint values and media query helpers

/**
 * Standard breakpoint values (in pixels)
 * Based on common device sizes and industry standards
 */
export const BREAKPOINT_VALUES = {
  xs: 320,    // Small phones (iPhone SE, older Android)
  sm: 480,    // Large phones (iPhone 6/7/8)
  md: 768,    // Tablets (iPad Mini, iPad portrait)
  lg: 1024,   // Small desktops / iPad landscape
  xl: 1280,   // Large desktops
  xxl: 1536,  // Extra large screens / 4K
};

/**
 * Breakpoint strings for CSS and styled-components
 */
export const BREAKPOINTS = {
  xs: `${BREAKPOINT_VALUES.xs}px`,
  sm: `${BREAKPOINT_VALUES.sm}px`,
  md: `${BREAKPOINT_VALUES.md}px`,
  lg: `${BREAKPOINT_VALUES.lg}px`,
  xl: `${BREAKPOINT_VALUES.xl}px`,
  xxl: `${BREAKPOINT_VALUES.xxl}px`,
};

/**
 * Media query strings for use in CSS-in-JS
 * Usage: ${MEDIA_QUERIES.mobile} { styles here }
 */
export const MEDIA_QUERIES = {
  // Max-width queries (mobile-first breakpoints)
  mobile: `@media (max-width: ${BREAKPOINT_VALUES.md - 1}px)`,           // < 768px
  tablet: `@media (min-width: ${BREAKPOINT_VALUES.md}px) and (max-width: ${BREAKPOINT_VALUES.lg - 1}px)`, // 768-1023px
  desktop: `@media (min-width: ${BREAKPOINT_VALUES.lg}px)`,              // >= 1024px

  // Specific device ranges
  smallPhone: `@media (max-width: ${BREAKPOINT_VALUES.sm - 1}px)`,       // < 480px
  largePhone: `@media (min-width: ${BREAKPOINT_VALUES.sm}px) and (max-width: ${BREAKPOINT_VALUES.md - 1}px)`, // 480-767px
  tabletOnly: `@media (min-width: ${BREAKPOINT_VALUES.md}px) and (max-width: ${BREAKPOINT_VALUES.lg - 1}px)`, // 768-1023px
  desktopOnly: `@media (min-width: ${BREAKPOINT_VALUES.lg}px) and (max-width: ${BREAKPOINT_VALUES.xl - 1}px)`, // 1024-1279px
  largeDesktop: `@media (min-width: ${BREAKPOINT_VALUES.xl}px)`,         // >= 1280px

  // Touch device detection
  touch: `@media (hover: none) and (pointer: coarse)`,
  mouse: `@media (hover: hover) and (pointer: fine)`,

  // Orientation
  portrait: `@media (orientation: portrait)`,
  landscape: `@media (orientation: landscape)`,

  // Reduced motion preference
  reducedMotion: `@media (prefers-reduced-motion: reduce)`,

  // Print
  print: `@media print`,
};

/**
 * Helper function to create min-width media query
 * @param {number} width - Minimum width in pixels
 * @returns {string} Media query string
 */
export const minWidth = (width) => `@media (min-width: ${width}px)`;

/**
 * Helper function to create max-width media query
 * @param {number} width - Maximum width in pixels
 * @returns {string} Media query string
 */
export const maxWidth = (width) => `@media (max-width: ${width}px)`;

/**
 * Helper function to create between media query
 * @param {number} minW - Minimum width in pixels
 * @param {number} maxW - Maximum width in pixels
 * @returns {string} Media query string
 */
export const between = (minW, maxW) =>
  `@media (min-width: ${minW}px) and (max-width: ${maxW}px)`;

/**
 * Check if current viewport matches a breakpoint (client-side only)
 * @param {string} breakpoint - Breakpoint key (xs, sm, md, lg, xl, xxl)
 * @returns {boolean} True if viewport is at or above the breakpoint
 */
export const isBreakpoint = (breakpoint) => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINT_VALUES[breakpoint];
};

/**
 * Check if current viewport is mobile (client-side only)
 * @returns {boolean} True if viewport is mobile (<768px)
 */
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINT_VALUES.md;
};

/**
 * Check if current viewport is tablet (client-side only)
 * @returns {boolean} True if viewport is tablet (768-1023px)
 */
export const isTablet = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINT_VALUES.md && window.innerWidth < BREAKPOINT_VALUES.lg;
};

/**
 * Check if current viewport is desktop (client-side only)
 * @returns {boolean} True if viewport is desktop (>=1024px)
 */
export const isDesktop = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINT_VALUES.lg;
};

/**
 * Get current breakpoint name (client-side only)
 * @returns {string} Current breakpoint name
 */
export const getCurrentBreakpoint = () => {
  if (typeof window === 'undefined') return 'md';

  const width = window.innerWidth;

  if (width < BREAKPOINT_VALUES.xs) return 'xs';
  if (width < BREAKPOINT_VALUES.sm) return 'sm';
  if (width < BREAKPOINT_VALUES.md) return 'md';
  if (width < BREAKPOINT_VALUES.lg) return 'lg';
  if (width < BREAKPOINT_VALUES.xl) return 'xl';
  return 'xxl';
};

/**
 * Responsive value helper - returns appropriate value based on breakpoint
 * @param {Object} values - Object with breakpoint keys and values
 * @param {string} currentBreakpoint - Current breakpoint name
 * @returns {*} Value for current breakpoint (falls back to smaller breakpoints)
 *
 * Usage:
 * const padding = getResponsiveValue({ xs: '8px', md: '16px', lg: '24px' }, 'md');
 * // Returns '16px'
 */
export const getResponsiveValue = (values, currentBreakpoint = getCurrentBreakpoint()) => {
  const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  // Find the value for current breakpoint or fall back to smaller breakpoints
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  // If no value found, return the first defined value
  return Object.values(values)[0];
};

export default {
  BREAKPOINT_VALUES,
  BREAKPOINTS,
  MEDIA_QUERIES,
  minWidth,
  maxWidth,
  between,
  isBreakpoint,
  isMobile,
  isTablet,
  isDesktop,
  getCurrentBreakpoint,
  getResponsiveValue,
};
