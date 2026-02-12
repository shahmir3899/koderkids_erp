// ============================================
// IMAGE ZOOM - Lightbox overlay for images
// ============================================
// Full-screen image viewer with pinch-to-zoom on mobile,
// click-outside to close, and smooth transitions.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSearchPlus, faSearchMinus } from '@fortawesome/free-solid-svg-icons';
import { BOOK_RADIUS } from '../../utils/bookTheme';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const ImageZoom = ({ src, alt = 'Zoomed image', onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef(null);
  const imgRef = useRef(null);

  // Reset on new image
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  // Keyboard: Escape to close, +/- to zoom
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(s + 0.5, MAX_SCALE));
      if (e.key === '-') {
        setScale((s) => {
          const next = Math.max(s - 0.5, MIN_SCALE);
          if (next === MIN_SCALE) setPosition({ x: 0, y: 0 });
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale((prev) => {
      const next = prev + (e.deltaY > 0 ? -0.3 : 0.3);
      const clamped = Math.min(Math.max(next, MIN_SCALE), MAX_SCALE);
      if (clamped === MIN_SCALE) setPosition({ x: 0, y: 0 });
      return clamped;
    });
  }, []);

  // Mouse drag
  const handleMouseDown = useCallback((e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    lastPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [scale, position]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - lastPos.current.x,
      y: e.clientY - lastPos.current.y,
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Touch pinch-to-zoom
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastTouchDist.current !== null) {
        const delta = (dist - lastTouchDist.current) * 0.01;
        setScale((prev) => {
          const next = Math.min(Math.max(prev + delta, MIN_SCALE), MAX_SCALE);
          if (next === MIN_SCALE) setPosition({ x: 0, y: 0 });
          return next;
        });
      }
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      // Single touch drag when zoomed
      setPosition({
        x: e.touches[0].clientX - lastPos.current.x,
        y: e.touches[0].clientY - lastPos.current.y,
      });
    }
  }, [scale]);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1 && scale > 1) {
      lastPos.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
    lastTouchDist.current = null;
  }, [scale, position]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
  }, []);

  // Double-tap to toggle zoom
  const lastTap = useRef(0);
  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  if (!src) return null;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button style={styles.closeBtn} onClick={onClose}>
        <FontAwesomeIcon icon={faTimes} />
      </button>

      {/* Zoom controls */}
      <div style={styles.controls}>
        <button
          style={styles.controlBtn}
          onClick={() => setScale((s) => Math.min(s + 0.5, MAX_SCALE))}
        >
          <FontAwesomeIcon icon={faSearchPlus} />
        </button>
        <span style={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button
          style={styles.controlBtn}
          onClick={() => {
            setScale((s) => {
              const next = Math.max(s - 0.5, MIN_SCALE);
              if (next === MIN_SCALE) setPosition({ x: 0, y: 0 });
              return next;
            });
          }}
        >
          <FontAwesomeIcon icon={faSearchMinus} />
        </button>
      </div>

      {/* Image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        style={{
          ...styles.image,
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        draggable={false}
      />
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
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '1rem',
    touchAction: 'none',
  },

  closeBtn: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.125rem',
    zIndex: 2,
    backdropFilter: 'blur(4px)',
  },

  controls: {
    position: 'absolute',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(0,0,0,0.6)',
    borderRadius: BOOK_RADIUS.full,
    padding: '0.375rem 1rem',
    backdropFilter: 'blur(4px)',
    zIndex: 2,
  },

  controlBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
  },

  zoomLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.75rem',
    fontWeight: 600,
    minWidth: '40px',
    textAlign: 'center',
  },

  image: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '4px',
    transition: 'transform 0.1s ease',
    userSelect: 'none',
    WebkitUserDrag: 'none',
  },
};

export default ImageZoom;
