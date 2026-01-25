// ============================================
// VIDEO PLAYER - YouTube/Vimeo embed wrapper
// ============================================
// Location: src/components/lms/player/VideoPlayer.js

import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faVideo } from '@fortawesome/free-solid-svg-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIXINS,
} from '../../../utils/designConstants';

const VideoPlayer = ({ videoUrl, title, onPlay, onPause }) => {
  // Parse video URL to get embed URL
  const embedUrl = useMemo(() => {
    if (!videoUrl) return null;

    try {
      const url = new URL(videoUrl);

      // YouTube
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        let videoId = '';

        if (url.hostname.includes('youtu.be')) {
          // Short URL: https://youtu.be/VIDEO_ID
          videoId = url.pathname.slice(1);
        } else if (url.pathname.includes('/embed/')) {
          // Already embed URL
          videoId = url.pathname.split('/embed/')[1];
        } else {
          // Regular URL: https://www.youtube.com/watch?v=VIDEO_ID
          videoId = url.searchParams.get('v');
        }

        if (videoId) {
          // Remove any additional params from videoId
          videoId = videoId.split('&')[0].split('?')[0];
          return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
        }
      }

      // Vimeo
      if (url.hostname.includes('vimeo.com')) {
        let videoId = '';

        if (url.pathname.includes('/video/')) {
          videoId = url.pathname.split('/video/')[1];
        } else {
          // Regular URL: https://vimeo.com/VIDEO_ID
          videoId = url.pathname.slice(1);
        }

        if (videoId) {
          videoId = videoId.split('/')[0].split('?')[0];
          return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
        }
      }

      // Direct embed URL (already formatted)
      if (url.pathname.includes('/embed') || url.hostname.includes('player.')) {
        return videoUrl;
      }

      return null;
    } catch (e) {
      console.error('Error parsing video URL:', e);
      return null;
    }
  }, [videoUrl]);

  if (!videoUrl) {
    return null;
  }

  if (!embedUrl) {
    return (
      <div style={styles.errorContainer}>
        <FontAwesomeIcon icon={faVideo} style={styles.errorIcon} />
        <p style={styles.errorText}>
          Unable to load video. Unsupported URL format.
        </p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.externalLink}
        >
          Open video in new tab
        </a>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.videoWrapper}>
        <iframe
          src={embedUrl}
          title={title || 'Video'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={styles.iframe}
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    marginBottom: SPACING.xl,
  },

  videoWrapper: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%', // 16:9 aspect ratio
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },

  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },

  errorContainer: {
    ...MIXINS.glassmorphicSubtle,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING['2xl'],
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },

  errorIcon: {
    fontSize: '2.5rem',
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.md,
  },

  errorText: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    marginBottom: SPACING.md,
  },

  externalLink: {
    color: COLORS.status.info,
    fontSize: FONT_SIZES.sm,
    textDecoration: 'underline',
  },
};

export default VideoPlayer;
