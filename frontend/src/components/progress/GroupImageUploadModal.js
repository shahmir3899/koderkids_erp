// ============================================
// GROUP IMAGE UPLOAD MODAL - one progress image -> many students
// ============================================
// Location: src/components/progress/GroupImageUploadModal.js

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { compressImage } from '../../utils/compressImage';
import {
  filterStudents,
  isStudentAbsent,
  runWithConcurrency,
} from '../../utils/groupUpload';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  Z_INDEX,
  MIXINS,
} from '../../utils/designConstants';

// Same panel tone the page uses for its glass dropdowns
const PANEL_BG = 'rgba(55, 40, 80, 0.95)';

/**
 * GroupImageUploadModal
 * Upload ONE (compressed) image to several already-loaded students.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Array} students - students already loaded on the page ({ id, name })
 * @param {Object} attendanceData - page attendance state, keyed by student id
 * @param {string} sessionDate - YYYY-MM-DD
 * @param {Function} uploadHandler - (studentId, file, sessionDate) => Promise<imageUrl>
 * @param {Function} onStudentUploaded - (studentId, imageUrl) after each success
 */
export const GroupImageUploadModal = ({
  isOpen,
  onClose,
  students,
  attendanceData,
  sessionDate,
  uploadHandler,
  onStudentUploaded,
}) => {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [file, setFile] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statuses, setStatuses] = useState({}); // id -> 'done' | 'error'
  const [runTotal, setRunTotal] = useState(0);

  const resetPreview = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
  }, []);

  // Reset everything when the modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIds(new Set());
      setFile(null);
      setOriginalSize(0);
      setIsProcessing(false);
      setIsUploading(false);
      setStatuses({});
      setRunTotal(0);
      resetPreview();
    }
  }, [isOpen, resetPreview]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  // Escape closes (not mid-upload); lock page scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !isUploading) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isUploading, onClose]);

  const visibleStudents = useMemo(
    () => filterStudents(students, query),
    [students, query]
  );
  const selectableVisible = useMemo(
    () => visibleStudents.filter((s) => !isStudentAbsent(attendanceData, s.id)),
    [visibleStudents, attendanceData]
  );
  const nameById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s.name])),
    [students]
  );

  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllShown = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectableVisible.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleFileSelect = async (event) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;

    setIsProcessing(true);
    try {
      const processed = await compressImage(picked);
      resetPreview();
      previewUrlRef.current = URL.createObjectURL(processed);
      setPreviewUrl(previewUrlRef.current);
      setFile(processed);
      setOriginalSize(picked.size);
      setStatuses({});
      setRunTotal(0);
    } catch (err) {
      console.error('Compression error:', err);
      toast.error('Failed to process image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const failedIds = Object.keys(statuses)
    .filter((id) => statuses[id] === 'error')
    .map(Number);

  const startUpload = async (ids) => {
    if (!file || ids.length === 0) return;
    setIsUploading(true);
    setRunTotal(ids.length);
    setStatuses((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });

    const results = await runWithConcurrency(ids, async (id) => {
      const url = await uploadHandler(id, file, sessionDate);
      if (onStudentUploaded) onStudentUploaded(id, url);
      setStatuses((prev) => ({ ...prev, [id]: 'done' }));
      return url;
    });

    const failed = results.filter((r) => !r.ok).map((r) => r.item);
    if (failed.length) {
      setStatuses((prev) => {
        const next = { ...prev };
        failed.forEach((id) => { next[id] = 'error'; });
        return next;
      });
      toast.error(`${failed.length} upload${failed.length > 1 ? 's' : ''} failed.`);
    } else {
      toast.success(`Image uploaded to ${results.length} student${results.length > 1 ? 's' : ''}.`);
      onClose();
    }
    setIsUploading(false);
  };

  if (!isOpen) return null;

  const doneCount = Object.values(statuses).filter((s) => s === 'done').length;
  const finishedCount = doneCount + failedIds.length;
  const pendingIds = [...selectedIds].filter((id) => statuses[id] !== 'done');
  const selectedCount = selectedIds.size;
  const canUpload = !!file && pendingIds.length > 0 && !isUploading && !isProcessing;
  const compressedKb = file ? (file.size / 1024).toFixed(0) : 0;
  const originalKb = (originalSize / 1024).toFixed(0);

  const styles = {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: COLORS.background.overlay,
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: Z_INDEX.modal,
      padding: SPACING.md,
    },
    panel: {
      ...MIXINS.glassmorphicCard,
      background: PANEL_BG,
      color: COLORS.text.white,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      width: '100%',
      maxWidth: '520px',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: SPACING.sm,
      marginBottom: SPACING.md,
      borderBottom: `1px solid ${COLORS.border.whiteMedium}`,
    },
    title: { margin: 0, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold },
    closeBtn: {
      background: 'none',
      border: 'none',
      color: COLORS.text.white,
      fontSize: FONT_SIZES['2xl'],
      cursor: isUploading ? 'not-allowed' : 'pointer',
      lineHeight: 1,
      minWidth: '44px',
      minHeight: '44px',
    },
    muted: { color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.sm },
    search: {
      width: '100%',
      boxSizing: 'border-box',
      padding: `${SPACING.sm} ${SPACING.md}`,
      border: `1px solid ${COLORS.border.whiteTransparent}`,
      borderRadius: BORDER_RADIUS.sm,
      fontSize: FONT_SIZES.sm,
      background: COLORS.background.whiteMedium,
      color: COLORS.text.white,
      outline: 'none',
      minHeight: '44px',
    },
    linkBtn: {
      background: 'none',
      border: 'none',
      color: COLORS.text.white,
      textDecoration: 'underline',
      cursor: 'pointer',
      fontSize: FONT_SIZES.sm,
      padding: SPACING.xs,
    },
    list: {
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.md,
      maxHeight: '220px',
      overflowY: 'auto',
      marginBottom: SPACING.md,
    },
    row: (checked, disabled) => ({
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: `${SPACING.sm} ${SPACING.md}`,
      borderBottom: `1px solid ${COLORS.border.whiteSubtle}`,
      background: checked ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
      minHeight: '44px',
    }),
    dropZone: {
      border: `2px dashed ${COLORS.border.whiteStrong}`,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.lg,
      textAlign: 'center',
      cursor: 'pointer',
      background: COLORS.background.whiteSubtle,
      marginBottom: SPACING.md,
    },
    previewRow: {
      ...MIXINS.glassmorphicSubtle,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.sm,
      display: 'flex',
      gap: SPACING.md,
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    thumb: {
      width: '56px',
      height: '56px',
      objectFit: 'cover',
      borderRadius: BORDER_RADIUS.sm,
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: SPACING.sm,
      paddingTop: SPACING.md,
      borderTop: `1px solid ${COLORS.border.whiteMedium}`,
    },
    cancelBtn: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      background: COLORS.background.whiteMedium,
      color: COLORS.text.white,
      border: `1px solid ${COLORS.border.whiteTransparent}`,
      borderRadius: BORDER_RADIUS.sm,
      fontSize: FONT_SIZES.sm,
      cursor: isUploading ? 'not-allowed' : 'pointer',
      minHeight: '44px',
    },
    uploadBtn: {
      padding: `${SPACING.sm} ${SPACING.lg}`,
      background: canUpload ? COLORS.status.info : '#9CA3AF',
      color: COLORS.text.white,
      border: 'none',
      borderRadius: BORDER_RADIUS.sm,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium,
      cursor: canUpload ? 'pointer' : 'not-allowed',
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.xs,
      minHeight: '44px',
      transition: TRANSITIONS.normal,
    },
  };

  return ReactDOM.createPortal(
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
    >
      <div style={styles.panel} role="dialog" aria-modal="true" aria-label="Group progress upload">
        <div style={styles.header}>
          <h2 style={styles.title}>📷 Group Progress Upload</h2>
          <button style={styles.closeBtn} onClick={onClose} disabled={isUploading} aria-label="Close">
            ✕
          </button>
        </div>

        <p style={{ ...styles.muted, margin: `0 0 ${SPACING.sm}` }}>
          Date: {sessionDate} · {students.length} students loaded
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search students by name..."
          style={styles.search}
          aria-label="Search students"
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: `${SPACING.xs} 0`,
        }}>
          <span>
            <button style={styles.linkBtn} onClick={selectAllShown} disabled={isUploading}>
              Select all shown ({selectableVisible.length})
            </button>
            <button style={styles.linkBtn} onClick={() => setSelectedIds(new Set())} disabled={isUploading}>
              Clear
            </button>
          </span>
          <span style={styles.muted}>{selectedCount} selected</span>
        </div>

        <div style={styles.list}>
          {visibleStudents.length === 0 && (
            <p style={{ ...styles.muted, padding: SPACING.md, margin: 0, textAlign: 'center' }}>
              No students match "{query}".
            </p>
          )}
          {visibleStudents.map((s) => {
            const absent = isStudentAbsent(attendanceData, s.id);
            const checked = selectedIds.has(s.id);
            const status = statuses[s.id];
            return (
              <label key={s.id} style={styles.row(checked, absent)}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={absent || isUploading}
                  onChange={() => toggleStudent(s.id)}
                />
                <span style={{ flex: 1 }}>{s.name}</span>
                {absent && <span style={{ ...styles.muted, color: '#FCA5A5' }}>Absent · blocked</span>}
                {status === 'done' && <span style={{ color: '#6EE7B7' }}>✓</span>}
                {status === 'error' && <span style={{ color: '#FCA5A5' }}>Failed</span>}
              </label>
            );
          })}
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <div
          style={styles.dropZone}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isProcessing ? (
            <>
              <LoadingSpinner size="medium" />
              <p style={{ ...styles.muted, margin: SPACING.sm }}>Processing image...</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: FONT_SIZES['3xl'] || '2rem' }}>📁</div>
              <p style={{ margin: 0, fontWeight: FONT_WEIGHTS.medium }}>
                {file ? 'Choose a different image' : 'Click to browse for one image'}
              </p>
              <p style={{ ...styles.muted, margin: `${SPACING.xs} 0 0` }}>
                Compressed once, then uploaded to each selected student
              </p>
            </>
          )}
        </div>

        {previewUrl && (
          <div style={styles.previewRow}>
            <img src={previewUrl} alt="Preview" style={styles.thumb} />
            <div>
              <div>{file?.name}</div>
              <div style={styles.muted}>{originalKb} KB → {compressedKb} KB</div>
            </div>
          </div>
        )}

        {runTotal > 0 && (
          <div style={{ marginBottom: SPACING.md }}>
            <div style={{
              height: '6px',
              borderRadius: '3px',
              background: COLORS.background.whiteMedium,
              overflow: 'hidden',
              marginBottom: SPACING.xs,
            }}>
              <div style={{
                width: `${Math.min(100, (finishedCount / runTotal) * 100)}%`,
                height: '100%',
                background: COLORS.status.success,
              }} />
            </div>
            <span style={styles.muted}>
              {doneCount} done{failedIds.length > 0 && ` · ${failedIds.length} failed (${failedIds.map((id) => nameById[id]).join(', ')})`}
            </span>
          </div>
        )}

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={isUploading}>
            {failedIds.length > 0 ? 'Close' : 'Cancel'}
          </button>
          {failedIds.length > 0 && !isUploading && (
            <button
              style={{ ...styles.uploadBtn, background: COLORS.status.warningDark, cursor: 'pointer' }}
              onClick={() => startUpload(failedIds)}
            >
              Retry failed ({failedIds.length})
            </button>
          )}
          <button style={styles.uploadBtn} disabled={!canUpload} onClick={() => startUpload(pendingIds)}>
            {isUploading ? (
              <>
                <LoadingSpinner size="tiny" />
                Uploading...
              </>
            ) : (
              <>⬆️ Upload to {pendingIds.length} student{pendingIds.length === 1 ? '' : 's'}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GroupImageUploadModal;
