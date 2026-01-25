// ============================================
// TOPIC SIDEBAR - Course navigation with progress
// ============================================
// Location: src/components/lms/player/TopicSidebar.js

import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faCheck,
  faLock,
  faPlay,
  faBook,
  faFileAlt,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
} from '../../../utils/designConstants';

const TopicSidebar = ({
  topics = [],
  currentTopicId,
  topicProgress = {},
  onSelectTopic,
  courseTitle,
  progressPercentage = 0,
}) => {
  const [expandedChapters, setExpandedChapters] = useState(() => {
    // Auto-expand chapter containing current topic
    const expanded = {};
    const findChapter = (items, chapterId = null) => {
      for (const item of items) {
        if (item.id === currentTopicId) {
          if (chapterId) expanded[chapterId] = true;
          return true;
        }
        if (item.children?.length) {
          const found = findChapter(item.children, item.type === 'chapter' ? item.id : chapterId);
          if (found && item.type === 'chapter') {
            expanded[item.id] = true;
            return true;
          }
        }
      }
      return false;
    };
    findChapter(topics);
    return expanded;
  });

  const toggleChapter = (chapterId) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const getTopicStatus = useCallback((topicId) => {
    const progress = topicProgress[topicId];
    if (!progress) {
      return { status: 'not_started', is_unlocked: false };
    }
    return {
      status: progress.status || 'not_started',
      is_unlocked: progress.is_unlocked !== false,
    };
  }, [topicProgress]);

  const getStatusIcon = (status, isUnlocked, isCurrent) => {
    if (isCurrent) {
      return { icon: faPlay, color: COLORS.status.info };
    }
    if (status === 'completed') {
      return { icon: faCheck, color: COLORS.status.success };
    }
    if (!isUnlocked) {
      return { icon: faLock, color: COLORS.text.whiteSubtle };
    }
    return { icon: null, color: COLORS.text.whiteSubtle };
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'chapter':
        return faBook;
      case 'activity':
        return faFileAlt;
      default:
        return faFileAlt;
    }
  };

  const renderTopicNode = (topic, depth = 0) => {
    const isChapter = topic.type === 'chapter';
    const hasChildren = topic.children?.length > 0;
    const isExpanded = expandedChapters[topic.id];
    const isCurrent = topic.id === currentTopicId;
    const { status, is_unlocked } = getTopicStatus(topic.id);
    const { icon: statusIcon, color: statusColor } = getStatusIcon(status, is_unlocked, isCurrent);

    const isClickable = is_unlocked || status === 'completed' || isChapter;

    return (
      <div key={topic.id}>
        <div
          style={{
            ...styles.topicNode,
            paddingLeft: `${16 + depth * 16}px`,
            backgroundColor: isCurrent
              ? 'rgba(59, 130, 246, 0.2)'
              : 'transparent',
            borderLeft: isCurrent
              ? `3px solid ${COLORS.status.info}`
              : '3px solid transparent',
            opacity: isClickable ? 1 : 0.5,
            cursor: isClickable ? 'pointer' : 'not-allowed',
          }}
          onClick={() => {
            if (isChapter) {
              // For chapters: toggle expand AND select to show chapter content
              if (hasChildren) {
                toggleChapter(topic.id);
              }
              // Also select the chapter to show its content
              onSelectTopic?.(topic);
            } else if (isClickable) {
              onSelectTopic?.(topic);
            }
          }}
        >
          {/* Expand/Collapse for chapters */}
          {isChapter && hasChildren && (
            <FontAwesomeIcon
              icon={faChevronRight}
              style={{
                ...styles.expandIcon,
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          )}

          {/* Status Icon */}
          <div style={{
            ...styles.statusIcon,
            backgroundColor: isCurrent
              ? COLORS.status.info
              : status === 'completed'
                ? COLORS.status.success
                : 'transparent',
            border: statusIcon
              ? 'none'
              : `2px solid ${is_unlocked ? COLORS.text.whiteSubtle : COLORS.text.whiteSubtle}`,
          }}>
            {statusIcon && (
              <FontAwesomeIcon
                icon={statusIcon}
                style={{
                  fontSize: '10px',
                  color: isCurrent || status === 'completed'
                    ? COLORS.text.white
                    : statusColor,
                }}
              />
            )}
          </div>

          {/* Topic Content */}
          <div style={styles.topicContent}>
            <span style={{
              ...styles.topicTitle,
              fontWeight: isChapter ? FONT_WEIGHTS.semibold : FONT_WEIGHTS.normal,
              color: isCurrent
                ? COLORS.text.white
                : is_unlocked
                  ? COLORS.text.whiteTransparent
                  : COLORS.text.whiteSubtle,
            }}>
              {topic.display_title || topic.title}
            </span>

            {/* Duration for lessons */}
            {!isChapter && topic.estimated_time_minutes && (
              <span style={styles.duration}>
                <FontAwesomeIcon icon={faClock} style={{ marginRight: '4px' }} />
                {topic.estimated_time_minutes}m
              </span>
            )}
          </div>

          {/* Lock icon for locked topics */}
          {!is_unlocked && !isChapter && status !== 'completed' && (
            <FontAwesomeIcon
              icon={faLock}
              style={styles.lockIcon}
            />
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div style={styles.childrenContainer}>
            {topic.children.map((child) => renderTopicNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.courseTitle}>{courseTitle}</h2>
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progressPercentage}%`,
              }}
            />
          </div>
          <span style={styles.progressText}>{progressPercentage}% complete</span>
        </div>
      </div>

      {/* Topic List */}
      <div style={styles.topicList}>
        {topics.length === 0 ? (
          <p style={styles.emptyText}>No topics available</p>
        ) : (
          topics.map((topic) => renderTopicNode(topic, 0))
        )}
      </div>
    </div>
  );
};

const styles = {
  sidebar: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRight: `1px solid ${COLORS.border.whiteTransparent}`,
  },

  header: {
    padding: SPACING.lg,
    borderBottom: `1px solid ${COLORS.border.whiteTransparent}`,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },

  courseTitle: {
    margin: 0,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginBottom: SPACING.md,
    lineHeight: 1.3,
  },

  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xs,
  },

  progressBar: {
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.status.success,
    borderRadius: BORDER_RADIUS.full,
    transition: `width ${TRANSITIONS.slow}`,
  },

  progressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },

  topicList: {
    flex: 1,
    overflowY: 'auto',
    padding: `${SPACING.sm} 0`,
  },

  topicNode: {
    display: 'flex',
    alignItems: 'center',
    padding: `${SPACING.sm} ${SPACING.md}`,
    gap: SPACING.sm,
    transition: `all ${TRANSITIONS.fast}`,
    borderRadius: 0,
    minHeight: '44px', // Touch friendly
  },

  expandIcon: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    transition: `transform ${TRANSITIONS.fast}`,
    width: '16px',
    flexShrink: 0,
  },

  statusIcon: {
    width: '20px',
    height: '20px',
    borderRadius: BORDER_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  topicContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },

  topicTitle: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  duration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    display: 'flex',
    alignItems: 'center',
  },

  lockIcon: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
    flexShrink: 0,
  },

  childrenContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },

  emptyText: {
    padding: SPACING.lg,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
};

export default TopicSidebar;
