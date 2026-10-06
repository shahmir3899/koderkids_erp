// ============================================
// BULK REPORT PROGRESS - overlay shown while a bulk ZIP is being generated
// ============================================

import React from 'react';
import { COLORS, BORDER_RADIUS } from '../../utils/designConstants';

const fmtTime = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const STATUS_META = {
  queued: { label: 'Queued', color: '#9CA3AF', icon: '○' },
  working: { label: 'Generating', color: '#6366F1', icon: '◔' },
  retrying: { label: 'Retrying', color: '#F59E0B', icon: '↻' },
  done: { label: 'Done', color: '#10B981', icon: '✓' },
  failed: { label: 'Failed', color: '#EF4444', icon: '✕' },
};

const css = `
@keyframes bulkShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes bulkSpin { to { transform: rotate(360deg); } }
@keyframes bulkPulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
.bulk-bar-fill { background: linear-gradient(90deg,#6366F1,#B061CE,#6366F1); background-size: 200% 100%; animation: bulkShimmer 2s linear infinite; }
.bulk-spinner { animation: bulkSpin 1s linear infinite; display: inline-block; }
.bulk-pulse { animation: bulkPulse 1.4s ease-in-out infinite; }
`;

export const BulkReportProgress = ({ state, onCancel, onClose, onDownload }) => {
  if (!state) return null;
  const { phase, batches = [], totalStudents, generated, failedCount, elapsedMs, result } = state;

  const running = phase === 'running';
  const processed = generated + failedCount;
  const pct = totalStudents ? Math.min(100, Math.round((processed / totalStudents) * 100)) : 0;
  const currentIdx = batches.findIndex((b) => b.status === 'working' || b.status === 'retrying');
  const current = currentIdx >= 0 ? batches[currentIdx] : null;
  const etaMs = processed > 0 && running ? (elapsedMs / processed) * (totalStudents - processed) : null;

  let title = 'Generating reports…';
  if (phase === 'finished') title = failedCount ? 'Finished with some problems' : 'All reports ready!';
  if (phase === 'cancelled') title = 'Cancelled';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bulk report generation progress"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16, background: COLORS.background.overlay, backdropFilter: 'blur(4px)',
      }}
    >
      <style>{css}</style>
      <div
        style={{
          width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', color: '#fff',
          background: COLORS.background.gradient, borderRadius: BORDER_RADIUS?.xl || 20, padding: 24,
          border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          {running && <span className="bulk-spinner" aria-hidden>⟳</span>}
          {title}
        </h3>

        <p style={{ margin: '6px 0 16px', opacity: 0.9, fontSize: 14 }}>
          {running && current && (
            <>
              Batch {currentIdx + 1} of {batches.length}
              {current.status === 'retrying' ? ` · retry ${current.attempt - 1} of 2` : ''} ·{' '}
              {processed} / {totalStudents} students
            </>
          )}
          {running && !current && 'Preparing…'}
          {!running && `${generated} of ${totalStudents} reports generated${failedCount ? `, ${failedCount} failed` : ''}`}
        </p>

        {/* Progress bar */}
        <div
          role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
          style={{ height: 14, background: 'rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden' }}
        >
          <div
            className={running ? 'bulk-bar-fill' : ''}
            style={{
              height: '100%', width: `${pct}%`, transition: 'width .5s ease',
              background: running ? undefined : failedCount ? '#F59E0B' : '#10B981',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6, opacity: 0.9 }}>
          <span>{pct}%</span>
          <span>
            Elapsed {fmtTime(elapsedMs)}
            {etaMs != null && ` · ~${fmtTime(etaMs)} left`}
          </span>
        </div>

        {running && (
          <p className="bulk-pulse" style={{ fontSize: 13, margin: '12px 0 0' }}>
            Please keep this tab open. Reports are built in small batches so large classes don't time out.
          </p>
        )}

        {/* Batch chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {batches.map((b) => {
            const m = STATUS_META[b.status];
            return (
              <div
                key={b.index}
                title={b.error ? `${b.error.title}: ${b.error.detail}` : m.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: 12, borderRadius: 999,
                  background: 'rgba(255,255,255,0.15)', border: `1px solid ${m.color}`,
                }}
              >
                <span
                  className={b.status === 'working' || b.status === 'retrying' ? 'bulk-spinner' : ''}
                  style={{ color: m.color, fontWeight: 700 }}
                >
                  {m.icon}
                </span>
                #{b.index + 1} · {b.ids.length} · {m.label}
              </div>
            );
          })}
        </div>

        {/* Per-batch errors (live) */}
        {batches.some((b) => b.error) && (
          <div style={{ marginTop: 14, fontSize: 13, background: 'rgba(239,68,68,0.2)', borderRadius: 10, padding: 10 }}>
            {batches.filter((b) => b.error).map((b) => (
              <div key={b.index} style={{ marginBottom: 4 }}>
                <strong>Batch {b.index + 1}:</strong> {b.error.title} — {b.error.detail}
                {b.error.requestId ? ` (ref ${b.error.requestId.slice(0, 8)})` : ''}
              </div>
            ))}
          </div>
        )}

        {/* Final failed-student list */}
        {!running && result?.failed?.length > 0 && (
          <details open style={{ marginTop: 14, fontSize: 13 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              {result.failed.length} student{result.failed.length > 1 ? 's' : ''} missing from the ZIP
            </summary>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, maxHeight: 160, overflowY: 'auto' }}>
              {result.failed.map((f, i) => (
                <li key={`${f.student_id}-${i}`}>
                  {f.name || `Student #${f.student_id}`} — {f.stage}: {f.reason}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          {running ? (
            <button onClick={onCancel} style={btn('rgba(255,255,255,0.2)')}>Cancel</button>
          ) : (
            <>
              {result?.blob && <button onClick={onDownload} style={btn('#10B981')}>Download ZIP again</button>}
              <button onClick={onClose} style={btn('rgba(255,255,255,0.25)')}>Close</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const btn = (bg) => ({
  background: bg, color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 10,
  padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
});

export default BulkReportProgress;
