// ============================================
// READING TIMER - Animated reading time progress
// ============================================
// Shows an animated clock with progress bar indicating
// how much of the required reading time has been met.
// Syncs with heartbeat data from LMSContext.

import React, { useState, useEffect } from 'react';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
} from '../../utils/bookTheme';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Animated SVG clock that ticks every second
 */
const AnimatedClock = ({ progress, isComplete, size = 20 }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isComplete]);

  const r = size / 2;
  const cx = r;
  const cy = r;
  const handLen = r * 0.6;
  // Second hand rotates based on tick
  const secondAngle = (tick % 60) * 6;
  // Minute hand based on overall progress
  const minuteAngle = progress * 3.6;

  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
  const secX = cx + handLen * Math.cos(toRad(secondAngle));
  const secY = cy + handLen * Math.sin(toRad(secondAngle));
  const minX = cx + (handLen * 0.7) * Math.cos(toRad(minuteAngle));
  const minY = cy + (handLen * 0.7) * Math.sin(toRad(minuteAngle));

  // Progress arc (circular progress ring)
  const arcR = r - 1.5;
  const circumference = 2 * Math.PI * arcR;
  const arcOffset = circumference * (1 - progress / 100);

  const ringColor = isComplete ? BOOK_COLORS.success : BOOK_COLORS.reading;
  const handColor = isComplete ? BOOK_COLORS.success : BOOK_COLORS.classActivity;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={arcR} fill="none" stroke={BOOK_COLORS.borderLight} strokeWidth="1.5" />
      {/* Progress arc */}
      <circle
        cx={cx} cy={cy} r={arcR}
        fill="none"
        stroke={ringColor}
        strokeWidth="1.5"
        strokeDasharray={circumference}
        strokeDashoffset={arcOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="1.2" fill={handColor} />
      {isComplete ? (
        /* Checkmark when complete */
        <path
          d={`M${r * 0.35} ${r} L${r * 0.75} ${r * 1.3} L${r * 1.55} ${r * 0.55}`}
          stroke={BOOK_COLORS.success}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          {/* Minute hand (short, thick) */}
          <line x1={cx} y1={cy} x2={minX} y2={minY}
            stroke={handColor} strokeWidth="1.5" strokeLinecap="round" />
          {/* Second hand (long, thin) */}
          <line x1={cx} y1={cy} x2={secX} y2={secY}
            stroke={BOOK_COLORS.reading} strokeWidth="0.8" strokeLinecap="round"
            style={{ transition: 'none' }}
          />
        </>
      )}
    </svg>
  );
};

/**
 * Calculate dynamic reading time based on word count
 * ~150 words/min for kids, minimum 60s, maximum 600s (10 min)
 */
export const calculateReadingTime = (topicContent) => {
  if (!topicContent) return 60;

  let text = '';

  // Main HTML content → strip tags and count words
  if (topicContent.content) {
    text += topicContent.content.replace(/<[^>]*>/g, ' ');
  }

  // Activity blocks text
  const blocks = Array.isArray(topicContent.activity_blocks)
    ? topicContent.activity_blocks
    : [];
  for (const block of blocks) {
    if (block.introduction) text += ' ' + block.introduction;
    if (block.content) text += ' ' + block.content.replace(/<[^>]*>/g, ' ');
    if (block.challenge) text += ' ' + block.challenge;
    if (Array.isArray(block.steps)) {
      for (const step of block.steps) {
        if (step.title) text += ' ' + step.title;
        if (step.content) text += ' ' + step.content;
      }
    }
  }

  // Count words (split on whitespace, filter empties)
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  // ~150 words per minute for kids (Class 1-5)
  const minutes = wordCount / 150;
  const seconds = Math.round(minutes * 60);

  // Clamp: minimum 60s (1 min), maximum 600s (10 min)
  return Math.max(60, Math.min(seconds, 600));
};

const ReadingTimer = ({
  readingTime = 0,         // Accumulated seconds from heartbeat
  requiredTime = 60,       // Dynamic, calculated from content
}) => {
  const progress = Math.min((readingTime / requiredTime) * 100, 100);
  const isComplete = readingTime >= requiredTime;

  return (
    <div style={styles.container}>
      {/* Progress bar */}
      <div style={styles.track}>
        <div
          style={{
            ...styles.fill,
            width: `${progress}%`,
            background: isComplete
              ? BOOK_COLORS.success
              : `linear-gradient(90deg, ${BOOK_COLORS.classActivity}, ${BOOK_COLORS.reading})`,
          }}
        />
      </div>

      {/* Label with animated clock */}
      <div style={styles.label}>
        <AnimatedClock progress={progress} isComplete={isComplete} size={18} />
        <span style={{
          ...styles.text,
          color: isComplete ? BOOK_COLORS.success : BOOK_COLORS.muted,
        }}>
          {isComplete
            ? 'Reading time complete!'
            : `Reading: ${formatTime(readingTime)} / ${formatTime(requiredTime)}`
          }
        </span>
        {!isComplete && (
          <span style={styles.badge}>
            {Math.ceil((requiredTime - readingTime) / 60)} min left
          </span>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    marginBottom: '1rem',
  },

  track: {
    height: '3px',
    background: BOOK_COLORS.borderLight,
    borderRadius: BOOK_RADIUS.full,
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    borderRadius: BOOK_RADIUS.full,
    transition: 'width 0.6s ease',
  },

  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },

  text: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.xs,
    fontWeight: 600,
  },

  badge: {
    fontFamily: BOOK_FONTS.body,
    fontSize: '0.625rem',
    fontWeight: 600,
    color: BOOK_COLORS.reading,
    background: `${BOOK_COLORS.reading}12`,
    padding: '1px 6px',
    borderRadius: BOOK_RADIUS.full,
  },
};

export default ReadingTimer;
