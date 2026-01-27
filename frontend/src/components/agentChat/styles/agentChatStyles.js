// ============================================
// SHARED AGENT CHAT STYLES
// Common styles for all AI agent chat components
// Location: frontend/src/components/agentChat/styles/agentChatStyles.js
// ============================================

import {
    COLORS,
    SPACING,
    BORDER_RADIUS,
    FONT_SIZES,
    TRANSITIONS
} from '../../../utils/designConstants';

// ============================================
// STYLE FACTORY FUNCTIONS
// ============================================

/**
 * Get container styles for the agent chat
 * @param {string} height - Container height
 */
export const getContainerStyles = (height) => ({
    display: 'flex',
    flexDirection: 'column',
    height,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden'
});

/**
 * Get header styles
 * @param {boolean} aiAvailable - AI availability status
 */
export const getHeaderStyles = (aiAvailable) => ({
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)'
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        fontSize: FONT_SIZES.md,
        fontWeight: 600,
        color: COLORS.text.white
    },
    aiStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        fontSize: FONT_SIZES.xs,
        color: aiAvailable ? '#4ADE80' : aiAvailable === false ? '#F87171' : 'rgba(255,255,255,0.5)'
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: aiAvailable ? '#4ADE80' : aiAvailable === false ? '#F87171' : 'rgba(255,255,255,0.3)'
    },
    clearButton: {
        padding: `${SPACING.xs} ${SPACING.sm}`,
        backgroundColor: 'transparent',
        color: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: BORDER_RADIUS.sm,
        fontSize: FONT_SIZES.xs,
        cursor: 'pointer',
        transition: TRANSITIONS.fast
    }
});

// ============================================
// STATIC STYLES
// ============================================

export const chatAreaStyles = {
    flex: 1,
    overflowY: 'auto',
    padding: SPACING.md,
    display: 'flex',
    flexDirection: 'column'
};

export const welcomeStyles = {
    section: {
        textAlign: 'center',
        padding: SPACING.lg,
        color: 'rgba(255,255,255,0.7)'
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 600,
        color: COLORS.text.white,
        marginBottom: SPACING.sm
    },
    text: {
        fontSize: FONT_SIZES.sm,
        marginBottom: SPACING.md
    },
    examplePrompts: {
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.xs,
        marginTop: SPACING.md,
        textAlign: 'left'
    },
    examplePrompt: {
        padding: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        transition: TRANSITIONS.fast,
        border: '1px solid transparent'
    },
    examplePromptHover: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(255,255,255,0.2)'
    }
};

export const messageStyles = {
    base: {
        maxWidth: '85%',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        fontSize: FONT_SIZES.sm,
        lineHeight: 1.5,
        marginBottom: SPACING.sm,
        whiteSpace: 'pre-line'
    },
    user: {
        alignSelf: 'flex-end',
        marginLeft: 'auto',
        backgroundColor: COLORS.primary,
        color: COLORS.text.white,
        borderBottomRightRadius: BORDER_RADIUS.xs
    },
    bot: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: COLORS.text.white,
        borderBottomLeftRadius: BORDER_RADIUS.xs
    },
    error: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        color: '#FCA5A5',
        borderBottomLeftRadius: BORDER_RADIUS.xs
    },
    system: {
        alignSelf: 'center',
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        color: '#FCD34D',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.xs,
        textAlign: 'center'
    }
};

