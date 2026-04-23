// ============================================
// VISIT DETAIL PAGE
// ============================================
// Read-only view of a single monitoring visit and all its teacher evaluations.
// Accessible at /monitoring/visits/:visitId for Admin and BDM roles.

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronDown,
  faChevronUp,
  faUser,
  faClipboardCheck,
  faCalendarAlt,
  faSchool,
  faUserTie,
  faStar,
} from '@fortawesome/free-solid-svg-icons';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  MIXINS,
} from '../../utils/designConstants';
import { useResponsive } from '../../hooks/useResponsive';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/common/ui/ErrorDisplay';
import { fetchVisitDetail, fetchVisitEvaluations, fetchEvaluationDetail } from '../../services/monitoringService';

// ============================================
// HELPERS
// ============================================

const STATUS_COLORS = {
  planned:     { bg: 'rgba(99,102,241,0.15)', color: '#818CF8', border: 'rgba(99,102,241,0.4)' },
  in_progress: { bg: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: 'rgba(245,158,11,0.4)' },
  completed:   { bg: 'rgba(16,185,129,0.15)', color: '#34D399', border: 'rgba(16,185,129,0.4)' },
  cancelled:   { bg: 'rgba(239,68,68,0.15)', color: '#F87171', border: 'rgba(239,68,68,0.4)' },
  missed:      { bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF', border: 'rgba(156,163,175,0.4)' },
};

const scoreColor = (score) => {
  if (score === null || score === undefined) return 'rgba(255,255,255,0.4)';
  if (score >= 80) return '#34D399';
  if (score >= 60) return '#FBBF24';
  return '#F87171';
};

const scoreLabel = (score) => {
  if (score === null || score === undefined) return 'N/A';
  if (score >= 90) return 'Outstanding';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Satisfactory';
  if (score >= 50) return 'Needs Improvement';
  return 'Unsatisfactory';
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

// ============================================
// EVALUATION RESPONSE ROW
// ============================================

const ResponseRow = ({ response, isMobile }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: `${SPACING.sm} 0`,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
  }}>
    <span style={{ fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.65)', flex: 1, minWidth: 120 }}>
      {response.field_label}
    </span>
    <span style={{
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold,
      color: response.field_type?.startsWith('rating')
        ? scoreColor(parseFloat(response.numeric_value) * (response.field_type === 'rating_1_5' ? 20 : 10))
        : COLORS.text.white,
      textAlign: 'right',
    }}>
      {response.field_type === 'rating_1_5' && response.numeric_value
        ? `${response.numeric_value} / 5`
        : response.field_type === 'rating_1_10' && response.numeric_value
        ? `${response.numeric_value} / 10`
        : response.field_type === 'yes_no'
        ? (response.numeric_value === '1' || response.numeric_value === 1 ? 'Yes' : 'No')
        : response.value || '—'}
    </span>
  </div>
);

// ============================================
// EVALUATION CARD
// ============================================

const EvaluationCard = ({ evaluation, isMobile }) => {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!detail) {
      setLoading(true);
      try {
        const data = await fetchEvaluationDetail(evaluation.id);
        setDetail(data);
      } catch {
        toast.error('Failed to load evaluation details.');
        return;
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  }, [expanded, detail, evaluation.id]);

  const score = parseFloat(evaluation.normalized_score);
  const color = scoreColor(score);

  return (
    <div style={{
      ...MIXINS.glassmorphicCard,
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      borderLeft: `4px solid ${color}`,
      transition: `all ${TRANSITIONS.normal}`,
    }}>
      {/* Header row */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleExpand}
        onKeyDown={(e) => e.key === 'Enter' && handleExpand()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? SPACING.md : `${SPACING.md} ${SPACING.xl}`,
          cursor: 'pointer',
          gap: SPACING.md,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}
      >
        {/* Teacher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(139,92,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FontAwesomeIcon icon={faUser} style={{ color: '#A78BFA', fontSize: 14 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.white, fontSize: FONT_SIZES.sm, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {evaluation.teacher_name}
            </p>
            <p style={{ margin: 0, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.5)' }}>
              {evaluation.template_name}
            </p>
          </div>
        </div>

        {/* Score badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexShrink: 0 }}>
          <div style={{
            padding: `${SPACING.xs} ${SPACING.md}`,
            borderRadius: BORDER_RADIUS.full,
            background: `${color}22`,
            border: `1px solid ${color}55`,
            textAlign: 'center',
            minWidth: 70,
          }}>
            <p style={{ margin: 0, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color }}>
              {isNaN(score) ? '—' : `${score.toFixed(1)}%`}
            </p>
            <p style={{ margin: 0, fontSize: FONT_SIZES.xs, color }}>
              {isNaN(score) ? '' : scoreLabel(score)}
            </p>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            {loading
              ? <span style={{ fontSize: 11 }}>…</span>
              : <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
            }
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && detail && (
        <div style={{
          padding: isMobile ? SPACING.md : `0 ${SPACING.xl} ${SPACING.xl}`,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          animation: 'fadeIn 0.15s ease',
        }}>
          {/* Field responses */}
          {Array.isArray(detail.responses) && detail.responses.length > 0 && (
            <div style={{ marginBottom: SPACING.md }}>
              <p style={{ margin: `${SPACING.md} 0 ${SPACING.sm}`, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Evaluation Responses
              </p>
              {detail.responses.map((r) => (
                <ResponseRow key={r.id} response={r} isMobile={isMobile} />
              ))}
            </div>
          )}

          {/* Qualitative fields */}
          {[
            { label: 'Remarks', value: detail.remarks },
            { label: 'Strengths', value: detail.teacher_strengths },
            { label: 'Areas of Improvement', value: detail.areas_of_improvement },
          ].filter((f) => f.value).map((f) => (
            <div key={f.label} style={{ marginBottom: SPACING.sm }}>
              <p style={{ margin: `0 0 ${SPACING.xs}`, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {f.label}
              </p>
              <p style={{ margin: 0, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                {f.value}
              </p>
            </div>
          ))}

          {/* Submitted at */}
          <p style={{ margin: `${SPACING.md} 0 0`, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.35)' }}>
            Submitted: {formatDate(detail.submitted_at)}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================
// META CHIP
// ============================================

const MetaChip = ({ icon, label, value, color = 'rgba(255,255,255,0.7)' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
    <FontAwesomeIcon icon={icon} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }} />
    <span style={{ fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.5)' }}>{label}:</span>
    <span style={{ fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color }}>{value}</span>
  </div>
);

// ============================================
// MAIN PAGE
// ============================================

const VisitDetailPage = () => {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [visit, setVisit] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loadingVisit, setLoadingVisit] = useState(true);
  const [loadingEvals, setLoadingEvals] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!visitId) return;
    setLoadingVisit(true);
    setLoadingEvals(true);
    setError('');

    try {
      const [visitData, evalData] = await Promise.all([
        fetchVisitDetail(visitId),
        fetchVisitEvaluations(visitId),
      ]);
      setVisit(visitData);
      setEvaluations(Array.isArray(evalData) ? evalData : []);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to load visit details.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingVisit(false);
      setLoadingEvals(false);
    }
  }, [visitId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loadingVisit) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={loadData} />;
  if (!visit) return null;

  const statusColors = STATUS_COLORS[visit.status] || STATUS_COLORS.planned;
  const teacherNames = Array.isArray(visit.teacher_names) ? visit.teacher_names.filter(Boolean) : [];
  const teacherCount = teacherNames.length > 0
    ? teacherNames.length
    : Number(visit.teacher_count || 0);
  const avgScore = evaluations.length > 0
    ? evaluations.reduce((sum, e) => sum + parseFloat(e.normalized_score || 0), 0) / evaluations.length
    : null;

  return (
    <div style={{
      minHeight: '100vh',
      padding: isMobile ? SPACING.md : SPACING.xl,
      maxWidth: 900,
      margin: '0 auto',
    }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/monitoring')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.55)',
          cursor: 'pointer',
          fontSize: FONT_SIZES.sm,
          padding: `${SPACING.xs} 0`,
          marginBottom: SPACING.md,
          transition: `color ${TRANSITIONS.fast}`,
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = COLORS.text.white}
        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Back to Monitoring
      </button>

      <PageHeader
        title="Visit Detail"
        subtitle={`${visit.school_name} · ${formatDate(visit.visit_date)}`}
      />

      {/* Visit summary card */}
      <div style={{
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        padding: isMobile ? SPACING.md : SPACING.xl,
        marginBottom: SPACING.xl,
        borderLeft: `4px solid ${statusColors.color}`,
      }}>
        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md, flexWrap: 'wrap', gap: SPACING.sm }}>
          <span style={{
            padding: `${SPACING.xs} ${SPACING.md}`,
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.xs,
            fontWeight: FONT_WEIGHTS.semibold,
            background: statusColors.bg,
            color: statusColors.color,
            border: `1px solid ${statusColors.border}`,
            textTransform: 'capitalize',
          }}>
            {visit.status.replace('_', ' ')}
          </span>
          {avgScore !== null && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.4)' }}>Avg. Evaluation Score</p>
              <p style={{ margin: 0, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: scoreColor(avgScore) }}>
                {avgScore.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* Meta info grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? SPACING.sm : SPACING.xl }}>
          <MetaChip icon={faSchool} label="School" value={visit.school_name} color="#60A5FA" />
          <MetaChip icon={faUserTie} label="BDM" value={visit.bdm_name} color="#A78BFA" />
          <MetaChip icon={faCalendarAlt} label="Date" value={formatDate(visit.visit_date)} />
          {visit.planned_time && (
            <MetaChip icon={faStar} label="Planned Time" value={formatTime(visit.planned_time)} />
          )}
          <MetaChip icon={faUser} label="Teachers" value={`${teacherCount} assigned`} color="#93C5FD" />
          <MetaChip icon={faClipboardCheck} label="Evaluations" value={`${evaluations.length} recorded`} color="#34D399" />
        </div>

        {teacherNames.length > 0 && (
          <p style={{ margin: `${SPACING.md} 0 0`, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.7)' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Teacher Names: </span>
            {teacherNames.join(', ')}
          </p>
        )}

        {visit.purpose && (
          <p style={{ margin: `${SPACING.md} 0 0`, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Purpose: </span>{visit.purpose}
          </p>
        )}
        {visit.notes && (
          <p style={{ margin: `${SPACING.sm} 0 0`, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Notes: </span>{visit.notes}
          </p>
        )}
      </div>

      {/* Evaluations section */}
      <div>
        <h2 style={{ margin: `0 0 ${SPACING.md}`, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.white }}>
          Teacher Evaluations
        </h2>

        {loadingEvals ? (
          <LoadingSpinner />
        ) : evaluations.length === 0 ? (
          <div style={{
            ...MIXINS.glassmorphicCard,
            borderRadius: BORDER_RADIUS.xl,
            padding: SPACING.xl,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: FONT_SIZES.sm,
          }}>
            No evaluations recorded for this visit.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            {evaluations.map((ev) => (
              <EvaluationCard key={ev.id} evaluation={ev} isMobile={isMobile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitDetailPage;
