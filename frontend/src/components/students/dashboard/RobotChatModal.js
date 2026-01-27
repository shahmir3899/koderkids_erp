import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { sendMessageToRobot } from '../../../api';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
} from '../../../utils/designConstants';

/**
 * RobotChatModal - Draggable chat modal for students to ask questions
 * Features:
 * - Renders via Portal to document.body (truly on top of everything)
 * - Dark glassmorphic theme matching app design
 * - Draggable anywhere on the entire screen
 * - Inline loading spinner (no ERPLoader)
 * - z-index: 99999 (always on top)
 */
const RobotChatModal = ({ isOpen, onClose, isMobile }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const modalRef = useRef(null);

  // Draggable state
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Initialize position to center on mount
  useEffect(() => {
    if (isOpen && position.x === -1) {
      // Position in bottom-right by default
      setPosition({
        x: window.innerWidth - 400,
        y: window.innerHeight - 580,
      });
    }
  }, [isOpen, position.x]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Dragging handlers - attached to window for smooth dragging
  const handleMouseDown = useCallback((e) => {
    // Only start drag from header area, not from inputs or buttons
    if (e.target.closest('input') || e.target.closest('button') || e.target.closest('[data-no-drag]')) return;

    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    // Allow dragging anywhere on screen, just keep at least 50px visible
    const modalWidth = modalRef.current?.offsetWidth || 380;
    const modalHeight = modalRef.current?.offsetHeight || 550;

    setPosition({
      x: Math.max(-modalWidth + 100, Math.min(newX, window.innerWidth - 100)),
      y: Math.max(0, Math.min(newY, window.innerHeight - 50)),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach mouse events to window for smooth dragging outside modal
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message to history
    setChatHistory(prev => [...prev, { sender: 'user', text: userMessage }]);

    // Get robot reply
    setIsLoading(true);
    try {
      const reply = await sendMessageToRobot(userMessage);
      setChatHistory(prev => [...prev, { sender: 'bot', text: reply }]);
    } catch (error) {
      setChatHistory(prev => [...prev, {
        sender: 'bot',
        text: "Oops! I couldn't connect. Please try again."
      }]);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const styles = getStyles(isMobile, isDragging);

  // Use createPortal to render directly to document.body
  const modalContent = (
    <>
      {/* Semi-transparent backdrop - click to close */}
      <div
        style={styles.backdrop}
        onClick={onClose}
        data-no-drag
      />

      {/* Modal - draggable */}
      <div
        ref={modalRef}
        style={{
          ...styles.modal,
          left: isMobile ? 0 : Math.max(0, position.x),
          top: isMobile ? 0 : Math.max(0, position.y),
        }}
      >
        {/* Header - drag handle */}
        <div
          style={styles.header}
          onMouseDown={!isMobile ? handleMouseDown : undefined}
        >
          <div style={styles.headerLeft}>
            <div style={styles.robotIconContainer}>
              <span style={styles.robotIcon}>🤖</span>
            </div>
            <div>
              <h3 style={styles.title}>Kody</h3>
              <span style={styles.subtitle}>Your coding helper</span>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Messages */}
        <div style={styles.chatContainer} ref={chatContainerRef} data-no-drag>
          {chatHistory.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>💬</span>
              <p style={styles.emptyText}>Hi! I'm Kody, your coding helper.</p>
              <p style={styles.emptyHint}>Ask me anything about coding or your lessons!</p>
            </div>
          ) : (
            chatHistory.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.messageWrapper,
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.sender === 'bot' && <span style={styles.botAvatar}>🤖</span>}
                <div
                  style={{
                    ...styles.message,
                    ...(msg.sender === 'user' ? styles.userMessage : styles.botMessage),
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}

          {/* Inline typing indicator */}
          {isLoading && (
            <div style={styles.messageWrapper}>
              <span style={styles.botAvatar}>🤖</span>
              <div style={styles.typingIndicator}>
                <span style={{ ...styles.dot, animationDelay: '0s' }} />
                <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={styles.inputContainer} data-no-drag>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question..."
            style={styles.input}
            autoFocus
          />
          <button
            style={{
              ...styles.sendButton,
              opacity: message.trim() && !isLoading ? 1 : 0.5,
            }}
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );

  // Render to document.body using Portal
  return ReactDOM.createPortal(modalContent, document.body);
};

const getStyles = (isMobile, isDragging) => ({
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 99998,
  },
  modal: {
    position: 'fixed',
    width: isMobile ? '100%' : '380px',
    height: isMobile ? '100%' : '550px',
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: isMobile ? 0 : BORDER_RADIUS.xl,
    boxShadow: `${SHADOWS.xl}, 0 0 60px rgba(0, 0, 0, 0.3)`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 99999,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    // Prevent any parent styling from affecting this
    isolation: 'isolate',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.sm} ${SPACING.md}`,
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: isMobile ? 'default' : (isDragging ? 'grabbing' : 'grab'),
    userSelect: 'none',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  robotIconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotIcon: {
    fontSize: '24px',
  },
  title: {
    margin: 0,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: COLORS.text.white,
    transition: `background-color ${TRANSITIONS.fast}`,
  },
  chatContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: SPACING.md,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: SPACING.md,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: 0,
  },
  emptyHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    marginTop: SPACING.xs,
  },
  messageWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  botAvatar: {
    fontSize: '20px',
    marginBottom: '2px',
  },
  message: {
    maxWidth: '80%',
    padding: `${SPACING.sm} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    borderBottomRightRadius: BORDER_RADIUS.xs,
  },
  botMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
  },
  dot: {
    width: '6px',
    height: '6px',
    backgroundColor: COLORS.text.whiteSubtle,
    borderRadius: BORDER_RADIUS.full,
    animation: 'bounce 1.4s infinite ease-in-out both',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  input: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    transition: `border-color ${TRANSITIONS.fast}`,
  },
  sendButton: {
    width: '38px',
    height: '38px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#FFFFFF',
    transition: `opacity ${TRANSITIONS.fast}`,
  },
});

export default RobotChatModal;
