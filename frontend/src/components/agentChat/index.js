// ============================================
// AGENT CHAT COMPONENTS INDEX
// Export all shared agent chat components
// Location: frontend/src/components/agentChat/index.js
// ============================================

// Hooks
export { useSpeechRecognition } from './hooks/useSpeechRecognition';
export { useSpeechSynthesis } from './hooks/useSpeechSynthesis';

// Components
export { default as AgentChatInput } from './components/AgentChatInput';
export { default as ProcessingIndicator } from './components/ProcessingIndicator';
export { default as InlineConfirmation } from './components/InlineConfirmation';
export { default as ChatMessage } from './components/ChatMessage';

// Styles
export * from './styles/agentChatStyles';
