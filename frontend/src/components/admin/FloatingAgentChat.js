// ============================================
// FLOATING AGENT CHAT COMPONENT
// Floating window with AI agents (Fee, Inventory, Task)
// Location: frontend/src/components/admin/FloatingAgentChat.js
// ============================================

import React from 'react';
import { SPACING } from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';
import FloatingChatWindow from '../common/FloatingChatWindow';
import UnifiedAgentSelector from './UnifiedAgentSelector';

// ============================================
// MAIN COMPONENT
// ============================================
const FloatingAgentChat = () => {
    const { isMobile, isTablet } = useResponsive();

    const fabPosition = {
        bottom: SPACING['2xl'],
        right: isMobile ? SPACING.xl : isTablet ? SPACING.xl : '280px',
    };

    const windowSize = {
        width: isMobile ? '100vw' : isTablet ? '90vw' : '380px',
        height: isMobile ? '100vh' : isTablet ? '80vh' : '520px',
    };

    return (
        <FloatingChatWindow
            title="AI Agent Hub"
            subtitle="Select an agent to get started"
            icon="🤖"
            fabPosition={fabPosition}
            windowSize={windowSize}
            showBadge={true}
            badgeColor="#4ADE80"
            zIndex={1000}
        >
            <UnifiedAgentSelector height="100%" />
        </FloatingChatWindow>
    );
};

export default FloatingAgentChat;
