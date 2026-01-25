// ============================================
// CONTENT VIEWER - Renders topic activity blocks
// ============================================
// Location: src/components/lms/player/ContentViewer.js

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChalkboardTeacher,
  faHome,
  faBookOpen,
  faLightbulb,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MIXINS,
} from '../../../utils/designConstants';

// API URL for resolving relative image paths
const API_URL = process.env.REACT_APP_API_URL || '';

// Resolve image URL - prepend API_URL if relative path
const resolveImageUrl = (url) => {
  if (!url) return '';
  // If already absolute URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Prepend API URL to relative paths
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Process HTML content to fix relative image URLs
const processHtmlContent = (html) => {
  if (!html || !API_URL) return html;
  // Replace relative src attributes in img tags
  return html.replace(
    /src=["'](?!http|https|data:)(\/[^"']+)["']/g,
    `src="${API_URL}$1"`
  );
};

const ContentViewer = ({ activityBlocks, topicTitle, mainContent, topicType }) => {
  // Ensure activityBlocks is always an array
  // Handle case where it's a single object instead of an array
  const normalizeBlocks = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && (data.type || data.content)) {
      // Single block object - wrap in array
      return [data];
    }
    return [];
  };
  const blocks = normalizeBlocks(activityBlocks);
  const hasMainContent = mainContent && mainContent.trim().length > 0;
  // Get icon based on activity type (handles both 'class' and 'class_activity' formats)
  const getActivityIcon = (type) => {
    const normalizedType = type?.toLowerCase().replace('_activity', '');
    switch (normalizedType) {
      case 'class':
        return faChalkboardTeacher;
      case 'home':
        return faHome;
      case 'reading':
        return faBookOpen;
      case 'exercise':
      case 'challenge':
        return faClipboardList;
      case 'note':
        return faLightbulb;
      default:
        return faLightbulb;
    }
  };

  // Get color based on activity type (handles both formats)
  const getActivityColor = (type) => {
    const normalizedType = type?.toLowerCase().replace('_activity', '');
    switch (normalizedType) {
      case 'class':
        return COLORS.status.info;
      case 'home':
        return COLORS.status.success;
      case 'reading':
        return COLORS.accent.purple;
      case 'exercise':
      case 'challenge':
        return COLORS.status.warning;
      case 'note':
        return '#8B5CF6'; // Purple for notes
      default:
        return COLORS.status.info;
    }
  };

  // Check if activity block has any content
  const hasActivityContent = (block) => {
    return block.introduction ||
           (block.steps && block.steps.length > 0) ||
           block.challenge ||
           block.content;
  };

  // Get label based on activity type
  const getActivityLabel = (type, title) => {
    if (title) return title;
    switch (type?.toLowerCase()) {
      case 'class':
        return 'Class Activity';
      case 'home':
        return 'Home Activity';
      case 'reading':
        return 'Reading Material';
      case 'exercise':
        return 'Exercise';
      default:
        return 'Activity';
    }
  };

  // Show empty state only if no main content AND no activity blocks
  if (!hasMainContent && blocks.length === 0) {
    return (
      <div style={styles.emptyState}>
        <FontAwesomeIcon icon={faBookOpen} style={styles.emptyIcon} />
        <p style={styles.emptyText}>No content available for this topic</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Main Content (from Book Management - content field) */}
      {hasMainContent && (
        <div style={styles.mainContentSection}>
          <div
            style={styles.mainContentHtml}
            dangerouslySetInnerHTML={{ __html: processHtmlContent(mainContent) }}
          />
        </div>
      )}

      {/* Activity Blocks */}
      {blocks.length > 0 && (
        <>
          {hasMainContent && <div style={styles.sectionDivider} />}
          {[...blocks]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((block, index) => {
              const icon = getActivityIcon(block.type);
              const color = getActivityColor(block.type);
              // Use child_title if this is aggregated from a child topic
              const label = getActivityLabel(block.type, block.child_title || block.title);

              return (
                <div key={index} style={styles.activityBlock}>
                  {/* Activity Header */}
                  <div style={{
                    ...styles.activityHeader,
                    borderLeftColor: color,
                  }}>
                    <div style={{
                      ...styles.iconContainer,
                      backgroundColor: `${color}20`,
                    }}>
                      <FontAwesomeIcon
                        icon={icon}
                        style={{ color, fontSize: FONT_SIZES.md }}
                      />
                    </div>
                    <h3 style={styles.activityTitle}>{label}</h3>
                  </div>

                  {/* Activity Content */}
                  <div style={styles.activityContent}>
                    {hasActivityContent(block) ? (
                      <>
                        {/* Introduction */}
                        {block.introduction && (
                          <p style={styles.introText}>{block.introduction}</p>
                        )}

                        {/* Steps */}
                        {block.steps?.length > 0 && (
                          <div style={styles.stepsContainer}>
                            {block.steps.map((step, stepIndex) => (
                              <div key={stepIndex} style={styles.stepItem}>
                                <div style={styles.stepNumber}>{step.number || stepIndex + 1}</div>
                                <div style={styles.stepContentBox}>
                                  {step.title && <strong style={styles.stepTitle}>{step.title}</strong>}
                                  {step.content && <p style={styles.stepText}>{step.content}</p>}
                                  {step.image && (
                                    <img src={resolveImageUrl(step.image)} alt={`Step ${step.number || stepIndex + 1}`} style={styles.stepImage} />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Challenge/Note */}
                        {block.challenge && (
                          <div style={styles.challengeBox}>
                            <strong style={styles.challengeLabel}>💡 Challenge:</strong>
                            <p style={styles.challengeText}>{block.challenge}</p>
                          </div>
                        )}

                        {/* Additional HTML Content */}
                        {block.content && (
                          <div
                            style={styles.htmlContent}
                            dangerouslySetInnerHTML={{ __html: processHtmlContent(block.content) }}
                          />
                        )}
                      </>
                    ) : (
                      <p style={styles.noContent}>No content provided</p>
                    )}
                  </div>
                </div>
              );
            })}
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.xl,
  },

  activityBlock: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },

  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderLeft: '4px solid',
  },

  iconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: BORDER_RADIUS.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityTitle: {
    margin: 0,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },

  activityContent: {
    padding: SPACING.lg,
  },

  htmlContent: {
    color: COLORS.text.whiteTransparent,
    fontSize: FONT_SIZES.base,
    lineHeight: 1.7,
    // Style nested HTML elements
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: COLORS.text.white,
      marginTop: SPACING.lg,
      marginBottom: SPACING.md,
    },
    '& p': {
      marginBottom: SPACING.md,
    },
    '& ul, & ol': {
      paddingLeft: SPACING.xl,
      marginBottom: SPACING.md,
    },
    '& li': {
      marginBottom: SPACING.sm,
    },
    '& a': {
      color: COLORS.status.info,
      textDecoration: 'underline',
    },
    '& code': {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      padding: '2px 6px',
      borderRadius: BORDER_RADIUS.sm,
      fontFamily: 'monospace',
    },
    '& pre': {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'auto',
    },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      borderRadius: BORDER_RADIUS.md,
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: SPACING.md,
    },
    '& th, & td': {
      padding: SPACING.sm,
      border: `1px solid ${COLORS.border.whiteTransparent}`,
      textAlign: 'left',
    },
    '& th': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    '& blockquote': {
      borderLeft: `4px solid ${COLORS.status.info}`,
      paddingLeft: SPACING.md,
      marginLeft: 0,
      fontStyle: 'italic',
      color: COLORS.text.whiteSubtle,
    },
  },

  noContent: {
    color: COLORS.text.whiteSubtle,
    fontStyle: 'italic',
    margin: 0,
  },

  // Activity block content styles
  introText: {
    color: COLORS.text.whiteTransparent,
    fontSize: FONT_SIZES.base,
    lineHeight: 1.7,
    marginBottom: SPACING.lg,
  },

  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },

  stepItem: {
    display: 'flex',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BORDER_RADIUS.md,
  },

  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.status.info,
    color: COLORS.text.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
    flexShrink: 0,
  },

  stepContentBox: {
    flex: 1,
  },

  stepTitle: {
    display: 'block',
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.xs,
  },

  stepText: {
    color: COLORS.text.whiteTransparent,
    fontSize: FONT_SIZES.sm,
    lineHeight: 1.6,
    margin: 0,
  },

  stepImage: {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },

  challengeBox: {
    padding: SPACING.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    borderLeft: `4px solid ${COLORS.status.warning}`,
    marginBottom: SPACING.lg,
  },

  challengeLabel: {
    color: COLORS.status.warning,
    fontSize: FONT_SIZES.sm,
    display: 'block',
    marginBottom: SPACING.xs,
  },

  challengeText: {
    color: COLORS.text.whiteTransparent,
    fontSize: FONT_SIZES.sm,
    lineHeight: 1.6,
    margin: 0,
  },

  emptyState: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING['3xl'],
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: '3rem',
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.md,
  },

  emptyText: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },

  // Main content section (from Book Management content field)
  mainContentSection: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    borderLeft: `4px solid ${COLORS.accent.purple}`,
  },

  mainContentHtml: {
    color: COLORS.text.whiteTransparent,
    fontSize: FONT_SIZES.base,
    lineHeight: 1.8,
  },

  sectionDivider: {
    height: '1px',
    backgroundColor: COLORS.border.whiteTransparent,
    margin: `${SPACING.md} 0`,
  },
};

