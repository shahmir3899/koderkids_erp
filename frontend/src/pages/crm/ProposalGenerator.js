// ============================================
// PROPOSAL GENERATOR PAGE - Enhanced with Live Preview
// ============================================

import React, { useState, useCallback, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { toast } from "react-toastify";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

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
import { useProposalGenerator } from '../../hooks/useProposalGenerator';
import { PageHeader } from '../../components/common/PageHeader';

// ============================================
// CANVAS UTILITIES
// ============================================

const imageCache = {};
const page1BlueLineCache = {};

function loadImage(src) {
  if (imageCache[src]) return Promise.resolve(imageCache[src]);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imageCache[src] = img; resolve(img); };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function canvasToArrayBuffer(canvas, format = 'image/png') {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      blob.arrayBuffer().then(resolve);
    }, format);
  });
}

function getPage1BlueLineMetrics(img) {
  const cacheKey = img?.src || 'page1-default';
  if (page1BlueLineCache[cacheKey]) {
    return page1BlueLineCache[cacheKey];
  }

  const fallback = {
    startX: 0.24,
    endX: 0.76,
    centerY: 0.485,
  };

  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;

    const candidates = [];
    const minRun = Math.max(120, Math.floor(width * 0.18));

    // Scan the middle vertical band where the cover line is expected.
    const yStart = Math.floor(height * 0.30);
    const yEnd = Math.floor(height * 0.70);

    for (let y = yStart; y <= yEnd; y += 1) {
      let runStart = -1;
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Blue-ish line detection tuned for template highlights.
        const isBlueLinePixel =
          a > 120 &&
          b > 95 &&
          b > r * 1.20 &&
          b > g * 1.05;

        if (isBlueLinePixel) {
          if (runStart === -1) runStart = x;
        } else if (runStart !== -1) {
          const runLen = x - runStart;
          if (runLen >= minRun) {
            candidates.push({ y, startX: runStart, endX: x, length: runLen });
          }
          runStart = -1;
        }
      }

      // Handle run until row end.
      if (runStart !== -1) {
        const runLen = width - runStart;
        if (runLen >= minRun) {
          candidates.push({ y, startX: runStart, endX: width, length: runLen });
        }
      }
    }

    if (candidates.length > 0) {
      // Group nearby y-runs into line bands to avoid duplicates from line thickness.
      candidates.sort((a, b) => a.y - b.y);
      const bands = [];
      const yTolerance = Math.max(2, Math.floor(height * 0.005));

      candidates.forEach((c) => {
        const lastBand = bands[bands.length - 1];
        if (!lastBand || Math.abs(c.y - lastBand.avgY) > yTolerance) {
          bands.push({
            runs: [c],
            avgY: c.y,
            minX: c.startX,
            maxX: c.endX,
            maxLen: c.length,
          });
          return;
        }

        lastBand.runs.push(c);
        lastBand.avgY = Math.round(
          lastBand.runs.reduce((sum, r) => sum + r.y, 0) / lastBand.runs.length
        );
        lastBand.minX = Math.min(lastBand.minX, c.startX);
        lastBand.maxX = Math.max(lastBand.maxX, c.endX);
        lastBand.maxLen = Math.max(lastBand.maxLen, c.length);
      });

      // Keep only meaningful horizontal lines.
      const meaningfulBands = bands
        .filter((b) => b.maxLen >= minRun)
        .sort((a, b) => a.avgY - b.avgY);

      const pickedBand = meaningfulBands.length >= 2
        ? meaningfulBands[1] // Explicitly pick second line (as requested)
        : meaningfulBands[0];

      if (pickedBand) {
        page1BlueLineCache[cacheKey] = {
          startX: pickedBand.minX / width,
          endX: pickedBand.maxX / width,
          centerY: pickedBand.avgY / height,
        };
        return page1BlueLineCache[cacheKey];
      }
    }

    // Fallback: if grouping failed but we still have candidates, pick the lower one.
    if (candidates.length > 0) {
      const sortedByY = [...candidates].sort((a, b) => a.y - b.y);
      const picked = sortedByY.length >= 2 ? sortedByY[1] : sortedByY[0];
      page1BlueLineCache[cacheKey] = {
        startX: picked.startX / width,
        endX: picked.endX / width,
        centerY: picked.y / height,
      };
      return page1BlueLineCache[cacheKey];
    }
  } catch (error) {
    console.warn('Blue line detection failed, using fallback:', error);
  }

  page1BlueLineCache[cacheKey] = fallback;
  return fallback;
}

