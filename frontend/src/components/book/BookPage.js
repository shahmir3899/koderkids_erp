// ============================================
// BOOK PAGE - A4-proportioned content container
// ============================================
// White page with triangle bunting borders,
// paper shadow, and proper book margins

import React, { useRef, useState, useEffect } from 'react';
import { TriangleBunting, PageNumber } from './BookDecorations';
import {
  BOOK_COLORS,
  BOOK_PAGE,
  BOOK_SHADOWS,
} from '../../utils/bookTheme';

const BookPage = ({
  children,
  pageNumber,
  topicId,
  onScroll,
}) => {
  const scrollRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll progress tracking + reset on topic change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 100;
      setScrollProgress(progress);
      onScroll?.(progress);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    el.scrollTop = 0;
    setScrollProgress(0);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [topicId, onScroll]);

  return (
    <div style={styles.wrapper}>
      {/* Scroll progress bar */}
      <div style={styles.scrollProgressTrack}>
        <div
          style={{
            ...styles.scrollProgressBar,
            width: `${scrollProgress}%`,
          }}
        />
      </div>

      <div
        ref={scrollRef}
        className="book-page-enter"
        style={styles.page}
      >
        {/* Top bunting */}
        <TriangleBunting />

        {/* Page content */}
        <div style={styles.content}>
          {children}
        </div>

        {/* Bottom bunting */}
        <TriangleBunting flipped />

        {/* Page number */}
        {pageNumber && (
          <div style={styles.pageNumberWrap}>
            <PageNumber number={pageNumber} />
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },

  scrollProgressTrack: {
    position: 'sticky',
    top: 0,
    width: '100%',
    height: '3px',
    background: BOOK_COLORS.borderLight,
    zIndex: 10,
    flexShrink: 0,
  },

  scrollProgressBar: {
    height: '100%',
    background: `linear-gradient(90deg, ${BOOK_COLORS.classActivity}, ${BOOK_COLORS.heading})`,
    borderRadius: '0 2px 2px 0',
    transition: 'width 0.2s ease',
  },

  page: {
    flex: 1,
    maxWidth: BOOK_PAGE.maxWidth,
    width: '100%',
    margin: '0 auto',
    background: BOOK_COLORS.pageBg,
    boxShadow: BOOK_SHADOWS.page,
    borderRadius: '2px',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  content: {
    flex: 1,
    padding: BOOK_PAGE.padding,
    fontFamily: "'Nunito', sans-serif",
    fontSize: '0.9375rem',
    color: BOOK_COLORS.body,
    lineHeight: 1.7,
  },

  pageNumberWrap: {
    padding: '0.5rem 0 1rem',
    flexShrink: 0,
  },
};

export default BookPage;