// CSS for nested HTML elements (inject into head)
const injectStyles = () => {
  const styleId = 'content-viewer-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .lms-content h1, .lms-content h2, .lms-content h3,
    .lms-content h4, .lms-content h5, .lms-content h6 {
      color: #FFFFFF;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .lms-content h1 { font-size: 1.5rem; }
    .lms-content h2 { font-size: 1.25rem; }
    .lms-content h3 { font-size: 1.125rem; }
    .lms-content p { margin-bottom: 1rem; }
    .lms-content ul, .lms-content ol {
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }
    .lms-content li { margin-bottom: 0.5rem; }
    .lms-content a {
      color: #3B82F6;
      text-decoration: underline;
    }
    .lms-content code {
      background-color: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .lms-content pre {
      background-color: rgba(0, 0, 0, 0.3);
      padding: 1rem;
      border-radius: 8px;
      overflow: auto;
    }
    .lms-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .lms-content table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }
    .lms-content th, .lms-content td {
      padding: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      text-align: left;
    }
    .lms-content th {
      background-color: rgba(255, 255, 255, 0.1);
    }
    .lms-content blockquote {
      border-left: 4px solid #3B82F6;
      padding-left: 1rem;
      margin-left: 0;
      font-style: italic;
      color: rgba(255, 255, 255, 0.7);
    }
  `;
  document.head.appendChild(style);
};

// Inject styles on module load
if (typeof document !== 'undefined') {
  injectStyles();
}

export default ContentViewer;
