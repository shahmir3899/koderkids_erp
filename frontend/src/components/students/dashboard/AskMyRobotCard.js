import React, { useState } from 'react';
import RobotChatModal from './RobotChatModal';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

/**
 * AskMyRobotCard - Opens chat modal for students to ask questions
 */
const AskMyRobotCard = ({ isMobile }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleAskQuestion = () => {
    setIsChatOpen(true);
  };

  const handlePracticeQuiz = () => {
    // For now, open the chat modal - can be replaced with quiz functionality later
    setIsChatOpen(true);
  };

  return (
    <div style={getStyles(isMobile).card}>
      <h4 style={getStyles(isMobile).title}>Ask My Robot</h4>

      {/* Badge icons */}
      <div style={getStyles(isMobile).badgesRow}>
        <span style={getStyles(isMobile).badge}>⭐</span>
        <span style={getStyles(isMobile).badge}>🏆</span>
        <span style={getStyles(isMobile).badge}>📋</span>
      </div>

      {/* Robot image placeholder */}
      <div style={getStyles(isMobile).robotContainer}>
        <span style={getStyles(isMobile).robotEmoji}>🤖</span>
      </div>

      {/* Action buttons */}
      <div style={getStyles(isMobile).buttonsContainer}>
        <button style={getStyles(isMobile).button} onClick={handleAskQuestion}>
          Ask a Question <span style={getStyles(isMobile).arrow}>&#8250;</span>
        </button>
        <button style={getStyles(isMobile).button} onClick={handlePracticeQuiz}>
          Practice Quiz <span style={getStyles(isMobile).arrow}>&#8250;</span>
        </button>
      </div>

      {/* Chat Modal */}
      <RobotChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isMobile={isMobile}
      />
    </div>
  );
};

const getStyles = (isMobile) => ({
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isMobile ? SPACING.md : SPACING.lg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: isMobile ? '100%' : '200px',
  },
  title: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    margin: `0 0 ${SPACING.sm} 0`,
  },
  badgesRow: {
    display: 'flex',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  badge: {
    width: '32px',
    height: '32px',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  robotContainer: {
    width: isMobile ? '80px' : '100px',
    height: isMobile ? '80px' : '100px',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  robotEmoji: {
    fontSize: isMobile ? '40px' : '50px',
  },
  buttonsContainer: {
    display: 'flex',
    gap: SPACING.sm,
    width: '100%',
    flexDirection: isMobile ? 'column' : 'row',
  },
  button: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    transition: 'background-color 0.2s ease',
  },
  arrow: {
    fontSize: FONT_SIZES.sm,
  },
});

export default AskMyRobotCard;
