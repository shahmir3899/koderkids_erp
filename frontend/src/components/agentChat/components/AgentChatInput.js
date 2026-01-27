// ============================================
// AGENT CHAT INPUT COMPONENT
// Input section with Send button and Mic button
// Location: frontend/src/components/agentChat/components/AgentChatInput.js
// ============================================

import React, { useEffect } from 'react';
import { inputStyles, keyframesCSS } from '../styles/agentChatStyles';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

/**
 * AgentChatInput - Input section for agent chat
 *
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Callback when input changes
 * @param {Function} props.onSend - Callback when send is clicked
 * @param {boolean} props.disabled - Disable input
 * @param {boolean} props.isProcessing - Show processing state
 * @param {string} props.placeholder - Input placeholder text
 * @param {boolean} props.showMicButton - Show microphone button (default: true)
 * @param {Function} props.onVoiceInput - Callback when voice input is received
 */
const AgentChatInput = ({
    value,
    onChange,
    onSend,
    disabled = false,
    isProcessing = false,
    placeholder = "Type your message...",
    showMicButton = true,
    onVoiceInput
}) => {
    // Speech recognition hook
    const {
        isListening,
        isSupported: speechSupported,
        startListening,
        stopListening,
        error: speechError
    } = useSpeechRecognition({
        onResult: (transcript) => {
            // Fill input with transcript
            onChange(transcript);
            // Optional callback
            if (onVoiceInput) {
                onVoiceInput(transcript);
            }
        }
    });

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

    // Handle Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !disabled && !isProcessing) {
                onSend();
            }
        }
    };

    // Handle mic button click
    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const isDisabled = disabled || isProcessing;
    const showMic = showMicButton && speechSupported;

    return (
        <div style={inputStyles.section}>
            <div style={inputStyles.row}>
                {/* Text Input */}
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Listening..." : placeholder}
                    disabled={isDisabled}
                    style={{
                        ...inputStyles.textInput,
                        opacity: isDisabled ? 0.6 : 1
                    }}
                />

                {/* Microphone Button */}
                {showMic && (
                    <button
                        type="button"
                        onClick={handleMicClick}
                        disabled={isProcessing}
                        style={isListening ? inputStyles.micButtonListening : inputStyles.micButton}
                        title={isListening ? "Stop listening" : "Start voice input"}
                        aria-label={isListening ? "Stop listening" : "Start voice input"}
                    >
                        {isListening ? '🎙️' : '🎤'}
                    </button>
                )}

                {/* Send Button */}
                <button
                    type="button"
                    onClick={onSend}
                    disabled={isDisabled || !value.trim()}
                    style={{
                        ...inputStyles.sendButton,
                        opacity: (isDisabled || !value.trim()) ? 0.6 : 1,
                        cursor: (isDisabled || !value.trim()) ? 'not-allowed' : 'pointer'
                    }}
                >
                    Send →
                </button>
            </div>

            {/* Speech Error */}
            {speechError && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#FCA5A5'
                }}>
                    {speechError}
                </div>
            )}
        </div>
    );
};

export default AgentChatInput;
