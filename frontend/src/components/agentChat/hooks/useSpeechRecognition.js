// ============================================
// USE SPEECH RECOGNITION HOOK
// Voice input using Web Speech API
// Location: frontend/src/components/agentChat/hooks/useSpeechRecognition.js
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for speech recognition (voice input)
 * Uses Web Speech API (webkitSpeechRecognition)
 *
 * @param {Object} options
 * @param {Function} options.onResult - Callback when speech is recognized
 * @param {Function} options.onError - Callback on error
 * @param {string} options.language - Language code (default: 'en-US')
 * @param {boolean} options.continuous - Continue listening (default: false)
 *
 * @returns {Object} { isListening, isSupported, startListening, stopListening, transcript, error }
 */
export const useSpeechRecognition = (options = {}) => {
    const {
        onResult,
        onError,
        language = 'en-US',
        continuous = false
    } = options;

    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);

    const recognitionRef = useRef(null);

    // Check browser support and initialize
    useEffect(() => {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);

            const recognition = new SpeechRecognition();
            recognition.continuous = continuous;
            recognition.interimResults = false;
            recognition.lang = language;

            // Event handlers
            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event) => {
                const result = event.results[event.results.length - 1];
                const text = result[0].transcript;
                setTranscript(text);

                if (onResult) {
                    onResult(text);
                }
            };

            recognition.onerror = (event) => {
                setIsListening(false);
                const errorMessage = getErrorMessage(event.error);
                setError(errorMessage);

                if (onError) {
                    onError(errorMessage);
                }
            };

            recognitionRef.current = recognition;
        } else {
            setIsSupported(false);
        }

        // Cleanup
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
        };
    }, [language, continuous, onResult, onError]);

    // Start listening
    const startListening = useCallback(() => {
        if (!recognitionRef.current || !isSupported) {
            setError('Speech recognition not supported in this browser');
            return;
        }

        setTranscript('');
        setError(null);

        try {
            recognitionRef.current.start();
        } catch (e) {
            // May throw if already started
            if (e.name === 'InvalidStateError') {
                recognitionRef.current.stop();
                setTimeout(() => {
                    recognitionRef.current.start();
                }, 100);
            } else {
                setError('Failed to start speech recognition');
            }
        }
    }, [isSupported]);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore errors during stop
            }
        }
    }, [isListening]);

    // Toggle listening
    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        isSupported,
        transcript,
        error,
        startListening,
        stopListening,
        toggleListening
    };
};

// Helper to get user-friendly error messages
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'not-allowed':
            return 'Microphone access denied. Please enable microphone permissions.';
        case 'no-speech':
            return 'No speech detected. Please try again.';
        case 'audio-capture':
            return 'No microphone found. Please connect a microphone.';
        case 'network':
            return 'Network error. Please check your connection.';
        case 'aborted':
            return 'Listening was stopped.';
        case 'service-not-allowed':
            return 'Speech recognition service not allowed.';
        default:
            return `Speech recognition error: ${errorCode}`;
    }
}

export default useSpeechRecognition;
