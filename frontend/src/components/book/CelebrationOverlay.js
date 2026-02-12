// ============================================
// CELEBRATION OVERLAY - Confetti on completion
// ============================================
// Shows a brief celebration animation when a topic,
// chapter, or course is completed. Uses canvas-confetti.

import React, { useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
} from '../../utils/bookTheme';

const CELEBRATION_TYPES = {
  topic: {
    message: 'Great Job!',
    emoji: '⭐',
    duration: 2000,
    confettiCount: 60,
  },
  chapter: {
    message: 'Chapter Complete!',
    emoji: '🎉',
    duration: 2500,
    confettiCount: 120,
  },
  course: {
    message: 'Course Finished!',
    emoji: '🏆',
    duration: 3500,
    confettiCount: 200,
  },
};

const CelebrationOverlay = ({
  type = 'topic',    // 'topic' | 'chapter' | 'course'
  onDone,            // Callback when celebration ends
  visible = false,
}) => {
  const timerRef = useRef(null);
  const config = CELEBRATION_TYPES[type] || CELEBRATION_TYPES.topic;

  const fireConfetti = useCallback(() => {
    const count = config.confettiCount;
    const colors = [
      BOOK_COLORS.heading,
      BOOK_COLORS.classActivity,
      BOOK_COLORS.homeActivity,
      '#FBBF24',
      '#EC4899',
      '#F97316',
    ];

    // Center burst
    confetti({
      particleCount: Math.floor(count * 0.5),
      spread: 70,
      origin: { y: 0.6 },
      colors,
      disableForReducedMotion: true,
    });

    // Side bursts for chapter/course
    if (type !== 'topic') {
      setTimeout(() => {
        confetti({
          particleCount: Math.floor(count * 0.25),
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors,
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: Math.floor(count * 0.25),
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors,
          disableForReducedMotion: true,
        });
      }, 300);
    }
  }, [type, config.confettiCount]);

  useEffect(() => {
    if (!visible) return;

    fireConfetti();

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      onDone?.();
    }, config.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, fireConfetti, config.duration, onDone]);

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onDone}>
      <div style={styles.card}>
        <span style={styles.emoji}>{config.emoji}</span>
        <h2 style={styles.message}>{config.message}</h2>
        <p style={styles.sub}>
          {type === 'course'
            ? 'You completed the entire course!'
            : 'Keep going, you\'re doing amazing!'}
        </p>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    cursor: 'pointer',
    animation: 'fadeIn 0.2s ease',
  },

  card: {
    background: '#FFFFFF',
    borderRadius: BOOK_RADIUS.xl,
    padding: '2.5rem 3rem',
    textAlign: 'center',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
    maxWidth: '340px',
    animation: 'bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  emoji: {
    fontSize: '3.5rem',
    display: 'block',
    marginBottom: '0.75rem',
  },

  message: {
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES['2xl'],
    color: BOOK_COLORS.heading,
    margin: '0 0 0.5rem',
  },

  sub: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    color: BOOK_COLORS.muted,
    margin: 0,
  },
};

export default CelebrationOverlay;
