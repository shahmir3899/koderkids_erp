// ============================================
// BOOK DECORATIONS - SVG/CSS decorative elements
// ============================================
// Mimics the KoderKids PDF visual style

import React from 'react';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
  BOOK_SHADOWS,
} from '../../utils/bookTheme';

// ─── Triangle Bunting ──────────────────────
// Row of colored triangles at top/bottom of pages
export const TriangleBunting = ({ flipped = false, style = {} }) => {
  const colors = BOOK_COLORS.bunting;
  const triangleCount = 20;
  const w = 100 / triangleCount;

  return (
    <svg
      viewBox={`0 0 100 ${flipped ? 6 : 6}`}
      preserveAspectRatio="none"
      style={{
        width: '100%',
        height: '24px',
        display: 'block',
        transform: flipped ? 'scaleY(-1)' : 'none',
        ...style,
      }}
    >
      {Array.from({ length: triangleCount }).map((_, i) => {
        const x = i * w;
        const color = colors[i % colors.length];
        return (
          <polygon
            key={i}
            points={`${x},0 ${x + w / 2},6 ${x + w},0`}
            fill={color}
          />
        );
      })}
      {/* Thin rope line across the top */}
      <line x1="0" y1="0.3" x2="100" y2="0.3" stroke="#94A3B8" strokeWidth="0.2" />
    </svg>
  );
};

// ─── Page Number ──────────────────────────
export const PageNumber = ({ number, style = {} }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      borderRadius: BOOK_RADIUS.full,
      border: `2px solid ${BOOK_COLORS.heading}`,
      color: BOOK_COLORS.heading,
      fontFamily: BOOK_FONTS.heading,
      fontSize: BOOK_FONT_SIZES.sm,
      margin: '0 auto',
      ...style,
    }}
  >
    {number}
  </div>
);

// ─── Step Badge ───────────────────────────
// Numbered circle badge for activity steps
export const StepBadge = ({ number, color, size = 36, style = {} }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: BOOK_RADIUS.full,
      background: color || BOOK_COLORS.stepBadges[(number - 1) % BOOK_COLORS.stepBadges.length],
      color: '#FFFFFF',
      fontFamily: BOOK_FONTS.heading,
      fontSize: size > 30 ? BOOK_FONT_SIZES.md : BOOK_FONT_SIZES.sm,
      fontWeight: 700,
      flexShrink: 0,
      boxShadow: BOOK_SHADOWS.stepBadge,
      ...style,
    }}
  >
    {number}
  </div>
);

// ─── Fun Fact Box ─────────────────────────
// Yellow callout box with pencil accent
export const FunFactBox = ({ children, title = 'Fun Fact:', style = {} }) => (
  <div
    style={{
      position: 'relative',
      background: BOOK_COLORS.funFact + '18',
      border: `2px solid ${BOOK_COLORS.funFact}`,
      borderRadius: BOOK_RADIUS.lg,
      padding: '1rem 1.25rem 1rem 3.25rem',
      margin: '1.25rem 0',
      fontFamily: BOOK_FONTS.body,
      fontSize: BOOK_FONT_SIZES.base,
      color: BOOK_COLORS.body,
      lineHeight: 1.6,
      ...style,
    }}
  >
    {/* Pencil icon area */}
    <div
      style={{
        position: 'absolute',
        left: '0.75rem',
        top: '0.85rem',
        fontSize: '1.5rem',
      }}
    >
      ✏️
    </div>
    {title && (
      <strong
        style={{
          display: 'block',
          fontFamily: BOOK_FONTS.handwritten,
          fontSize: BOOK_FONT_SIZES.lg,
          color: '#92400E',
          marginBottom: '0.25rem',
        }}
      >
        {title}
      </strong>
    )}
    {children}
  </div>
);

