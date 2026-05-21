import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../../utils/designConstants';

const BookProgressCard = ({ books = [], isMobile }) => {
  const navigate = useNavigate();

  if (books.length === 0) {
    return (
      <div style={styles.card}>
        <h3 style={styles.heading}>📚 My Books</h3>
        <p style={styles.empty}>No books assigned yet.</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h3 style={styles.heading}>📚 My Books</h3>
        <span style={styles.count}>{books.length} enrolled</span>
      </div>
      <div style={styles.list}>
        {books.map((book) => (
          <div key={book.enrollment_id} style={styles.bookRow}>
            {/* Cover */}
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} style={styles.cover} />
            ) : (
              <div style={styles.coverPlaceholder}>
                <span style={{ fontSize: '26px' }}>📖</span>
              </div>
            )}
            {/* Info */}
            <div style={styles.bookInfo}>
              <p style={styles.bookTitle}>{book.title}</p>
              {/* Progress bar */}
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${Math.max(book.progress_percent, 1)}%`,
                  }}
                />
              </div>
              <div style={styles.progressMeta}>
                <span style={styles.progressPct}>{book.progress_percent}%</span>
                <span style={styles.progressTopics}>
                  {book.completed_topics}/{book.total_topics} topics
                </span>
              </div>
              {book.last_accessed_at && (
                <p style={styles.lastSeen}>
                  Last opened: {new Date(book.last_accessed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            {/* Open button */}
            <button
              style={styles.openBtn}
              onClick={() => {
                const path = book.last_topic
                  ? `/lms/book/${book.book_id}/${book.last_topic.id}`
                  : `/lms/book/${book.book_id}`;
                navigate(path);
              }}
            >
              Open →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: '16px',
    padding: SPACING.lg,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  heading: {
    margin: 0,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  count: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(165,180,252,0.7)',
    backgroundColor: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: BORDER_RADIUS.full,
    padding: '3px 10px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  bookRow: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.06)',
    flexWrap: 'wrap',
    transition: 'background 0.2s ease',
  },
  cover: {
    width: '52px',
    height: '70px',
    objectFit: 'cover',
    borderRadius: '8px',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  coverPlaceholder: {
    width: '52px',
    height: '70px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid rgba(99,102,241,0.25)',
  },
  bookInfo: {
    flex: 1,
    minWidth: '140px',
  },
  bookTitle: {
    margin: `0 0 ${SPACING.sm} 0`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
    letterSpacing: '0.01em',
  },
  progressTrack: {
    height: '10px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
    background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
    transition: 'width 0.5s ease',
    boxShadow: '0 0 8px rgba(99,102,241,0.5)',
  },
  progressMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  progressPct: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#a5b4fc',
  },
  progressTopics: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.4)',
  },
  lastSeen: {
    margin: 0,
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  openBtn: {
    padding: `8px 16px`,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.7), rgba(139,92,246,0.7))',
    color: '#fff',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    flexShrink: 0,
    letterSpacing: '0.02em',
    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
    whiteSpace: 'nowrap',
  },
  empty: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    textAlign: 'center',
    padding: SPACING.xl,
  },
};

export default BookProgressCard;