export const inputStyles = {
    section: {
        padding: SPACING.md,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)'
    },
    row: {
        display: 'flex',
        gap: SPACING.sm,
        alignItems: 'center'
    },
    textInput: {
        flex: 1,
        padding: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: BORDER_RADIUS.md,
        color: COLORS.text.white,
        fontSize: FONT_SIZES.sm,
        outline: 'none',
        transition: TRANSITIONS.fast,
        resize: 'none'
    },
    sendButton: {
        padding: `${SPACING.sm} ${SPACING.md}`,
        backgroundColor: COLORS.primary,
        color: COLORS.text.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        fontWeight: 600,
        cursor: 'pointer',
        transition: TRANSITIONS.fast,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs
    },
    micButton: {
        padding: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: COLORS.text.white,
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.md,
        cursor: 'pointer',
        transition: TRANSITIONS.fast,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '40px',
        minHeight: '40px'
    },
    micButtonListening: {
        padding: SPACING.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        color: '#EF4444',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.md,
        cursor: 'pointer',
        transition: TRANSITIONS.fast,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '40px',
        minHeight: '40px',
        animation: 'pulse 1.5s ease-in-out infinite'
    }
};

export const confirmationStyles = {
    box: {
        display: 'flex',
        gap: SPACING.sm,
        marginTop: SPACING.sm
    },
    yesButton: {
        flex: 1,
        padding: SPACING.sm,
        backgroundColor: '#10B981',
        color: 'white',
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs
    },
    noButton: {
        flex: 1,
        padding: SPACING.sm,
        backgroundColor: '#EF4444',
        color: 'white',
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs
    }
};

export const processingStyles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        alignSelf: 'flex-start',
        padding: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm
    },
    spinner: {
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255,255,255,0.2)',
        borderTopColor: COLORS.primary,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
    },
    text: {
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.7)'
    }
};

export const quickActionsStyles = {
    footer: {
        padding: SPACING.md,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)'
    },
    label: {
        fontSize: FONT_SIZES.xs,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: SPACING.xs
    },
    row: {
        display: 'flex',
        gap: SPACING.sm,
        flexWrap: 'wrap'
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        padding: `${SPACING.xs} ${SPACING.sm}`,
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: BORDER_RADIUS.md,
        color: COLORS.text.white,
        fontSize: FONT_SIZES.xs,
        cursor: 'pointer',
        transition: TRANSITIONS.fast
    },
    buttonHover: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: COLORS.primary
    }
};

export const templateStyles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: SPACING.sm,
        marginTop: SPACING.md
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: SPACING.xs,
        padding: SPACING.md,
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: BORDER_RADIUS.md,
        cursor: 'pointer',
        transition: TRANSITIONS.fast,
        textAlign: 'center'
    },
    cardHover: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: COLORS.primary
    },
    icon: {
        fontSize: '24px'
    },
    name: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 600,
        color: COLORS.text.white
    },
    description: {
        fontSize: '10px',
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 1.2
    }
};

export const formStyles = {
    section: {
        padding: SPACING.md,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)'
    },
    field: {
        marginBottom: SPACING.md
    },
    label: {
        display: 'block',
        fontSize: FONT_SIZES.xs,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: SPACING.xs
    },
    input: {
        width: '100%',
        padding: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: BORDER_RADIUS.md,
        color: COLORS.text.white,
        fontSize: FONT_SIZES.sm,
        outline: 'none'
    },
    select: {
        width: '100%',
        padding: SPACING.sm,
        backgroundColor: 'rgba(30,30,40,0.9)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: BORDER_RADIUS.md,
        color: COLORS.text.white,
        fontSize: FONT_SIZES.sm,
        outline: 'none',
        cursor: 'pointer'
    },
    buttonRow: {
        display: 'flex',
        gap: SPACING.sm,
        marginTop: SPACING.md
    },
    cancelButton: {
        flex: 1,
        padding: SPACING.sm,
        backgroundColor: 'transparent',
        color: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        cursor: 'pointer'
    },
    submitButton: {
        flex: 1,
        padding: SPACING.sm,
        backgroundColor: COLORS.primary,
        color: COLORS.text.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.sm,
        fontWeight: 600,
        cursor: 'pointer'
    }
};

// ============================================
// CSS KEYFRAMES (to be injected)
// ============================================

export const keyframesCSS = `
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
}
`;

// Helper to get message style by type
export const getMessageStyle = (type) => ({
    ...messageStyles.base,
    ...(messageStyles[type] || messageStyles.bot)
});
