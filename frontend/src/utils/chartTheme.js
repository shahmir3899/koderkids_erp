// ============================================
// CHART THEME - shared styling for finance charts
// ============================================
// Location: src/utils/chartTheme.js

import { useEffect, useState } from 'react';

/**
 * Two variants: 'dark' for charts on the glassmorphic gradient background,
 * 'light' for charts on white cards.
 */
const THEMES = {
  dark: {
    grid: 'rgba(255, 255, 255, 0.22)',
    axisLine: 'rgba(255, 255, 255, 0.55)',
    tickFill: 'rgba(255, 255, 255, 0.92)',
    zeroLine: 'rgba(255, 255, 255, 0.7)',
    legendText: 'rgba(255, 255, 255, 0.92)',
  },
  light: {
    grid: '#D1D5DB',
    axisLine: '#6B7280',
    tickFill: '#374151',
    zeroLine: '#6B7280',
    legendText: '#374151',
  },
};

export const SERIES_COLORS = {
  income: '#34D399',
  expense: '#F87171',
  net: '#60A5FA',
  balance: '#3B82F6',
};

export const LINE_WIDTH = 3;
export const AREA_GRADIENT_TOP_OPACITY = 0.55;

export const getChartTheme = (variant = 'dark') => THEMES[variant] || THEMES.dark;

/** Props to spread onto <XAxis /> and <YAxis /> */
export const getAxisProps = (variant = 'dark') => {
  const t = getChartTheme(variant);
  return {
    stroke: t.axisLine,
    tick: { fill: t.tickFill, fontSize: 13, fontWeight: 500 },
    tickLine: { stroke: t.axisLine },
  };
};

/** Props to spread onto <CartesianGrid /> */
export const getGridProps = (variant = 'dark') => ({
  strokeDasharray: '4 4',
  stroke: getChartTheme(variant).grid,
});

/** Props for <Line /> series: thicker stroke, visible dots, bigger hover dot. */
export const getLineProps = (color, width = LINE_WIDTH) => ({
  type: 'monotone',
  stroke: color,
  strokeWidth: width,
  dot: { r: 4, fill: color, stroke: '#fff', strokeWidth: 1.5 },
  activeDot: { r: 7, fill: color, stroke: '#fff', strokeWidth: 2 },
});

/**
 * Compact PKR formatter for axis ticks: 500, 12k, 1.5M. Keeps sign for negatives.
 */
export const formatCompact = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${+(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${+(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${+(abs / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}k`;
  return `${sign}${abs}`;
};

/** Full-precision PKR for tooltips. */
export const formatPKR = (value) => `PKR ${Math.round(Number(value) || 0).toLocaleString()}`;

/** Chart height by viewport: 260 on phones, 320 on tablets, 380 on desktop. */
export const useChartHeight = () => {
  const compute = () => {
    if (typeof window === 'undefined') return 380;
    const w = window.innerWidth;
    if (w < 640) return 260;
    if (w < 1024) return 320;
    return 380;
  };
  const [height, setHeight] = useState(compute);
  useEffect(() => {
    const onResize = () => setHeight(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return height;
};

/**
 * Sort category rows by total (desc) and merge slices below `minPct` percent
 * into one "Other" slice so pie labels stay readable. Expects rows shaped
 * { category, total, percentage }.
 */
export const groupSmallSlices = (rows, minPct = 4) => {
  const sorted = [...rows].sort((a, b) => (b.total || 0) - (a.total || 0));
  const sum = sorted.reduce((s, r) => s + (r.total || 0), 0);
  if (sum <= 0) return sorted;
  const big = [];
  let otherTotal = 0;
  let otherCount = 0;
  sorted.forEach((r) => {
    if (((r.total || 0) / sum) * 100 < minPct) {
      otherTotal += r.total || 0;
      otherCount += 1;
    } else {
      big.push(r);
    }
  });
  // A lone small slice is not worth hiding behind "Other".
  if (otherCount <= 1) return sorted;
  return [
    ...big,
    { category: `Other (${otherCount})`, total: otherTotal, percentage: (otherTotal / sum) * 100 },
  ];
};
