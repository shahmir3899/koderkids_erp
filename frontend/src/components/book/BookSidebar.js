// ============================================
// BOOK SIDEBAR - Light-themed topic navigation
// ============================================
// Adapted from TopicSidebar with KoderKids book theme

import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faCheck,
  faLock,
  faPlay,
  faClock,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
} from '../../utils/bookTheme';

// Strip internal code prefixes like "1.2.class.1" from activity titles
const stripCodePrefix = (title) => {
  if (!title) return title;
  return title.replace(/^[\d.]+(?:class_activity|home_activity|class|home|note|challenge)[\d.]*\s*/i, '').trim();
};

// Activity type config for sidebar display
const ACTIVITY_CONFIGS = {
  class_activity: { emoji: '\uD83D\uDCDD', color: '#3B82F6', label: 'Class Activity' },
  class: { emoji: '\uD83D\uDCDD', color: '#3B82F6', label: 'Class Activity' },
  home_activity: { emoji: '\uD83C\uDFE0', color: '#10B981', label: 'Home Activity' },
  home: { emoji: '\uD83C\uDFE0', color: '#10B981', label: 'Home Activity' },
  challenge: { emoji: '\u2B50', color: '#EF4444', label: 'Challenge' },
  note: { emoji: '\uD83D\uDCA1', color: '#F59E0B', label: 'Fun Fact' },
};

