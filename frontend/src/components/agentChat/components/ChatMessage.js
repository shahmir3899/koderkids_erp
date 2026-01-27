// ============================================
// CHAT MESSAGE COMPONENT
// Individual message bubble for agent chat
// Location: frontend/src/components/agentChat/components/ChatMessage.js
// ============================================

import React from 'react';
import { getMessageStyle } from '../styles/agentChatStyles';

/**
 * ChatMessage - Individual message bubble
 *
 * @param {Object} props
 * @param {string} props.type - Message type: 'user' | 'bot' | 'error' | 'system'
 * @param {string} props.content - Message text content
 * @param {React.ReactNode} props.children - Optional children (for custom content like data displays)
 * @param {Object} props.style - Additional styles to merge
 */
const ChatMessage = ({
    type = 'bot',
    content,
    children,
    style = {}
}) => {
    const messageStyle = {
        ...getMessageStyle(type),
        ...style
    };

    return (
        <div style={messageStyle}>
            {content && <div>{content}</div>}
            {children}
        </div>
    );
};

export default ChatMessage;
