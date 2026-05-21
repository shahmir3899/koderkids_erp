import React from 'react';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

const QuizScoresCard = ({ quizzes = [] }) => {
  if (quizzes.length === 0) {
    return (
      <div style={styles.card}>
        <h3 style={styles.heading}>&#128221; Quiz Scores</h3>
        <p style={styles.empty}>No quizzes completed yet.</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>&#128221; Quiz Scores</h3>
      <ul style={styles.list}>
        {quizzes.map((q, i) => (
          <li key={i} style={styles.item}>
            <div style={styles.itemBody}>
              <p style={styles.topicTitle}>{q.topic_title || 'Quiz'}</p>
              <p style={styles.bookName}>{q.book_title}</p>
            </div>
            <div style={styles.scoreBlock}>
              <span
                style={{
                  ...styles.scoreBadge,
                  backgroundColor:
                    q.passed === true
                      ? 'rgba(34,197,94,0.15)'
                      : q.passed === false
                      ? 'rgba(239,68,68,0.15)'
                      : 'rgba(255,255,255,0.08)',
                  color:
                    q.passed === true
                      ? '#4ade80'
                      : q.passed === false
                      ? '#f87171'
                      : COLORS.text.whiteSubtle,
                }}
              >
                {q.score !== null ? `${q.score}%` : 'N/A'}
              </span>
              <p style={styles.passLabel}>
                {q.passed === true ? '&#9989; Pass' : q.passed === false ? '&#10060; Fail' : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const styles = {
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  heading: {
    margin: `0 0 ${SPACING.md} 0`,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.sm} 0`,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    gap: SPACING.md,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  topicTitle: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.white,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  bookName: {
    margin: 0,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  scoreBlock: {
    textAlign: 'center',
    flexShrink: 0,
  },
  scoreBadge: {
    display: 'inline-block',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  passLabel: {
    margin: `2px 0 0 0`,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  empty: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    textAlign: 'center',
    padding: SPACING.lg,
  },
};

export default QuizScoresCard;
