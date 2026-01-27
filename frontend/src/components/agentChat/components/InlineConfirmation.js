// ============================================
// INLINE CONFIRMATION COMPONENT
// Yes/No confirmation buttons (inline, not modal)
// Location: frontend/src/components/agentChat/components/InlineConfirmation.js
// ============================================

import React from 'react';
import { confirmationStyles } from '../styles/agentChatStyles';

/**
 * InlineConfirmation - Inline Yes/No confirmation buttons
 *
 * @param {Object} props
 * @param {string} props.message - Confirmation message to display
 * @param {Function} props.onConfirm - Callback when Yes is clicked
 * @param {Function} props.onCancel - Callback when No is clicked
 * @param {boolean} props.isProcessing - Disable buttons while processing
 * @param {string} props.confirmText - Yes button text (default: "Yes")
 * @param {string} props.cancelText - No button text (default: "No")
 * @param {string} props.confirmIcon - Yes button icon (default: "✓")
 * @param {string} props.cancelIcon - No button icon (default: "✕")
 * @param {string} props.variant - 'default' | 'destructive' | 'warning'
 */
const InlineConfirmation = ({
    message,
    onConfirm,
    onCancel,
    isProcessing = false,
    confirmText = "Yes",
    cancelText = "No",
    confirmIcon = "✓",
    cancelIcon = "✕",
    variant = 'default'
}) => {
    // Get button colors based on variant
    const getButtonColors = () => {
        switch (variant) {
            case 'destructive':
                return {
                    yes: '#EF4444', // Red for destructive confirm
                    no: '#6B7280'   // Gray for cancel
                };
            case 'warning':
                return {
                    yes: '#F59E0B', // Amber for warning confirm
                    no: '#6B7280'   // Gray for cancel
                };
            default:
                return {
                    yes: '#10B981', // Green for confirm
                    no: '#EF4444'   // Red for cancel
                };
        }
    };

    const colors = getButtonColors();

    return (
        <div>
            {/* Message */}
            {message && (
                <div style={{
                    marginBottom: '8px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.9)'
                }}>
                    {message}
                </div>
            )}

            {/* Buttons */}
            <div style={confirmationStyles.box}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isProcessing}
                    style={{
                        ...confirmationStyles.noButton,
                        backgroundColor: colors.no,
                        opacity: isProcessing ? 0.6 : 1,
                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                >
                    {cancelIcon} {cancelText}
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isProcessing}
                    style={{
                        ...confirmationStyles.yesButton,
                        backgroundColor: colors.yes,
                        opacity: isProcessing ? 0.6 : 1,
                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                >
                    {confirmIcon} {confirmText}
                </button>
            </div>
        </div>
    );
};

export default InlineConfirmation;
