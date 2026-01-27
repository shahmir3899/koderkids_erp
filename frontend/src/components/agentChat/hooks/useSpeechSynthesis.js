// ============================================
// USE SPEECH SYNTHESIS HOOK
// Text-to-speech using Web Speech API
// Location: frontend/src/components/agentChat/hooks/useSpeechSynthesis.js
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for speech synthesis (text-to-speech)
 * Uses Web Speech API (SpeechSynthesis)
 *
 * @param {Object} options
 * @param {string} options.language - Language code (default: 'en-US')
 * @param {number} options.rate - Speech rate 0.1-10 (default: 1)
 * @param {number} options.pitch - Speech pitch 0-2 (default: 1)
 * @param {number} options.volume - Volume 0-1 (default: 1)
 *
 * @returns {Object} { isSpeaking, isSupported, speak, stop, pause, resume }
 */
export const useSpeechSynthesis = (options = {}) => {
    const {
        language = 'en-US',
        rate = 1,
        pitch = 1,
        volume = 1
    } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState([]);

    const utteranceRef = useRef(null);

    // Check browser support and get voices
    useEffect(() => {
        if ('speechSynthesis' in window) {
            setIsSupported(true);

            // Get available voices
            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);
            };

            // Voices may load asynchronously
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;

            return () => {
                window.speechSynthesis.onvoiceschanged = null;
            };
        } else {
            setIsSupported(false);
        }
    }, []);

    // Get the best voice for the language
    const getVoice = useCallback(() => {
        if (voices.length === 0) return null;

        // Try to find a voice matching the language
        const langVoice = voices.find(v => v.lang.startsWith(language.split('-')[0]));
        if (langVoice) return langVoice;

        // Fallback to first available voice
        return voices[0];
    }, [voices, language]);

    // Speak text
    const speak = useCallback((text) => {
        if (!isSupported || !text) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        // Set voice if available
        const voice = getVoice();
        if (voice) {
            utterance.voice = voice;
        }

        // Event handlers
        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            setIsSpeaking(false);
            setIsPaused(false);
        };

        utterance.onpause = () => {
            setIsPaused(true);
        };

        utterance.onresume = () => {
            setIsPaused(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [isSupported, language, rate, pitch, volume, getVoice]);

    // Stop speaking
    const stop = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setIsPaused(false);
        }
    }, [isSupported]);

    // Pause speaking
    const pause = useCallback(() => {
        if (isSupported && isSpeaking) {
            window.speechSynthesis.pause();
        }
    }, [isSupported, isSpeaking]);

    // Resume speaking
    const resume = useCallback(() => {
        if (isSupported && isPaused) {
            window.speechSynthesis.resume();
        }
    }, [isSupported, isPaused]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isSupported]);

    return {
        isSpeaking,
        isPaused,
        isSupported,
        voices,
        speak,
        stop,
        pause,
        resume
    };
};

export default useSpeechSynthesis;
