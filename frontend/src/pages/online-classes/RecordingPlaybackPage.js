// frontend/src/pages/online-classes/RecordingPlaybackPage.js
// Watch a class recording

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';
import { listRecordings } from '../../services/onlineClassService';

const RecordingPlaybackPage = () => {
  const { recordingId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listRecordings()
      .then((data) => {
        const found = data.find((r) => String(r.id) === String(recordingId));
        if (found) {
          setRecording(found);
        } else {
          setError('Recording not found.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [recordingId]);

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const styles = getStyles();

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.centered}><div style={styles.spinner} /></div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div style={styles.page}>
        <p style={styles.errorText}>{error || 'Recording not available.'}</p>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Go Back</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <button onClick={() => navigate(-1)} style={styles.backLink}>← Back to Classes</button>

      <div style={styles.playerCard}>
        <video
          ref={videoRef}
          controls
          src={recording.url}
          style={styles.video}
        />
        <div style={styles.meta}>
          <h2 style={styles.title}>{recording.session_title}</h2>
          <div style={styles.metaRow}>
            <span style={styles.metaItem}>📅 {formatDate(recording.created_at)}</span>
            <span style={styles.metaItem}>⏱ {formatDuration(recording.duration_seconds)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const getStyles = () => ({
  page: {
    padding: SPACING[6],
    maxWidth: 900,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING[4],
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: COLORS.primary,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    padding: 0,
    alignSelf: 'flex-start',
  },
  playerCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    boxShadow: '0 14px 36px rgba(63, 46, 132, 0.14)',
  },
  video: {
    width: '100%',
    aspectRatio: '16/9',
    background: '#000',
    display: 'block',
  },
  meta: {
    padding: SPACING[5],
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
    marginBottom: SPACING[3],
  },
  metaRow: {
    display: 'flex',
    gap: SPACING[6],
  },
  metaItem: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
  },
  centered: { display: 'flex', justifyContent: 'center', padding: SPACING['3xl'] },
  spinner: {
    width: 36, height: 36,
    border: `3px solid ${COLORS.border.light}`,
    borderTop: `3px solid ${COLORS.primary}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorText: { color: COLORS.status.error, textAlign: 'center' },
  backBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.lg,
    padding: `${SPACING[2]} ${SPACING[4]}`,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.white,
    alignSelf: 'center',
  },
});

export default RecordingPlaybackPage;
