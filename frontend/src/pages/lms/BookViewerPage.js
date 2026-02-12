// ============================================
// BOOK VIEWER PAGE - Interactive book experience
// ============================================
// Kid-friendly, colorful book viewer that mimics
// the KoderKids PDF textbook visual style.
// Reuses LMSContext for all state/API/progress.

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronLeft,
  faChevronRight,
  faBars,
  faQuestionCircle,
  faExpand,
  faCompress,
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';

// Book components
import BookSidebar from '../../components/book/BookSidebar';
import BookPage from '../../components/book/BookPage';
import BookContentRenderer from '../../components/book/BookContentRenderer';
import ReadingTimer, { calculateReadingTime } from '../../components/book/ReadingTimer';
import ValidationStepper from '../../components/book/ValidationStepper';
import SmartCompleteButton from '../../components/book/SmartCompleteButton';
import CelebrationOverlay from '../../components/book/CelebrationOverlay';
import ImageZoom from '../../components/book/ImageZoom';
import '../../components/book/BookViewerPage.css';

// Context & hooks
import { useLMS } from '../../contexts/LMSContext';
import { useResponsive } from '../../hooks/useResponsive';

// Theme
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
} from '../../utils/bookTheme';

const BookViewerPage = () => {
  const { courseId, topicId } = useParams();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  const {
    currentCourse,
    currentTopic,
    topicContent,
    topicProgress,
    courseLoading,
    topicLoading,
    loadCourse,
    loadTopicContent,
    markTopicComplete,
    getTopicStatus,
    findFirstUnlockedTopic,
    findNextTopic,
    findPreviousTopic,
    startHeartbeat,
    stopHeartbeat,
    resetPlayer,
    activityProofs,
    loadProofsForCourse,
    addProof,
    validationSteps,
    loadValidationSteps,
    refreshValidation,
    readingTime,
  } = useLMS();

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isCompleting, setIsCompleting] = useState(false);
  const [loadedTopicId, setLoadedTopicId] = useState(null);
  const [imageZoom, setImageZoom] = useState(null);
  const [celebration, setCelebration] = useState(null); // null | 'topic' | 'chapter' | 'course'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentAreaRef = useRef(null);
  const containerRef = useRef(null);

  // Cache activity blocks per topic so sidebar shows them even after navigating away
  const [activityBlocksMap, setActivityBlocksMap] = useState({});

  // ── Load course on mount ──
  useEffect(() => {
    if (courseId) {
      loadCourse(parseInt(courseId));
      loadProofsForCourse(parseInt(courseId));
    }
    return () => stopHeartbeat();
  }, [courseId, loadCourse, loadProofsForCourse, stopHeartbeat]);

  // ── Load topic when course ready / topicId changes ──
  useEffect(() => {
    if (currentCourse && currentCourse.topics?.length > 0) {
      let targetTopicId = topicId ? parseInt(topicId) : null;

      if (!targetTopicId) {
        const firstTopic = findFirstUnlockedTopic(currentCourse.topics);
        if (firstTopic) {
          targetTopicId = firstTopic.id;
          navigate(`/lms/book/${courseId}/${targetTopicId}`, { replace: true });
          return;
        }
      }

      if (targetTopicId && targetTopicId !== loadedTopicId) {
        setLoadedTopicId(targetTopicId);
        loadTopicContent(targetTopicId);
        startHeartbeat(targetTopicId);
        loadValidationSteps(targetTopicId);
      }
    }
  }, [
    currentCourse?.id,
    topicId,
    courseId,
    loadedTopicId,
    loadTopicContent,
    findFirstUnlockedTopic,
    startHeartbeat,
    loadValidationSteps,
    navigate,
  ]);

  // ── Cache activity blocks when topicContent loads ──
  useEffect(() => {
    if (topicContent?.id && topicContent.activity_blocks) {
      const blocks = Array.isArray(topicContent.activity_blocks)
        ? topicContent.activity_blocks
        : [];
      if (blocks.length > 0) {
        setActivityBlocksMap((prev) => ({
          ...prev,
          [topicContent.id]: blocks,
        }));
      }
    }
  }, [topicContent]);

  // ── Fullscreen toggle ──
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {
        // Fallback: just toggle our CSS-based fullscreen
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Sync state when browser fullscreen changes (e.g. user presses Esc)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowLeft': handlePrevious(); break;
        case 'ArrowRight': handleNext(); break;
        case 'Enter':
          if (e.ctrlKey || e.metaKey) handleComplete();
          break;
        case 'Escape':
          if (imageZoom) setImageZoom(null);
          else if (isFullscreen) toggleFullscreen();
          else handleExit();
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) toggleFullscreen();
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCourse, currentTopic, imageZoom, isFullscreen, toggleFullscreen]);

  // ── Navigation handlers ──
  const handleSelectTopic = useCallback((topic) => {
    stopHeartbeat();
    navigate(`/lms/book/${courseId}/${topic.id}`);
    if (isMobile) setSidebarOpen(false);
  }, [courseId, navigate, stopHeartbeat, isMobile]);

  const handlePrevious = useCallback(() => {
    if (!currentCourse || !currentTopic) return;
    const prev = findPreviousTopic(currentCourse.topics, currentTopic.id);
    if (prev) handleSelectTopic(prev);
  }, [currentCourse, currentTopic, findPreviousTopic, handleSelectTopic]);

  const handleNext = useCallback(() => {
    if (!currentCourse || !currentTopic) return;
    const next = findNextTopic(currentCourse.topics, currentTopic.id);
    if (next) handleSelectTopic(next);
  }, [currentCourse, currentTopic, findNextTopic, handleSelectTopic]);

  const handleComplete = useCallback(async () => {
    if (!currentTopic || isCompleting) return;
    setIsCompleting(true);
    try {
      const result = await markTopicComplete(currentTopic.id);

      // Determine celebration type
      const celebType = result.course_completed
        ? 'course'
        : currentTopic.type === 'chapter'
          ? 'chapter'
          : 'topic';
      setCelebration(celebType);

      // Auto-navigate after celebration (unless course is done)
      if (!result.course_completed) {
        const next = findNextTopic(currentCourse.topics, currentTopic.id);
        if (next) {
          setTimeout(() => handleSelectTopic(next), celebType === 'topic' ? 2200 : 2800);
        }
      }
    } finally {
      setIsCompleting(false);
    }
  }, [currentTopic, isCompleting, markTopicComplete, currentCourse, findNextTopic, handleSelectTopic]);

  const handleExit = useCallback(() => {
    stopHeartbeat();
    resetPlayer();
    navigate('/lms/my-courses');
  }, [stopHeartbeat, resetPlayer, navigate]);

  // ── Derived state ──
  const currentStatus = currentTopic ? getTopicStatus(currentTopic.id) : null;
  const isCompleted = currentStatus?.status === 'completed';
  const progressPercentage = currentCourse?.enrollment?.progress_percentage || 0;
  const hasPrevious = currentCourse && currentTopic && findPreviousTopic(currentCourse.topics, currentTopic.id);
  const hasNext = currentCourse && currentTopic && findNextTopic(currentCourse.topics, currentTopic.id);

  // ── Compute topic "page number" ──
  const getTopicIndex = () => {
    if (!currentCourse || !currentTopic) return null;
    let index = 0;
    const walk = (topics) => {
      for (const t of topics) {
        index++;
        if (t.id === currentTopic.id) return index;
        if (t.children?.length) {
          const found = walk(t.children);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(currentCourse.topics);
  };

  // ── Check if topic has home_activity blocks ──
  const hasHomeActivity = useMemo(() => {
    if (!topicContent?.activity_blocks) return false;
    const blocks = Array.isArray(topicContent.activity_blocks) ? topicContent.activity_blocks : [];
    return blocks.some((b) => {
      const t = b.type?.toLowerCase();
      return t === 'home_activity' || t === 'home';
    });
  }, [topicContent]);

  // ── Dynamic reading time based on content word count ──
  const requiredReadingTime = useMemo(() => {
    return calculateReadingTime(topicContent);
  }, [topicContent]);

  // ── Scroll to upload section ──
  const handleScrollToUpload = useCallback(() => {
    const el = contentAreaRef.current;
    if (el) {
      // Find the homework uploader section
      const uploadSection = el.querySelector('[data-homework-upload]');
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback: scroll to bottom
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }, []);

  // ── Scroll to a specific activity block by index ──
  const handleScrollToActivity = useCallback((blockIndex) => {
    const el = contentAreaRef.current;
    if (el) {
      const target = el.querySelector(`[data-activity-block="${blockIndex}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  // ── Loading ──
  if (courseLoading || !currentCourse) {
    return (
      <div style={styles.loadingContainer}>
        <ClipLoader size={45} color={BOOK_COLORS.heading} />
        <p style={styles.loadingText}>Loading book...</p>
      </div>
    );
  }

  return (
    <div className="book-viewer-page" style={styles.container} ref={containerRef}>
      {/* ── Header (hidden in fullscreen) ── */}
      {!isFullscreen && (
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backBtn} onClick={handleExit} title="Back to courses">
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            {isMobile && (
              <button
                style={styles.menuBtn}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <FontAwesomeIcon icon={faBars} />
              </button>
            )}
            <h1 style={styles.headerTitle}>{currentCourse.title}</h1>
          </div>
          <div style={styles.headerRight}>
            <button
              className="book-fs-toggle"
              style={styles.fullscreenBtn}
              onClick={toggleFullscreen}
              title="Enter fullscreen (F)"
            >
              <FontAwesomeIcon icon={faExpand} />
            </button>
            <span style={styles.progressPill}>
              {progressPercentage}%
            </span>
          </div>
        </header>
      )}

      {/* ── Fullscreen floating toolbar (hover to reveal) ── */}
      {isFullscreen && (
        <>
          <div className="book-fullscreen-hover-zone" />
          <div className="book-fullscreen-bar" style={styles.fullscreenBar}>
            <span style={styles.fullscreenTitle}>
              {currentTopic?.title || currentCourse.title}
            </span>
            <button
              style={styles.fullscreenExitBtn}
              onClick={toggleFullscreen}
              title="Exit fullscreen (Esc)"
            >
              <FontAwesomeIcon icon={faCompress} style={{ marginRight: '6px' }} />
              Exit
            </button>
          </div>
        </>
      )}

      {/* ── Main layout ── */}
      <div style={styles.main}>
        {/* Sidebar (hidden in fullscreen) */}
        {!isFullscreen && (sidebarOpen || !isMobile) && (
          <>
            {isMobile && (
              <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
            )}
            <aside
              style={{
                ...styles.sidebar,
                ...(isMobile ? styles.sidebarMobile : {}),
              }}
            >
              <BookSidebar
                topics={currentCourse.topics || []}
                currentTopicId={currentTopic?.id}
                topicProgress={topicProgress}
                onSelectTopic={handleSelectTopic}
                courseTitle={currentCourse.title}
                progressPercentage={progressPercentage}
                onClose={isMobile ? () => setSidebarOpen(false) : undefined}
                activityBlocksMap={activityBlocksMap}
                onActivityClick={handleScrollToActivity}
              />
            </aside>
          </>
        )}

        {/* Content area (book canvas) */}
        <main style={styles.contentArea} ref={contentAreaRef}>
          {topicLoading ? (
            <div style={styles.contentLoading}>
              <ClipLoader size={36} color={BOOK_COLORS.heading} />
              <p style={styles.loadingText}>Loading topic...</p>
            </div>
          ) : topicContent ? (
            <BookPage
              key={currentTopic?.id}
              topicId={currentTopic?.id}
              pageNumber={getTopicIndex()}
            >
              {/* Reading timer (animated clock + progress bar) */}
              <ReadingTimer readingTime={readingTime} requiredTime={requiredReadingTime} />

              <BookContentRenderer
                topicContent={topicContent}
                onImageClick={(url) => setImageZoom(url)}
                activityProofs={activityProofs}
                onProofSubmitted={(tid, proof) => {
                  addProof(tid, proof);
                  // Refresh validation steps after upload
                  if (currentTopic?.id) refreshValidation(currentTopic.id);
                }}
              />

              {/* Quiz link */}
              {topicContent.has_quiz && (
                <div style={styles.quizCard}>
                  <FontAwesomeIcon icon={faQuestionCircle} style={styles.quizIcon} />
                  <div style={{ flex: 1 }}>
                    <strong style={styles.quizTitle}>Quiz Time!</strong>
                    <p style={styles.quizText}>Test what you've learned in this topic</p>
                  </div>
                  <button
                    style={styles.quizBtn}
                    onClick={() => navigate(`/lms/quiz/${topicContent.id}`)}
                  >
                    Start Quiz
                  </button>
                </div>
              )}

              {/* Validation stepper (5-step pipeline) */}
              {hasHomeActivity && validationSteps && (
                <ValidationStepper validationData={validationSteps} />
              )}
            </BookPage>
          ) : (
            <div style={styles.emptyContent}>
              <p style={{ color: BOOK_COLORS.muted }}>Select a topic from the sidebar to start reading</p>
            </div>
          )}

          {/* ── Footer navigation ── */}
          {currentTopic && (
            <footer style={styles.footer}>
              <button
                style={{ ...styles.navBtn, opacity: hasPrevious ? 1 : 0.4 }}
                onClick={handlePrevious}
                disabled={!hasPrevious}
              >
                <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '6px' }} />
                Previous
              </button>

              <SmartCompleteButton
                validationData={validationSteps}
                readingTime={readingTime}
                requiredReadingTime={requiredReadingTime}
                isCompleted={isCompleted}
                isCompleting={isCompleting}
                hasHomeActivity={hasHomeActivity}
                onComplete={handleComplete}
                onNavigateNext={handleNext}
                onScrollToUpload={handleScrollToUpload}
              />

              <button
                style={{ ...styles.navBtn, opacity: hasNext ? 1 : 0.4 }}
                onClick={handleNext}
                disabled={!hasNext}
              >
                Next
                <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '6px' }} />
              </button>
            </footer>
          )}
        </main>
      </div>

      {/* ── Image zoom lightbox ── */}
      {imageZoom && (
        <ImageZoom
          src={imageZoom}
          onClose={() => setImageZoom(null)}
        />
      )}

      {/* ── Celebration overlay ── */}
      {celebration && (
        <CelebrationOverlay
          type={celebration}
          visible={!!celebration}
          onDone={() => setCelebration(null)}
        />
      )}
    </div>
  );
};

// ─── STYLES ───
const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: BOOK_COLORS.canvasBg,
    fontFamily: BOOK_FONTS.body,
  },

  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    background: BOOK_COLORS.canvasBg,
  },

  loadingText: {
    color: BOOK_COLORS.muted,
    fontSize: BOOK_FONT_SIZES.sm,
    fontFamily: BOOK_FONTS.body,
  },

  // ── Header ──
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.625rem 1rem',
    background: '#FFFFFF',
    borderBottom: `1px solid ${BOOK_COLORS.border}`,
    minHeight: '56px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flex: 1,
    overflow: 'hidden',
  },

  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'none',
    border: `1px solid ${BOOK_COLORS.border}`,
    borderRadius: BOOK_RADIUS.md,
    color: BOOK_COLORS.bodyLight,
    fontSize: '0.875rem',
    cursor: 'pointer',
  },

  menuBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: BOOK_COLORS.pageAlt,
    border: `1px solid ${BOOK_COLORS.border}`,
    borderRadius: BOOK_RADIUS.md,
    color: BOOK_COLORS.heading,
    fontSize: '0.875rem',
    cursor: 'pointer',
  },

  headerTitle: {
    margin: 0,
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.lg,
    color: BOOK_COLORS.heading,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },

  fullscreenBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'none',
    border: `1px solid ${BOOK_COLORS.border}`,
    borderRadius: BOOK_RADIUS.md,
    color: BOOK_COLORS.bodyLight,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  progressPill: {
    padding: '0.25rem 0.75rem',
    background: `${BOOK_COLORS.heading}12`,
    color: BOOK_COLORS.heading,
    borderRadius: BOOK_RADIUS.full,
    fontSize: BOOK_FONT_SIZES.sm,
    fontWeight: 700,
    fontFamily: BOOK_FONTS.body,
  },

  // ── Fullscreen bar ──
  fullscreenBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 1rem',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)',
    zIndex: 50,
    opacity: 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
  },

  fullscreenTitle: {
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.sm,
    color: '#FFFFFF',
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  fullscreenExitBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.375rem 0.875rem',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: BOOK_RADIUS.md,
    color: '#FFFFFF',
    fontFamily: BOOK_FONTS.body,
    fontWeight: 600,
    fontSize: BOOK_FONT_SIZES.xs,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    pointerEvents: 'auto',
  },

  // ── Main ──
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },

  sidebar: {
    width: '300px',
    flexShrink: 0,
    overflow: 'hidden',
  },

  sidebarMobile: {
    position: 'fixed',
    top: '56px',
    left: 0,
    bottom: 0,
    width: '300px',
    zIndex: 1000,
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
  },

  overlay: {
    position: 'fixed',
    top: '56px',
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },

  // ── Content ──
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '1rem',
  },

  contentLoading: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
  },

  emptyContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Quiz card ──
  quizCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.25rem',
    background: '#FFFBEB',
    border: `2px solid ${BOOK_COLORS.warning}40`,
    borderRadius: BOOK_RADIUS.lg,
    marginTop: '1.5rem',
  },

  quizIcon: {
    fontSize: '1.5rem',
    color: BOOK_COLORS.warning,
  },

  quizTitle: {
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.md,
    color: '#92400E',
    display: 'block',
  },

  quizText: {
    margin: '0.125rem 0 0',
    fontSize: BOOK_FONT_SIZES.sm,
    color: BOOK_COLORS.bodyLight,
  },

  quizBtn: {
    padding: '0.5rem 1.25rem',
    background: BOOK_COLORS.warning,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: BOOK_RADIUS.md,
    fontFamily: BOOK_FONTS.body,
    fontWeight: 700,
    fontSize: BOOK_FONT_SIZES.sm,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // ── Footer ──
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    gap: '0.75rem',
    maxWidth: '820px',
    width: '100%',
    margin: '0 auto',
    flexShrink: 0,
  },

  navBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    background: '#FFFFFF',
    border: `1px solid ${BOOK_COLORS.border}`,
    borderRadius: BOOK_RADIUS.md,
    color: BOOK_COLORS.body,
    fontFamily: BOOK_FONTS.body,
    fontWeight: 600,
    fontSize: BOOK_FONT_SIZES.sm,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

};

export default BookViewerPage;
