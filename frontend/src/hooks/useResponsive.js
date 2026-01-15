// ============================================
// USE RESPONSIVE HOOK
// ============================================
// Location: src/hooks/useResponsive.js
// Purpose: React hook for responsive breakpoint detection

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BREAKPOINT_VALUES } from '../utils/designConstants';

/**
 * Custom hook for responsive breakpoint detection
 * Provides real-time viewport size information for conditional rendering
 *
 * @returns {Object} Responsive state object
 *
 * Usage:
 * const { isMobile, isTablet, isDesktop, breakpoint, width } = useResponsive();
 *
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 */
export const useResponsive = () => {
  // Initialize with SSR-safe defaults
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  // Debounced resize handler
  const handleResize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial size
    handleResize();

    // Debounce resize events for performance
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  // Memoized breakpoint calculations
  const breakpointInfo = useMemo(() => {
    const { width } = windowSize;

    // Device type detection
    const isMobile = width < BREAKPOINT_VALUES.md;
    const isTablet = width >= BREAKPOINT_VALUES.md && width < BREAKPOINT_VALUES.lg;
    const isDesktop = width >= BREAKPOINT_VALUES.lg;

    // More specific breakpoints
    const isSmallPhone = width < BREAKPOINT_VALUES.sm;
    const isLargePhone = width >= BREAKPOINT_VALUES.sm && width < BREAKPOINT_VALUES.md;
    const isSmallDesktop = width >= BREAKPOINT_VALUES.lg && width < BREAKPOINT_VALUES.xl;
    const isLargeDesktop = width >= BREAKPOINT_VALUES.xl;

    // Current breakpoint name
    let breakpoint = 'xxl';
    if (width < BREAKPOINT_VALUES.sm) breakpoint = 'xs';
    else if (width < BREAKPOINT_VALUES.md) breakpoint = 'sm';
    else if (width < BREAKPOINT_VALUES.lg) breakpoint = 'md';
    else if (width < BREAKPOINT_VALUES.xl) breakpoint = 'lg';
    else if (width < BREAKPOINT_VALUES.xxl) breakpoint = 'xl';

    // Orientation
    const isPortrait = windowSize.height > windowSize.width;
    const isLandscape = windowSize.width > windowSize.height;

    return {
      // Window dimensions
      width: windowSize.width,
      height: windowSize.height,

      // Primary device types
      isMobile,
      isTablet,
      isDesktop,

      // Specific breakpoints
      isSmallPhone,
      isLargePhone,
      isSmallDesktop,
      isLargeDesktop,

      // Current breakpoint name
      breakpoint,

      // Orientation
      isPortrait,
      isLandscape,

      // Utility functions
      isAbove: (bp) => width >= BREAKPOINT_VALUES[bp],
      isBelow: (bp) => width < BREAKPOINT_VALUES[bp],
      isBetween: (minBp, maxBp) =>
        width >= BREAKPOINT_VALUES[minBp] && width < BREAKPOINT_VALUES[maxBp],
    };
  }, [windowSize]);

  return breakpointInfo;
};

/**
 * Hook that returns a single boolean for a specific breakpoint query
 * More efficient when you only need one breakpoint check
 *
 * @param {string} query - Breakpoint query ('mobile', 'tablet', 'desktop', or custom)
 * @returns {boolean}
 *
 * Usage:
 * const isMobile = useBreakpoint('mobile');
 */
export const useBreakpoint = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mediaQuery;

    switch (query) {
      case 'mobile':
        mediaQuery = `(max-width: ${BREAKPOINT_VALUES.md - 1}px)`;
        break;
      case 'tablet':
        mediaQuery = `(min-width: ${BREAKPOINT_VALUES.md}px) and (max-width: ${BREAKPOINT_VALUES.lg - 1}px)`;
        break;
      case 'desktop':
        mediaQuery = `(min-width: ${BREAKPOINT_VALUES.lg}px)`;
        break;
      case 'touch':
        mediaQuery = '(hover: none) and (pointer: coarse)';
        break;
      default:
        // Allow custom media queries
        mediaQuery = query;
    }

    const mql = window.matchMedia(mediaQuery);
    setMatches(mql.matches);

    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);

    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

/**
 * Hook that returns responsive value based on current breakpoint
 *
 * @param {Object} values - Object with breakpoint keys and values
 * @returns {*} Value for current breakpoint
 *
 * Usage:
 * const columns = useResponsiveValue({ mobile: 1, tablet: 2, desktop: 4 });
 */
export const useResponsiveValue = (values) => {
  const { isMobile, isTablet } = useResponsive();

  return useMemo(() => {
    if (isMobile && values.mobile !== undefined) return values.mobile;
    if (isTablet && values.tablet !== undefined) return values.tablet;
    return values.desktop ?? values.tablet ?? values.mobile;
  }, [isMobile, isTablet, values]);
};

/**
 * Hook for detecting touch device
 * @returns {boolean}
 */
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches
      );
    };

    checkTouch();
  }, []);

  return isTouch;
};

export default useResponsive;
