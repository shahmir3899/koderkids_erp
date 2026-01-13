import React, { useState, useEffect } from 'react';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../utils/designConstants';

/**
 * ERP Loader Component
 * Based on erp-loader.html design
 * Shows animated logo with "LOADING ERP..." text
 */
function ERPLoader({ isLoading, loadingMessage = 'LOADING ERP', onComplete, delay = 2000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      // Small delay to ensure smooth appearance
      setTimeout(() => setIsVisible(true), 10);
    } else {
      // Fade out when loading stops
      setIsVisible(false);
      const hideTimer = setTimeout(() => {
        setShouldRender(false);
        if (onComplete) {
          onComplete();
        }
      }, 300); // Wait for fade out animation

      return () => clearTimeout(hideTimer);
    }
  }, [isLoading, onComplete]);

  if (!shouldRender) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100vh',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Segoe UI", Arial, sans-serif',
    zIndex: 9999,
    opacity: isVisible ? 1 : 0,
    transition: `opacity ${TRANSITIONS.normal} ease-out`,
  };

  const contentContainerStyle = {
    textAlign: 'center',
    position: 'relative',
  };

  const rippleBaseStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
  };

  const rippleStyle1 = {
    ...rippleBaseStyle,
    border: `2px solid rgba(177, 102, 204, 0.2)`,
    animation: 'ripple 2s ease-out infinite',
  };

  const rippleStyle2 = {
    ...rippleBaseStyle,
    border: `2px solid rgba(177, 102, 204, 0.15)`,
    animation: 'ripple 2s ease-out infinite 0.5s',
  };

  const rippleStyle3 = {
    ...rippleBaseStyle,
    border: `2px solid rgba(177, 102, 204, 0.1)`,
    animation: 'ripple 2s ease-out infinite 1s',
  };

  const gradientRingStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '280px',
    height: '280px',
    borderRadius: '50%',
    background: `conic-gradient(from 0deg, ${COLORS.accent.purple}, ${COLORS.accent.blue}, ${COLORS.accent.purple})`,
    opacity: 0.3,
    animation: 'rotate 3s linear infinite',
    filter: 'blur(8px)',
  };

  const logoContainerStyle = {
    width: '220px',
    position: 'relative',
    zIndex: 10,
    animation: 'pulse 2.6s ease-in-out infinite',
  };

  const logoStyle = {
    width: '100%',
    height: 'auto',
    display: 'block',
    backgroundColor: 'transparent',
    filter: `drop-shadow(0 4px 12px rgba(177, 102, 204, 0.3))`,
  };

  const progressBarContainerStyle = {
    width: '220px',
    height: '4px',
    backgroundColor: 'rgba(177, 102, 204, 0.1)',
    borderRadius: BORDER_RADIUS.xs,
    margin: `${SPACING.lg} auto 0`,
    overflow: 'hidden',
    position: 'relative',
  };

  const progressBarStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '40%',
    background: `linear-gradient(90deg, ${COLORS.accent.purple}, ${COLORS.accent.blue}, ${COLORS.accent.purple})`,
    backgroundSize: '200% 100%',
    borderRadius: BORDER_RADIUS.xs,
    animation: 'progress 1.5s ease-in-out infinite, shimmer 2s linear infinite',
  };

  const loadingTextStyle = {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.sm,
    letterSpacing: '3px',
    color: COLORS.text.secondary,
    fontWeight: FONT_WEIGHTS.medium,
    position: 'relative',
    zIndex: 10,
  };

  const getParticleStyle = (index) => ({
    position: 'absolute',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: index % 2 === 0 ? COLORS.accent.purple : COLORS.accent.blue,
    opacity: 0.6,
    top: `${20 + index * 15}%`,
    left: `${15 + (index % 3) * 30}%`,
    animation: `float ${2 + index * 0.3}s ease-in-out infinite`,
    animationDelay: `${index * 0.2}s`,
  });

  return (
    <div style={overlayStyle}>
      <div style={contentContainerStyle}>
        {/* Animated Background Circles */}
        <div style={rippleStyle1} />
        <div style={rippleStyle2} />
        <div style={rippleStyle3} />

        {/* Rotating Gradient Ring */}
        <div style={gradientRingStyle} />

        {/* Logo Container with Pulse Animation */}
        <div style={logoContainerStyle}>
          <img
            src="/logo.png"
            alt="Koder Kids Logo"
            style={logoStyle}
          />
        </div>

        {/* Modern Progress Bar */}
        <div style={progressBarContainerStyle}>
          <div style={progressBarStyle} />
        </div>

        {/* Loading Text with Animated Dots */}
        <div style={loadingTextStyle}>
          {loadingMessage}
          <span style={{ animation: 'dots 1.5s infinite' }}>.</span>
          <span style={{ animation: 'dots 1.5s infinite', animationDelay: '0.2s' }}>.</span>
          <span style={{ animation: 'dots 1.5s infinite', animationDelay: '0.4s' }}>.</span>
        </div>

        {/* Floating Particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={getParticleStyle(i)} />
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.06);
            opacity: 0.9;
          }
        }

        @keyframes dots {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0;
          }
        }

        @keyframes rotate {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes progress {
          0% {
            left: -40%;
          }
          50% {
            left: 100%;
          }
          100% {
            left: -40%;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default ERPLoader;
