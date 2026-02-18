// ============================================
// MY LESSONS PAGE - Student's enrolled lessons (Books)
// ============================================
// Location: src/pages/lms/MyCoursesPage.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faGraduationCap,
  faClock,
  faPlay,
  faSearch,
  faSync,
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';

// Components
import CourseCard from '../../components/lms/course/CourseCard';

// Context & Services
import { useLMS } from '../../contexts/LMSContext';
import { useUser } from '../../contexts/UserContext';

// Design System
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
  LAYOUT,
} from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const { user } = useUser();
  const {
    myCourses,
    myCoursesLoading,
    fetchMyCourses,
    continueLearning,
    fetchContinueLearning,
  } = useLMS();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, in_progress, completed
  const [enrolling, setEnrolling] = useState(false);

  // Fetch data on mount and auto-enroll students
  useEffect(() => {
    const loadData = async () => {
      await fetchMyCourses();
      fetchContinueLearning();
    };
    loadData();
  }, [fetchMyCourses, fetchContinueLearning]);

  // Manual refresh
  const handleRefresh = async () => {
    setEnrolling(true);
    try {
      await fetchMyCourses();
    } finally {
      setEnrolling(false);
    }
  };

  // Filter courses
  const filteredCourses = myCourses.filter((enrollment) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!enrollment.course_title?.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Status filter
    if (filter === 'in_progress' && enrollment.status !== 'active') {
      return false;
    }
    if (filter === 'completed' && enrollment.status !== 'completed') {
      return false;
    }

    return true;
  });

  // Stats
  const totalCourses = myCourses.length;
  const completedCourses = myCourses.filter((e) => e.status === 'completed').length;
  const inProgressCourses = myCourses.filter((e) => e.status === 'active').length;

  // Handlers
  const handleContinue = (course, enrollment) => {
    const topicId = enrollment?.last_topic || '';
    navigate(`/lms/book/${course.id}${topicId ? `/${topicId}` : ''}`);
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={{
            ...styles.pageTitle,
            fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
          }}>
            <FontAwesomeIcon icon={faGraduationCap} style={styles.titleIcon} />
            My Lessons
          </h1>
          <p style={styles.subtitle}>
            Continue your learning journey
          </p>
        </div>

        <button
          style={styles.browseButton}
          onClick={handleRefresh}
          disabled={enrolling}
        >
          <FontAwesomeIcon icon={faSync} style={{ marginRight: '8px' }} spin={enrolling} />
          {enrolling ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Continue Learning Card */}
      {continueLearning && (
        <div style={styles.continueCard}>
          <div style={styles.continueContent}>
            <span style={styles.continueLabel}>
              <FontAwesomeIcon icon={faPlay} style={{ marginRight: '8px' }} />
              Continue where you left off
            </span>
            <h3 style={styles.continueTitle}>{continueLearning.course_title}</h3>
            {continueLearning.topic_title && (
              <p style={styles.continueTopic}>{continueLearning.topic_title}</p>
            )}
            <div style={styles.continueProgress}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${continueLearning.progress_percentage || 0}%`,
                  }}
                />
              </div>
              <span style={styles.progressText}>
                {continueLearning.progress_percentage || 0}% complete
              </span>
            </div>
          </div>
          <button
            style={styles.resumeButton}
            onClick={() => navigate(
              `/lms/book/${continueLearning.course_id}${continueLearning.topic_id ? `/${continueLearning.topic_id}` : ''}`
            )}
          >
            <FontAwesomeIcon icon={faPlay} style={{ marginRight: '8px' }} />
            Resume
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{
        ...styles.statsGrid,
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      }}>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faBook} style={{ ...styles.statIcon, color: COLORS.status.info }} />
          <div>
            <p style={styles.statValue}>{totalCourses}</p>
            <p style={styles.statLabel}>Total Lessons</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faClock} style={{ ...styles.statIcon, color: COLORS.status.warning }} />
          <div>
            <p style={styles.statValue}>{inProgressCourses}</p>
            <p style={styles.statLabel}>In Progress</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faGraduationCap} style={{ ...styles.statIcon, color: COLORS.status.success }} />
          <div>
            <p style={styles.statValue}>{completedCourses}</p>
            <p style={styles.statLabel}>Completed</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={{
        ...styles.filterBar,
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <div style={styles.searchContainer}>
          <FontAwesomeIcon icon={faSearch} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterTabs}>
          {[
            { key: 'all', label: 'All' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              style={{
                ...styles.filterTab,
                ...(filter === tab.key ? styles.filterTabActive : {}),
              }}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {myCoursesLoading ? (
        <div style={styles.loadingContainer}>
          <ClipLoader size={40} color={COLORS.status.info} />
          <p style={styles.loadingText}>Loading your lessons...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div style={styles.emptyState}>
          <FontAwesomeIcon icon={faBook} style={styles.emptyIcon} />
          <h3 style={styles.emptyTitle}>
            {myCourses.length === 0
              ? 'No lessons assigned yet'
              : 'No lessons match your search'}
          </h3>
          <p style={styles.emptyText}>
            {myCourses.length === 0
              ? 'Your teacher will assign lessons to your class'
              : 'Try adjusting your filters'}
          </p>
          {myCourses.length === 0 && (
            <button style={styles.emptyButton} onClick={handleRefresh} disabled={enrolling}>
              <FontAwesomeIcon icon={faSync} style={{ marginRight: '8px' }} spin={enrolling} />
              {enrolling ? 'Loading...' : 'Refresh Lessons'}
            </button>
          )}
        </div>
      ) : (
        <div style={{
          ...styles.courseGrid,
          gridTemplateColumns: isMobile
            ? '1fr'
            : isTablet
              ? 'repeat(2, 1fr)'
              : 'repeat(3, 1fr)',
        }}>
          {filteredCourses.map((enrollment) => (
            <CourseCard
              key={enrollment.id || `course-${enrollment.course}`}
              course={{
                id: enrollment.course,
                title: enrollment.course_title,
                cover: enrollment.course_cover,
                total_topics: enrollment.total_topics,
                total_duration_minutes: enrollment.total_duration_minutes,
              }}
              enrollment={enrollment}
              topicValidations={enrollment.topic_validations || []}
              onContinue={handleContinue}
              showEnrollButton={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: SPACING.xl,
    maxWidth: LAYOUT.maxWidth.md,
    margin: '0 auto',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
    gap: SPACING.md,
  },

  headerContent: {},

  pageTitle: {
    margin: 0,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },

  titleIcon: {
    color: COLORS.status.info,
  },

  subtitle: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },

  browseButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    backgroundColor: COLORS.status.success,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
  },

  // Continue Learning Card
  continueCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    borderLeft: `4px solid ${COLORS.status.info}`,
  },

  continueContent: {
    flex: 1,
    minWidth: '200px',
  },

  continueLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.status.info,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: FONT_WEIGHTS.semibold,
  },

  continueTitle: {
    margin: `${SPACING.sm} 0 ${SPACING.xs}`,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  continueTopic: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },

  continueProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },

  progressBar: {
    flex: 1,
    maxWidth: '200px',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.status.info,
    borderRadius: BORDER_RADIUS.full,
    transition: `width ${TRANSITIONS.slow}`,
  },

  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },

  resumeButton: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
    display: 'flex',
    alignItems: 'center',
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  statCard: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  },

  statIcon: {
    fontSize: FONT_SIZES['2xl'],
  },

  statValue: {
    margin: 0,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },

  statLabel: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },

  // Filter Bar
  filterBar: {
    display: 'flex',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },

  searchContainer: {
    flex: 1,
    position: 'relative',
    maxWidth: '400px',
  },

  searchIcon: {
    position: 'absolute',
    left: SPACING.md,
    top: '50%',
    transform: 'translateY(-50%)',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },

  searchInput: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md} ${SPACING.sm} ${SPACING.xl}`,
    paddingLeft: '40px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: `1px solid ${COLORS.border.whiteTransparent}`,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
    transition: `all ${TRANSITIONS.fast}`,
  },

  filterTabs: {
    display: 'flex',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },

  filterTab: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },

  filterTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: COLORS.text.white,
  },

  // Course Grid
  courseGrid: {
    display: 'grid',
    gap: SPACING.lg,
  },

  // Loading
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['3xl'],
    gap: SPACING.md,
  },

  loadingText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },

  // Empty State
  emptyState: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING['3xl'],
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: '3rem',
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.lg,
  },

  emptyTitle: {
    margin: 0,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  emptyText: {
    margin: `${SPACING.sm} 0 ${SPACING.lg}`,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },

  emptyButton: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
};

export default MyCoursesPage;