// ============================================
// DRAW FUNCTIONS (shared between preview & PDF)
// ============================================

function drawPage1OnCanvas(ctx, img, w, h, schoolName, contactPerson, config) {
  ctx.drawImage(img, 0, 0, w, h);

  const coverCfg = config.coverLine || { x: 0.5, y: 0.48, fontSize: 12, color: '#FFFFFF' };
  const combinedText = [schoolName, contactPerson].filter(Boolean).join(' - ');
  if (!combinedText) return;

  const drawX = w * (coverCfg.x ?? 0.5);
  const drawY = h * (coverCfg.y ?? 0.5);
  const lineLength = w * 0.72;

  let fontSize = Math.max(9, Math.round((coverCfg.fontSize || 12) * (h / 500)));
  const maxTextWidth = lineLength * 0.98;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = coverCfg.color || '#FFFFFF';

  // Fit text to detected blue-line length.
  while (fontSize > 9) {
    ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    if (ctx.measureText(combinedText).width <= maxTextWidth) break;
    fontSize -= 1;
  }

  ctx.fillText(combinedText, drawX, drawY);
}

function drawPage13OnCanvas(
  ctx,
  img,
  w,
  h,
  discountedRate,
  standardRate,
  lumpsumDiscountedRate,
  lumpsumStandardRate,
  config,
  featureItems
) {
  ctx.drawImage(img, 0, 0, w, h);

  // Discounted rate
  const drCfg = config.discountedRate;
  const drFontSize = Math.round(drCfg.fontSize * (h / 500));
  ctx.font = `bold ${drFontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = drCfg.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PKR ${discountedRate}`, w * drCfg.x, h * drCfg.y);

  // Standard rate
  const srCfg = config.standardRate;
  const srFontSize = Math.round(srCfg.fontSize * (h / 500));
  ctx.font = `bold ${srFontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = srCfg.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const stdText = `PKR ${standardRate}`;
  const stdX = w * srCfg.x;
  const stdY = h * srCfg.y;
  ctx.fillText(stdText, stdX, stdY);

  // Strikethrough
  if (config.strikethrough) {
    const textMetrics = ctx.measureText(stdText);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = Math.max(2, srFontSize / 12);
    ctx.beginPath();
    ctx.moveTo(stdX - textMetrics.width / 2 - 5, stdY);
    ctx.lineTo(stdX + textMetrics.width / 2 + 5, stdY);
    ctx.stroke();
  }

  // Lumpsum discounted rate
  const ldrCfg = config.lumpsumDiscountedRate;
  const ldrFontSize = Math.round(ldrCfg.fontSize * (h / 500));
  ctx.font = `bold ${ldrFontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = ldrCfg.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PKR ${lumpsumDiscountedRate}`, w * ldrCfg.x, h * ldrCfg.y);

  // Lumpsum standard rate
  const lsrCfg = config.lumpsumStandardRate;
  const lsrFontSize = Math.round(lsrCfg.fontSize * (h / 500));
  ctx.font = `bold ${lsrFontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = lsrCfg.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lumpStdText = `PKR ${lumpsumStandardRate}`;
  const lumpStdX = w * lsrCfg.x;
  const lumpStdY = h * lsrCfg.y;
  ctx.fillText(lumpStdText, lumpStdX, lumpStdY);

  if (config.strikethrough) {
    const lumpTextMetrics = ctx.measureText(lumpStdText);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = Math.max(2, lsrFontSize / 12);
    ctx.beginPath();
    ctx.moveTo(lumpStdX - lumpTextMetrics.width / 2 - 5, lumpStdY);
    ctx.lineTo(lumpStdX + lumpTextMetrics.width / 2 + 5, lumpStdY);
    ctx.stroke();
  }

  // Feature items (tick list)
  if (featureItems && featureItems.length > 0) {
    const featureCfg = config.featureList || { x: 0.15, y: 0.58, fontSize: 14, color: '#FFFFFF', lineHeight: 0.035 };
    const startY = featureCfg.y;
    const lineHeight = featureCfg.lineHeight || 0.035;
    const startX = featureCfg.x;
    const featureFontSize = Math.round((featureCfg.fontSize || 14) * (h / 500));
    ctx.font = `${featureFontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    featureItems.forEach((item, idx) => {
      const y = h * (startY + idx * lineHeight);
      const x = w * startX;
      // Green checkmark
      ctx.fillStyle = '#22c55e';
      ctx.font = `bold ${featureFontSize}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText('\u2713', x, y);
      // Item text
      ctx.fillStyle = featureCfg.color || '#FFFFFF';
      ctx.font = `${featureFontSize}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText(item, x + featureFontSize * 1.5, y);
    });
  }
}

// ============================================
// PROCESS PAGES FOR PDF (full resolution)
// ============================================

async function processPage1ForPDF(schoolName, contactPerson, config) {
  const img = await loadImage('/proposal-templates/1.png');
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  drawPage1OnCanvas(ctx, img, canvas.width, canvas.height, schoolName, contactPerson, config);
  return canvasToArrayBuffer(canvas);
}

async function processPage13ForPDF(
  discountedRate,
  standardRate,
  lumpsumDiscountedRate,
  lumpsumStandardRate,
  config,
  featureItems
) {
  const img = await loadImage('/proposal-templates/13.png');
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  drawPage13OnCanvas(
    ctx,
    img,
    canvas.width,
    canvas.height,
    discountedRate,
    standardRate,
    lumpsumDiscountedRate,
    lumpsumStandardRate,
    config,
    featureItems
  );
  return canvasToArrayBuffer(canvas);
}

// ============================================
// PDF GENERATION
// ============================================

async function generateProposalPDF(
  schoolName, contactPerson, discountedRate, standardRate, lumpsumDiscountedRate, lumpsumStandardRate,
  pageSelection, page1TextConfig, page13TextConfig, featureItems,
  setProgress
) {
  const pdfDoc = await PDFDocument.create();
  const TOTAL_PAGES = 14;
  const selectedPages = [];

  for (let i = 1; i <= TOTAL_PAGES; i++) {
    if (pageSelection[i]) selectedPages.push(i);
  }

  for (let idx = 0; idx < selectedPages.length; idx++) {
    const i = selectedPages[idx];
    setProgress(`Processing page ${idx + 1}/${selectedPages.length}...`);

    let imageBytes;

    if (i === 1) {
      imageBytes = await processPage1ForPDF(schoolName, contactPerson, page1TextConfig);
    } else if (i === 13) {
      imageBytes = await processPage13ForPDF(
        discountedRate,
        standardRate,
        lumpsumDiscountedRate,
        lumpsumStandardRate,
        page13TextConfig,
        featureItems
      );
    } else {
      const response = await fetch(`/proposal-templates/${i}.png`);
      imageBytes = await response.arrayBuffer();
    }

    const image = await pdfDoc.embedPng(imageBytes);
    const { width, height } = image.scale(1);

    const a4Width = 595.28;
    const scale = a4Width / width;
    const scaledHeight = height * scale;

    const page = pdfDoc.addPage([a4Width, scaledHeight]);
    page.drawImage(image, { x: 0, y: 0, width: a4Width, height: scaledHeight });
  }

  setProgress('Generating PDF...');
  return pdfDoc.save();
}

// ============================================
// MAIN COMPONENT
// ============================================

const ProposalGenerator = () => {
  const { isMobile, isTablet } = useResponsive();
  const [leadSearch, setLeadSearch] = useState('');
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('page1');
  const [activeField, setActiveField] = useState('coverLine');
  const [isDraggingText, setIsDraggingText] = useState(false);
  const previewCanvasRef = useRef(null);
  const leadPickerRef = useRef(null);

  const {
    selectedLeadId, schoolName, setSchoolName,
    contactPerson, setContactPerson,
    standardRate, setStandardRate,
    discountedRate, setDiscountedRate,
    lumpsumStandardRate, setLumpsumStandardRate,
    lumpsumDiscountedRate, setLumpsumDiscountedRate,
    pageSelection, togglePage, selectedPageCount,
    page1TextConfig, page13TextConfig,
    updatePage1TextPos, updatePage13TextPos,
    updateTextColor, updateFontSize, toggleStrikethrough,
    featureItems, addFeatureItem, removeFeatureItem, updateFeatureItem,
    leads, leadsLoading, loadLeads, selectLead,
    proposalHistory, selectedHistoryProposal,
    loadHistoricalProposal, deleteHistoricalProposal,
    saveProposalToDb, clearForm,
    loading, setLoading, isFormValid, progress, setProgress,
  } = useProposalGenerator();

  // ============================================
  // LIVE PREVIEW RENDERING
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => renderPreview(), 200);
    return () => clearTimeout(timer);
  }, [schoolName, contactPerson, discountedRate, standardRate, lumpsumDiscountedRate, lumpsumStandardRate,
    page1TextConfig, page13TextConfig, featureItems, activePreviewTab]);

  const renderPreview = useCallback(async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    try {
      const pageNum = activePreviewTab === 'page1' ? 1 : 13;
      const img = await loadImage(`/proposal-templates/${pageNum}.png`);

      // Set canvas size to match image aspect ratio within container
      const containerWidth = canvas.parentElement?.clientWidth || 400;
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      canvas.width = containerWidth;
      canvas.height = containerWidth * aspectRatio;

      const ctx = canvas.getContext('2d');

      if (activePreviewTab === 'page1') {
        drawPage1OnCanvas(ctx, img, canvas.width, canvas.height, schoolName, contactPerson, page1TextConfig);
      } else {
        drawPage13OnCanvas(
          ctx,
          img,
          canvas.width,
          canvas.height,
          discountedRate,
          standardRate,
          lumpsumDiscountedRate,
          lumpsumStandardRate,
          page13TextConfig,
          featureItems
        );
      }

    } catch (err) {
      console.error('Preview render error:', err);
    }
  }, [activePreviewTab, schoolName, contactPerson, discountedRate, standardRate, lumpsumDiscountedRate, lumpsumStandardRate,
    page1TextConfig, page13TextConfig, featureItems]);

  // ============================================
  // CLICK-TO-POSITION ON PREVIEW
  // ============================================
  const updateActiveFieldPosition = useCallback((x, y) => {
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    if (activePreviewTab === 'page1') {
      updatePage1TextPos(activeField, { x: clampedX, y: clampedY });
    } else {
      updatePage13TextPos(activeField, { x: clampedX, y: clampedY });
    }
  }, [activePreviewTab, activeField, updatePage1TextPos, updatePage13TextPos]);

  const getCanvasPoint = useCallback((event) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return { x, y };
  }, []);

  const handleCanvasClick = useCallback((e) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    updateActiveFieldPosition(point.x, point.y);
  }, [getCanvasPoint, updateActiveFieldPosition]);

  const handleCanvasMouseDown = useCallback((e) => {
    const point = getCanvasPoint(e);
    if (!point) return;
    setIsDraggingText(true);
    updateActiveFieldPosition(point.x, point.y);
  }, [getCanvasPoint, updateActiveFieldPosition]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isDraggingText) return;
    const point = getCanvasPoint(e);
    if (!point) return;
    updateActiveFieldPosition(point.x, point.y);
  }, [isDraggingText, getCanvasPoint, updateActiveFieldPosition]);

  const stopDragging = useCallback(() => {
    setIsDraggingText(false);
  }, []);

  // ============================================
  // LEAD PICKER
  // ============================================
  const handleLeadSearch = useCallback((e) => {
    const val = e.target.value;
    setLeadSearch(val);
    loadLeads(val);
    setShowLeadPicker(true);
  }, [loadLeads]);

  const handleSelectLead = useCallback((lead) => {
    selectLead(lead);
    setLeadSearch(lead.school_name || lead.phone || '');
    setShowLeadPicker(false);
  }, [selectLead]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (leadPickerRef.current && !leadPickerRef.current.contains(event.target)) {
        setShowLeadPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================
  // GENERATE & DOWNLOAD
  // ============================================
  const handleGenerate = async () => {
    if (!isFormValid) {
      toast.error('Please fill in the school name');
      return;
    }

    setLoading(prev => ({ ...prev, generating: true }));
    try {
      await saveProposalToDb();

      const pdfBytes = await generateProposalPDF(
        schoolName, contactPerson, discountedRate, standardRate, lumpsumDiscountedRate, lumpsumStandardRate,
        pageSelection, page1TextConfig, page13TextConfig, featureItems,
        setProgress
      );

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proposal_${schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Proposal generated and downloaded!');
    } catch (error) {
      console.error('Error generating proposal:', error);
      toast.error('Failed to generate proposal: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, generating: false }));
      setProgress('');
    }
  };

  // ============================================
  // ACTIVE FIELD CONFIG FOR CONTROLS
  // ============================================
  const getActiveFieldConfig = () => {
    if (activePreviewTab === 'page1') {
      return page1TextConfig[activeField] || page1TextConfig.coverLine;
    }
    return page13TextConfig[activeField] || page13TextConfig.discountedRate;
  };

  const activeConfig = getActiveFieldConfig();


  // Field options for current tab
  const fieldOptions = activePreviewTab === 'page1'
    ? [
      { key: 'coverLine', label: 'Cover Line (School - Focal Person)' },
    ]
    : [
      { key: 'discountedRate', label: 'Discounted Rate' },
      { key: 'standardRate', label: 'Standard Rate' },
      { key: 'lumpsumDiscountedRate', label: 'Lumpsum Discounted Rate' },
      { key: 'lumpsumStandardRate', label: 'Lumpsum Standard Rate' },
      { key: 'featureList', label: 'Feature List' },
    ];

  // Set activeField to first option when tab changes
  useEffect(() => {
    setActiveField(activePreviewTab === 'page1' ? 'coverLine' : 'discountedRate');
  }, [activePreviewTab]);

  // ============================================
  // RESPONSIVE STYLES
  // ============================================
  const rs = getResponsiveStyles(isMobile, isTablet);

  return (
    <div style={{ padding: isMobile ? SPACING.md : SPACING.xl, maxWidth: '1600px', margin: '0 auto' }}>
      <PageHeader
        title="Proposal Generator"
        subtitle="Generate collaboration proposals for leads and clients"
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1.4fr 0.8fr',
        gap: SPACING.lg,
        marginTop: SPACING.lg,
      }}>
        {/* ============================================ */}
        {/* LEFT COLUMN - FORM + CONTROLS */}
        {/* ============================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          {/* Proposal Details Card */}
          <div style={rs.formCard}>
            <h3 style={staticStyles.sectionTitle}>Proposal Details</h3>

            {/* Lead Picker */}
            <div style={staticStyles.fieldGroup}>
              <label style={staticStyles.label}>Select Lead (optional)</label>
              <div ref={leadPickerRef} style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={leadSearch}
                  onChange={handleLeadSearch}
                  onFocus={() => { if (leads.length > 0) setShowLeadPicker(true); }}
                  placeholder="Search leads by name or phone..."
                  style={rs.input}
                />
                {selectedLeadId && (
                  <span style={staticStyles.selectedBadge}>Lead linked</span>
                )}
                {showLeadPicker && (
                  <div style={staticStyles.dropdown}>
                    {leadsLoading ? (
                      <div style={staticStyles.dropdownEmpty}>Loading leads...</div>
                    ) : leads.length === 0 ? (
                      <div style={staticStyles.dropdownEmpty}>No leads found</div>
                    ) : (
                      leads.slice(0, 10).map(lead => (
                        <div
                          key={lead.id}
                          style={staticStyles.dropdownItem}
                          onClick={() => handleSelectLead(lead)}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.2)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div style={{ color: COLORS.text.white, fontSize: FONT_SIZES.sm }}>
                            {lead.school_name || 'No name'}
                          </div>
                          <div style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
                            {lead.contact_person || ''} {lead.phone ? `| ${lead.phone}` : ''} | {lead.status}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={staticStyles.groupHeader}>
              <div style={staticStyles.groupTitle}>Page 1: Cover Details</div>
              <div style={staticStyles.groupHint}>
                These fields are combined as "School Name - Focal Person" and auto-placed on the blue line on Page 1.
              </div>
            </div>

            {/* School Name */}
            <div style={staticStyles.fieldGroup}>
              <label style={staticStyles.label}>School Name *</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Enter school name"
                style={rs.input}
              />
            </div>

            {/* Contact Person */}
            <div style={staticStyles.fieldGroup}>
              <label style={staticStyles.label}>Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Enter contact person name"
                style={rs.input}
              />
            </div>

            <div style={staticStyles.groupHeader}>
              <div style={staticStyles.groupTitle}>Page 13: Per-Student Model</div>
              <div style={staticStyles.groupHint}>
                These are the existing per-student rates shown on the left pricing column.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
              <div style={staticStyles.fieldGroup}>
                <label style={staticStyles.label}>Discounted Rate</label>
                <div style={{ position: 'relative' }}>
                  <span style={staticStyles.currencyPrefix}>PKR</span>
                  <input
                    type="text"
                    value={discountedRate}
                    onChange={(e) => setDiscountedRate(e.target.value)}
                    placeholder="1,000"
                    style={{ ...rs.input, paddingLeft: '52px' }}
                  />
                </div>
              </div>
              <div style={staticStyles.fieldGroup}>
                <label style={staticStyles.label}>Standard Rate</label>
                <div style={{ position: 'relative' }}>
                  <span style={staticStyles.currencyPrefix}>PKR</span>
                  <input
                    type="text"
                    value={standardRate}
                    onChange={(e) => setStandardRate(e.target.value)}
                    placeholder="2,500"
                    style={{ ...rs.input, paddingLeft: '52px' }}
                  />
                </div>
              </div>
            </div>

            <div style={staticStyles.groupHeader}>
              <div style={staticStyles.groupTitle}>Page 13: Lumpsum Model</div>
              <div style={staticStyles.groupHint}>
                New lumpsum rates shown on the right pricing column.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
              <div style={staticStyles.fieldGroup}>
                <label style={staticStyles.label}>Lumpsum Discounted Rate</label>
                <div style={{ position: 'relative' }}>
                  <span style={staticStyles.currencyPrefix}>PKR</span>
                  <input
                    type="text"
                    value={lumpsumDiscountedRate}
                    onChange={(e) => setLumpsumDiscountedRate(e.target.value)}
                    placeholder="35,000"
                    style={{ ...rs.input, paddingLeft: '52px' }}
                  />
                </div>
              </div>
              <div style={staticStyles.fieldGroup}>
                <label style={staticStyles.label}>Lumpsum Standard Rate</label>
                <div style={{ position: 'relative' }}>
                  <span style={staticStyles.currencyPrefix}>PKR</span>
                  <input
                    type="text"
                    value={lumpsumStandardRate}
                    onChange={(e) => setLumpsumStandardRate(e.target.value)}
                    placeholder="50,000"
                    style={{ ...rs.input, paddingLeft: '52px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Page Selection Card */}
          <div style={rs.formCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={staticStyles.sectionTitle}>Pages to Include</h3>
              <span style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
                {selectedPageCount}/14 selected
              </span>
            </div>
            <div style={staticStyles.pageThumbGrid}>
              {Array.from({ length: 14 }, (_, i) => i + 1).map(pageNum => (
                <div
                  key={pageNum}
                  onClick={() => togglePage(pageNum)}
                  style={{
                    ...staticStyles.pageThumb,
                    ...(pageSelection[pageNum] ? staticStyles.pageThumbActive : staticStyles.pageThumbInactive),
                  }}
                >
                  <img
                    src={`/proposal-templates/${pageNum}.png`}
                    alt={`Page ${pageNum}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      opacity: pageSelection[pageNum] ? 1 : 0.3,
                      transition: `opacity ${TRANSITIONS.fast}`,
                    }}
                    loading="lazy"
                  />
                  <span style={staticStyles.pageThumbLabel}>
                    {pageNum}
                  </span>
                  {!pageSelection[pageNum] && (
                    <div style={staticStyles.pageThumbOverlay} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feature Items Card (Page 13 tick list) */}
          <div style={rs.formCard}>
            <h3 style={staticStyles.sectionTitle}>Features List (Page 13)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
              {featureItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: SPACING.xs, alignItems: 'center' }}>
                  <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: FONT_SIZES.sm, flexShrink: 0 }}>{'\u2713'}</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateFeatureItem(idx, e.target.value)}
                    style={{ ...rs.input, flex: 1 }}
                  />
                  <button
                    onClick={() => removeFeatureItem(idx)}
                    style={staticStyles.miniDeleteBtn}
                    title="Remove"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addFeatureItem('New feature')}
              style={staticStyles.addItemBtn}
            >
              + Add Item
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: SPACING.md, flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerate}
              disabled={!isFormValid || loading.generating}
              style={{
                ...rs.primaryButton,
                ...(!isFormValid || loading.generating ? staticStyles.disabledButton : {}),
              }}
            >
              {loading.generating ? (progress || 'Generating...') : `Generate PDF (${selectedPageCount} pages)`}
            </button>
            <button onClick={clearForm} style={rs.secondaryButton}>
              Clear
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* CENTER COLUMN - LIVE PREVIEW */}
        {/* ============================================ */}
        <div style={rs.previewCard}>
          <h3 style={staticStyles.sectionTitle}>Live Preview</h3>
          <p style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs, margin: `0 0 ${SPACING.sm} 0` }}>
            Click and drag on the image to reposition the selected text field.
          </p>

          {/* Preview Tabs */}
          <div style={staticStyles.tabRow}>
            {['page1', 'page13'].map(tab => (
              <button
                key={tab}
                onClick={() => setActivePreviewTab(tab)}
                style={{
                  ...staticStyles.tabButton,
                  ...(activePreviewTab === tab ? staticStyles.tabButtonActive : {}),
                }}
              >
                {tab === 'page1' ? 'Page 1 - Cover' : 'Page 13 - Pricing'}
              </button>
            ))}
          </div>

          {/* Active field selector */}
          <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.sm }}>
            {fieldOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setActiveField(opt.key)}
                style={{
                  ...staticStyles.fieldChip,
                  ...(activeField === opt.key ? staticStyles.fieldChipActive : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Controls: Color + Font Size */}
          <div style={{ display: 'flex', gap: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
              <label style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>Color</label>
              <input
                type="color"
                value={activeConfig?.color?.startsWith('rgba') ? '#FFFFFF' : (activeConfig?.color || '#FFFFFF')}
                onChange={(e) => {
                  const page = activePreviewTab === 'page1' ? 1 : 13;
                  updateTextColor(page, activeField, e.target.value);
                }}
                style={staticStyles.colorInput}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs, flex: 1, minWidth: 120 }}>
              <label style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs, whiteSpace: 'nowrap' }}>
                Size: {activeConfig?.fontSize || 20}
              </label>
              <Slider
                min={10}
                max={60}
                value={activeConfig?.fontSize || 20}
                onChange={(val) => {
                  const page = activePreviewTab === 'page1' ? 1 : 13;
                  updateFontSize(page, activeField, val);
                }}
                trackStyle={{ backgroundColor: '#8B5CF6', height: 4 }}
                handleStyle={{ borderColor: '#8B5CF6', backgroundColor: '#FFFFFF', width: 16, height: 16, marginTop: -6 }}
                railStyle={{ backgroundColor: 'rgba(255,255,255,0.15)', height: 4 }}
              />
            </div>
            {activePreviewTab === 'page13' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={page13TextConfig.strikethrough}
                  onChange={toggleStrikethrough}
                  style={{ accentColor: '#8B5CF6' }}
                />
                <span style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>Strikethrough</span>
              </label>
            )}
          </div>

          {/* Canvas Preview */}
          <div style={staticStyles.canvasContainer}>
            <canvas
              ref={previewCanvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={stopDragging}
              onMouseLeave={stopDragging}
              style={{
                width: '100%',
                cursor: isDraggingText ? 'grabbing' : 'grab',
                borderRadius: BORDER_RADIUS.md,
                display: 'block',
              }}
            />

          </div>
        </div>

        {/* ============================================ */}
        {/* RIGHT COLUMN - HISTORY */}
        {/* ============================================ */}
        <div style={rs.historyCard}>
          <div style={staticStyles.historyHeader}>
            <h3 style={staticStyles.sectionTitle}>History</h3>
            <span style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
              {proposalHistory.length} records
            </span>
          </div>

          {loading.history ? (
            <div style={staticStyles.emptyState}>Loading...</div>
          ) : proposalHistory.length === 0 ? (
            <div style={staticStyles.emptyState}>No proposals yet</div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {proposalHistory.map(proposal => (
                <div
                  key={proposal.id}
                  style={{
                    ...staticStyles.historyItem,
                    ...(selectedHistoryProposal?.id === proposal.id ? staticStyles.historyItemActive : {}),
                  }}
                >
                  <div
                    style={{ cursor: 'pointer', flex: 1 }}
                    onClick={() => loadHistoricalProposal(proposal.id)}
                  >
                    <div style={{ color: COLORS.text.white, fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.sm }}>
                      {proposal.school_name}
                    </div>
                    <div style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs, marginTop: '2px' }}>
                      {proposal.contact_person && `${proposal.contact_person} | `}
                      {proposal.discounted_rate} | {new Date(proposal.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.xs }}>
                      by {proposal.generated_by_name}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this proposal record?')) {
                        deleteHistoricalProposal(proposal.id);
                      }
                    }}
                    style={staticStyles.deleteButton}
                    title="Delete"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// RESPONSIVE STYLES FACTORY
// ============================================
const getResponsiveStyles = (isMobile, isTablet) => ({
  formCard: {
    ...MIXINS.glassmorphicCard,
    padding: isMobile ? SPACING.md : SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
  },
  previewCard: {
    ...MIXINS.glassmorphicCard,
    padding: isMobile ? SPACING.md : SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  historyCard: {
    ...MIXINS.glassmorphicCard,
    padding: isMobile ? SPACING.md : SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  input: {
    width: '100%',
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    outline: 'none',
    transition: `border-color ${TRANSITIONS.normal}`,
    boxSizing: 'border-box',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: `${SPACING.md} ${SPACING.xl}`,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    cursor: 'pointer',
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    transition: `all ${TRANSITIONS.normal}`,
    minHeight: '48px',
    flex: isMobile ? '1' : 'none',
  },
  secondaryButton: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    transition: `all ${TRANSITIONS.normal}`,
    minHeight: '48px',
  },
});

// ============================================
// STATIC STYLES
// ============================================
const staticStyles = {
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    margin: 0,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.xs,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  groupHeader: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderLeft: '3px solid rgba(139, 92, 246, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
  },
  groupTitle: {
    color: COLORS.text.white,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.xs,
    marginBottom: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  groupHint: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.xs,
  },
  currencyPrefix: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    pointerEvents: 'none',
  },
  selectedBadge: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: `2px ${SPACING.xs}`,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#4ADE80',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    marginTop: '4px',
    backgroundColor: 'rgba(30, 30, 50, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    maxHeight: '240px',
    overflowY: 'auto',
    padding: SPACING.xs,
  },
  dropdownItem: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    cursor: 'pointer',
    borderRadius: BORDER_RADIUS.md,
    transition: `background-color ${TRANSITIONS.fast}`,
  },
  dropdownEmpty: {
    padding: SPACING.md,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  // Preview styles
  tabRow: {
    display: 'flex',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
    color: COLORS.text.white,
  },
  fieldChip: {
    padding: `4px ${SPACING.sm}`,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: BORDER_RADIUS.sm,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.xs,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.fast}`,
  },
  fieldChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.6)',
    color: COLORS.text.white,
  },
  colorInput: {
    width: '32px',
    height: '32px',
    padding: 0,
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  canvasContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  // Page selection thumbnails
  pageThumbGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: SPACING.xs,
  },
  pageThumb: {
    position: 'relative',
    aspectRatio: '1240 / 1754',
    borderRadius: '6px',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: `all ${TRANSITIONS.fast}`,
    border: '2px solid transparent',
  },
  pageThumbActive: {
    borderColor: 'rgba(34, 197, 94, 0.7)',
    boxShadow: '0 0 8px rgba(34, 197, 94, 0.3)',
  },
  pageThumbInactive: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pageThumbLabel: {
    position: 'absolute',
    bottom: '2px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '9px',
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '3px',
    padding: '1px 4px',
    lineHeight: 1.2,
  },
  pageThumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  // Feature items
  miniDeleteBtn: {
    padding: '4px 8px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#FCA5A5',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    flexShrink: 0,
  },
  addItemBtn: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#C4B5FD',
    border: '1px dashed rgba(139, 92, 246, 0.4)',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  // History
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    transition: `background-color ${TRANSITIONS.fast}`,
  },
  historyItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: BORDER_RADIUS.md,
  },
  deleteButton: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#FCA5A5',
    border: 'none',
    borderRadius: BORDER_RADIUS.sm,
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    transition: `all ${TRANSITIONS.normal}`,
  },
  emptyState: {
    textAlign: 'center',
    padding: SPACING.xl,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
};

export default ProposalGenerator;
