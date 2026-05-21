// frontend/src/pages/online-classes/OnlineClassesStudentPage.js
// Student view: list upcoming and past online classes

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { listSessions } from '../../services/onlineClassService';

const TABS = ['Upcoming', 'Past Classes', 'Recordings'];

const OnlineClassesStudentPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (activeTab === 'Upcoming') {
        // Fetch both scheduled and live so sessions remain visible after the teacher starts them
        const [scheduled, live] = await Promise.all([
          listSessions({ status: 'scheduled' }),
          listSessions({ status: 'live' }),
        ]);
        data = [...live, ...scheduled]; // live sessions first
      } else {
        const statusMap = { 'Past Classes': 'ended', Recordings: 'ended' };
        data = await listSessions({ status: statusMap[activeTab] });
      }
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Auto-refresh every 20 seconds while on the Upcoming tab so live sessions appear without a manual reload
  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => {
    if (activeTab !== 'Upcoming') return;
    const id = setInterval(fetchSessions, 20000);
    return () => clearInterval(id);
  }, [activeTab, fetchSessions]);

  const handleJoin = (session) => {
    navigate(`/online-classes/check/${session.id}`);
  };

  const canJoin = (session) => {
    if (session.status === 'ended' || session.status === 'cancelled') return false;
    const now = new Date();
    const start = new Date(session.scheduled_at);
    const end = new Date(start.getTime() + (session.duration_mins || 60) * 60 * 1000);
    const earlyBuffer = 30 * 60 * 1000; // allow joining 30 min before start
    return now >= new Date(start.getTime() - earlyBuffer) && now <= end;
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  };

  const getCountdown = (iso) => {
    const diff = new Date(iso) - new Date();
    if (diff <= 0) return 'Starting now';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `Starts in ${h}h ${m}m`;
    return `Starts in ${m}m`;
  };

  const styles = getStyles();

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎓 Online Classes</h1>
        <p style={styles.subtitle}>Join your live classes, view past recordings</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={activeTab === tab ? styles.tabActive : styles.tab}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <div style={styles.centered}><div style={styles.spinner} /></div>}
      {error && <ErrorDisplay error={error} onRetry={fetchSessions} isRetrying={loading} />}

      {!loading && !error && sessions.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>{activeTab === 'Upcoming' ? '📅' : '🎬'}</div>
          <p style={styles.emptyText}>
            {activeTab === 'Upcoming' ? 'No upcoming classes scheduled.' : 'No past classes found.'}
          </p>
        </div>
      )}

      <div style={styles.grid}>
        {sessions.map((session) => {
          const joinable = canJoin(session);
          const isLive = session.status === 'live';
          return (
            <div key={session.id} style={{
              ...styles.card,
              ...(isLive ? { borderTop: `3px solid ${COLORS.status.error}` } : {}),
            }}>
              {isLive && <div style={styles.liveBadge}><span style={{ animation: 'pulse 1.2s ease-in-out infinite' }}>●</span> LIVE</div>}
              <div style={styles.cardHeader}>
                <h3 style={styles.sessionTitle}>{session.title}</h3>
                <span style={styles.duration}>{session.duration_mins} min</span>
              </div>
              <p style={styles.teacherName}>👩‍🏫 {session.teacher_name}</p>
              <div style={styles.dateTimeRow}>
                <span style={styles.dateText}>{formatDate(session.scheduled_at)}</span>
                <span style={styles.timeText}>{formatTime(session.scheduled_at)}</span>
              </div>
              {activeTab === 'Upcoming' && !isLive && (
                <p style={styles.countdown}>{getCountdown(session.scheduled_at)}</p>
              )}
              {session.description ? (
                <p style={styles.description}>{session.description}</p>
              ) : null}
              <div style={styles.cardFooter}>
                {(activeTab === 'Upcoming' || activeTab === 'Past Classes') && (
                  <button
                    onClick={() => handleJoin(session)}
                    disabled={!joinable && !isLive}
                    style={isLive ? styles.joinBtnLive : joinable ? styles.joinBtn : styles.joinBtnDisabled}
                  >
                    {isLive ? '🔴 Join Live' : joinable ? 'Join Class' : 'Not yet open'}
                  </button>
                )}
                {activeTab === 'Recordings' && session.recording_enabled && (
                  <button
                    onClick={() => navigate(`/online-classes/recordings/${session.id}`)}
                    style={styles.recordingBtn}
                  >
                    ▶ Watch Recording
                  </button>
                )}
                {activeTab === 'Recordings' && !session.recording_enabled && (
                  <span style={styles.noRecording}>Recording not available</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getStyles = () => ({
  page: { padding: SPACING.xl, maxWidth: 900, margin: '0 auto' },

  // Header — sits on the App.js gradient, so just white text, no extra background
  header: { marginBottom: SPACING.xl },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteSubtle,
    marginTop: SPACING.xs,
    margin: 0,
  },

  // Tabs
  tabBar: {
    display: 'flex',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: SPACING.sm,
  },
  tab: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.whiteSubtle,
    borderRadius: BORDER_RADIUS.md,
  },
  tabActive: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(255,255,255,0.2)',
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
    borderRadius: BORDER_RADIUS.md,
  },

  // Session cards grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: SPACING.lg,
  },
  card: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },

  // LIVE indicator
  liveBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    background: COLORS.status.error,
    color: '#fff',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    padding: `3px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.full,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    animation: 'livePulse 2s ease-in-out infinite',
  },

  // Card content
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#fff',
    margin: 0,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  duration: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    background: 'rgba(255,255,255,0.12)',
    padding: `2px ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.md,
    whiteSpace: 'nowrap',
  },
  teacherName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.whiteMedium,
    margin: 0,
  },
  dateTimeRow: { display: 'flex', justifyContent: 'space-between' },
  dateText: { fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle },
  timeText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: '#93C5FD' },
  countdown: { fontSize: FONT_SIZES.xs, color: '#FCD34D', fontWeight: FONT_WEIGHTS.medium, margin: 0 },
  description: { fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, margin: 0 },

  cardFooter: { marginTop: 'auto', paddingTop: SPACING.sm },

  // Action buttons
  joinBtn: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.lg}`,
    background: 'rgba(255,255,255,0.92)',
    color: COLORS.primary,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
  },
  joinBtnLive: {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    background: COLORS.status.error,
    color: '#fff',
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
    animation: 'livePulse 2s ease-in-out infinite',
  },
  joinBtnDisabled: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.lg}`,
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: BORDER_RADIUS.lg,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: FONT_SIZES.sm,
    cursor: 'not-allowed',
  },
  recordingBtn: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.lg}`,
    background: 'rgba(59,130,246,0.85)',
    color: '#fff',
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.sm,
    cursor: 'pointer',
  },
  noRecording: { fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle },

  // Empty / loading states
  emptyState: {
    textAlign: 'center',
    padding: `${SPACING['3xl']} ${SPACING['2xl']}`,
    color: COLORS.text.whiteSubtle,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.lg },
  emptyText: { fontSize: FONT_SIZES.base },
  centered: { display: 'flex', justifyContent: 'center', padding: SPACING['3xl'] },
  spinner: {
    width: 36, height: 36,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTop: '3px solid #fff',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
});

export default OnlineClassesStudentPage;