// ─── Tip Box ──────────────────────────────
// "Key Tip" / "Parent Tip" styled callout
export const TipBox = ({ children, title = 'Key Tip:', variant = 'key', style = {} }) => {
  const configs = {
    key: { bg: '#EFF6FF', border: '#3B82F6', icon: '💡', titleColor: '#1E40AF' },
    parent: { bg: '#F0FDF4', border: '#10B981', icon: '👨‍👩‍👧', titleColor: '#065F46' },
    warning: { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️', titleColor: '#92400E' },
    diy: { bg: '#FDF4FF', border: '#A855F7', icon: '🛠️', titleColor: '#6B21A8' },
  };
  const cfg = configs[variant] || configs.key;

  return (
    <div
      style={{
        background: cfg.bg,
        borderLeft: `4px solid ${cfg.border}`,
        borderRadius: `0 ${BOOK_RADIUS.md} ${BOOK_RADIUS.md} 0`,
        padding: '0.875rem 1.25rem',
        margin: '1rem 0',
        fontFamily: BOOK_FONTS.body,
        fontSize: BOOK_FONT_SIZES.base,
        color: BOOK_COLORS.body,
        lineHeight: 1.6,
        ...style,
      }}
    >
      <strong style={{ color: cfg.titleColor, marginRight: '0.5rem' }}>
        {cfg.icon} {title}
      </strong>
      {children}
    </div>
  );
};

// ─── Chapter Header ───────────────────────
// Large decorative chapter title
export const ChapterHeader = ({ code, title, style = {} }) => (
  <div
    style={{
      textAlign: 'center',
      padding: '2rem 1rem 1.5rem',
      ...style,
    }}
  >
    {code && (
      <div
        style={{
          fontFamily: BOOK_FONTS.body,
          fontSize: BOOK_FONT_SIZES.lg,
          color: BOOK_COLORS.headingAlt,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
        }}
      >
        Chapter {code}
      </div>
    )}
    <h1
      style={{
        fontFamily: BOOK_FONTS.heading,
        fontSize: BOOK_FONT_SIZES['3xl'],
        color: BOOK_COLORS.heading,
        margin: '0 0 0.75rem',
        lineHeight: 1.2,
      }}
    >
      {title}
    </h1>
    <div
      style={{
        width: '80px',
        height: '4px',
        background: `linear-gradient(90deg, ${BOOK_COLORS.classActivity}, ${BOOK_COLORS.heading})`,
        borderRadius: BOOK_RADIUS.full,
        margin: '0 auto',
      }}
    />
  </div>
);

// ─── Section Heading ──────────────────────
// Topic/lesson heading (e.g., "1.1 Understanding Pixel Art Basics")
export const SectionHeading = ({ code, title, style = {} }) => (
  <h2
    style={{
      fontFamily: BOOK_FONTS.heading,
      fontSize: BOOK_FONT_SIZES['2xl'],
      color: BOOK_COLORS.heading,
      margin: '0 0 0.75rem',
      lineHeight: 1.3,
      borderBottom: `3px solid ${BOOK_COLORS.headingAlt}`,
      paddingBottom: '0.5rem',
      ...style,
    }}
  >
    {code && <span style={{ marginRight: '0.5rem' }}>{code}</span>}
    {title}
  </h2>
);

// ─── Activity Card Wrapper ────────────────
// Colored border card for activity blocks
export const ActivityCard = ({ type, title, icon, children, style = {}, dataBlockIndex }) => {
  const typeConfigs = {
    class_activity: { color: BOOK_COLORS.classActivity, bg: '#EFF6FF', label: 'Class Activity' },
    class: { color: BOOK_COLORS.classActivity, bg: '#EFF6FF', label: 'Class Activity' },
    home_activity: { color: BOOK_COLORS.homeActivity, bg: '#ECFDF5', label: 'Home Activity' },
    home: { color: BOOK_COLORS.homeActivity, bg: '#ECFDF5', label: 'Home Activity' },
    challenge: { color: BOOK_COLORS.challenge, bg: '#FEF2F2', label: 'Challenge' },
    note: { color: BOOK_COLORS.note, bg: '#FFFBEB', label: 'Fun Fact' },
  };

  const normalized = type?.toLowerCase();
  const cfg = typeConfigs[normalized] || typeConfigs.note;
  const displayTitle = title || cfg.label;

  return (
    <div
      data-activity-block={dataBlockIndex != null ? dataBlockIndex : undefined}
      style={{
        border: `2px solid ${cfg.color}30`,
        borderRadius: BOOK_RADIUS.xl,
        overflow: 'hidden',
        margin: '1.5rem 0',
        background: '#FFFFFF',
        boxShadow: BOOK_SHADOWS.card,
        ...style,
      }}
    >
      {/* Header strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.25rem',
          background: cfg.bg,
          borderBottom: `2px solid ${cfg.color}25`,
        }}
      >
        {icon && (
          <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        )}
        <h3
          style={{
            margin: 0,
            fontFamily: BOOK_FONTS.heading,
            fontSize: BOOK_FONT_SIZES.lg,
            color: cfg.color,
          }}
        >
          {displayTitle}
        </h3>
      </div>
      {/* Content */}
      <div style={{ padding: '1.25rem' }}>
        {children}
      </div>
    </div>
  );
};

// ─── Challenge Strip ──────────────────────
// Highlighted challenge text at bottom of activity
export const ChallengeStrip = ({ children, style = {} }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      background: '#FEF2F2',
      border: `1px solid ${BOOK_COLORS.challenge}40`,
      borderRadius: BOOK_RADIUS.md,
      padding: '0.875rem 1rem',
      marginTop: '1rem',
      fontFamily: BOOK_FONTS.body,
      fontSize: BOOK_FONT_SIZES.base,
      color: BOOK_COLORS.body,
      lineHeight: 1.6,
      ...style,
    }}
  >
    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🌟</span>
    <div>
      <strong style={{ color: BOOK_COLORS.challenge, marginRight: '0.35rem' }}>Challenge:</strong>
      {children}
    </div>
  </div>
);