const BookSidebar = ({
  topics = [],
  currentTopicId,
  topicProgress = {},
  onSelectTopic,
  courseTitle,
  progressPercentage = 0,
  onClose,       // For mobile drawer close
  isMobileOpen,  // Whether mobile drawer is open
  activityBlocksMap = {},  // Map of topicId → activity blocks (cached)
  onActivityClick,         // Callback(blockIndex) to scroll to activity in current topic
}) => {
  const [expandedChapters, setExpandedChapters] = useState(() => {
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
    if (!progress) return { status: 'not_started', is_unlocked: false };
    return {
      status: progress.status || 'not_started',
      is_unlocked: progress.is_unlocked !== false,
    };
  }, [topicProgress]);

  const getStatusConfig = (status, isUnlocked, isCurrent) => {
    if (isCurrent) return { icon: faPlay, bg: BOOK_COLORS.info, color: '#FFFFFF' };
    if (status === 'completed') return { icon: faCheck, bg: BOOK_COLORS.success, color: '#FFFFFF' };
    if (!isUnlocked) return { icon: faLock, bg: 'transparent', color: BOOK_COLORS.locked };
    return { icon: null, bg: 'transparent', color: BOOK_COLORS.muted };
  };

  // Get sorted activity blocks for a given topic from the cache
  const getBlocksForTopic = useCallback((topicId) => {
    const blocks = activityBlocksMap[topicId];
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return [];
    return [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [activityBlocksMap]);

  const renderTopicNode = (topic, depth = 0) => {
    const isChapter = topic.type === 'chapter';
    const hasChildren = topic.children?.length > 0;
    const isExpanded = expandedChapters[topic.id];
    const isCurrent = topic.id === currentTopicId;
    const { status, is_unlocked } = getTopicStatus(topic.id);
    const statusCfg = getStatusConfig(status, is_unlocked, isCurrent);
    const isClickable = is_unlocked || status === 'completed' || isChapter;

    return (
      <div key={topic.id}>
        <div
          style={{
            ...styles.topicNode,
            paddingLeft: `${16 + depth * 16}px`,
            background: isCurrent ? `${BOOK_COLORS.heading}0D` : 'transparent',
            borderLeft: isCurrent
              ? `3px solid ${BOOK_COLORS.heading}`
              : '3px solid transparent',
            opacity: isClickable ? 1 : 0.5,
            cursor: isClickable ? 'pointer' : 'not-allowed',
          }}
          onClick={() => {
            if (isChapter) {
              if (hasChildren) toggleChapter(topic.id);
              onSelectTopic?.(topic);
            } else if (isClickable) {
              onSelectTopic?.(topic);
              onClose?.(); // Close mobile drawer on topic select
            }
          }}
          onMouseEnter={(e) => {
            if (isClickable && !isCurrent) {
              e.currentTarget.style.background = '#F8FAFC';
            }
          }}
          onMouseLeave={(e) => {
            if (!isCurrent) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {/* Expand/Collapse arrow for chapters */}
          {isChapter && hasChildren ? (
            <FontAwesomeIcon
              icon={faChevronRight}
              style={{
                ...styles.expandIcon,
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          ) : (
            <div style={{ width: '16px', flexShrink: 0 }} />
          )}

          {/* Status circle */}
          <div
            style={{
              ...styles.statusCircle,
              background: statusCfg.bg,
              border: statusCfg.icon
                ? 'none'
                : `2px solid ${is_unlocked ? BOOK_COLORS.border : BOOK_COLORS.locked}`,
            }}
          >
            {statusCfg.icon && (
              <FontAwesomeIcon
                icon={statusCfg.icon}
                style={{ fontSize: '9px', color: statusCfg.color }}
              />
            )}
          </div>

          {/* Title + duration */}
          <div style={styles.topicInfo}>
            <span
              style={{
                ...styles.topicTitle,
                fontWeight: isChapter ? 700 : 400,
                fontFamily: isChapter ? BOOK_FONTS.heading : BOOK_FONTS.body,
                color: isCurrent
                  ? BOOK_COLORS.heading
                  : is_unlocked || status === 'completed'
                    ? BOOK_COLORS.body
                    : BOOK_COLORS.muted,
              }}
            >
              {topic.display_title || topic.title}
            </span>
            {!isChapter && topic.estimated_time_minutes && (
              <span style={styles.duration}>
                <FontAwesomeIcon icon={faClock} style={{ marginRight: '3px', fontSize: '9px' }} />
                {topic.estimated_time_minutes}m
              </span>
            )}
          </div>
        </div>

        {/* Activity blocks for this topic (from cache) */}
        {(() => {
          const topicBlocks = !isChapter ? getBlocksForTopic(topic.id) : [];
          if (topicBlocks.length === 0) return null;
          return (
            <div style={styles.activityList}>
              {topicBlocks.map((block, idx) => {
                const cfg = ACTIVITY_CONFIGS[block.type?.toLowerCase()] || ACTIVITY_CONFIGS.note;
                const rawTitle = block.child_title || block.title;
                const cleanTitle = stripCodePrefix(rawTitle) || cfg.label;
                return (
                  <div
                    key={idx}
                    style={{
                      ...styles.activityNode,
                      paddingLeft: `${32 + depth * 16}px`,
                      opacity: isCurrent ? 1 : 0.7,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCurrent) {
                        // Scroll to activity in current content
                        onActivityClick?.(idx);
                      } else if (isClickable) {
                        // Navigate to topic first, then scroll after load
                        onSelectTopic?.(topic);
                        onClose?.();
                      }
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${cfg.color}0D`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ ...styles.activityEmoji, color: cfg.color }}>{cfg.emoji}</span>
                    <span style={{ ...styles.activityTitle, color: cfg.color }}>
                      {cleanTitle}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div style={styles.children}>
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
        <div style={styles.headerTop}>
          <h2 style={styles.courseTitle}>{courseTitle}</h2>
          {onClose && (
            <button onClick={onClose} style={styles.closeBtn}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        {/* Progress bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressTrack}>
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

      {/* Topic list */}
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
    background: '#FFFFFF',
    borderRight: `1px solid ${BOOK_COLORS.border}`,
  },

  header: {
    padding: '1rem',
    borderBottom: `1px solid ${BOOK_COLORS.border}`,
    background: '#FAFBFF',
  },

  headerTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },

  courseTitle: {
    margin: '0 0 0.75rem',
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.md,
    color: BOOK_COLORS.heading,
    lineHeight: 1.3,
    flex: 1,
  },

  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: BOOK_COLORS.muted,
    fontSize: '1.125rem',
    padding: '0.25rem',
    lineHeight: 1,
  },

  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },

  progressTrack: {
    height: '6px',
    background: BOOK_COLORS.borderLight,
    borderRadius: BOOK_RADIUS.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${BOOK_COLORS.success}, #34D399)`,
    borderRadius: BOOK_RADIUS.full,
    transition: 'width 0.4s ease',
  },

  progressText: {
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.muted,
    fontFamily: BOOK_FONTS.body,
  },

  topicList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem 0',
  },

  topicNode: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    gap: '0.5rem',
    transition: 'all 0.15s ease',
    minHeight: '42px',
  },

  expandIcon: {
    fontSize: '0.625rem',
    color: BOOK_COLORS.muted,
    transition: 'transform 0.2s ease',
    width: '16px',
    flexShrink: 0,
  },

  statusCircle: {
    width: '20px',
    height: '20px',
    borderRadius: BOOK_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  topicInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    overflow: 'hidden',
  },

  topicTitle: {
    fontSize: BOOK_FONT_SIZES.sm,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  duration: {
    fontSize: BOOK_FONT_SIZES.xs,
    color: BOOK_COLORS.muted,
    display: 'flex',
    alignItems: 'center',
    fontFamily: BOOK_FONTS.body,
  },

  children: {
    background: '#FAFBFF',
  },

  activityList: {
    background: '#FAFBFF',
    borderLeft: '3px solid transparent',
  },

  activityNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.75rem',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    minHeight: '34px',
  },

  activityEmoji: {
    fontSize: '0.8rem',
    flexShrink: 0,
    width: '20px',
    textAlign: 'center',
  },

  activityTitle: {
    fontSize: BOOK_FONT_SIZES.xs,
    fontFamily: BOOK_FONTS.body,
    fontWeight: 600,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },

  emptyText: {
    padding: '1rem',
    color: BOOK_COLORS.muted,
    fontSize: BOOK_FONT_SIZES.sm,
    textAlign: 'center',
    fontFamily: BOOK_FONTS.body,
  },
};

export default BookSidebar;
