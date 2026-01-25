// ============================================
// COURSE PLAYER PAGE - Main learning interface
// ============================================
// Location: src/pages/lms/CoursePlayerPage.js

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronLeft,
  faChevronRight,
  faCheck,
  faBars,
  faTimes,
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';

// Components
import TopicSidebar from '../../components/lms/player/TopicSidebar';
import ContentViewer from '../../components/lms/player/ContentViewer';
import VideoPlayer from '../../components/lms/player/VideoPlayer';

// Context
import { useLMS } from '../../contexts/LMSContext';

// Design System
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  Z_INDEX,
} from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';

const CoursePlayerPage = () => {
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
  } = useLMS();

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isCompleting, setIsCompleting] = useState(false);
  const [loadedTopicId, setLoadedTopicId] = useState(null);

  // Load course on mount
  useEffect(() => {
    if (courseId) {
      loadCourse(parseInt(courseId));
    }

    return () => {
      stopHeartbeat();
    };
  }, [courseId, loadCourse, stopHeartbeat]);

  // Load topic when course is ready or topicId changes
  useEffect(() => {
    if (currentCourse && currentCourse.topics?.length > 0) {
      let targetTopicId = topicId ? parseInt(topicId) : null;

      // If no topic specified, find first unlocked topic
      if (!targetTopicId) {
        const firstTopic = findFirstUnlockedTopic(currentCourse.topics);
        if (firstTopic) {
          targetTopicId = firstTopic.id;
          // Update URL without adding to history
          navigate(`/lms/learn/${courseId}/${targetTopicId}`, { replace: true });
          return; // Let the URL change trigger this effect again
        }
      }

      // Only load if this is a different topic than what we already loaded
      if (targetTopicId && targetTopicId !== loadedTopicId) {
        setLoadedTopicId(targetTopicId);
        loadTopicContent(targetTopicId);
        startHeartbeat(targetTopicId);
      }
    }
  }, [
    currentCourse?.id, // Only react to course ID changes, not the entire object
    topicId,
    courseId,
    loadedTopicId,
    loadTopicContent,
    findFirstUnlockedTopic,
    startHeartbeat,
    navigate,
  ]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            handleComplete();
          }
          break;
        case 'Escape':
          handleExit();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCourse, currentTopic]);

  // Navigation handlers
  const handleSelectTopic = useCallback((topic) => {
    stopHeartbeat();
    navigate(`/lms/learn/${courseId}/${topic.id}`);
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [courseId, navigate, stopHeartbeat, isMobile]);

  const handlePrevious = useCallback(() => {
    if (!currentCourse || !currentTopic) return;
    const prevTopic = findPreviousTopic(currentCourse.topics, currentTopic.id);
    if (prevTopic) {
      handleSelectTopic(prevTopic);
    }
  }, [currentCourse, currentTopic, findPreviousTopic, handleSelectTopic]);

  const handleNext = useCallback(() => {
    if (!currentCourse || !currentTopic) return;
    const nextTopic = findNextTopic(currentCourse.topics, currentTopic.id);
    if (nextTopic) {
      handleSelectTopic(nextTopic);
    }
  }, [currentCourse, currentTopic, findNextTopic, handleSelectTopic]);

  const handleComplete = useCallback(async () => {
    if (!currentTopic || isCompleting) return;

    setIsCompleting(true);
    try {
      const result = await markTopicComplete(currentTopic.id);

      // Auto-advance to next topic if available
      if (!result.course_completed) {
        const nextTopic = findNextTopic(currentCourse.topics, currentTopic.id);
        if (nextTopic) {
          setTimeout(() => handleSelectTopic(nextTopic), 500);
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

  // Get current topic status
  const currentStatus = currentTopic ? getTopicStatus(currentTopic.id) : null;
  const isCompleted = currentStatus?.status === 'completed';

  // Calculate progress
  const progressPercentage = currentCourse?.enrollment?.progress_percentage || 0;

  // Check if has previous/next
  const hasPrevious = currentCourse && currentTopic && findPreviousTopic(currentCourse.topics, currentTopic.id);
  const hasNext = currentCourse && currentTopic && findNextTopic(currentCourse.topics, currentTopic.id);

  // Loading state
  if (courseLoading || !currentCourse) {
    return (
      <div style={styles.loadingContainer}>
        <ClipLoader size={50} color={COLORS.status.info} />
        <p style={styles.loadingText}>Loading course...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={handleExit}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          {isMobile && (
            <button
              style={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
            </button>
          )}
          <h1 style={styles.headerTitle}>
            {currentCourse.title}
          </h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.progressBadge}>
            {progressPercentage}% complete
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Sidebar */}
        {(sidebarOpen || !isMobile) && (
          <>
            {isMobile && (
              <div
                style={styles.sidebarOverlay}
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <aside style={{
              ...styles.sidebar,
              ...(isMobile ? styles.sidebarMobile : {}),
            }}>
              <TopicSidebar
                topics={currentCourse.topics || []}
                currentTopicId={currentTopic?.id}
                topicProgress={topicProgress}
                onSelectTopic={handleSelectTopic}
                courseTitle={currentCourse.title}
                progressPercentage={progressPercentage}
              />
            </aside>
          </>
        )}

        {/* Content Area */}
        <main style={styles.content}>
          {topicLoading ? (
            <div style={styles.contentLoading}>
              <ClipLoader size={40} color={COLORS.status.info} />
              <p style={styles.loadingText}>Loading topic...</p>
            </div>
          ) : topicContent ? (
            <div style={styles.topicContainer}>
              {/* Topic Title */}
              <h2 style={styles.topicTitle}>
                {topicContent.display_title || topicContent.title}
              </h2>

              {/* Video Player (if available) */}
              {topicContent.video_url && (
                <VideoPlayer
                  videoUrl={topicContent.video_url}
                  title={topicContent.display_title}
                />
              )}

              {/* Main Content & Activity Blocks */}
              <ContentViewer
                activityBlocks={topicContent.activity_blocks}
                topicTitle={topicContent.display_title}
                mainContent={topicContent.content}
                topicType={topicContent.type}
              />

              {/* Quiz Link (if has quiz) */}
              {topicContent.has_quiz && (
                <div style={styles.quizSection}>
                  <FontAwesomeIcon icon={faQuestionCircle} style={styles.quizIcon} />
                  <div>
                    <h4 style={styles.quizTitle}>Topic Quiz</h4>
                    <p style={styles.quizText}>
                      Test your understanding of this topic
                    </p>
                  </div>
                  <button
                    style={styles.quizButton}
                    onClick={() => navigate(`/lms/quiz/${topicContent.id}`)}
                  >
                    Start Quiz
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptyContent}>
              <p>Select a topic to begin learning</p>
            </div>
          )}

          {/* Navigation Footer */}
          {currentTopic && (
            <footer style={styles.footer}>
              <button
                style={{
                  ...styles.navButton,
                  opacity: hasPrevious ? 1 : 0.5,
                }}
                onClick={handlePrevious}
                disabled={!hasPrevious}
              >
                <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '8px' }} />
                Previous
              </button>

              <button
                style={{
                  ...styles.completeButton,
                  backgroundColor: isCompleted
                    ? COLORS.status.success
                    : COLORS.status.info,
                }}
                onClick={handleComplete}
                disabled={isCompleted || isCompleting}
              >
                {isCompleting ? (
                  <ClipLoader size={16} color={COLORS.text.white} />
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} style={{ marginRight: '8px' }} />
                    {isCompleted ? 'Completed' : 'Mark Complete'}
                  </>
                )}
              </button>

              <button
                style={{
                  ...styles.navButton,
                  opacity: hasNext ? 1 : 0.5,
                }}
                onClick={handleNext}
                disabled={!hasNext}
              >
                Next
                <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '8px' }} />
              </button>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
  },

  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },

  loadingText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    minHeight: '60px',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
    overflow: 'hidden',
  },

  backButton: {
    padding: SPACING.sm,
    backgroundColor: 'transparent',
    border: 'none',
    color: COLORS.text.white,
    fontSize: FONT_SIZES.md,
    cursor: 'pointer',
    borderRadius: BORDER_RADIUS.md,
    transition: `all ${TRANSITIONS.fast}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
  },

  menuButton: {
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: COLORS.text.white,
    fontSize: FONT_SIZES.md,
    cursor: 'pointer',
    borderRadius: BORDER_RADIUS.md,
    width: '40px',
    height: '40px',
  },

  headerTitle: {
    margin: 0,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },

  progressBadge: {
    padding: `${SPACING.xs} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.full,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteTransparent,
  },

  // Main
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },

  // Sidebar
  sidebar: {
    width: '320px',
    flexShrink: 0,
    overflow: 'hidden',
  },

  sidebarMobile: {
    position: 'fixed',
    top: '60px',
    left: 0,
    bottom: 0,
    width: '300px',
    zIndex: Z_INDEX.sidebar,
    backgroundColor: 'rgba(30, 30, 50, 0.98)',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
  },

  sidebarOverlay: {
    position: 'fixed',
    top: '60px',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: Z_INDEX.sidebar - 1,
  },

  // Content
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  contentLoading: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },

  topicContainer: {
    flex: 1,
    overflow: 'auto',
    padding: SPACING.xl,
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  },

  topicTitle: {
    margin: `0 0 ${SPACING.xl}`,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },

  emptyContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.text.whiteSubtle,
  },

  // Quiz Section
  quizSection: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.xl,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
    borderLeft: `4px solid ${COLORS.status.warning}`,
  },

  quizIcon: {
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.status.warning,
  },

  quizTitle: {
    margin: 0,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  quizText: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },

  quizButton: {
    marginLeft: 'auto',
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.status.warning,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTop: `1px solid ${COLORS.border.whiteTransparent}`,
    gap: SPACING.md,
  },

  navButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    color: COLORS.text.white,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
    display: 'flex',
    alignItems: 'center',
  },

  completeButton: {
    padding: `${SPACING.sm} ${SPACING.xl}`,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
    minWidth: '140px',
    justifyContent: 'center',
  },
};

export default CoursePlayerPage;
