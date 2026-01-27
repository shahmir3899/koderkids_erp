// ============================================
// FLOATING AGENT CHAT COMPONENT
// Floating window with AI agents (Fee, Inventory, Task)
// Location: frontend/src/components/admin/FloatingAgentChat.js
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
import UnifiedAgentSelector from './UnifiedAgentSelector';

// ============================================
// MAIN COMPONENT
// ============================================
const FloatingAgentChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: null, y: null }); // null = default position
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const windowRef = useRef(null);
    const headerRef = useRef(null);

    // Initialize position on first open
    useEffect(() => {
        if (isOpen && position.x === null) {
            // Position at bottom-right with some padding
            setPosition({
                x: window.innerWidth - 420 - 24,
                y: window.innerHeight - 580 - 24
            });
        }
    }, [isOpen, position.x]);

    // Handle drag start
    const handleDragStart = useCallback((e) => {
        if (e.target !== headerRef.current && !headerRef.current?.contains(e.target)) {
            return;
        }

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

        const newX = Math.max(0, Math.min(window.innerWidth - 400, clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, clientY - dragOffset.y));

        setPosition({ x: newX, y: newY });
    }, [isDragging, dragOffset]);

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
        // Floating Action Button - positioned left of notification button
        fab: {
            position: 'fixed',
            bottom: SPACING['2xl'],
            right: '280px', // Offset to avoid notification button
            width: '56px',
            height: '56px',
            borderRadius: BORDER_RADIUS.full,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: COLORS.text.white,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
            transition: `all ${TRANSITIONS.base}`,
            zIndex: 1000,
        },
        fabOpen: {
            transform: 'rotate(0deg)',
            backgroundColor: COLORS.primary,
        },
        fabClosed: {
            transform: 'rotate(0deg)',
        },
        fabHover: {
            transform: 'scale(1.1)',
            boxShadow: '0 12px 28px rgba(124, 58, 237, 0.4)',
        },
        // AI indicator dot
        badge: {
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '12px',
            height: '12px',
            borderRadius: BORDER_RADIUS.full,
            backgroundColor: '#4ADE80',
            border: '2px solid rgba(30, 27, 75, 0.9)',
            boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)',
        },
        // Floating Window - matches app purple/gradient theme
        window: {
            position: 'fixed',
            width: '380px',
            height: isMinimized ? '46px' : '520px',
            background: 'linear-gradient(180deg, rgba(30, 27, 75, 0.98) 0%, rgba(15, 12, 41, 0.98) 100%)',
            borderRadius: BORDER_RADIUS.lg,
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.1)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: isDragging ? 'none' : `height ${TRANSITIONS.base}`,
        },
        // Window Header - gradient header matching app theme
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${SPACING.xs} ${SPACING.md}`,
            background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(102, 126, 234, 0.15) 100%)',
            borderBottom: isMinimized ? 'none' : '1px solid rgba(139, 92, 246, 0.2)',
            cursor: 'move',
            userSelect: 'none',
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
        minimizeButton: {
            ':hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
            },
        },
        closeButton: {
            ':hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
            },
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
                        e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 58, 237, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = SHADOWS.xl;
                    }}
                    title="Open AI Assistant"
                    aria-label="Open AI Assistant"
                >
                    <span role="img" aria-label="robot">🤖</span>
                    <span style={styles.badge}>AI</span>
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
                        right: position.x === null ? SPACING['2xl'] : 'auto',
                        bottom: position.y === null ? SPACING['2xl'] : 'auto',
                    }}
                >
                    {/* Header - Draggable */}
                    <div
                        ref={headerRef}
                        style={styles.header}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                    >
                        <div style={styles.headerTitle}>
                            <span style={styles.headerIcon}>🤖</span>
                            <span>AI Agent Hub</span>
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
                        <UnifiedAgentSelector height="100%" />
                    </div>
                </div>
            )}

            {/* Styles for animations */}
            <style>{`
                @keyframes floatIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </>
    );
};

export default FloatingAgentChat;
