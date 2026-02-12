// ============================================
// BOOK CONTENT RENDERER - Kid-friendly themed content
// ============================================
// Renders topic content + activity blocks in the
// colorful KoderKids book style (light theme)

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChalkboardTeacher,
  faHome,
  faBookOpen,
  faLightbulb,
  faClipboardList,
  faStar,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';

import {
  ChapterHeader,
  SectionHeading,
  ActivityCard,
  StepBadge,
  FunFactBox,
  TipBox,
  ChallengeStrip,
} from './BookDecorations';
import HomeworkUploader from './HomeworkUploader';
import ProofStatusBadge from './ProofStatusBadge';
import VideoPlayer from '../lms/player/VideoPlayer';
import {
  BOOK_COLORS,
  BOOK_FONTS,
  BOOK_FONT_SIZES,
  BOOK_RADIUS,
  BOOK_SHADOWS,
  BOOK_SPACING,
} from '../../utils/bookTheme';

// ─── Image URL helpers (reused from ContentViewer) ───
const API_URL = process.env.REACT_APP_API_URL || '';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const processHtmlContent = (html) => {
  if (!html) return html;
  let processed = html;
  // Fix relative image URLs
  if (API_URL) {
    processed = processed.replace(
      /src=["'](?!http|https|data:)(\/[^"']+)["']/g,
      `src="${API_URL}$1"`
    );
  }
  // Strip activity code prefixes from text content inside HTML tags
  // Matches patterns like "1.2.class.1 ", "1.2.class_activity.1 " at the start of text
  processed = processed.replace(
    />([\s]*)([\d.]+(?:class_activity|home_activity|class|home|note|challenge)[\d.]*)\s+/gi,
    '>$1'
  );
  return processed;
};

// ─── Activity type helpers ───
const getActivityIcon = (type) => {
  const t = type?.toLowerCase().replace('_activity', '');
  switch (t) {
    case 'class': return faChalkboardTeacher;
    case 'home': return faHome;
    case 'reading': return faBookOpen;
    case 'exercise': case 'challenge': return faClipboardList;
    case 'note': return faLightbulb;
    default: return faLightbulb;
  }
};

const getActivityEmoji = (type) => {
  const t = type?.toLowerCase().replace('_activity', '');
  switch (t) {
    case 'class': return '🏫';
    case 'home': return '🏠';
    case 'reading': return '📖';
    case 'exercise': case 'challenge': return '🌟';
    case 'note': return '💡';
    default: return '📝';
  }
};

const normalizeBlocks = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && (data.type || data.content)) return [data];
  return [];
};

