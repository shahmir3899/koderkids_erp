// ============================================
// CHART STATES - skeleton loader and empty state for finance charts
// ============================================
// Location: src/components/finance/ChartStates.js

import React from 'react';
import { useChartHeight } from '../../utils/chartTheme';

const PALETTES = {
  dark: {
    bar: 'rgba(255, 255, 255, 0.14)',
    shine: 'rgba(255, 255, 255, 0.28)',
    boxBg: 'rgba(255, 255, 255, 0.08)',
    boxBorder: 'rgba(255, 255, 255, 0.25)',
    title: '#FFFFFF',
    hint: 'rgba(255, 255, 255, 0.85)',
  },
  light: {
    bar: '#E5E7EB',
    shine: '#F3F4F6',
    boxBg: '#F9FAFB',
    boxBorder: '#D1D5DB',
    title: '#1F2937',
    hint: '#4B5563',
  },
};

const STYLE_ID = 'chart-skeleton-keyframes';
const ensureKeyframes = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = '@keyframes chartSkeletonPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }';
  document.head.appendChild(el);
};

// Heights of the placeholder bars, as a fraction of the chart area.
const BARS = [0.35, 0.55, 0.45, 0.7, 0.6, 0.85, 0.65, 0.9];

export const ChartSkeleton = ({ variant = 'dark', label = 'Loading chart' }) => {
  ensureKeyframes();
  const p = PALETTES[variant] || PALETTES.dark;
  const height = useChartHeight();

  return (
    <div
      role="status"
      aria-label={label}
      style={{
        height: `${height}px`,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.75rem',
        padding: '1.5rem 1rem 2rem',
        borderBottom: `2px solid ${p.bar}`,
        borderLeft: `2px solid ${p.bar}`,
        animation: 'chartSkeletonPulse 1.4s ease-in-out infinite',
      }}
    >
      {BARS.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h * 100}%`,
            borderRadius: '6px 6px 0 0',
            background: `linear-gradient(180deg, ${p.shine}, ${p.bar})`,
          }}
        />
      ))}
    </div>
  );
};

export const ChartEmptyState = ({
  variant = 'dark',
  title = 'No data for this selection',
  hint = 'Try a longer period or a different school.',
  actionLabel,
  onAction,
}) => {
  const p = PALETTES[variant] || PALETTES.dark;
  return (
    <div
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: p.boxBg,
        border: `2px dashed ${p.boxBorder}`,
        borderRadius: '12px',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} aria-hidden="true">📉</div>
      <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: p.title }}>{title}</p>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: p.hint }}>{hint}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: '#3B82F6',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
