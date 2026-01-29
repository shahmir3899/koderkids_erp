// ============================================
// FLOATING AGENT CHAT COMPONENT
// Floating window with AI agents (Fee, Inventory, Task)
// Location: frontend/src/components/admin/FloatingAgentChat.js
// ============================================

import React from 'react';
import { SPACING } from '../../utils/designConstants';
import FloatingChatWindow from '../common/FloatingChatWindow';
import UnifiedAgentSelector from './UnifiedAgentSelector';

// ============================================
// MAIN COMPONENT
// ============================================
const FloatingAgentChat = () => {
    return (
        <FloatingChatWindow
            title="AI Agent Hub"
            subtitle="Select an agent to get started"
            icon="🤖"
            fabPosition={{ bottom: SPACING['2xl'], right: '280px' }}
            windowSize={{ width: '380px', height: '520px' }}
            showBadge={true}
            badgeColor="#4ADE80"
            zIndex={1000}
        >
            <UnifiedAgentSelector height="100%" />
        </FloatingChatWindow>
    );
};

export default FloatingAgentChat;