// ─── MAIN COMPONENT ───
const BookContentRenderer = ({
  topicContent,      // Full topic object from API
  onImageClick,      // Optional: for lightbox zoom
  activityProofs,    // Map of topicId → proof data (from LMSContext)
  onProofSubmitted,  // Callback(topicId, proof) when homework uploaded
}) => {
  if (!topicContent) return null;

  const {
    type: topicType,
    code,
    display_title,
    title,
    content: mainContent,
    activity_blocks,
    video_url,
    thumbnail,
  } = topicContent;

  const blocks = normalizeBlocks(activity_blocks);
  const hasMainContent = mainContent && mainContent.trim().length > 0;

  return (
    <div style={styles.container}>
      {/* ── Thumbnail / Banner ── */}
      {thumbnail && (
        <div style={styles.bannerWrap}>
          <img
            src={resolveImageUrl(thumbnail)}
            alt={title}
            style={styles.banner}
            onClick={() => onImageClick?.(resolveImageUrl(thumbnail))}
          />
        </div>
      )}

      {/* ── Topic Heading ── */}
      {topicType === 'chapter' ? (
        <ChapterHeader code={code} title={title} />
      ) : (
        <SectionHeading
          code={code && /(?:class|home|note|challenge)/i.test(code) ? null : code}
          title={stripCodePrefix(title) || title}
        />
      )}

      {/* ── Video Player ── */}
      {video_url && (
        <div style={styles.videoWrap}>
          <VideoPlayer videoUrl={video_url} />
        </div>
      )}

      {/* ── Main Content (HTML) ── */}
      {hasMainContent && (
        <div
          className="book-content-html"
          style={styles.mainContent}
          dangerouslySetInnerHTML={{ __html: processHtmlContent(mainContent) }}
        />
      )}

      {/* ── Activity Blocks ── */}
      {blocks.length > 0 && (
        <div style={styles.blocksContainer}>
          {[...blocks]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((block, index) => (
              <ActivityBlockRenderer
                key={index}
                block={block}
                blockIndex={index}
                topicId={topicContent.id}
                onImageClick={onImageClick}
                activityProofs={activityProofs}
                onProofSubmitted={onProofSubmitted}
              />
            ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasMainContent && blocks.length === 0 && !video_url && (
        <div style={styles.emptyState}>
          <FontAwesomeIcon icon={faBookOpen} style={{ fontSize: '2.5rem', color: BOOK_COLORS.muted }} />
          <p style={{ color: BOOK_COLORS.muted, marginTop: '0.75rem' }}>
            No content available for this topic yet.
          </p>
        </div>
      )}
    </div>
  );
};

// Strip internal code prefixes like "1.2.class.1", "2.3.home.2", "1.1.note.1" from titles
const stripCodePrefix = (title) => {
  if (!title) return title;
  // Pattern: digits/dots/underscores mixed with type keywords, followed by optional space
  return title.replace(/^[\d.]+(?:class_activity|home_activity|class|home|note|challenge)[\d.]*\s*/i, '').trim();
};

// ─── ACTIVITY BLOCK RENDERER ───
const ActivityBlockRenderer = ({ block, blockIndex, topicId, onImageClick, activityProofs, onProofSubmitted }) => {
  const [showUploader, setShowUploader] = useState(false);
  const emoji = getActivityEmoji(block.type);
  const rawTitle = block.child_title || block.title;
  const displayTitle = stripCodePrefix(rawTitle);
  const blockType = block.type?.toLowerCase();
  const isHomeActivity = blockType === 'home_activity' || blockType === 'home';
  const proof = activityProofs?.[topicId];

  // "note" type → Fun Fact box
  if (blockType === 'note') {
    return (
      <div data-activity-block={blockIndex}>
        <FunFactBox title={displayTitle || 'Fun Fact:'}>
          {block.introduction && <p style={{ margin: 0 }}>{block.introduction}</p>}
          {block.content && (
            <div
              className="book-content-html"
              dangerouslySetInnerHTML={{ __html: processHtmlContent(block.content) }}
            />
          )}
        </FunFactBox>
      </div>
    );
  }

  return (
    <ActivityCard type={block.type} title={displayTitle} icon={emoji} dataBlockIndex={blockIndex}>
      {/* Introduction */}
      {block.introduction && (
        <p style={styles.introText}>{block.introduction}</p>
      )}

      {/* Steps - 2-column grid with numbered badges */}
      {block.steps?.length > 0 && (
        <div style={styles.stepsGrid}>
          {block.steps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              index={i}
              onImageClick={onImageClick}
            />
          ))}
        </div>
      )}

      {/* Additional HTML content */}
      {block.content && (
        <div
          className="book-content-html"
          style={styles.blockHtmlContent}
          dangerouslySetInnerHTML={{ __html: processHtmlContent(block.content) }}
        />
      )}

      {/* Challenge strip */}
      {block.challenge && (
        <ChallengeStrip>{block.challenge}</ChallengeStrip>
      )}

      {/* Homework upload section (only for home_activity blocks) */}
      {isHomeActivity && (
        <div style={styles.homeworkSection} data-homework-upload="true">
          {proof && !showUploader ? (
            <ProofStatusBadge
              proof={proof}
              onReupload={() => setShowUploader(true)}
            />
          ) : (
            <HomeworkUploader
              topicId={topicId}
              topicTitle={displayTitle}
              onUploadSuccess={(newProof) => {
                setShowUploader(false);
                onProofSubmitted?.(topicId, newProof);
              }}
            />
          )}
        </div>
      )}
    </ActivityCard>
  );
};

// ─── STEP CARD ───
const StepCard = ({ step, index, onImageClick }) => {
  const stepNumber = step.number || index + 1;
  const hasImage = step.image;

  return (
    <div style={styles.stepCard}>
      {/* Step header with badge */}
      <div style={styles.stepHeader}>
        <StepBadge number={stepNumber} size={32} />
        <span style={styles.stepLabel}>
          {step.title || `Step ${stepNumber}`}
        </span>
      </div>

      {/* Step content */}
      {step.content && (
        <p style={styles.stepContent}>{step.content}</p>
      )}

      {/* Step image (screenshot) */}
      {hasImage && (
        <img
          src={resolveImageUrl(step.image)}
          alt={`Step ${stepNumber}`}
          style={styles.stepImage}
          onClick={() => onImageClick?.(resolveImageUrl(step.image))}
          loading="lazy"
        />
      )}
    </div>
  );
};

// ─── STYLES ───
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },

  bannerWrap: {
    borderRadius: BOOK_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: BOOK_SPACING.lg,
  },

  banner: {
    width: '100%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'cover',
    display: 'block',
    cursor: 'pointer',
  },

  videoWrap: {
    margin: `${BOOK_SPACING.lg} 0`,
    borderRadius: BOOK_RADIUS.lg,
    overflow: 'hidden',
  },

  mainContent: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.base,
    color: BOOK_COLORS.body,
    lineHeight: 1.75,
    marginBottom: BOOK_SPACING.xl,
  },

  blocksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },

  introText: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.base,
    color: BOOK_COLORS.body,
    lineHeight: 1.7,
    margin: '0 0 1rem',
  },

  // Steps rendered as a responsive grid
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
    marginBottom: '0.75rem',
  },

  stepCard: {
    background: BOOK_COLORS.pageAlt,
    border: `1px solid ${BOOK_COLORS.border}`,
    borderRadius: BOOK_RADIUS.lg,
    padding: '1rem',
    transition: 'box-shadow 0.2s ease',
  },

  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    marginBottom: '0.625rem',
  },

  stepLabel: {
    fontFamily: BOOK_FONTS.heading,
    fontSize: BOOK_FONT_SIZES.md,
    color: BOOK_COLORS.heading,
  },

  stepContent: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.sm,
    color: BOOK_COLORS.bodyLight,
    lineHeight: 1.6,
    margin: '0 0 0.5rem',
  },

  stepImage: {
    width: '100%',
    height: 'auto',
    borderRadius: BOOK_RADIUS.md,
    marginTop: '0.5rem',
    cursor: 'pointer',
    border: `1px solid ${BOOK_COLORS.border}`,
  },

  blockHtmlContent: {
    fontFamily: BOOK_FONTS.body,
    fontSize: BOOK_FONT_SIZES.base,
    color: BOOK_COLORS.body,
    lineHeight: 1.7,
  },

  homeworkSection: {
    marginTop: '1rem',
    paddingTop: '0.75rem',
    borderTop: `1px dashed ${BOOK_COLORS.border}`,
  },

  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
};

export default BookContentRenderer;
