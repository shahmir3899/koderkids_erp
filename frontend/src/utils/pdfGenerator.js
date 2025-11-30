// ============================================
// PDF GENERATOR - Advanced PDF Generation Utility
// ============================================
// Location: src/utils/pdfGenerator.js
//
// Uses pdf-lib for professional PDF generation with:
// - Multi-page support
// - Text formatting (bold, italic, strikethrough, monospace)
// - Bullet and numbered lists
// - Background images
// - Headers and footers
// - Line spacing options

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toast } from 'react-toastify';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch array buffer for images with timeout
 */
async function fetchArrayBuffer(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { mode: 'cors', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

/**
 * Validate image format (PNG or JPEG)
 */
async function validateImageFormat(arrayBuffer) {
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJpeg = firstBytes[0] === 0xff && firstBytes[1] === 0xd8;
  const isPng =
    firstBytes[0] === 0x89 &&
    firstBytes[1] === 0x50 &&
    firstBytes[2] === 0x4e &&
    firstBytes[3] === 0x47;
  if (!isJpeg && !isPng) throw new Error('Invalid image format. Only PNG and JPEG supported.');
  return isJpeg;
}

/**
 * Parse text into styled runs for PDF rendering
 * Supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 */
function parseTextToRuns(text, fontRegular, fontBold, fontItalic, fontMono) {
  const parts = text.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```)/g).filter((part) => part);
  const runs = [];

  for (const part of parts) {
    if (part.startsWith('*') && part.endsWith('*')) {
      runs.push({ text: part.slice(1, -1), font: fontBold });
    } else if (part.startsWith('_') && part.endsWith('_')) {
      runs.push({ text: part.slice(1, -1), font: fontItalic });
    } else if (part.startsWith('~') && part.endsWith('~')) {
      runs.push({ text: part.slice(1, -1), font: fontRegular, strike: true });
    } else if (part.startsWith('```') && part.endsWith('```')) {
      runs.push({ text: part.slice(3, -3), font: fontMono, mono: true });
    } else {
      runs.push({ text: part, font: fontRegular });
    }
  }

  return runs;
}

/**
 * Draw wrapped text with styles, handling multi-page
 */
async function drawWrappedText(pdfDoc, page, xStart, yStart, runs, options) {
  let currentPage = page;
  let currentX = xStart;
  let currentY = yStart;

  const {
    maxWidth,
    fontSize,
    lineHeight,
    color,
    pageWidth,
    pageHeight,
    margin,
    footerSpace,
    fontRegular,
    drawBackground,
    drawFooter,
    bodyTopMargin,
  } = options;

  for (const run of runs) {
    const words = run.text.split(/(\s+)/).filter((word) => word);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWidth = run.font.widthOfTextAtSize(word, fontSize);

      if (currentX + wordWidth > xStart + maxWidth) {
        // Move to new line
        currentY -= lineHeight;
        if (currentY < margin + footerSpace) {
          // Draw footer on current page
          drawFooter(currentPage, fontRegular, pageWidth, margin);
          // Add new page
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

      // Draw strikethrough line
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

// ============================================
// MAIN PDF GENERATOR CLASS
// ============================================

export class PDFGenerator {
  constructor(options = {}) {
    this.pageWidth = options.pageWidth || 595; // A4 width
    this.pageHeight = options.pageHeight || 842; // A4 height
    this.margin = options.margin || 50;
    this.fontSize = options.fontSize || 12;
    this.lineSpacing = options.lineSpacing || 'single';
    this.backgroundImage = options.backgroundImage || null;
    this.logoSrc = options.logoSrc || '/logo.png';
    this.footerText = options.footerText || '';
    this.companyName = options.companyName || 'Koder Kids';
    this.companyAddress = options.companyAddress || [
      'Address: Office # 8, First Floor, Khyber III',
      'G-15 Markaz Islamabad, Pakistan',
      'Phone: 0316-7394390',
    ];
  }

  /**
   * Calculate line height based on spacing option
   */
  getLineHeight() {
    switch (this.lineSpacing) {
      case '1.5':
        return this.fontSize + 8;
      case 'double':
        return this.fontSize + 12;
      default:
        return this.fontSize + 5;
    }
  }

  /**
   * Generate PDF for Lesson Plans
   */
  async generateLessonPlanPDF(options) {
    const {
      lessons = [],
      schoolName = '',
      className = '',
      dateRange = '',
      formatDate,
      adminName = 'Admin',
    } = options;

    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);

      const lineHeight = this.getLineHeight();
      const topSpace = 144;
      const bodyTopMargin = topSpace + 60;
      const footerSpace = 50;

      // Embed fonts
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Background function
      const drawBackgroundFunc = async (currentPage, pw, ph) => {
        if (this.backgroundImage) {
          try {
            const imageArrayBuffer = await fetchArrayBuffer(this.backgroundImage);
            const isJpeg = await validateImageFormat(imageArrayBuffer);
            const backgroundImage = isJpeg
              ? await pdfDoc.embedJpg(imageArrayBuffer)
              : await pdfDoc.embedPng(imageArrayBuffer);
            currentPage.drawImage(backgroundImage, { x: 0, y: 0, width: pw, height: ph });
          } catch (error) {
            console.warn('Using fallback background:', error.message);
            currentPage.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(1, 1, 1) });
          }
        } else {
          currentPage.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(1, 1, 1) });
        }
      };

      // Footer function
      const drawFooterFunc = (currentPage, fr, pw, m) => {
        const footerText = this.footerText || `Generated by: ${adminName} | ${this.companyName}`;
        const footerX = (pw - fr.widthOfTextAtSize(footerText, 10)) / 2;
        currentPage.drawText(footerText, {
          x: footerX,
          y: m,
          size: 10,
          font: fr,
          color: rgb(0.4, 0.4, 0.4),
        });
      };

      // Draw background on first page
      await drawBackgroundFunc(page, this.pageWidth, this.pageHeight);

      // Header - Company info (top right)
      const headers = [
        ...this.companyAddress,
        `Date: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full', timeZone: 'Asia/Karachi' })}`,
      ];
      const maxHeaderWidth = 200;
      const headerStartY = this.pageHeight - this.margin;

      headers.forEach((line, i) => {
        page.drawText(line, {
          x: this.pageWidth - this.margin - maxHeaderWidth,
          y: headerStartY - i * 20,
          size: 10,
          font: fontRegular,
          color: rgb(0, 0, 0),
          maxWidth: maxHeaderWidth,
        });
      });

      // Title
      const title = 'LESSON PLAN';
      const titleWidth = fontBold.widthOfTextAtSize(title, 18);
      page.drawText(title, {
        x: (this.pageWidth - titleWidth) / 2,
        y: this.pageHeight - topSpace,
        size: 18,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Subtitle - School and Class info
      page.drawText(`School: ${schoolName}`, {
        x: this.margin,
        y: this.pageHeight - topSpace - 30,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Class: ${className}`, {
        x: this.margin,
        y: this.pageHeight - topSpace - 50,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Period: ${dateRange}`, {
        x: this.margin,
        y: this.pageHeight - topSpace - 70,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      // Table setup
      let yPosition = this.pageHeight - bodyTopMargin - 20;
      const colWidths = [150, this.pageWidth - 2 * this.margin - 150];
      const tableX = this.margin;

      // Table header
      const drawTableHeader = (currentPage, y) => {
        currentPage.drawRectangle({
          x: tableX,
          y: y - 5,
          width: colWidths[0] + colWidths[1],
          height: 25,
          color: rgb(0.9, 0.9, 0.9),
        });

        currentPage.drawText('Date', {
          x: tableX + 10,
          y: y,
          size: 12,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        currentPage.drawText('Planned Topic', {
          x: tableX + colWidths[0] + 10,
          y: y,
          size: 12,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        return y - 30;
      };

      yPosition = drawTableHeader(page, yPosition);

      // Table rows
      for (const lesson of lessons) {
        const dateText = formatDate ? formatDate(lesson.session_date) : lesson.session_date;
        const topicText = lesson.planned_topic || '(No topic planned)';

        // Check if we need a new page
        if (yPosition < this.margin + footerSpace + 30) {
          drawFooterFunc(page, fontRegular, this.pageWidth, this.margin);
          page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
          await drawBackgroundFunc(page, this.pageWidth, this.pageHeight);
          yPosition = this.pageHeight - bodyTopMargin;
          yPosition = drawTableHeader(page, yPosition);
        }

        // Draw row border
        page.drawLine({
          start: { x: tableX, y: yPosition + 15 },
          end: { x: tableX + colWidths[0] + colWidths[1], y: yPosition + 15 },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });

        // Date column
        page.drawText(dateText, {
          x: tableX + 10,
          y: yPosition,
          size: 11,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });

        // Topic column - handle long text
        const maxTopicWidth = colWidths[1] - 20;
        const words = topicText.split(' ');
        let currentLine = '';
        let topicY = yPosition;

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = fontRegular.widthOfTextAtSize(testLine, 11);

          if (testWidth > maxTopicWidth && currentLine) {
            page.drawText(currentLine, {
              x: tableX + colWidths[0] + 10,
              y: topicY,
              size: 11,
              font: fontRegular,
              color: rgb(0.2, 0.2, 0.2),
            });
            currentLine = word;
            topicY -= lineHeight;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          page.drawText(currentLine, {
            x: tableX + colWidths[0] + 10,
            y: topicY,
            size: 11,
            font: fontRegular,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        yPosition = Math.min(yPosition, topicY) - lineHeight - 5;
      }

      // Draw footer on last page
      drawFooterFunc(page, fontRegular, this.pageWidth, this.margin);

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error.message);
      toast.error(`Failed to generate PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate custom report PDF (like CustomReport.js)
   */
  async generateCustomReportPDF(options) {
    const {
      to = '',
      subject = '',
      bodyText = '',
      adminName = 'Admin',
    } = options;

    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);

      const lineHeight = this.getLineHeight();
      const topSpace = 144;
      const bodyTopMargin = topSpace + 60;
      const footerSpace = 50;
      const listIndent = 30;

      // Embed fonts
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

      // Background function
      const drawBackgroundFunc = async (currentPage, pw, ph) => {
        if (this.backgroundImage) {
          try {
            const imageArrayBuffer = await fetchArrayBuffer(this.backgroundImage);
            const isJpeg = await validateImageFormat(imageArrayBuffer);
            const backgroundImage = isJpeg
              ? await pdfDoc.embedJpg(imageArrayBuffer)
              : await pdfDoc.embedPng(imageArrayBuffer);
            currentPage.drawImage(backgroundImage, { x: 0, y: 0, width: pw, height: ph });
          } catch (error) {
            console.warn('Using fallback background:', error.message);
            currentPage.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(1, 1, 1) });
          }
        } else {
          currentPage.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(1, 1, 1) });
        }
      };

      // Footer function
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

      // Draw background on first page
      await drawBackgroundFunc(page, this.pageWidth, this.pageHeight);

      // Header - Company info
      const headers = [
        ...this.companyAddress,
        `Date: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full', timeZone: 'Asia/Karachi' })}`,
      ];
      const maxHeaderWidth = 200;
      const headerStartY = this.pageHeight - this.margin;

      headers.forEach((line, i) => {
        page.drawText(line, {
          x: this.pageWidth - this.margin - maxHeaderWidth,
          y: headerStartY - i * 20,
          size: 10,
          font: fontRegular,
          color: rgb(0, 0, 0),
          maxWidth: maxHeaderWidth,
        });
      });

      // To and Subject
      page.drawText(`To: ${to}`, {
        x: this.margin,
        y: this.pageHeight - topSpace - 20,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      const subjectLabel = 'Subject: ';
      const subjectLabelWidth = fontBold.widthOfTextAtSize(subjectLabel, 12);
      page.drawText(subjectLabel, {
        x: this.margin,
        y: this.pageHeight - topSpace - 40,
        size: 12,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      page.drawText(subject, {
        x: this.margin + subjectLabelWidth,
        y: this.pageHeight - topSpace - 40,
        size: 12,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      // Body text
      let yPosition = this.pageHeight - bodyTopMargin;
      const lines = bodyText.split('\n');

      for (const line of lines) {
        if (yPosition < this.margin + footerSpace) {
          drawFooterFunc(page, fontRegular, this.pageWidth, this.margin);
          page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
          await drawBackgroundFunc(page, this.pageWidth, this.pageHeight);
          yPosition = this.pageHeight - bodyTopMargin;
        }

        if (line.trim() === '') {
          yPosition -= lineHeight;
          continue;
        }

        // Check for list items
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
        }

        const runs = parseTextToRuns(itemText, fontRegular, fontBold, fontItalic, fontMono);

        if (isListItem) {
          const textX = this.margin + listIndent;
          const itemMaxWidth = this.pageWidth - textX - this.margin;

          if (number) {
            page.drawText(`${number}. `, {
              x: this.margin,
              y: yPosition,
              size: this.fontSize,
              font: fontRegular,
              color: rgb(0, 0, 0),
            });
          } else if (bullet) {
            page.drawText('•', {
              x: this.margin,
              y: yPosition,
              size: this.fontSize,
              font: fontRegular,
              color: rgb(0, 0, 0),
            });
          }

          const drawResult = await drawWrappedText(pdfDoc, page, textX, yPosition, runs, {
            maxWidth: itemMaxWidth,
            fontSize: this.fontSize,
            lineHeight,
            color: rgb(0, 0, 0),
            pageWidth: this.pageWidth,
            pageHeight: this.pageHeight,
            margin: this.margin,
            footerSpace,
            fontRegular,
            drawBackground: drawBackgroundFunc,
            drawFooter: drawFooterFunc,
            bodyTopMargin,
          });

          yPosition = drawResult.newY;
          page = drawResult.newPage;
        } else {
          const drawResult = await drawWrappedText(pdfDoc, page, this.margin, yPosition, runs, {
            maxWidth: this.pageWidth - 2 * this.margin,
            fontSize: this.fontSize,
            lineHeight,
            color: rgb(0, 0, 0),
            pageWidth: this.pageWidth,
            pageHeight: this.pageHeight,
            margin: this.margin,
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

      // Regards
      if (yPosition < this.margin + footerSpace + lineHeight * 2) {
        drawFooterFunc(page, fontRegular, this.pageWidth, this.margin);
        page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        await drawBackgroundFunc(page, this.pageWidth, this.pageHeight);
        yPosition = this.pageHeight - bodyTopMargin;
      }

      yPosition -= 30;
      page.drawText('Regards,', {
        x: this.margin,
        y: yPosition,
        size: this.fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      yPosition -= lineHeight;
      page.drawText(this.companyName, {
        x: this.margin,
        y: yPosition,
        size: this.fontSize,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      // Draw footer on last page
      drawFooterFunc(page, fontRegular, this.pageWidth, this.margin);

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error.message);
      toast.error(`Failed to generate PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download the generated PDF blob
   */
  static downloadPDF(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default PDFGenerator;