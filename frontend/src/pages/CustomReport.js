// ============================================
// CUSTOM REPORT PAGE - Glassmorphism Design
// ============================================
// Location: src/pages/CustomReport.js

import React, { useRef, useState, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "react-toastify";

// Design Constants
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  TRANSITIONS,
  LAYOUT,
  MIXINS,
} from '../utils/designConstants';

// Responsive Hook
import { useResponsive } from '../hooks/useResponsive';

// Custom Report Hook
import { useCustomReport } from '../hooks/useCustomReport';

// Common Components
import { PageHeader } from '../components/common/PageHeader';

// ============================================
// PDF GENERATION UTILITIES
// ============================================

async function fetchArrayBuffer(url) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { mode: "cors", signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

async function validateImageFormat(arrayBuffer) {
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJpeg = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
  const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
  if (!isJpeg && !isPng) throw new Error("Invalid image format. Only PNG and JPEG supported.");
  return isJpeg;
}

function parseTextToRuns(text, fontRegular, fontBold, fontItalic, fontMono) {
  const parts = text.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```)/g).filter(part => part);
  const runs = [];
  for (const part of parts) {
    if (part.startsWith("*") && part.endsWith("*")) {
      runs.push({ text: part.slice(1, -1), font: fontBold });
    } else if (part.startsWith("_") && part.endsWith("_")) {
      runs.push({ text: part.slice(1, -1), font: fontItalic });
    } else if (part.startsWith("~") && part.endsWith("~")) {
      runs.push({ text: part.slice(1, -1), font: fontRegular, strike: true });
    } else if (part.startsWith("```") && part.endsWith("```")) {
      runs.push({ text: part.slice(3, -3), font: fontMono, mono: true });
    } else {
      runs.push({ text: part, font: fontRegular });
    }
  }
  return runs;
}

async function drawWrappedText(pdfDoc, page, xStart, yStart, runs, options) {
  let currentPage = page;
  let currentX = xStart;
  let currentY = yStart;
  const { maxWidth, fontSize, lineHeight, color, pageWidth, pageHeight, margin, footerSpace, fontRegular, drawBackground, drawFooter, bodyTopMargin } = options;

  for (const run of runs) {
    const words = run.text.split(/(\s+)/).filter(word => word);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWidth = run.font.widthOfTextAtSize(word, fontSize);

      if (currentX + wordWidth > xStart + maxWidth) {
        currentY -= lineHeight;
        if (currentY < margin + footerSpace) {
          drawFooter(currentPage, fontRegular, pageWidth, margin);
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          await drawBackground(currentPage, pageWidth, pageHeight);
          currentY = pageHeight - bodyTopMargin;
        }
        currentX = xStart;
      }

      currentPage.drawText(word, {
        x: currentX,
        y: currentY,
        size: fontSize,
        font: run.font,
        color,
      });

      if (run.strike) {
        currentPage.drawLine({
          start: { x: currentX, y: currentY + fontSize / 2 },
          end: { x: currentX + wordWidth, y: currentY + fontSize / 2 },
          thickness: 1,
          color,
        });
      }

      currentX += wordWidth;
    }
  }

  return { newY: currentY - lineHeight, newPage: currentPage };
}

async function generatePDFWithBackground(to, subject, bodyText, lineSpacing, adminName) {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const margin = 50;
    const topSpace = 144;
    const bodyTopMargin = topSpace + 60;
    const fontSize = 12;
    let lineHeight = fontSize + 5;
    if (lineSpacing === '1.5') lineHeight = fontSize + 8;
    if (lineSpacing === 'double') lineHeight = fontSize + 12;
    const footerSpace = 50;
    const listIndent = 30;

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    const drawBackgroundFunc = async (currentPage, pw, ph) => {
      try {
        const imageArrayBuffer = await fetchArrayBuffer("/bg.png");
        const isJpeg = await validateImageFormat(imageArrayBuffer);
        const backgroundImage = isJpeg
          ? await pdfDoc.embedJpg(imageArrayBuffer)
          : await pdfDoc.embedPng(imageArrayBuffer);
        currentPage.drawImage(backgroundImage, { x: 0, y: 0, width: pw, height: ph });
      } catch (error) {
        console.warn("Using fallback background:", error.message);
        currentPage.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(1, 1, 1) });
      }
    };

    const drawFooterFunc = (currentPage, fr, pw, m) => {
      const footerText = `---This document is generated by Admin: ${adminName}------`;
      const footerX = (pw - fr.widthOfTextAtSize(footerText, 10)) / 2;
      currentPage.drawText(footerText, {
        x: footerX,
        y: m,
        size: 10,
        font: fr,
        color: rgb(0, 0, 0),
      });
    };

    await drawBackgroundFunc(page, pageWidth, pageHeight);

    const headers = [
      "Address: Office # 8, First Floor, Khyber III",
      "G-15 Markaz Islamabad, Pakistan",
      "Phone: 0316-7394390",
      `Date: ${new Date().toLocaleString("en-PK", { dateStyle: "full", timeZone: "Asia/Karachi" })}`,
    ];
    const maxHeaderWidth = 200;
    const headerStartY = pageHeight - margin;
    headers.forEach((line, i) => {
      page.drawText(line, {
        x: pageWidth - margin - maxHeaderWidth,
        y: headerStartY - (i * 20),
        size: 10,
        font: fontRegular,
        color: rgb(0, 0, 0),
        maxWidth: maxHeaderWidth,
      });
    });

    // Helper function to wrap text within max width
    const wrapText = (text, font, size, maxWidth) => {
      const words = text.split(/\s+/);
      const lines = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    };

    // Draw "To:" field with multiline and word-wrap support
    const toLines = to.split('\n');
    let currentY = pageHeight - topSpace - 20;
    const toLineHeight = fontSize + 4; // Line height for To field
    const toLabelWidth = fontBold.widthOfTextAtSize("To: ", 12);
    const toMaxWidth = pageWidth - margin - margin - toLabelWidth; // Available width for To content

    // Draw "To:" label on first line
    page.drawText("To:", {
      x: margin,
      y: currentY,
      size: 12,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Process each line of To field with word wrapping
    let isFirstLine = true;
    for (const toLine of toLines) {
      const wrappedLines = wrapText(toLine, fontRegular, 12, toMaxWidth);

      for (const wrappedLine of wrappedLines) {
        if (!isFirstLine) {
          currentY -= toLineHeight;
        }
        page.drawText(wrappedLine, {
          x: margin + toLabelWidth,
          y: currentY,
          size: 12,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
        isFirstLine = false;
      }
    }

    // Position Subject below the last To line with some spacing
    currentY -= toLineHeight + 5;

    const subjectLabel = "Subject: ";
    const subjectLabelWidth = fontBold.widthOfTextAtSize(subjectLabel, 12);
    const subjectMaxWidth = pageWidth - margin - margin - subjectLabelWidth; // Available width for Subject

    // Draw Subject label
    page.drawText(subjectLabel, {
      x: margin,
      y: currentY,
      size: 12,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Wrap subject text if needed
    const subjectWrappedLines = wrapText(subject, fontRegular, 12, subjectMaxWidth);
    let isFirstSubjectLine = true;
    for (const subjectLine of subjectWrappedLines) {
      if (!isFirstSubjectLine) {
        currentY -= toLineHeight;
      }
      page.drawText(subjectLine, {
        x: margin + subjectLabelWidth,
        y: currentY,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      isFirstSubjectLine = false;
    }

    // Body starts below Subject with spacing
    let yPosition = currentY - lineHeight - 15;

    const lines = bodyText.split("\n");
    for (const line of lines) {
      if (yPosition < margin + footerSpace) {
        drawFooterFunc(page, fontRegular, pageWidth, margin);
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        await drawBackgroundFunc(page, pageWidth, pageHeight);
        yPosition = pageHeight - bodyTopMargin;
      }

      if (line.trim() === '') {
        yPosition -= lineHeight;
        continue;
      }

      let isListItem = false;
      let number = null;
      let bullet = false;
      let itemText = line.trim();
      const numMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
      const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (numMatch) {
        isListItem = true;
        number = numMatch[1];
        itemText = numMatch[2];
      } else if (bulletMatch) {
        isListItem = true;
        bullet = true;
        itemText = bulletMatch[1];
      } else {
        itemText = line;
      }

      const runs = parseTextToRuns(itemText, fontRegular, fontBold, fontItalic, fontMono);

      if (isListItem) {
        if (number) {
          const numberText = `${number}. `;
          page.drawText(numberText, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: fontRegular,
            color: rgb(0, 0, 0),
          });
          const textX = margin + listIndent;
          const itemMaxWidth = pageWidth - textX - margin;
          const drawResult = await drawWrappedText(pdfDoc, page, textX, yPosition, runs, {
            maxWidth: itemMaxWidth,
            fontSize,
            lineHeight,
            color: rgb(0, 0, 0),
            pageWidth,
            pageHeight,
            margin,
            footerSpace,
            fontRegular,
            drawBackground: drawBackgroundFunc,
            drawFooter: drawFooterFunc,
            bodyTopMargin,
          });
          yPosition = drawResult.newY;
          page = drawResult.newPage;
        } else if (bullet) {
          page.drawText('•', {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: fontRegular,
            color: rgb(0, 0, 0),
          });
          const textX = margin + listIndent;
          const itemMaxWidth = pageWidth - textX - margin;
          const drawResult = await drawWrappedText(pdfDoc, page, textX, yPosition, runs, {
            maxWidth: itemMaxWidth,
            fontSize,
            lineHeight,
            color: rgb(0, 0, 0),
            pageWidth,
            pageHeight,
            margin,
            footerSpace,
            fontRegular,
            drawBackground: drawBackgroundFunc,
            drawFooter: drawFooterFunc,
            bodyTopMargin,
          });
          yPosition = drawResult.newY;
          page = drawResult.newPage;
        }
      } else {
        const drawResult = await drawWrappedText(pdfDoc, page, margin, yPosition, runs, {
          maxWidth: pageWidth - 2 * margin,
          fontSize,
          lineHeight,
          color: rgb(0, 0, 0),
          pageWidth,
          pageHeight,
          margin,
          footerSpace,
          fontRegular,
          drawBackground: drawBackgroundFunc,
          drawFooter: drawFooterFunc,
          bodyTopMargin,
        });
        yPosition = drawResult.newY;
        page = drawResult.newPage;
      }
    }

    if (yPosition < margin + footerSpace + lineHeight * 2) {
      drawFooterFunc(page, fontRegular, pageWidth, margin);
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      await drawBackgroundFunc(page, pageWidth, pageHeight);
      yPosition = pageHeight - bodyTopMargin;
    }
    yPosition -= 30;
    page.drawText("Regards,", {
      x: margin,
      y: yPosition,
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
    page.drawText("Koder Kids", {
      x: margin,
      y: yPosition,
      size: fontSize,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;

    drawFooterFunc(page, fontRegular, pageWidth, margin);

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: "application/pdf" });
  } catch (error) {
    console.error("Error generating PDF:", error.message);
    toast.error(`Failed to generate report: ${error.message}`);
    throw error;
  }
}

function parseToHTML(text) {
  let html = text
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    .replace(/~(.*?)~/g, "<s>$1</s>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/```(.*?)```/g, "<code>$1</code>")
    .replace(/^\s*-\s+(.*)$/gm, "<li>$1</li>")
    .replace(/^\s*(\d+)\.\s+(.*)$/gm, "<li value='$1'>$2</li>")
    .replace(/\n/g, "<br>");

  html = html.replace(/<li>(.*?)<\/li>/g, match => {
    if (match.startsWith("<li value=")) return `<ol>${match}</ol>`;
    return `<ul>${match}</ul>`;
  });

  return html;
}

// ============================================
// RESPONSIVE STYLES GENERATOR
// ============================================
const getResponsiveStyles = (isMobile, isTablet) => ({
  pageContainer: {
    padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
    background: COLORS.background.gradient,
    minHeight: '100vh',
  },
  contentWrapper: {
    maxWidth: LAYOUT.maxWidth.lg,
    margin: '0 auto',
    width: '100%',
  },
  pageTitle: {
    fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
    textAlign: 'center',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? SPACING.md : SPACING.lg,
    marginBottom: isMobile ? SPACING.lg : SPACING.xl,
  },
  input: {
    padding: isMobile ? SPACING.md : SPACING.md,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    fontSize: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
    minHeight: '44px',
  },
  editorContainer: {
    display: isMobile ? 'flex' : 'grid',
    flexDirection: isMobile ? 'column' : undefined,
    gridTemplateColumns: isMobile ? undefined : isTablet ? '1fr' : '1fr 1fr',
    gap: isMobile ? SPACING.lg : SPACING.xl,
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: isMobile ? SPACING.xs : SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: isMobile ? SPACING.sm : SPACING.md,
    borderRadius: `${BORDER_RADIUS.lg} ${BORDER_RADIUS.lg} 0 0`,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderBottom: 'none',
  },
  toolbarButton: {
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    fontSize: FONT_SIZES.sm,
    minHeight: '44px',
    minWidth: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarSelect: {
    padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(30, 30, 50, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    cursor: 'pointer',
    fontSize: '16px',
    minHeight: '44px',
  },
  heightSliderContainer: {
    display: isMobile ? 'none' : 'flex',
    alignItems: 'center',
  },
  textarea: {
    padding: isMobile ? SPACING.md : SPACING.lg,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: `0 0 ${BORDER_RADIUS.lg} ${BORDER_RADIUS.lg}`,
    fontSize: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: COLORS.text.white,
    outline: 'none',
    transition: `all ${TRANSITIONS.normal}`,
    resize: 'none',
    minHeight: isMobile ? '200px' : '256px',
  },
  previewContainer: {
    ...MIXINS.glassmorphicCard,
    padding: isMobile ? SPACING.md : SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflowY: 'auto',
    fontSize: FONT_SIZES.sm,
    lineHeight: 1.6,
    color: COLORS.text.white,
    minHeight: isMobile ? '150px' : '256px',
  },
  generateButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: isMobile ? `${SPACING.md} ${SPACING.lg}` : `${SPACING.md} ${SPACING.xl}`,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    color: COLORS.text.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    cursor: 'pointer',
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.semibold,
    transition: `all ${TRANSITIONS.normal}`,
    minHeight: '48px',
    width: isMobile ? '100%' : 'auto',
  },
  // History section styles
  historySection: {
    ...MIXINS.glassmorphicCard,
    padding: isMobile ? SPACING.md : SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: isMobile ? SPACING.lg : SPACING.xl,
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  historyTitle: {
    fontSize: isMobile ? FONT_SIZES.lg : FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.white,
  },
  historyTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  historyTh: {
    textAlign: 'left',
    padding: SPACING.sm,
    color: '#FBBF24',
    fontWeight: FONT_WEIGHTS.bold,
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    fontSize: FONT_SIZES.sm,
  },
  historyTd: {
    padding: SPACING.sm,
    color: COLORS.text.white,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: FONT_SIZES.sm,
  },
  actionButton: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: BORDER_RADIUS.md,
    border: 'none',
    cursor: 'pointer',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    transition: `all ${TRANSITIONS.normal}`,
    marginRight: SPACING.xs,
  },
});

// ============================================
// STATIC STYLES
// ============================================
const styles = {
  errorBanner: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#FCA5A5',
    borderRadius: BORDER_RADIUS.lg,
    border: '1px solid rgba(239, 68, 68, 0.4)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  editorSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  heightSliderLabel: {
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.white,
    marginRight: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  heightSlider: {
    width: '6rem',
  },
  heightValue: {
    color: COLORS.text.whiteSubtle,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  previewTitle: {
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
  },
  generateButtonDisabled: {
    opacity: 0.75,
    cursor: 'not-allowed',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  templateSelectRow: {
    display: 'flex',
    gap: SPACING.md,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  templateSelectGroup: {
    flex: '1 1 200px',
    display: 'flex',
    flexDirection: 'column',
  },
  buttonRow: {
    display: 'flex',
    gap: SPACING.md,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  historyBadge: {
    display: 'inline-block',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#4ADE80',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  templateBadge: {
    display: 'inline-block',
    padding: `2px ${SPACING.xs}`,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#A78BFA',
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  noHistory: {
    textAlign: 'center',
    padding: SPACING.xl,
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  // Recipient picker styles
  recipientButtons: {
    display: 'flex',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  recipientTypeButton: {
    padding: `${SPACING.xs} ${SPACING.md}`,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    minWidth: '80px',
    textAlign: 'center',
  },
  recipientPickerDropdown: {
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(30, 30, 50, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    maxHeight: '200px',
    overflowY: 'auto',
    padding: SPACING.xs,
  },
  pickerItem: {
    padding: `${SPACING.sm} ${SPACING.md}`,
    cursor: 'pointer',
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text.white,
    fontSize: FONT_SIZES.sm,
    transition: `background-color ${TRANSITIONS.fast}`,
  },
  pickerItemSubtext: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.xs,
  },
  pickerLoading: {
    padding: SPACING.md,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  pickerEmpty: {
    padding: SPACING.md,
    textAlign: 'center',
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
  },
  // Update/Create modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modalBox: {
    background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.95) 0%, rgba(20, 20, 40, 0.98) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxWidth: '420px',
    width: '90%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.1)',
    animation: 'slideUp 0.3s ease-out',
  },
  modalIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    marginBottom: SPACING.md,
    fontSize: '28px',
  },
  modalTitle: {
    color: COLORS.text.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalText: {
    color: COLORS.text.whiteSubtle,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    lineHeight: 1.6,
  },
  modalButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  modalButton: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    color: COLORS.text.white,
    cursor: 'pointer',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    transition: `all ${TRANSITIONS.normal}`,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  modalButtonPrimary: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
  },
  modalButtonSuccess: {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
  },
  modalButtonCancel: {
    background: 'rgba(107, 114, 128, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  modalButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

// ============================================
// COMPONENT
// ============================================
const CustomReport = () => {
  const { isMobile, isTablet } = useResponsive();
  const responsiveStyles = getResponsiveStyles(isMobile, isTablet);
  const textareaRef = useRef(null);

  // Use custom hook for state management
  const {
    to, setTo,
    subject, setSubject,
    bodyText, setBodyText,
    lineSpacing, setLineSpacing,
    templateType,
    reportHistory,
    selectedHistoryReport,
    templateOptions,
    applyTemplate,
    saveReportToDb,
    updateReportInDb,
    loadHistoricalReport,
    deleteHistoricalReport,
    clearForm,
    loading,
    error,
    setError,
    // Recipient picker
    recipientType,
    schools,
    employees,
    showRecipientPicker,
    openRecipientPicker,
    closeRecipientPicker,
    selectRecipient,
  } = useCustomReport();

  const [adminName, setAdminName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [textAreaHeight, setTextAreaHeight] = useState(256);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  useEffect(() => {
    const storedFullName = localStorage.getItem('fullName') || 'Unknown';
    setAdminName(storedFullName);
  }, []);

  const formatText = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = bodyText.slice(start, end);
    let replacement = selected;
    let marker;

    switch (type) {
      case "bold":
        marker = "*";
        replacement = `${marker}${selected}${marker}`;
        break;
      case "italic":
        marker = "_";
        replacement = `${marker}${selected}${marker}`;
        break;
      case "strike":
        marker = "~";
        replacement = `${marker}${selected}${marker}`;
        break;
      case "mono":
        marker = "```";
        replacement = `${marker}${selected}${marker}`;
        break;
      case "bullet":
        if (selected) {
          replacement = selected
            .split("\n")
            .map((line) => (line ? `- ${line}` : ""))
            .join("\n");
        } else {
          replacement = "- ";
        }
        break;
      case "number":
        if (selected) {
          replacement = selected
            .split("\n")
            .map((line, i) => (line ? `${i + 1}. ${line}` : ""))
            .join("\n");
        } else {
          replacement = "1. ";
        }
        break;
      case "newline":
        replacement = "\n";
        break;
      case "emptyline":
        replacement = "\n\n";
        break;
      default:
        return;
    }

    const newText = bodyText.slice(0, start) + replacement + bodyText.slice(end);
    setBodyText(newText);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + replacement.length;
      if (type === "bold" || type === "italic" || type === "strike" || type === "mono") {
        textarea.selectionStart = start + marker.length;
        textarea.selectionEnd = start + replacement.length - marker.length;
      }
      textarea.focus();
    }, 0);
  };

  const handleGenerateReport = async () => {
    if (!to || !subject || !bodyText.trim()) {
      setError("Please enter To, Subject, and Body text.");
      toast.warning("All fields are required.");
      return;
    }
    if (to.length > 500 || subject.length > 200) {
      setError("To must be under 500 characters and Subject under 200 characters.");
      toast.warning("Input too long.");
      return;
    }

    // If loaded from history, ask user whether to update or create new
    if (selectedHistoryReport) {
      setShowUpdateDialog(true);
      return;
    }

    // Generate and save as new
    await executeGeneration(false);
  };

  // Execute PDF generation and save/update
  const executeGeneration = async (shouldUpdate) => {
    setError("");
    setIsGenerating(true);
    // Keep modal open during generation to show progress

    try {
      const pdfBlob = await generatePDFWithBackground(to, subject, bodyText, lineSpacing, adminName);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Custom_Report_${subject.replace(/\s+/g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Report generated successfully!");

      // Save or update based on user choice
      if (shouldUpdate && selectedHistoryReport) {
        await updateReportInDb(selectedHistoryReport.id);
      } else {
        await saveReportToDb();
      }

      // Close modal and clear the form after successful generation and save
      setShowUpdateDialog(false);
      clearForm();
    } catch (err) {
      setError(`Failed to generate report: ${err.message}`);
      setShowUpdateDialog(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle dialog choices
  const handleUpdateChoice = () => {
    executeGeneration(true);
  };

  const handleCreateNewChoice = () => {
    executeGeneration(false);
  };

  const handleCancelDialog = () => {
    setShowUpdateDialog(false);
  };

  const handleDeleteReport = async (reportId) => {
    if (deleteConfirm === reportId) {
      await deleteHistoricalReport(reportId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(reportId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const getToolbarButtonStyle = (buttonId) => {
    const isHovered = hoveredButton === buttonId;
    return {
      ...responsiveStyles.toolbarButton,
      backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
    };
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={responsiveStyles.pageContainer}>
      {/* Update/Create Modal */}
      {showUpdateDialog && (
        <div style={styles.modalOverlay} onClick={isGenerating ? undefined : handleCancelDialog}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>
              {isGenerating ? '⏳' : '📄'}
            </div>
            <h3 style={styles.modalTitle}>
              {isGenerating ? 'Generating Report...' : 'Save Report'}
            </h3>
            <p style={styles.modalText}>
              {isGenerating
                ? 'Please wait while your PDF is being generated and saved.'
                : 'This report was loaded from history. How would you like to save your changes?'
              }
            </p>
            <div style={styles.modalButtons}>
              <button
                onClick={handleUpdateChoice}
                disabled={isGenerating}
                style={{
                  ...styles.modalButton,
                  ...styles.modalButtonPrimary,
                  ...(isGenerating ? styles.modalButtonDisabled : {}),
                }}
              >
                {isGenerating ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Update Existing
                  </>
                )}
              </button>
              <button
                onClick={handleCreateNewChoice}
                disabled={isGenerating}
                style={{
                  ...styles.modalButton,
                  ...styles.modalButtonSuccess,
                  ...(isGenerating ? styles.modalButtonDisabled : {}),
                }}
              >
                <span>➕</span>
                Create New Copy
              </button>
              <button
                onClick={handleCancelDialog}
                disabled={isGenerating}
                style={{
                  ...styles.modalButton,
                  ...styles.modalButtonCancel,
                  ...(isGenerating ? styles.modalButtonDisabled : {}),
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={responsiveStyles.contentWrapper}>
        <PageHeader
          icon="📄"
          title="Custom Report Generator"
          subtitle="Create custom PDF reports with your content"
        />

        {/* Historical Report Badge */}
        {selectedHistoryReport && (
          <div style={{ marginBottom: SPACING.md, display: 'flex', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
            <span style={styles.historyBadge}>
              Viewing Historical Report from {formatDate(selectedHistoryReport.created_at)}
            </span>
            <button
              onClick={() => {
                clearForm();
              }}
              style={{
                ...responsiveStyles.actionButton,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                color: 'white',
              }}
            >
              New Report
            </button>
          </div>
        )}

        {(error || '') && (
          <div style={styles.errorBanner}>{error}</div>
        )}

        <div style={responsiveStyles.formContainer}>
          {/* Template Selection Row */}
          <div style={styles.templateSelectRow}>
            <div style={styles.templateSelectGroup}>
              <label style={styles.label} htmlFor="template">Quick Draft Template:</label>
              <select
                id="template"
                style={{
                  ...responsiveStyles.toolbarSelect,
                  width: '100%',
                }}
                value={templateType}
                onChange={(e) => applyTemplate(e.target.value)}
              >
                {templateOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: '#1e1e32', color: 'white' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* To Field */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="to">To:</label>
            <textarea
              id="to"
              style={{
                ...responsiveStyles.input,
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Enter recipient (e.g., Mr. Babar)"
              maxLength={500}
            />
            {/* Recipient Type Buttons */}
            <div style={styles.recipientButtons}>
              <button
                type="button"
                onClick={() => openRecipientPicker('school')}
                style={{
                  ...styles.recipientTypeButton,
                  backgroundColor: recipientType === 'school' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  borderColor: recipientType === 'school' ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                School
              </button>
              <button
                type="button"
                onClick={() => openRecipientPicker('employee')}
                style={{
                  ...styles.recipientTypeButton,
                  backgroundColor: recipientType === 'employee' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  borderColor: recipientType === 'employee' ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => {
                  closeRecipientPicker();
                  setTo('');
                }}
                style={{
                  ...styles.recipientTypeButton,
                  backgroundColor: recipientType === 'custom' && !showRecipientPicker ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  borderColor: recipientType === 'custom' && !showRecipientPicker ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                Custom
              </button>
            </div>

            {/* Recipient Picker Dropdown */}
            {showRecipientPicker && (
              <div style={styles.recipientPickerDropdown}>
                {recipientType === 'school' && (
                  <>
                    {loading.schools ? (
                      <div style={styles.pickerLoading}>Loading schools...</div>
                    ) : schools.length === 0 ? (
                      <div style={styles.pickerEmpty}>No schools found</div>
                    ) : (
                      schools.map((school) => {
                        // Format school address for the "To" field
                        const schoolAddress = school.address || school.location || '';
                        const formattedRecipient = `The Principal,\n${school.name}${schoolAddress ? `\n${schoolAddress}` : ''}`;
                        return (
                          <div
                            key={school.id}
                            style={styles.pickerItem}
                            onClick={() => selectRecipient('school', formattedRecipient)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ fontWeight: 500 }}>{school.name}</div>
                            {schoolAddress && (
                              <div style={styles.pickerItemSubtext}>{schoolAddress}</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                )}
                {recipientType === 'employee' && (
                  <>
                    {loading.employees ? (
                      <div style={styles.pickerLoading}>Loading employees...</div>
                    ) : employees.length === 0 ? (
                      <div style={styles.pickerEmpty}>No employees found</div>
                    ) : (
                      employees.map((employee) => {
                        // Get the best available name
                        const displayName = employee.full_name ||
                          (employee.first_name && employee.last_name
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.first_name || employee.last_name || employee.username);
                        // Format recipient with name and employee ID
                        const formattedRecipient = employee.employee_id
                          ? `${displayName}\nEmployee ID: ${employee.employee_id}`
                          : displayName;
                        return (
                          <div
                            key={employee.id}
                            style={styles.pickerItem}
                            onClick={() => selectRecipient('employee', formattedRecipient)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ fontWeight: 500 }}>{displayName}</div>
                            {employee.employee_id && (
                              <div style={styles.pickerItemSubtext}>ID: {employee.employee_id}</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Subject Field */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="subject">Subject:</label>
            <input
              id="subject"
              type="text"
              style={responsiveStyles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter report subject"
              maxLength={100}
            />
          </div>

          {/* Editor and Preview */}
          <div style={responsiveStyles.editorContainer}>
            {/* Editor Section */}
            <div style={styles.editorSection}>
              <label style={styles.label} htmlFor="bodyText">
                Body Text (use *bold*, _italic_, ~strike~, ```mono```, - bullets, 1. numbering):
              </label>

              {/* Toolbar */}
              <div style={responsiveStyles.toolbar}>
                <button
                  onClick={() => formatText("bold")}
                  onMouseEnter={() => setHoveredButton("bold")}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={getToolbarButtonStyle("bold")}
                  title="Bold"
                  type="button"
                >
                  <strong>B</strong>
                </button>
                <button
                  onClick={() => formatText("italic")}
                  onMouseEnter={() => setHoveredButton("italic")}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={getToolbarButtonStyle("italic")}
                  title="Italic"
                  type="button"
                >
                  <em>I</em>
                </button>
                <button
                  onClick={() => formatText("strike")}
                  onMouseEnter={() => setHoveredButton("strike")}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={getToolbarButtonStyle("strike")}
                  title="Strikethrough"
                  type="button"
                >
                  <s>S</s>
                </button>
                <button
                  onClick={() => formatText("mono")}
                  onMouseEnter={() => setHoveredButton("mono")}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={getToolbarButtonStyle("mono")}
                  title="Monospace"
                  type="button"
                >
                  <code>M</code>
                </button>
                <button
                  onClick={() => formatText("bullet")}
                  onMouseEnter={() => setHoveredButton("bullet")}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={getToolbarButtonStyle("bullet")}
                  title="Bulleted List"
                  type="button"
                >
                  •
                </button>
                <button
                  onClick={() => formatText("number")}
                  onMouseEnter={() => setHoveredButton("number")}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={getToolbarButtonStyle("number")}
                  title="Numbered List"
                  type="button"
                >
                  1.
                </button>
                <button
                  onClick={() => formatText("newline")}
                  onMouseEnter={() => setHoveredButton("newline")}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={getToolbarButtonStyle("newline")}
                  title="New Line"
                  type="button"
                >
                  ↵
                </button>
                <button
                  onClick={() => formatText("emptyline")}
                  onMouseEnter={() => setHoveredButton("emptyline")}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={getToolbarButtonStyle("emptyline")}
                  title="Empty Line"
                  type="button"
                >
                  ⏎
                </button>
                <select
                  value={lineSpacing}
                  onChange={(e) => setLineSpacing(e.target.value)}
                  style={responsiveStyles.toolbarSelect}
                  title="Line Spacing"
                >
                  <option value="single" style={{ backgroundColor: '#1e1e32', color: 'white' }}>Single</option>
                  <option value="1.5" style={{ backgroundColor: '#1e1e32', color: 'white' }}>1.5</option>
                  <option value="double" style={{ backgroundColor: '#1e1e32', color: 'white' }}>Double</option>
                </select>
                {/* Height slider - hidden on mobile */}
                <div style={responsiveStyles.heightSliderContainer}>
                  <span style={styles.heightSliderLabel}>Height:</span>
                  <input
                    id="heightSlider"
                    type="range"
                    min="100"
                    max="600"
                    value={textAreaHeight}
                    onChange={(e) => setTextAreaHeight(parseInt(e.target.value))}
                    style={styles.heightSlider}
                    title="Adjust Text Area Height"
                  />
                  <span style={styles.heightValue}>{textAreaHeight}px</span>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                id="bodyText"
                ref={textareaRef}
                style={{ ...responsiveStyles.textarea, height: isMobile ? 'auto' : `${textAreaHeight}px` }}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Enter report content..."
              />
            </div>

            {/* Preview Section */}
            <div style={styles.previewSection}>
              <h3 style={styles.previewTitle}>Preview:</h3>
              <div
                style={{ ...responsiveStyles.previewContainer, height: isMobile ? 'auto' : `${textAreaHeight + 50}px` }}
                dangerouslySetInnerHTML={{ __html: parseToHTML(bodyText) }}
              />
            </div>
          </div>
        </div>

        {/* Button Row */}
        <div style={styles.buttonRow}>
          {/* Generate Button */}
          <button
            onClick={handleGenerateReport}
            style={{
              ...responsiveStyles.generateButton,
              ...((isGenerating || showUpdateDialog) ? styles.generateButtonDisabled : {}),
            }}
            disabled={isGenerating || showUpdateDialog}
            onMouseEnter={(e) => {
              if (!isGenerating && !showUpdateDialog) {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isGenerating ? (
              <>
                <svg
                  style={styles.spinner}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </button>

          {/* Clear Form Button */}
          <button
            onClick={clearForm}
            style={{
              ...responsiveStyles.generateButton,
              backgroundColor: 'rgba(107, 114, 128, 0.8)',
              width: isMobile ? '100%' : 'auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.8)';
            }}
          >
            Clear Form
          </button>
        </div>

        {/* ============================================ */}
        {/* REPORT HISTORY SECTION */}
        {/* ============================================ */}
        <div style={responsiveStyles.historySection}>
          <div style={responsiveStyles.historyHeader}>
            <h2 style={responsiveStyles.historyTitle}>Report History</h2>
            {loading.history && (
              <span style={{ color: COLORS.text.whiteSubtle, fontSize: FONT_SIZES.sm }}>
                Loading...
              </span>
            )}
          </div>

          {reportHistory.length === 0 ? (
            <div style={styles.noHistory}>
              No reports generated yet. Generate a report to see it here.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={responsiveStyles.historyTable}>
                <thead>
                  <tr>
                    <th style={responsiveStyles.historyTh}>Subject</th>
                    <th style={responsiveStyles.historyTh}>Recipient</th>
                    {!isMobile && <th style={responsiveStyles.historyTh}>Type</th>}
                    <th style={responsiveStyles.historyTh}>Date</th>
                    <th style={responsiveStyles.historyTh}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportHistory.map((report) => (
                    <tr key={report.id}>
                      <td style={responsiveStyles.historyTd}>
                        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {report.subject}
                        </div>
                      </td>
                      <td style={responsiveStyles.historyTd}>
                        <div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {report.recipient}
                        </div>
                      </td>
                      {!isMobile && (
                        <td style={responsiveStyles.historyTd}>
                          <span style={styles.templateBadge}>
                            {report.template_display}
                          </span>
                        </td>
                      )}
                      <td style={responsiveStyles.historyTd}>
                        {formatDate(report.created_at)}
                      </td>
                      <td style={responsiveStyles.historyTd}>
                        <button
                          onClick={() => loadHistoricalReport(report.id)}
                          style={{
                            ...responsiveStyles.actionButton,
                            backgroundColor: 'rgba(59, 130, 246, 0.8)',
                            color: 'white',
                          }}
                          disabled={loading.history}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          style={{
                            ...responsiveStyles.actionButton,
                            backgroundColor: deleteConfirm === report.id
                              ? 'rgba(239, 68, 68, 1)'
                              : 'rgba(239, 68, 68, 0.6)',
                            color: 'white',
                          }}
                          disabled={loading.deleting}
                        >
                          {deleteConfirm === report.id ? 'Confirm?' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Keyframe animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};

export default CustomReport;
