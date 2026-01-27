// ============================================
// PROCESSING INDICATOR COMPONENT
// Spinner with "Processing..." text
// Location: frontend/src/components/agentChat/components/ProcessingIndicator.js
// ============================================

import React, { useEffect } from 'react';
import { processingStyles, keyframesCSS } from '../styles/agentChatStyles';

/**
 * ProcessingIndicator - Shows spinner while AI is processing
 *
 * @param {Object} props
 * @param {string} props.text - Text to display (default: "Processing...")
 */
const ProcessingIndicator = ({ text = "Processing..." }) => {
    // Inject keyframes CSS
    useEffect(() => {
        const styleId = 'agent-chat-keyframes';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = keyframesCSS;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <div style={processingStyles.container}>
            <div style={processingStyles.spinner} />
            <span style={processingStyles.text}>{text}</span>
        </div>
    );
};

export default ProcessingIndicator;
