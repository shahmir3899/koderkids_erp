// ============================================
// CLARIFICATION MODAL COMPONENT
// Modal for selecting clarification options when command is ambiguous
// Location: frontend/src/components/staff/ClarificationModal.js
// ============================================

import React, { useEffect, useCallback } from 'react';
import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    SHADOWS,
    FONT_SIZES,
    TRANSITIONS
} from '../../utils/designConstants';

const ClarificationModal = ({
    isOpen,
    clarification,
    onSelect,
    onCancel,
    isLoading = false
}) => {
    // ========== Keyboard Handling ==========
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && !isLoading) {
            onCancel();
        }
    }, [onCancel, isLoading]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleKeyDown]);

    // Don't render if not open
    if (!isOpen || !clarification) return null;

    // ========== Styles ==========
    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: SPACING.md,
        },
        modal: {
            backgroundColor: COLORS.background.white,
            borderRadius: BORDER_RADIUS.xl,
            boxShadow: SHADOWS.xl,
            maxWidth: '420px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            animation: 'slideUp 0.2s ease-out',
        },
        header: {
            padding: SPACING.lg,
            borderBottom: `1px solid ${COLORS.border.light}`,
            textAlign: 'center',
        },
        icon: {
            fontSize: '48px',
            marginBottom: SPACING.sm,
        },
        title: {
            fontSize: FONT_SIZES.lg,
            fontWeight: 600,
            color: COLORS.text.primary,
            marginBottom: SPACING.xs,
        },
        message: {
            fontSize: FONT_SIZES.sm,
            color: COLORS.text.secondary,
            lineHeight: 1.5,
        },
        body: {
            padding: SPACING.lg,
            maxHeight: '300px',
            overflowY: 'auto',
        },
        optionsGrid: {
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.sm,
        },
        optionButton: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${SPACING.md} ${SPACING.md}`,
            backgroundColor: COLORS.background.gray,
            border: `2px solid transparent`,
            borderRadius: BORDER_RADIUS.lg,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
            textAlign: 'left',
        },
        optionLabel: {
            fontSize: FONT_SIZES.md,
            fontWeight: 500,
            color: COLORS.text.primary,
        },
        optionArrow: {
            fontSize: FONT_SIZES.md,
            color: COLORS.text.secondary,
        },
        footer: {
            padding: SPACING.lg,
            borderTop: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            justifyContent: 'center',
        },
        cancelButton: {
            padding: `${SPACING.sm} ${SPACING.xl}`,
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.border.medium}`,
            borderRadius: BORDER_RADIUS.md,
            fontSize: FONT_SIZES.sm,
            fontWeight: 500,
            color: COLORS.text.secondary,
            cursor: 'pointer',
            transition: TRANSITIONS.fast,
        },
        loadingOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: BORDER_RADIUS.xl,
        },
    };

    // ========== Field Icon Mapping ==========
    const getFieldIcon = (field) => {
        const iconMap = {
            school: '🏫',
            staff: '👤',
            class: '📚',
            item: '📦',
            category: '🏷️',
        };
        return iconMap[field] || '❓';
    };

    // ========== Render ==========
    return (
        <div
            style={styles.overlay}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onCancel();
                }
            }}
        >
            <div style={styles.modal}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.icon}>
                        {getFieldIcon(clarification.field)}
                    </div>
                    <div style={styles.title}>Clarification Needed</div>
                    <div style={styles.message}>
                        {clarification.message}
                    </div>
                </div>

                {/* Options */}
                <div style={styles.body}>
                    <div style={styles.optionsGrid}>
                        {clarification.options?.map((option, index) => (
                            <button
                                key={option.id || index}
                                onClick={() => onSelect({
                                    field: clarification.field,
                                    ...option
                                })}
                                disabled={isLoading}
                                style={styles.optionButton}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = COLORS.primary;
                                    e.currentTarget.style.backgroundColor = `${COLORS.primary}10`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.backgroundColor = COLORS.background.gray;
                                }}
                            >
                                <span style={styles.optionLabel}>
                                    {option.label}
                                </span>
                                <span style={styles.optionArrow}>→</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        style={styles.cancelButton}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = COLORS.background.gray;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        Cancel
                    </button>
                </div>

                {/* Loading Overlay */}
                {isLoading && (
                    <div style={styles.loadingOverlay}>
                        <span style={{ fontSize: '24px' }}>⏳</span>
                    </div>
                )}
            </div>

            {/* Keyframes for animation */}
            <style>
                {`
                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default ClarificationModal;
