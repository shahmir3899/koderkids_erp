// ============================================
// MONITORING TEMPLATES PAGE - Admin Only
// ============================================
// Manage evaluation form templates: list, create, edit, deactivate.

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPen, faToggleOn, faToggleOff, faClipboardList } from '@fortawesome/free-solid-svg-icons';

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
import { ConfirmationModal } from '../../components/common/modals/ConfirmationModal';
import TemplateFormModal from '../../components/monitoring/TemplateFormModal';
import { fetchTemplates, fetchTemplateDetail, deleteTemplate } from '../../services/monitoringService';

// ============================================
// TEMPLATE CARD
// ============================================

const TemplateCard = ({ template, isMobile, onEdit, onToggle }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...MIXINS.glassmorphicCard,
        borderRadius: BORDER_RADIUS.xl,
        padding: isMobile ? SPACING.md : SPACING.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.md,
        transition: `all ${TRANSITIONS.normal}`,
        transform: isHovered ? 'translateY(-3px)' : 'none',
        boxShadow: isHovered ? '0 12px 40px rgba(0,0,0,0.25)' : '0 4px 24px rgba(0,0,0,0.12)',
        opacity: template.is_active ? 1 : 0.55,
        borderLeft: `4px solid ${template.is_active ? '#818CF8' : 'rgba(255,255,255,0.2)'}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Name + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm }}>
        <h3 style={{ margin: 0, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text.white, flex: 1 }}>
          {template.name}
        </h3>
        <span style={{
          padding: `${SPACING.xs} ${SPACING.sm}`,
          borderRadius: BORDER_RADIUS.full,
          fontSize: FONT_SIZES.xs,
          fontWeight: FONT_WEIGHTS.semibold,
          background: template.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
          color: template.is_active ? '#34D399' : '#F87171',
          border: `1px solid ${template.is_active ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          whiteSpace: 'nowrap',
        }}>
          {template.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {template.description && (
        <p style={{ margin: 0, fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle, lineHeight: 1.5 }}>
          {template.description}
        </p>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', gap: SPACING.lg, flexWrap: 'wrap' }}>
        <span style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle }}>
          <span style={{ color: '#818CF8', fontWeight: FONT_WEIGHTS.semibold }}>
            {template.field_count ?? (template.fields ? template.fields.length : '?')}
          </span> {' '}fields
        </span>
        {template.created_by_name && (
          <span style={{ fontSize: FONT_SIZES.sm, color: COLORS.text.whiteSubtle }}>
            Created by {template.created_by_name}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap', paddingTop: SPACING.xs }}>
        <button
          onClick={() => onEdit(template)}
          style={{
            border: 'none',
            borderRadius: BORDER_RADIUS.lg,
            cursor: 'pointer',
            fontSize: FONT_SIZES.sm,
            fontWeight: FONT_WEIGHTS.semibold,
            padding: `${SPACING.sm} ${SPACING.md}`,
            background: 'rgba(139,92,246,0.2)',
            color: '#A78BFA',
            transition: `all ${TRANSITIONS.fast}`,
          }}
        >
          <FontAwesomeIcon icon={faPen} style={{ marginRight: SPACING.xs }} />
          Edit
        </button>
        <button
          onClick={() => onToggle(template)}
          style={{
            border: 'none',
            borderRadius: BORDER_RADIUS.lg,
            cursor: 'pointer',
            fontSize: FONT_SIZES.sm,
            fontWeight: FONT_WEIGHTS.semibold,
            padding: `${SPACING.sm} ${SPACING.md}`,
            background: template.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
            color: template.is_active ? '#F87171' : '#34D399',
            transition: `all ${TRANSITIONS.fast}`,
          }}
        >
          <FontAwesomeIcon icon={template.is_active ? faToggleOff : faToggleOn} style={{ marginRight: SPACING.xs }} />
          {template.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
};

// ============================================
// PAGE
// ============================================

const MonitoringTemplatesPage = () => {
  const { isMobile } = useResponsive();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [deactivateConfirm, setDeactivateConfirm] = useState({ isOpen: false, template: null });
  const [togglingId, setTogglingId] = useState(null);

  // Filter
  const [filterActive, setFilterActive] = useState('all');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTemplates(false);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreate = () => {
    setModalMode('create');
    setSelectedTemplate(null);
    setShowFormModal(true);
  };

  const handleEdit = async (template) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchTemplateDetail(template.id);
      setSelectedTemplate(detail);
      setModalMode('edit');
      setShowFormModal(true);
    } catch {
      toast.error('Failed to load template details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleClick = (template) => {
    if (template.is_active) {
      setDeactivateConfirm({ isOpen: true, template });
    } else {
      // Re-activate: call updateTemplate with is_active: true via deleteTemplate soft-delete endpoint
      // Backend soft-deletes only (sets is_active = false), so re-activate via PUT
      handleActivate(template);
    }
  };

  const handleActivate = async (template) => {
    setTogglingId(template.id);
    try {
      const { updateTemplate } = await import('../../services/monitoringService');
      await updateTemplate(template.id, { is_active: true });
      toast.success(`"${template.name}" activated`);
      loadTemplates();
    } catch {
      toast.error('Failed to activate template.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeactivateConfirm = async () => {
    const template = deactivateConfirm.template;
    setTogglingId(template.id);
    setDeactivateConfirm({ isOpen: false, template: null });
    try {
      await deleteTemplate(template.id);
      toast.success(`"${template.name}" deactivated`);
      loadTemplates();
    } catch {
      toast.error('Failed to deactivate template.');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (filterActive === 'active') return t.is_active;
    if (filterActive === 'inactive') return !t.is_active;
    return true;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={loadTemplates} />;

  return (
    <div style={{ padding: isMobile ? SPACING.md : SPACING['2xl'], maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Evaluation Templates"
        subtitle="Manage configurable teacher evaluation forms"
        icon={<FontAwesomeIcon icon={faClipboardList} />}
        action={
          <button
            onClick={handleCreate}
            disabled={loadingDetail}
            style={{
              border: 'none',
              borderRadius: BORDER_RADIUS.xl,
              cursor: 'pointer',
              fontSize: FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.semibold,
              padding: `${SPACING.sm} ${SPACING.xl}`,
              background: 'rgba(99,102,241,0.4)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
            New Template
          </button>
        }
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: SPACING.sm, marginBottom: SPACING.xl, flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: `All (${templates.length})` },
          { value: 'active', label: `Active (${templates.filter((t) => t.is_active).length})` },
          { value: 'inactive', label: `Inactive (${templates.filter((t) => !t.is_active).length})` },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterActive(tab.value)}
            style={{
              border: `1px solid ${filterActive === tab.value ? '#818CF8' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: BORDER_RADIUS.full,
              cursor: 'pointer',
              fontSize: FONT_SIZES.sm,
              fontWeight: FONT_WEIGHTS.medium,
              padding: `${SPACING.xs} ${SPACING.lg}`,
              background: filterActive === tab.value ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
              color: filterActive === tab.value ? '#818CF8' : COLORS.text.whiteMedium,
              transition: `all ${TRANSITIONS.fast}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredTemplates.length === 0 ? (
        <div style={{
          ...MIXINS.glassmorphicCard,
          borderRadius: BORDER_RADIUS.xl,
          padding: SPACING['2xl'],
          textAlign: 'center',
          color: COLORS.text.whiteSubtle,
          fontSize: FONT_SIZES.base,
        }}>
          No templates found. Create one to get started.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: SPACING.xl,
        }}>
          {filteredTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              template={togglingId === t.id ? { ...t, _toggling: true } : t}
              isMobile={isMobile}
              onEdit={handleEdit}
              onToggle={handleToggleClick}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <TemplateFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setSelectedTemplate(null); }}
        onSuccess={loadTemplates}
        mode={modalMode}
        initialTemplate={selectedTemplate}
      />

      {/* Deactivate confirmation */}
      {deactivateConfirm.isOpen && (
        <ConfirmationModal
          isOpen={deactivateConfirm.isOpen}
          title="Deactivate Template"
          message={`Deactivate "${deactivateConfirm.template?.name}"? It will no longer appear in the evaluation wizard. Existing evaluations are not affected.`}
          confirmLabel="Deactivate"
          confirmStyle="danger"
          onConfirm={handleDeactivateConfirm}
          onCancel={() => setDeactivateConfirm({ isOpen: false, template: null })}
        />
      )}
    </div>
  );
};

export default MonitoringTemplatesPage;
