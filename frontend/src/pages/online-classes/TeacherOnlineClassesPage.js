// frontend/src/pages/online-classes/TeacherOnlineClassesPage.js
// Teacher dashboard: view, start, and manage class sessions

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, MIXINS } from '../../utils/designConstants';
import { API_URL, getAuthHeaders } from '../../api';
import {
  deleteSession,
  getParticipants,
  listSessions,
  startSession,
} from '../../services/onlineClassService';

const TeacherOnlineClassesPage = () => {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [participantsModal, setParticipantsModal] = useState(null); // { session, list }
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const role = localStorage.getItem('role') || '';

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

  const fetchSessions = React.useCallback(() => {
    const buildParams = (status) => {
      const params = { status };
      if (selectedSchool) params.school = selectedSchool;
      return params;
    };

    Promise.all([
      listSessions(buildParams('scheduled')),
      listSessions(buildParams('live')),
      listSessions(buildParams('ended')),
    ])
      .then(([scheduled, live, ended]) => {
        setUpcoming([...live, ...scheduled]);
        setPast(ended);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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

  const handleViewParticipants = async (session) => {
    const list = await getParticipants(session.id).catch(() => []);
    setParticipantsModal({ session, list });
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const attendancePercent = (session) => {
    if (!session.participants_count || !session.participants_count) return '—';
    return '—'; // actual % needs participant data
  };

  const styles = getStyles();

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
      {error && <p style={styles.errorText}>{error}</p>}

      {/* Session table */}
      {!loading && !error && (
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
              {(activeTab === 'upcoming' ? upcoming : past).map((session) => (
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
                  <td style={styles.td}>
                    <div style={styles.actionBtns}>
                      {session.status === 'scheduled' && (
                        <>
                          <ActionBtn onClick={() => handleStartSession(session)} color={COLORS.status.success} label="▶ Start" />
                          <ActionBtn onClick={() => navigate(`/online-classes/teacher/edit/${session.id}`)} color={COLORS.status.info} label="Edit" />
                          <ActionBtn onClick={() => handleDelete(session)} color={COLORS.status.error} label="Cancel" />
                        </>
                      )}
                      {session.status === 'live' && (
                        <ActionBtn onClick={() => handleJoinLive(session)} color={COLORS.status.error} label="🔴 Join" />
                      )}
                      {session.status === 'ended' && (
                        <>
                          <ActionBtn onClick={() => handleViewParticipants(session)} color={COLORS.primary} label="Students" />
                          {session.recording_enabled && (
                            <ActionBtn onClick={() => navigate(`/online-classes/recordings/${session.id}`)} color={COLORS.status.warning} label="▶ Recording" />
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(activeTab === 'upcoming' ? upcoming : past).length === 0 && (
                <tr><td colSpan={6} style={styles.emptyCell}>No {activeTab} sessions</td></tr>
              )}
            </tbody>
          </table>
        </div>
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

const ActionBtn = ({ onClick, color, label }) => (
  <button onClick={onClick} style={{
    background: color, border: 'none', borderRadius: BORDER_RADIUS.lg,
    color: '#fff', padding: `6px 14px`, fontSize: FONT_SIZES.xs,
    cursor: 'pointer', fontWeight: FONT_WEIGHTS.semibold, whiteSpace: 'nowrap',
    boxShadow: `0 2px 8px ${color}55`,
  }}>
    {label}
  </button>
);

const getStyles = () => ({
  page: { padding: SPACING.xl, maxWidth: 1100, margin: '0 auto' },

  // Header
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.xl },
  pageTitle: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white, margin: 0, display: 'flex', alignItems: 'center', gap: SPACING.sm },
  pageSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle, margin: 0, marginTop: SPACING.xs },
  createBtn: {
    background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: BORDER_RADIUS.lg,
    color: COLORS.primary, padding: `${SPACING.md} ${SPACING.xl}`,
    fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.sm, cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
  },

  // School filter
  filterRow: { display: 'flex', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  filterLabel: { color: COLORS.text.whiteMedium, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium },
  filterSelect: {
    minWidth: 220,
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: BORDER_RADIUS.lg,
    padding: `${SPACING.sm} ${SPACING.md}`,
    fontSize: FONT_SIZES.sm,
    color: '#fff',
    outline: 'none',
  },

  // Stats
  statsRow: { display: 'flex', gap: SPACING.lg, marginBottom: SPACING.xl },
  statCard: {
    flex: 1,
    ...MIXINS.glassmorphicCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING.xs,
    textAlign: 'center',
  },
  statIcon: { fontSize: 28, display: 'block', marginBottom: SPACING.xs },
  statValue: { fontSize: FONT_SIZES['2xl'], fontWeight: FONT_WEIGHTS.bold, lineHeight: 1 },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.text.whiteSubtle, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: FONT_WEIGHTS.medium },

  // Tabs
  tabBar: {
    display: 'flex', gap: SPACING.sm, marginBottom: SPACING.lg,
    borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: SPACING.sm,
  },
  tab: {
    padding: `${SPACING.sm} ${SPACING.lg}`, border: '1px solid transparent',
    background: 'transparent', cursor: 'pointer', fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium, color: COLORS.text.whiteSubtle, borderRadius: BORDER_RADIUS.md,
  },
  tabActive: {
    padding: `${SPACING.sm} ${SPACING.lg}`, border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold, color: '#fff', borderRadius: BORDER_RADIUS.md,
  },

  // Main table
  tableWrapper: { ...MIXINS.glassmorphicCard, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden' },
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
  errorText: { color: '#FCA5A5', textAlign: 'center' },

  // Participants modal — white background so uses dark text
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    background: '#fff', borderRadius: BORDER_RADIUS.xl, padding: SPACING['2xl'],
    width: '90%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.primary, margin: 0 },
  modalClose: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: COLORS.text.secondary },
  noParticipants: { textAlign: 'center', color: COLORS.text.tertiary, padding: SPACING.xl },
  // Modal-specific table (light background)
  modalTableHead: { background: COLORS.background.gray },
  modalTh: {
    padding: `${SPACING.md} ${SPACING.lg}`, textAlign: 'left',
    fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.secondary, textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  modalTableRow: { borderTop: `1px solid ${COLORS.border.light}` },
  modalTd: { padding: `${SPACING.md} ${SPACING.lg}`, fontSize: FONT_SIZES.sm, color: COLORS.text.primary },
});

export default TeacherOnlineClassesPage;
