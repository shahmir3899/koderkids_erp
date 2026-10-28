// ============================================
// RECONCILIATION WIZARD
// Guided bank-statement reconciliation: pick account, upload statement,
// review each missing entry (approve / skip), check the balance.
// Location: frontend/src/components/transactions/ReconciliationWizard.js
// ============================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  startReconciliation,
  getOpenReconciliation,
  reconcileLineAction,
  adjustReconciliation,
  completeReconciliation,
} from '../../services/reconcileService';

const money = (n) =>
  `PKR ${Math.abs(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TYPES_FOR = { in: ['Income', 'Transfer'], out: ['Expense', 'Transfer'] };

export const ReconciliationWizard = ({ accounts = [], onRefresh }) => {
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState(null);
  const [session, setSession] = useState(null);
  const [resumable, setResumable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSkipped, setShowSkipped] = useState(false);
  const [edit, setEdit] = useState({});
  const [confirmText, setConfirmText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const fileInput = useRef(null);

  // ---- derived -----------------------------------------------------------
  const lines = useMemo(() => session?.lines || [], [session]);
  const pending = useMemo(() => lines.filter((l) => l.status === 'pending'), [lines]);
  const skipped = useMemo(
    () => lines.filter((l) => l.status === 'skipped' && (l.bucket === 'new' || l.bucket === 'earlier')),
    [lines]
  );
  const current = pending[0] || null;
  const otherAccounts = useMemo(
    () => accounts.filter((a) => !session || a.id !== session.account.id),
    [accounts, session]
  );

  // Reset the edit form whenever a different line comes up.
  useEffect(() => {
    if (!current) return;
    const s = current.suggestion || {};
    setEdit({
      transaction_type: s.type || (current.deposit > 0 ? 'Income' : 'Expense'),
      category: s.category || '',
      notes: current.description || '',
      counter_account_id: s.counter_account_id || '',
    });
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offer to resume an unfinished reconciliation for the chosen account.
  useEffect(() => {
    setResumable(null);
    if (!accountId || session) return;
    let cancelled = false;
    getOpenReconciliation(accountId).then((res) => {
      if (!cancelled && res.ok && res.data && res.data.id) setResumable(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, session]);

  // ---- actions -----------------------------------------------------------
  const handleStart = async () => {
    if (!accountId || !file) return;
    setBusy(true);
    setError('');
    const res = await startReconciliation(file, accountId);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSession(res.data);
    setFile(null);
  };

  const act = useCallback(
    async (line, action, body) => {
      if (!session || busy) return;
      setBusy(true);
      setError('');
      const res = await reconcileLineAction(session.id, line.id, action, body);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      setSession(res.data);
      if (action === 'approve' && onRefresh) onRefresh();
    },
    [session, busy, onRefresh]
  );

  const approve = useCallback(() => {
    if (!current) return;
    if (edit.transaction_type === 'Transfer' && !edit.counter_account_id) {
      return setError('Choose the other account for this transfer.');
    }
    act(current, 'approve', {
      transaction_type: edit.transaction_type,
      category: edit.category,
      notes: edit.notes,
      counter_account_id: edit.counter_account_id ? Number(edit.counter_account_id) : undefined,
    });
  }, [current, edit, act]);

  const skip = useCallback(() => current && act(current, 'skip'), [current, act]);

  // Keyboard: A = approve, S = skip (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e) => {
      if (!current || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'a' || e.key === 'A') approve();
      if (e.key === 's' || e.key === 'S') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, approve, skip]);

  const handleAdjust = async () => {
    setBusy(true);
    setError('');
    const res = await adjustReconciliation(session.id, session.balance.difference);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSession(res.data);
    setConfirmText('');
    setConfirmed(false);
    toast.warn('Adjustment entry created');
    if (onRefresh) onRefresh();
  };

  const handleFinish = async () => {
    setBusy(true);
    const res = await completeReconciliation(session.id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success('Reconciliation finished');
    setSession(null);
    if (onRefresh) onRefresh();
  };

  // ---- views -------------------------------------------------------------
  if (!session) {
    return (
      <div style={styles.wrap}>
        <h3 style={styles.h3}>1. Choose the account and upload its statement</h3>
        <label style={styles.label}>
          Account
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={styles.input}>
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </select>
        </label>

        {resumable && (
          <div style={styles.notice}>
            <strong>Unfinished reconciliation</strong> for this account ({resumable.file_name || 'statement'},{' '}
            {resumable.counts.pending} line(s) waiting).
            <div style={{ marginTop: 8 }}>
              <button type="button" style={styles.primary} onClick={() => setSession(resumable)}>
                Resume
              </button>
            </div>
          </div>
        )}

        <div
          style={styles.drop}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInput.current && fileInput.current.click()}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          {file ? <strong>{file.name}</strong> : 'Drop the bank statement here, or click to choose (PDF, Excel, CSV, image)'}
        </div>

        {error && <div style={styles.error}>{error}</div>}
        <button type="button" style={styles.primary} disabled={!accountId || !file || busy} onClick={handleStart}>
          {busy ? 'Reading statement…' : 'Read statement'}
        </button>
        <p style={styles.hint}>Nothing is saved to your books until you approve a line.</p>
      </div>
    );
  }

  const b = session.balance;
  const diff = b.difference;

  return (
    <div style={styles.wrap}>
      {/* Summary and balance bar */}
      <div style={styles.stickyBar}>
        <div style={styles.barRow}>
          <span>
            <strong>{session.account.name}</strong>
            <span style={styles.muted}> · {session.file_name}</span>
          </span>
          <span style={styles.muted}>
            {session.counts.matched} in system · {session.counts.approved} added · {session.counts.skipped} skipped ·{' '}
            {session.counts.pending} to review
          </span>
        </div>
        <div style={styles.barRow}>
          <span>Statement closing: <strong>{b.statement_closing == null ? '—' : money(b.statement_closing)}</strong></span>
          <span>System: <strong>{money(b.system_balance)}</strong></span>
          <span
            style={{
              ...styles.badge,
              background: b.matches ? '#065F46' : diff == null ? '#374151' : '#991B1B',
            }}
          >
            {b.matches ? 'Balances match' : diff == null ? 'No closing balance' : `Difference ${diff > 0 ? '+' : '−'}${money(diff)}`}
          </span>
        </div>
      </div>

      <p style={styles.hint}>{session.anchor_note}</p>
      {session.parse_mismatches > 0 && (
        <div style={styles.notice}>
          {session.parse_mismatches} statement row(s) do not follow the running balance. Check those amounts
          carefully; they may have been misread.
        </div>
      )}
      {error && <div style={styles.error}>{error}</div>}

      {/* Review card */}
      {current ? (
        <div style={styles.card}>
          <div style={styles.cardTop}>
            <span style={styles.muted}>
              Entry {lines.filter((l) => l.status !== 'matched').findIndex((l) => l.id === current.id) + 1} of{' '}
              {lines.filter((l) => l.status !== 'matched').length}
            </span>
            {current.bucket === 'earlier' && <span style={styles.tag}>Before the sync point</span>}
            {current.balance_ok === false && <span style={{ ...styles.tag, background: '#991B1B' }}>Balance mismatch</span>}
          </div>
          <div style={styles.date}>{current.date}</div>
          <div style={styles.desc}>{current.description || '(no description)'}</div>
          <div style={{ ...styles.amount, color: current.deposit > 0 ? '#6EE7B7' : '#FCA5A5' }}>
            {current.deposit > 0 ? '+ ' : '− '}
            {money(current.deposit > 0 ? current.deposit : current.withdrawal)}
          </div>

          <div style={styles.formGrid}>
            <label style={styles.label}>
              Type
              <select
                value={edit.transaction_type || ''}
                onChange={(e) => setEdit({ ...edit, transaction_type: e.target.value })}
                style={styles.input}
              >
                {TYPES_FOR[current.deposit > 0 ? 'in' : 'out'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {edit.transaction_type === 'Transfer' ? (
              <label style={styles.label}>
                {current.deposit > 0 ? 'Received from account' : 'Sent to account'}
                <select
                  value={edit.counter_account_id || ''}
                  onChange={(e) => setEdit({ ...edit, counter_account_id: e.target.value })}
                  style={styles.input}
                >
                  <option value="">Select account…</option>
                  {otherAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label style={styles.label}>
                Category
                <input
                  value={edit.category || ''}
                  placeholder="Reconciliation"
                  onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                  style={styles.input}
                />
              </label>
            )}
          </div>
          <label style={styles.label}>
            Notes
            <input value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} style={styles.input} />
          </label>

          <div style={styles.actions}>
            <button type="button" style={styles.approve} disabled={busy} onClick={approve}>
              ✓ Approve <kbd style={styles.kbd}>A</kbd>
            </button>
            <button type="button" style={styles.skip} disabled={busy} onClick={skip}>
              Skip <kbd style={styles.kbd}>S</kbd>
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <h3 style={styles.h3}>All entries reviewed</h3>
          {b.matches ? (
            <div style={styles.success}>✓ The system balance matches the statement closing balance.</div>
          ) : diff == null ? (
            <div style={styles.notice}>This statement has no closing balance to compare with.</div>
          ) : (
            <div style={styles.notice}>
              The system is <strong>{money(diff)}</strong> {diff > 0 ? 'lower' : 'higher'} than the statement.
              <ul style={{ margin: '8px 0 0 18px' }}>
                {b.explanations.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}

          {b.needs_adjustment && !session.adjustment_transaction_id && (
            <div style={styles.danger}>
              <div style={styles.dangerTitle}>⚠ Balance adjustment — normally this should not be needed</div>
              <p style={{ margin: '6px 0' }}>
                This creates a <strong>{diff > 0 ? 'Income' : 'Expense'}</strong> entry of <strong>{money(diff)}</strong>{' '}
                in {session.account.name}, labelled “Reconciliation Adjustment”. It hides the cause of the difference
                instead of fixing it. Try reviewing the skipped lines or checking the statement first.
              </p>
              <label style={{ display: 'block', margin: '8px 0' }}>
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I understand
                this changes the account balance by {money(diff)}.
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type ADJUST to confirm"
                style={styles.input}
              />
              <button
                type="button"
                style={{ ...styles.dangerBtn, opacity: confirmed && confirmText === 'ADJUST' ? 1 : 0.5 }}
                disabled={!confirmed || confirmText !== 'ADJUST' || busy}
                onClick={handleAdjust}
              >
                Create adjustment entry
              </button>
            </div>
          )}
          {session.adjustment_transaction_id && (
            <div style={styles.notice}>An adjustment entry was created for this reconciliation.</div>
          )}

          <div style={styles.actions}>
            <button type="button" style={styles.primary} disabled={busy} onClick={handleFinish}>
              Finish reconciliation
            </button>
          </div>
        </div>
      )}

      {/* Skipped lines can be reopened */}
      {skipped.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button type="button" style={styles.link} onClick={() => setShowSkipped(!showSkipped)}>
            {showSkipped ? 'Hide' : 'Show'} {skipped.length} skipped entr{skipped.length === 1 ? 'y' : 'ies'}
          </button>
          {showSkipped &&
            skipped.map((l) => (
              <div key={l.id} style={styles.skippedRow}>
                <span>
                  {l.date} · {l.description}
                  <br />
                  <strong>
                    {l.deposit > 0 ? '+ ' : '− '}
                    {money(l.deposit > 0 ? l.deposit : l.withdrawal)}
                  </strong>
                </span>
                <button type="button" style={styles.small} disabled={busy} onClick={() => act(l, 'reopen')}>
                  Review again
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  wrap: { color: '#fff', fontSize: '0.95rem' },
  h3: { margin: '0 0 12px', fontSize: '1.1rem' },
  label: { display: 'block', marginBottom: 10, fontWeight: 600, fontSize: '0.85rem' },
  input: {
    display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)', color: '#fff',
    boxSizing: 'border-box',
  },
  drop: {
    margin: '12px 0', padding: '28px 12px', textAlign: 'center', borderRadius: 12, cursor: 'pointer',
    border: '2px dashed rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)',
  },
  primary: {
    padding: '10px 18px', borderRadius: 8, border: 'none', background: '#3B82F6', color: '#fff',
    fontWeight: 700, cursor: 'pointer',
  },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' },
  muted: { color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' },
  error: { margin: '10px 0', padding: 10, borderRadius: 8, background: '#7F1D1D', border: '1px solid #FCA5A5' },
  notice: { margin: '10px 0', padding: 10, borderRadius: 8, background: 'rgba(251,191,36,0.2)', border: '1px solid #FBBF24' },
  success: { margin: '10px 0', padding: 10, borderRadius: 8, background: '#065F46', border: '1px solid #6EE7B7' },
  stickyBar: {
    position: 'sticky', top: 0, zIndex: 3, padding: 10, borderRadius: 10, marginBottom: 8,
    background: '#312E81', border: '1px solid rgba(255,255,255,0.3)',
  },
  barRow: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', margin: '2px 0' },
  badge: { padding: '4px 10px', borderRadius: 999, fontWeight: 700, fontSize: '0.85rem' },
  card: { padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)' },
  cardTop: { display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  tag: { padding: '2px 8px', borderRadius: 999, background: '#92400E', fontSize: '0.75rem', fontWeight: 700 },
  date: { marginTop: 8, color: 'rgba(255,255,255,0.8)' },
  desc: { fontSize: '1.1rem', fontWeight: 600, margin: '2px 0 6px', wordBreak: 'break-word' },
  amount: { fontSize: '2rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', margin: '4px 0 12px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  actions: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  approve: {
    flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff',
    fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
  },
  skip: {
    flex: 1, padding: '12px 16px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.6)',
    background: 'transparent', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
  },
  kbd: { marginLeft: 6, padding: '0 6px', borderRadius: 4, background: 'rgba(0,0,0,0.3)', fontSize: '0.75rem' },
  danger: { margin: '14px 0', padding: 14, borderRadius: 10, background: '#7F1D1D', border: '3px solid #F87171' },
  dangerTitle: { fontSize: '1.15rem', fontWeight: 800, color: '#FECACA' },
  dangerBtn: {
    marginTop: 10, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff',
    fontWeight: 800, cursor: 'pointer',
  },
  link: { background: 'none', border: 'none', color: '#93C5FD', cursor: 'pointer', textDecoration: 'underline', padding: 0 },
  skippedRow: {
    display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: 10, marginTop: 8,
    borderRadius: 8, background: 'rgba(255,255,255,0.08)',
  },
  small: { padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#fff', cursor: 'pointer' },
};

export default ReconciliationWizard;
