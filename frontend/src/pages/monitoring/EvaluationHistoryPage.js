// ============================================
// EVALUATION HISTORY PAGE
// ============================================
// Admin: view all teachers' monthly composite scores with filters.
// Teacher: view own scores (auto-uses my-evaluation endpoint).
// Route: /monitoring/evaluations
// Access: Admin, Teacher

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAward,
  faChartBar,
  faSyncAlt,
  faFilter,
  faUser,
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
import {
  fetchAllEvaluations,
  fetchMyEvaluation,
  calculateEvaluations,
} from '../../services/employeeEvaluationService';

// ============================================
// CONSTANTS
// ============================================

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];

const RATINGS = [
  { value: '', label: 'All Ratings' },
  { value: 'master_trainer', label: 'Master Trainer' },
  { value: 'certified_trainer', label: 'Certified Trainer' },
  { value: 'needs_improvement', label: 'Needs Improvement' },
  { value: 'performance_review', label: 'Performance Review' },
];

const RATING_COLORS = {
  master_trainer:    { color: '#34D399', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' },
  certified_trainer: { color: '#60A5FA', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)' },
  needs_improvement: { color: '#FBBF24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
  performance_review:{ color: '#F87171', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)' },
};

const COMPONENT_META = [
  { key: 'attendance',       label: 'Attendance',        color: '#60A5FA', weight: '30%' },
  { key: 'attitude',         label: 'Attitude (BDM Eval)', color: '#A78BFA', weight: '30%' },
  { key: 'student_interest', label: 'Student Interest',  color: '#34D399', weight: '20%' },
  { key: 'enrollment_impact',label: 'Enrollment Impact', color: '#FBBF24', weight: '20%' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear - i);

// ============================================
// HELPERS
// ============================================

const scoreColor = (score) => {
  if (score >= 85) return '#34D399';
  if (score >= 70) return '#60A5FA';
  if (score >= 55) return '#FBBF24';
  return '#F87171';
};

const monthName = (m) => MONTHS.find((mo) => mo.value === m)?.label ?? `Month ${m}`;

// ============================================
// SCORE BAR
// ============================================

const ScoreBar = ({ value, color, label, weight }) => (
  <div style={{ marginBottom: SPACING.xs }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.55)' }}>
        {label} <span style={{ opacity: 0.5 }}>({weight})</span>
      </span>
      <span style={{ fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color }}>
        {value?.toFixed(1) ?? '—'}%
      </span>
    </div>
    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, value ?? 0)}%`,
        background: color,
        borderRadius: 3,
        transition: 'width 0.6s ease',
      }} />
    </div>
  </div>
);

// ============================================
// EVALUATION ROW (Admin view)
// ============================================

const EvaluationRow = ({ evaluation, isMobile }) => {
  const [expanded, setExpanded] = useState(false);
  const ratingStyle = RATING_COLORS[evaluation.rating] || RATING_COLORS.needs_improvement;
  const total = parseFloat(evaluation.total_score);
  const scores = evaluation.scores || {};

  return (
    <div style={{
      ...MIXINS.glassmorphicCard,
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
      borderLeft: `4px solid ${scoreColor(total)}`,
      marginBottom: SPACING.sm,
    }}>
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((p) => !p)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((p) => !p)}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FontAwesomeIcon icon={faUser} style={{ color: '#818CF8', fontSize: 13 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.white, fontSize: FONT_SIZES.sm }}>
              {evaluation.teacher_name}
            </p>
            <p style={{ margin: 0, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.4)' }}>
              {monthName(evaluation.month)} {evaluation.year}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Rating badge */}
          <span style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.xs,
            fontWeight: FONT_WEIGHTS.semibold,
            background: ratingStyle.bg,
            color: ratingStyle.color,
            border: `1px solid ${ratingStyle.border}`,
            whiteSpace: 'nowrap',
          }}>
            {evaluation.rating_display ?? evaluation.rating}
          </span>

          {/* Total score */}
          <span style={{
            fontSize: FONT_SIZES.lg,
            fontWeight: FONT_WEIGHTS.bold,
            color: scoreColor(total),
            minWidth: 50,
            textAlign: 'right',
          }}>
            {total.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Expanded score breakdown */}
      {expanded && (
        <div style={{
          padding: isMobile ? SPACING.md : `${SPACING.sm} ${SPACING.xl} ${SPACING.lg}`,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {COMPONENT_META.map((c) => (
            <ScoreBar
              key={c.key}
              label={c.label}
              weight={c.weight}
              value={scores[c.key]}
              color={c.color}
            />
          ))}
          {evaluation.calculated_at && (
            <p style={{ margin: `${SPACING.sm} 0 0`, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.3)' }}>
              Last calculated: {new Date(evaluation.calculated_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// TEACHER SELF VIEW (my-evaluation)
// ============================================

const MyEvaluationView = ({ isMobile }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyEvaluation()
      .then(setData)
      .catch(() => setError('Failed to load your evaluation scores.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (!data || data.count === 0) {
    return (
      <div style={{
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: FONT_SIZES.sm,
      }}>
        No evaluation scores available yet.
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: `0 0 ${SPACING.md}`, fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.5)' }}>
        Showing scores for {data.teacher_name}
      </p>
      {data.evaluations.map((ev, idx) => {
        const total = parseFloat(ev.total_score);
        const ratingStyle = RATING_COLORS[ev.rating] || RATING_COLORS.needs_improvement;
        return (
          <div key={idx} style={{
            ...MIXINS.glassmorphicCard,
            borderRadius: BORDER_RADIUS.xl,
            padding: isMobile ? SPACING.md : SPACING.xl,
            marginBottom: SPACING.md,
            borderLeft: `4px solid ${scoreColor(total)}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md, flexWrap: 'wrap', gap: SPACING.sm }}>
              <div>
                <p style={{ margin: 0, fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text.white }}>
                  {monthName(ev.month)} {ev.year}
                </p>
                <span style={{
                  display: 'inline-block',
                  marginTop: SPACING.xs,
                  padding: `${SPACING.xs} ${SPACING.sm}`,
                  borderRadius: BORDER_RADIUS.full,
                  fontSize: FONT_SIZES.xs,
                  fontWeight: FONT_WEIGHTS.semibold,
                  background: ratingStyle.bg,
                  color: ratingStyle.color,
                  border: `1px solid ${ratingStyle.border}`,
                }}>
                  {ev.rating_display ?? ev.rating}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: FONT_SIZES['2xl'] ?? '1.75rem', fontWeight: FONT_WEIGHTS.bold, color: scoreColor(total) }}>
                {total.toFixed(1)}%
              </p>
            </div>
            {COMPONENT_META.map((c) => (
              <ScoreBar
                key={c.key}
                label={c.label}
                weight={c.weight}
                value={ev.scores?.[c.key]}
                color={c.color}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// SUMMARY STATS BAR (Admin only)
// ============================================

const SummaryBar = ({ summary, isMobile }) => {
  if (!summary) return null;
  const breakdown = summary.rating_breakdown || {};
  const chips = [
    { label: 'Master Trainer',   value: breakdown.master_trainer    ?? 0, ...RATING_COLORS.master_trainer },
    { label: 'Certified',        value: breakdown.certified_trainer  ?? 0, ...RATING_COLORS.certified_trainer },
    { label: 'Needs Improvement',value: breakdown.needs_improvement  ?? 0, ...RATING_COLORS.needs_improvement },
    { label: 'Perf. Review',     value: breakdown.performance_review ?? 0, ...RATING_COLORS.performance_review },
  ];

  return (
    <div style={{
      ...MIXINS.glassmorphicCard,
      borderRadius: BORDER_RADIUS.xl,
      padding: isMobile ? SPACING.md : SPACING.xl,
      marginBottom: SPACING.xl,
      display: 'flex',
      flexWrap: 'wrap',
      gap: SPACING.xl,
      alignItems: 'center',
    }}>
      <div>
        <p style={{ margin: 0, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Avg. Score</p>
        <p style={{ margin: 0, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: scoreColor(parseFloat(summary.average_score ?? 0)) }}>
          {summary.average_score ? parseFloat(summary.average_score).toFixed(1) : '—'}%
        </p>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Records</p>
        <p style={{ margin: 0, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white }}>
          {summary.total_evaluations ?? 0}
        </p>
      </div>
      <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <span key={c.label} style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.xs,
            fontWeight: FONT_WEIGHTS.semibold,
            background: c.bg,
            color: c.color,
            border: `1px solid ${c.border}`,
          }}>
            {c.label}: {c.value}
          </span>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE
// ============================================

const EvaluationHistoryPage = () => {
  const { isMobile } = useResponsive();

  // Determine role from stored auth
  const userRole = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').role; } catch { return null; }
  })();
  const isAdmin = userRole === 'Admin';

  const [evaluations, setEvaluations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);

  const [filters, setFilters] = useState({
    month: '',
    year: currentYear,
    rating: '',
  });

  const loadEvaluations = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllEvaluations({
        month: filters.month || undefined,
        year: filters.year || undefined,
        rating: filters.rating || undefined,
      });
      setEvaluations(data.evaluations || []);
      setSummary(data.summary || null);
    } catch {
      setError('Failed to load evaluation data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filters]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const handleCalculate = async () => {
    if (!filters.month || !filters.year) {
      toast.warning('Select a month and year to calculate scores.');
      return;
    }
    setCalculating(true);
    try {
      const result = await calculateEvaluations(filters.month, filters.year);
      toast.success(`Calculated scores for ${result.count} teacher(s).`);
      loadEvaluations();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.lg,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    padding: `${SPACING.sm} ${SPACING.md}`,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: isMobile ? SPACING.md : SPACING.xl,
      maxWidth: 960,
      margin: '0 auto',
    }}>
      <PageHeader
        title="Evaluation History"
        subtitle={isAdmin ? 'Monthly composite teacher performance scores' : 'Your performance scores'}
        icon={<FontAwesomeIcon icon={faChartBar} />}
      />

      {/* Teacher self-view */}
      {!isAdmin && <MyEvaluationView isMobile={isMobile} />}

      {/* Admin view */}
      {isAdmin && (
        <>
          {/* Filters row */}
          <div style={{
            display: 'flex',
            gap: SPACING.sm,
            flexWrap: 'wrap',
            marginBottom: SPACING.xl,
            alignItems: 'center',
          }}>
            <FontAwesomeIcon icon={faFilter} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }} />

            <select
              value={filters.month}
              onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))}
              style={inputStyle}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}
                  style={{ background: '#3730A3', color: 'white' }}
                >
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={filters.year}
              onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}
              style={inputStyle}
            >
              {YEARS.map((y) => (
                <option key={y} value={y} style={{ background: '#3730A3', color: 'white' }}>{y}</option>
              ))}
            </select>

            <select
              value={filters.rating}
              onChange={(e) => setFilters((p) => ({ ...p, rating: e.target.value }))}
              style={inputStyle}
            >
              {RATINGS.map((r) => (
                <option key={r.value} value={r.value} style={{ background: '#3730A3', color: 'white' }}>{r.label}</option>
              ))}
            </select>

            <button
              onClick={handleCalculate}
              disabled={calculating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.xs,
                background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: BORDER_RADIUS.lg,
                color: '#A78BFA',
                cursor: calculating ? 'not-allowed' : 'pointer',
                fontSize: FONT_SIZES.sm,
                fontWeight: FONT_WEIGHTS.semibold,
                padding: `${SPACING.sm} ${SPACING.md}`,
                opacity: calculating ? 0.6 : 1,
                transition: `all ${TRANSITIONS.fast}`,
              }}
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={calculating} />
              {calculating ? 'Calculating…' : 'Calculate'}
            </button>
          </div>

          {/* Summary stats */}
          <SummaryBar summary={summary} isMobile={isMobile} />

          {/* List */}
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorDisplay message={error} onRetry={loadEvaluations} />
          ) : evaluations.length === 0 ? (
            <div style={{
              ...MIXINS.glassmorphicCard,
              borderRadius: BORDER_RADIUS.xl,
              padding: SPACING.xl,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: FONT_SIZES.sm,
            }}>
              No evaluation records found for the selected filters.
              {filters.month && filters.year && (
                <span> Try clicking <strong style={{ color: '#A78BFA' }}>Calculate</strong> to generate scores.</span>
              )}
            </div>
          ) : (
            <div>
              {evaluations.map((ev) => (
                <EvaluationRow key={ev.id} evaluation={ev} isMobile={isMobile} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EvaluationHistoryPage;
