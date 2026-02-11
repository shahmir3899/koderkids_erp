import React, { useState, useRef, useCallback } from 'react';
import { SHADOWS, TRANSITIONS } from '../../../utils/designConstants';
import { useResponsive } from '../../../hooks/useResponsive';

/**
 * AnimatedCard - Pure wrapper component that adds interactive hover effects
 *
 * Features:
 * - 3D tilt effect following mouse position
 * - Lift and glow on hover
 * - Smooth transitions
 * - Does NOT override child styling - pure animation wrapper
 *
 * Usage: Wrap any card component to add hover animations
 * <AnimatedCard><YourCard /></AnimatedCard>
 */
const AnimatedCard = ({ children, disabled = false, className = '' }) => {
  const { isMobile } = useResponsive();
  const [isHovered, setIsHovered] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({});
  const cardRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (disabled || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate tilt angles (max 6 degrees for subtle effect)
    const tiltX = ((y - centerY) / centerY) * -6;
    const tiltY = ((x - centerX) / centerX) * 6;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(8px) scale(1.02)`,
    });
  }, [disabled]);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    setIsHovered(true);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTiltStyle({});
  }, []);

  const wrapperStyle = {
    transition: `all ${TRANSITIONS.normal} ease-out, transform 0.15s ease-out`,
    transformStyle: 'preserve-3d',
    willChange: 'transform',
    ...(isHovered && !disabled ? {
      filter: 'brightness(1.05)',
      boxShadow: `${SHADOWS.xl}, 0 0 40px rgba(139, 92, 246, 0.2)`,
      ...tiltStyle,
    } : {}),
  };

  return (
    <div
      ref={cardRef}
      className={className}
      style={wrapperStyle}
      onMouseEnter={isMobile ? undefined : handleMouseEnter}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
      onMouseMove={isMobile ? undefined : handleMouseMove}
    >
      {children}
    </div>
  );
};

export default AnimatedCard;
