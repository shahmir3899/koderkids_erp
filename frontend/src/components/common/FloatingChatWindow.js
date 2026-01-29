// ============================================
// FLOATING CHAT WINDOW - Shared Base Component
// Reusable floating window with AI agent styling
// Location: frontend/src/components/common/FloatingChatWindow.js
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    FONT_SIZES,
    FONT_WEIGHTS,
    SHADOWS,
    TRANSITIONS,
} from '../../utils/designConstants';

// ============================================
// MAIN COMPONENT
// ============================================
const FloatingChatWindow = ({
    // Content
    children,
    title = 'AI Assistant',
    subtitle = 'How can I help you?',
    icon = '🤖',

    // Customization
    fabPosition = { bottom: '24px', right: '24px' },
    windowSize = { width: '380px', height: '520px' },
    fabGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    windowGradient = 'linear-gradient(180deg, rgba(30, 27, 75, 0.98) 0%, rgba(15, 12, 41, 0.98) 100%)',
    borderColor = 'rgba(139, 92, 246, 0.3)',
    headerGradient = 'linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(102, 126, 234, 0.15) 100%)',

    // Badge
    showBadge = true,
    badgeText = '',
    badgeColor = '#4ADE80',

    // State control (optional - for external control)
    isOpenExternal,
    onOpenChange,

    // Z-index
    zIndex = 1000,
}) => {
    // Internal state (used when not externally controlled)
    const [isOpenInternal, setIsOpenInternal] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: null, y: null });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);

    // Determine if externally controlled
    const isControlled = isOpenExternal !== undefined;
    const isOpen = isControlled ? isOpenExternal : isOpenInternal;
    const setIsOpen = isControlled ? onOpenChange : setIsOpenInternal;

    const windowRef = useRef(null);
    const headerRef = useRef(null);

    // Animation on open
    useEffect(() => {
        if (isOpen && !isMinimized) {
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [isOpen, isMinimized]);

    // Initialize position on first open
    useEffect(() => {
        if (isOpen && position.x === null) {
            const width = parseInt(windowSize.width) || 380;
            const height = parseInt(windowSize.height) || 520;
            setPosition({
                x: window.innerWidth - width - 24,
                y: window.innerHeight - height - 100
            });
        }
    }, [isOpen, position.x, windowSize]);

    // Handle drag start
    const handleDragStart = useCallback((e) => {
        if (e.target !== headerRef.current && !headerRef.current?.contains(e.target)) {
            return;
        }
        // Don't start drag on button clicks
        if (e.target.tagName === 'BUTTON') return;

        e.preventDefault();
        setIsDragging(true);

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        setDragOffset({
            x: clientX - position.x,
            y: clientY - position.y
        });
    }, [position]);

    // Handle drag move
    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;

        e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const width = parseInt(windowSize.width) || 380;
        const newX = Math.max(0, Math.min(window.innerWidth - width, clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, clientY - dragOffset.y));

        setPosition({ x: newX, y: newY });
    }, [isDragging, dragOffset, windowSize]);

    // Handle drag end
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add/remove event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove);
            window.addEventListener('touchend', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Toggle open/close
    const toggleOpen = () => {
        if (isOpen && isMinimized) {
            setIsMinimized(false);
        } else {
            setIsOpen(!isOpen);
            setIsMinimized(false);
        }
    };

    // Minimize window
    const handleMinimize = () => {
        setIsMinimized(true);
    };

    // Close window
    const handleClose = () => {
        setIsOpen(false);
        setIsMinimized(false);
    };

    // ========== Styles ==========
    const styles = {
        // Floating Action Button
        fab: {
            position: 'fixed',
            bottom: fabPosition.bottom,
            right: fabPosition.right,
            width: '56px',
            height: '56px',
            borderRadius: BORDER_RADIUS.full,
            background: fabGradient,
            color: COLORS.text.white,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
            transition: `all ${TRANSITIONS.normal}`,
            zIndex: zIndex,
        },
        // AI indicator badge
        badge: {
            position: 'absolute',
            top: '2px',
            right: '2px',
            minWidth: '12px',
            height: '12px',
            padding: badgeText ? '0 4px' : 0,
            borderRadius: BORDER_RADIUS.full,
            backgroundColor: badgeColor,
            border: '2px solid rgba(30, 27, 75, 0.9)',
            boxShadow: `0 0 8px ${badgeColor}80`,
            fontSize: '8px',
            fontWeight: FONT_WEIGHTS.bold,
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        // Floating Window
        window: {
            position: 'fixed',
            width: windowSize.width,
            maxWidth: 'calc(100vw - 48px)',
            height: isMinimized ? '46px' : windowSize.height,
            maxHeight: isMinimized ? '46px' : 'calc(100vh - 120px)',
            background: windowGradient,
            borderRadius: BORDER_RADIUS.lg,
            border: `1px solid ${borderColor}`,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.1)',
            zIndex: zIndex + 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: isDragging ? 'none' : `all ${TRANSITIONS.normal}`,
            transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
            opacity: isVisible ? 1 : 0,
        },
        // Window Header
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${SPACING.sm} ${SPACING.md}`,
            background: headerGradient,
            borderBottom: isMinimized ? 'none' : `1px solid ${borderColor}`,
            cursor: 'move',
            userSelect: 'none',
            flexShrink: 0,
        },
        headerTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            color: COLORS.text.white,
            fontSize: FONT_SIZES.sm,
            fontWeight: FONT_WEIGHTS.semibold,
        },
        headerIcon: {
            fontSize: '20px',
        },
        headerSubtitle: {
            fontSize: FONT_SIZES.xs,
            color: COLORS.text.whiteSubtle,
            marginLeft: '28px',
            marginTop: '-2px',
        },
        headerButtons: {
            display: 'flex',
            gap: SPACING.xs,
        },
        headerButton: {
            width: '28px',
            height: '28px',
            borderRadius: BORDER_RADIUS.sm,
            border: 'none',
            backgroundColor: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            transition: `all ${TRANSITIONS.fast}`,
        },
        // Window Content
        content: {
            flex: 1,
            overflow: 'hidden',
            display: isMinimized ? 'none' : 'flex',
            flexDirection: 'column',
        },
    };

    return (
        <>
            {/* Floating Action Button */}
            {(!isOpen || isMinimized) && (
                <button
                    onClick={toggleOpen}
                    style={styles.fab}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 58, 237, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                    }}
                    title={`Open ${title}`}
                    aria-label={`Open ${title}`}
                >
                    <span role="img" aria-label="icon">{icon}</span>
                    {showBadge && (
                        <span style={styles.badge}>
                            {badgeText}
                        </span>
                    )}
                </button>
            )}

            {/* Floating Chat Window */}
            {isOpen && (
                <div
                    ref={windowRef}
                    style={{
                        ...styles.window,
                        left: position.x !== null ? `${position.x}px` : 'auto',
                        top: position.y !== null ? `${position.y}px` : 'auto',
                        right: position.x === null ? '24px' : 'auto',
                        bottom: position.y === null ? '100px' : 'auto',
                    }}
                >
                    {/* Header - Draggable */}
                    <div
                        ref={headerRef}
                        style={styles.header}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                    >
                        <div>
                            <div style={styles.headerTitle}>
                                <span style={styles.headerIcon}>{icon}</span>
                                <span>{title}</span>
                            </div>
                            {subtitle && !isMinimized && (
                                <div style={styles.headerSubtitle}>{subtitle}</div>
                            )}
                        </div>
                        <div style={styles.headerButtons}>
                            {/* Minimize Button */}
                            <button
                                onClick={handleMinimize}
                                style={styles.headerButton}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="Minimize"
                            >
                                <span>−</span>
                            </button>
                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                style={styles.headerButton}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                                    e.currentTarget.style.color = '#EF4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                }}
                                title="Close"
                            >
                                <span>×</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div style={styles.content}>
                        {children}
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingChatWindow;
