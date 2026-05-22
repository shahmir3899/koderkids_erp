// frontend/src/pages/online-classes/TeacherOnlineClassesPage.js
// Teacher dashboard: view, start, and manage class sessions

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { API_URL, getAuthHeaders } from '../../api';
import { useResponsive } from '../../hooks/useResponsive';
import {
  deletePastSession,
  deleteSession,
  getParticipants,
  listSessions,
  startSession,
} from '../../services/onlineClassService';

const ACTIVE_LIVE_CLASS_SESSION_KEY = 'activeOnlineClassSessionId';

const TeacherOnlineClassesPage = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [participantsModal, setParticipantsModal] = useState(null); // { session, list }
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [activeLiveSessionId, setActiveLiveSessionId] = useState(() => sessionStorage.getItem(ACTIVE_LIVE_CLASS_SESSION_KEY) || '');
  const role = localStorage.getItem('role') || '';

  useEffect(() => {
    const onFocus = () => setActiveLiveSessionId(sessionStorage.getItem(ACTIVE_LIVE_CLASS_SESSION_KEY) || '');
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const normalizeSchoolList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.schools)) return data.schools;
    return [];
  };

  useEffect(() => {
    const loadSchools = async () => {
      try {
        let schoolList = [];
        if (role === 'Admin') {
          const allSchoolsRes = await fetch(`${API_URL}/api/schools/`, { headers: getAuthHeaders() });
          if (allSchoolsRes.ok) {
            const allSchoolsData = await allSchoolsRes.json();
            schoolList = normalizeSchoolList(allSchoolsData).filter((s) => s.is_active !== false);
          }
        } else {
          const assignedRes = await fetch(`${API_URL}/api/users/me/assigned-schools/`, {
            headers: getAuthHeaders(),
          });
          const assignedData = assignedRes.ok ? await assignedRes.json() : [];
          schoolList = normalizeSchoolList(assignedData);
        }

        setSchools(schoolList);
      } catch {
        setSchools([]);
      }
    };

    loadSchools();
  }, [role]);

  const fetchSessions = React.useCallback(async () => {
    const buildParams = (status) => {
      const params = { status };
      if (selectedSchool) params.school = selectedSchool;
      return params;
    };

    const results = await Promise.allSettled([
      listSessions(buildParams('scheduled')),
      listSessions(buildParams('live')),
      listSessions(buildParams('ended')),
      listSessions(buildParams('cancelled')),
    ]);

    const [scheduledRes, liveRes, endedRes, cancelledRes] = results;
    const scheduled = scheduledRes.status === 'fulfilled' ? scheduledRes.value : [];
    const live = liveRes.status === 'fulfilled' ? liveRes.value : [];
    const ended = endedRes.status === 'fulfilled' ? endedRes.value : [];
    const cancelled = cancelledRes.status === 'fulfilled' ? cancelledRes.value : [];

    const rejected = results.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
      const firstError = rejected[0].reason;
      setError(firstError?.message || 'Some class data could not be loaded.');
    } else {
      setError('');
    }

    setUpcoming([...live, ...scheduled]);
    setPast([...ended, ...cancelled]);
    setLoading(false);
  }, [selectedSchool]);

  // Initial load + refresh when school filter changes
  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Auto-refresh every 20 seconds so live status changes appear without manual reload
  useEffect(() => {
    const id = setInterval(fetchSessions, 20000);
    return () => clearInterval(id);
  }, [fetchSessions]);

  const handleStartSession = async (session) => {
    await startSession(session.id).catch(() => {});
    navigate(`/online-classes/room/${session.id}`);
  };

  const handleJoinLive = (session) => {
    navigate(`/online-classes/room/${session.id}`);
  };

  const handleDelete = async (session) => {
    if (!window.confirm(`Cancel "${session.title}"?`)) return;
    await deleteSession(session.id);
    setUpcoming((prev) => prev.filter((s) => s.id !== session.id));
  };

  const handleDeletePast = async (session) => {
    if (!window.confirm(`Delete past session "${session.title}"? This cannot be undone.`)) return;

    const needsImpactWarning = session.recording_enabled || Number(session.participants_count || 0) > 0;
    if (needsImpactWarning) {
      const second = window.confirm(
        'This session has recordings or participant history. Deleting it may remove associated past data. Continue?'
      );
      if (!second) return;
    }

    await deletePastSession(session.id);
    setPast((prev) => prev.filter((s) => s.id !== session.id));
  };

  const handleViewParticipants = async (session) => {
    const list = await getParticipants(session.id).catch(() => []);
    setParticipantsModal({ session, list });
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const formatDateParts = (iso) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getMobileStatusConfig = (status) => {
    const map = {
      scheduled: { accent: '#60A5FA', glow: 'rgba(96,165,250,0.25)', emphasis: 'Scheduled' },
      live: { accent: '#EF4444', glow: 'rgba(239,68,68,0.28)', emphasis: 'Live now' },
      ended: { accent: '#34D399', glow: 'rgba(52,211,153,0.2)', emphasis: 'Completed' },
      cancelled: { accent: '#9CA3AF', glow: 'rgba(156,163,175,0.2)', emphasis: 'Cancelled' },
    };
    return map[status] || map.cancelled;
  };

  const attendancePercent = (session) => {
    if (!session.participants_count || !session.participants_count) return '—';
    return '—'; // actual % needs participant data
  };

  const handleRetry = async () => {
    setLoading(true);
    setError('');
    await fetchSessions();
  };

  const styles = getStyles({ isMobile, isCompact });
  const sessionsToShow = activeTab === 'upcoming' ? upcoming : past;

  const renderSessionActions = (session, compact = false) => {
    const sharedProps = compact
      ? { minHeight: 40, fullWidth: true }
      : { minHeight: 34, fullWidth: false };

    if (compact) {
      if (session.status === 'live') {
        return (
          <div style={styles.mobilePrimaryAction}>
            <ActionBtn
              onClick={() => handleJoinLive(session)}
              color={COLORS.status.error}
              label="🔴 Join Live Class"
              emphasis
              minHeight={44}
              fullWidth
            />
          </div>
        );
      }

      if (session.status === 'scheduled') {
        return (
          <>
            <div style={styles.mobilePrimaryAction}>
              <ActionBtn
                onClick={() => handleStartSession(session)}
                color={COLORS.status.success}
                label="▶ Start Class"
                emphasis
                minHeight={44}
                fullWidth
              />
            </div>
            <div style={styles.mobileSecondaryActions}>
              <ActionBtn
                onClick={() => navigate(`/online-classes/teacher/edit/${session.id}`)}
                color={COLORS.status.info}
                label="Edit"
                {...sharedProps}
              />
              <ActionBtn
                onClick={() => handleDelete(session)}
                color={COLORS.status.error}
                label="Cancel"
                {...sharedProps}
              />
            </div>
          </>
        );
      }

      if (session.status === 'ended') {
        return (
          <>
            <div style={styles.mobilePrimaryAction}>
              <ActionBtn
                onClick={() => handleViewParticipants(session)}
                color={COLORS.primary}
                label="Students"
                emphasis
                minHeight={44}
                fullWidth
              />
            </div>
            <div style={styles.mobileSecondaryActions}>
              {session.recording_enabled && (
                <ActionBtn
                  onClick={() => navigate(`/online-classes/recordings/${session.id}`)}
                  color={COLORS.status.warning}
                  label="▶ Recording"
                  {...sharedProps}
                />
              )}
              <ActionBtn
                onClick={() => handleDeletePast(session)}
                color={COLORS.status.error}
                label="Delete"
                {...sharedProps}
              />
            </div>
          </>
        );
      }

      return (
        <div style={styles.mobilePrimaryAction}>
          <ActionBtn
            onClick={() => handleDeletePast(session)}
            color={COLORS.status.error}
            label="Delete"
            emphasis
            minHeight={44}
            fullWidth
          />
        </div>
      );
    }

    return (
      <div style={styles.actionBtns}>
        {session.status === 'live' && (
          <ActionBtn
            onClick={() => handleJoinLive(session)}
            color={COLORS.status.error}
            label="🔴 Join"
            {...sharedProps}
          />
        )}
        {session.status === 'scheduled' && (
          <>
            <ActionBtn
              onClick={() => handleStartSession(session)}
              color={COLORS.status.success}
              label="▶ Start"
              {...sharedProps}
            />
            <ActionBtn
              onClick={() => navigate(`/online-classes/teacher/edit/${session.id}`)}
              color={COLORS.status.info}
              label="Edit"
              {...sharedProps}
            />
            <ActionBtn
              onClick={() => handleDelete(session)}
              color={COLORS.status.error}
              label="Cancel"
              {...sharedProps}
            />
          </>
        )}
        {session.status === 'ended' && (
          <>
            <ActionBtn
              onClick={() => handleViewParticipants(session)}
              color={COLORS.primary}
              label="Students"
              {...sharedProps}
            />
            {session.recording_enabled && (
              <ActionBtn
                onClick={() => navigate(`/online-classes/recordings/${session.id}`)}
                color={COLORS.status.warning}
                label="▶ Recording"
                {...sharedProps}
              />
            )}
            <ActionBtn
              onClick={() => handleDeletePast(session)}
              color={COLORS.status.error}
              label="Delete"
              {...sharedProps}
            />
          </>
        )}
        {session.status === 'cancelled' && (
          <ActionBtn
            onClick={() => handleDeletePast(session)}
            color={COLORS.status.error}
            label="Delete"
            {...sharedProps}
          />
        )}
      </div>
    );
  };

  // Stats
  const totalThisMonth = [...upcoming, ...past].filter((s) => {
    const d = new Date(s.scheduled_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.pageTitle}>🎥 Online Classes</h1>
          <p style={styles.pageSubtitle}>Manage and start your live sessions</p>
        </div>
        <button onClick={() => navigate('/online-classes/teacher/create')} style={styles.createBtn}>
          + Schedule Class
        </button>
      </div>

      {activeLiveSessionId && (
        <div style={styles.returnBanner}>
          <span style={styles.returnText}>You have an active live class session.</span>
          <button
            onClick={() => navigate(`/online-classes/room/${activeLiveSessionId}`)}
            style={styles.returnBtn}
          >
            Return to Live Class
          </button>
        </div>
      )}

      <div style={styles.filterRow}>
        <label style={styles.filterLabel}>School</label>
        <select
          value={selectedSchool}
          onChange={(e) => setSelectedSchool(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Schools</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>{school.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <StatCard label="This Month" value={totalThisMonth} icon="📅" color="#60A5FA" />
        <StatCard label="Upcoming" value={upcoming.length} icon="⏰" color="#A78BFA" />
        <StatCard label="Completed" value={past.length} icon="✅" color="#34D399" />
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {['upcoming', 'past'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={activeTab === t ? styles.tabActive : styles.tab}
          >
            {t === 'upcoming' ? 'Upcoming & Live' : 'Past Sessions'}
          </button>
        ))}
      </div>

      {loading && <div style={styles.centered}><div style={styles.spinner} /></div>}
      {error && <ErrorDisplay error={error} onRetry={handleRetry} isRetrying={loading} />}

      {/* Session table */}
      {!loading && !error && (
        <>
          {isCompact ? (
            <div style={styles.mobileList}>
              {sessionsToShow.map((session) => (
                (() => {
                  const mobileStatus = getMobileStatusConfig(session.status);
                  const dateParts = formatDateParts(session.scheduled_at);
                  return (
                <div
                  key={session.id}
                  style={{
                    ...styles.mobileCard,
                    borderLeft: `4px solid ${mobileStatus.accent}`,
                    boxShadow: `0 8px 20px ${mobileStatus.glow}`,
                    ...(session.status === 'live' ? styles.mobileCardLive : {}),
                  }}
                >
                  {session.status === 'live' && (
                    <div style={styles.mobileLiveBanner}>● LIVE NOW</div>
                  )}

                  <div style={styles.mobileCardTop}>
                    <div style={{ minWidth: 0 }}>
                      <p style={styles.mobileCardTitle}>{session.title}</p>
                      <p style={styles.mobileCardMeta}>{mobileStatus.emphasis}</p>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>

                  <div style={styles.mobileMetaChips}>
                    <span style={styles.mobileMetaChip}>📅 {dateParts.date}</span>
                    <span style={styles.mobileMetaChip}>🕒 {dateParts.time}</span>
                    <span style={styles.mobileMetaChip}>⏱ {session.duration_mins} min</span>
                    <span style={styles.mobileMetaChip}>👥 {session.participants_count ?? 0}</span>
                  </div>

                  {renderSessionActions(session, true)}
                </div>
                  );
                })()
              ))}

              {sessionsToShow.length === 0 && (
                <div style={styles.emptyMobileCard}>No {activeTab} sessions</div>
              )}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHead}>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Date & Time</th>
                    <th style={styles.th}>Duration</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Students</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionsToShow.map((session) => (
                    <tr key={session.id} style={{ ...styles.tableRow, ...(session.status === 'live' ? { background: 'rgba(239,68,68,0.04)' } : {}) }}>
                      <td style={styles.td}>
                        <span style={styles.sessionTitle}>{session.title}</span>
                        {session.is_recurring && <span style={styles.recurringBadge}>↻</span>}
                      </td>
                      <td style={styles.td}>{formatDate(session.scheduled_at)}</td>
                      <td style={styles.td}>{session.duration_mins} min</td>
                      <td style={styles.td}>
                        <StatusBadge status={session.status} />
                      </td>
                      <td style={styles.td}>{session.participants_count}</td>
                      <td style={styles.td}>{renderSessionActions(session, false)}</td>
                    </tr>
                  ))}
                  {sessionsToShow.length === 0 && (
                    <tr><td colSpan={6} style={styles.emptyCell}>No {activeTab} sessions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Participants Modal */}
      {participantsModal && (
        <div style={styles.modalOverlay} onClick={() => setParticipantsModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Participants — {participantsModal.session.title}</h3>
              <button onClick={() => setParticipantsModal(null)} style={styles.modalClose}>✕</button>
            </div>
            {participantsModal.list.length === 0 ? (
              <p style={styles.noParticipants}>No participants recorded</p>
            ) : (
              <>
                {isCompact ? (
                  <div style={styles.modalMobileList}>
                    {participantsModal.list.map((p) => (
                      <div key={p.id} style={styles.modalMobileItem}>
                        <p style={styles.modalMobileName}>{p.student_name}</p>
                        <p style={styles.modalMobileMeta}>Duration: {p.duration_mins} min</p>
                        <p style={styles.modalMobileMeta}>
                          Attendance: {p.attendance_auto_marked ? '✅ Marked' : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.modalTableHead}>
                        <th style={styles.modalTh}>Student</th>
                        <th style={styles.modalTh}>Duration</th>
                        <th style={styles.modalTh}>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participantsModal.list.map((p) => (
                        <tr key={p.id} style={styles.modalTableRow}>
                          <td style={styles.modalTd}>{p.student_name}</td>
                          <td style={styles.modalTd}>{p.duration_mins} min</td>
                          <td style={styles.modalTd}>
                            {p.attendance_auto_marked ? (
                              <span style={{ color: COLORS.status.success }}>✅ Marked</span>
                            ) : (
                              <span style={{ color: COLORS.text.tertiary }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

const StatCard = ({ label, value, icon, color = '#fff' }) => {
  const styles = getStyles();
  return (
    <div style={styles.statCard}>
      <span style={styles.statIcon}>{icon}</span>
      <span style={{ ...styles.statValue, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const colorMap = {
    scheduled: { bg: '#FEF3C7', color: '#D97706' },
    live: { bg: '#FEE2E2', color: '#DC2626' },
    ended: { bg: '#D1FAE5', color: '#059669' },
    cancelled: { bg: '#F3F4F6', color: '#6B7280' },
  };
  const c = colorMap[status] || colorMap.cancelled;
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '2px 8px', borderRadius: 12,
      fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold,
      textTransform: 'capitalize',
    }}>
      {status === 'live' ? '● ' : ''}{status}
    </span>
  );
};

const ActionBtn = ({ onClick, color, label, fullWidth = false, minHeight = 34, emphasis = false }) => (
  <button onClick={onClick} style={{
    background: color, border: 'none', borderRadius: BORDER_RADIUS.lg,
    color: '#fff', padding: emphasis ? `8px 14px` : `6px 14px`,
    fontSize: emphasis ? FONT_SIZES.sm : FONT_SIZES.xs,
    cursor: 'pointer', fontWeight: FONT_WEIGHTS.semibold, whiteSpace: 'nowrap',
    boxShadow: emphasis ? `0 4px 14px ${color}70` : `0 2px 8px ${color}55`,
    minHeight,
    width: fullWidth ? '100%' : 'auto',
  }}>
    {label}
  </button>
);

const getStyles = ({ isMobile = false, isCompact = false } = {}) => ({
  page: {
    padding: isCompact ? SPACING.md : SPACING.xl,
    paddingTop: isCompact ? SPACING['3xl'] : SPACING.xl,
    maxWidth: 1100,
    margin: '0 auto',
  },

  // Header
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: isCompact ? 'stretch' : 'flex-start',
    flexDirection: isCompact ? 'column' : 'row',
    gap: isCompact ? SPACING.md : SPACING.lg,
    marginBottom: SPACING.xl,
  },
  pageTitle: { fontSize: isCompact ? FONT_SIZES.xl : FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white, margin: 0, display: 'flex', alignItems: 'center', gap: SPACING.sm },
  pageSubtitle: { fontSize: isCompact ? FONT_SIZES.xs : FONT_SIZES.sm, color: COLORS.text.whiteSubtle, margin: 0, marginTop: SPACING.xs },
  createBtn: {
    background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: BORDER_RADIUS.lg,
    color: COLORS.primary, padding: `${SPACING.md} ${SPACING.xl}`,
    fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.sm, cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
    width: isCompact ? '100%' : 'auto',
    minHeight: 44,
  },
  returnBanner: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    padding: isCompact ? SPACING.md : SPACING.lg,
    display: 'flex',
    alignItems: isCompact ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    flexDirection: isCompact ? 'column' : 'row',
  },
  returnText: {
    color: COLORS.text.white,
    fontSize: isCompact ? FONT_SIZES.xs : FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  returnBtn: {
    background: COLORS.status.success,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    cursor: 'pointer',
    minHeight: 40,
    whiteSpace: 'nowrap',
  },

  // School filter
  filterRow: {
    display: 'flex',
    alignItems: isCompact ? 'stretch' : 'center',
    flexDirection: isCompact ? 'column' : 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  filterLabel: { color: COLORS.text.whiteMedium, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium },
  filterSelect: {
    minWidth: isCompact ? '100%' : 220,
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: BORDER_RADIUS.lg,
    padding: `${SPACING.sm} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    color: '#fff',
    outline: 'none',
    width: isCompact ? '100%' : 'auto',
    minHeight: 44,
  },

  // Stats
  statsRow: {
    display: 'grid',
    gridTemplateColumns: isCompact ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))',
    gap: isCompact ? SPACING.md : SPACING.lg,
    marginBottom: SPACING.xl,
  },
  statCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: isCompact ? SPACING.md : SPACING.xl,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING.xs,
    textAlign: 'center',
  },
  statIcon: { fontSize: isCompact ? 20 : 28, display: 'block', marginBottom: SPACING.xs },
  statValue: { fontSize: isCompact ? FONT_SIZES.lg : FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, lineHeight: 1 },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: FONT_WEIGHTS.medium },

  // Tabs
  tabBar: {
    display: 'flex', gap: SPACING.sm, marginBottom: SPACING.lg,
    borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: SPACING.sm,
    overflowX: 'auto', WebkitOverflowScrolling: 'touch',
  },
  tab: {
    padding: `${SPACING.sm} ${isCompact ? SPACING.md : SPACING.lg}`, border: '1px solid transparent',
    background: 'transparent', cursor: 'pointer', fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium, color: COLORS.text.whiteSubtle, borderRadius: BORDER_RADIUS.md,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minHeight: 40,
  },
  tabActive: {
    padding: `${SPACING.sm} ${isCompact ? SPACING.md : SPACING.lg}`, border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold, color: '#fff', borderRadius: BORDER_RADIUS.md,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minHeight: 40,
  },

  mobileList: { display: 'grid', gap: SPACING.md },
  mobileCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  mobileCardLive: {
    border: '1px solid rgba(239,68,68,0.5)',
    boxShadow: '0 8px 20px rgba(239,68,68,0.18)',
  },
  mobileLiveBanner: {
    alignSelf: 'flex-start',
    background: 'rgba(239,68,68,0.2)',
    color: '#FEE2E2',
    border: '1px solid rgba(239,68,68,0.45)',
    borderRadius: BORDER_RADIUS.full,
    fontSize: '11px',
    fontWeight: FONT_WEIGHTS.bold,
    padding: `3px ${SPACING.sm}`,
    letterSpacing: '0.04em',
  },
  mobileCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  mobileCardTitle: {
    margin: 0,
    fontSize: FONT_SIZES.base,
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.semibold,
    overflowWrap: 'anywhere',
  },
  mobileCardMeta: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
  mobileMetaChips: {
    display: 'grid',
    gap: SPACING.xs,
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
  },
  mobileMetaChip: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteMedium,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  mobilePrimaryAction: {
    marginTop: SPACING.xs,
  },
  mobileSecondaryActions: {
    display: 'grid',
    gap: SPACING.xs,
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
  },
  emptyMobileCard: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: `${SPACING.xl} ${SPACING.lg}`,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },

  // Main table
  tableWrapper: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: 'rgba(0,0,0,0.18)' },
  th: {
    padding: `${SPACING.md} ${SPACING.lg}`, textAlign: 'left',
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteSubtle, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  tableRow: { borderTop: '1px solid rgba(255,255,255,0.08)' },
  td: { padding: `${SPACING.md} ${SPACING.lg}`, fontSize: FONT_SIZES.sm, color: COLORS.text.white },
  sessionTitle: { fontWeight: FONT_WEIGHTS.medium, color: '#fff' },
  recurringBadge: {
    marginLeft: SPACING.xs, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)',
    borderRadius: BORDER_RADIUS.full, padding: '1px 6px', fontSize: 10,
  },
  actionBtns: { display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' },
  emptyCell: { padding: `${SPACING['2xl']} ${SPACING.lg}`, textAlign: 'center', color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.sm },
  centered: { display: 'flex', justifyContent: 'center', padding: SPACING['3xl'] },
  spinner: {
    width: 36, height: 36, border: '3px solid rgba(255,255,255,0.2)',
    borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  // Participants modal — white background so uses dark text
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl, padding: isCompact ? SPACING.lg : SPACING['2xl'],
    width: isCompact ? '94%' : '90%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto',
    boxShadow: '0 14px 36px rgba(63, 46, 132, 0.16)',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white, margin: 0 },
  modalClose: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: COLORS.text.whiteSubtle },
  noParticipants: { textAlign: 'center', color: COLORS.text.whiteSubtle, padding: SPACING.xl },
  // Modal-specific table (light background)
  modalTableHead: { background: 'rgba(255,255,255,0.08)' },
  modalTh: {
    padding: `${SPACING.md} ${SPACING.lg}`, textAlign: 'left',
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.whiteSubtle, textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  modalTableRow: { borderTop: '1px solid rgba(255,255,255,0.1)' },
  modalTd: { padding: `${SPACING.md} ${SPACING.lg}`, fontSize: FONT_SIZES.sm, color: COLORS.text.white },
  modalMobileList: { display: 'grid', gap: SPACING.sm },
  modalMobileItem: {
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: BORDER_RADIUS.md,
    background: 'rgba(255,255,255,0.08)',
    padding: SPACING.md,
  },
  modalMobileName: {
    margin: 0,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
  },
  modalMobileMeta: {
    margin: `${SPACING.xs} 0 0`,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.whiteSubtle,
  },
});

export default TeacherOnlineClassesPage;
