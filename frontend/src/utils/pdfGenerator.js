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
   * Generate PDF for Salary Slips
   * @param {Object} options - Salary slip data
   * @returns {Promise<Blob>} - PDF blob
   */
  async generateSalarySlipPDF(options) {
    const {
      name = '',
      title = '',
      schools = '',
      dateOfJoining = '',
      fromDate = '',
      tillDate = '',
      basicSalary = 0,
      paymentDate = '',
      bankName = '',
      accountTitle = '',
      accountNumber = '',
      noOfDays = 0,
      proratedSalary = 0,
      earnings = [],
      deductions = [],
      totalEarning = 0,
      totalDeduction = 0,
      netPay = 0,
    } = options;

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);

      const lineHeight = this.getLineHeight();
      const topSpace = 144; // 2 inches for letterhead
      const footerSpace = 50;

      // Embed fonts
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Helper: Format date with ordinal (1st, 2nd, 3rd, etc.)
      const formatDateWithOrdinal = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'long' });
        const year = date.getFullYear();
        const ordinal =
          day % 10 === 1 && day !== 11
            ? 'st'
            : day % 10 === 2 && day !== 12
              ? 'nd'
              : day % 10 === 3 && day !== 13
                ? 'rd'
                : 'th';
        return `${day}${ordinal} ${month} ${year}`;
      };

      // Helper: Get month and year
      const getMonthYear = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.toLocaleString('en-US', { month: 'long' });
        const year = date.getFullYear();
        return `${month} ${year}`;
      };

      // Helper: Format currency
      const formatCurrency = (amount) => {
        if (isNaN(amount) || amount === null || amount === undefined) return 'PKR 0.00';
        return `PKR ${parseFloat(amount)
          .toFixed(2)
          .replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
      };

      // Draw background
      if (this.backgroundImage) {
        try {
          const imageArrayBuffer = await fetchArrayBuffer(this.backgroundImage);
          const isJpeg = await validateImageFormat(imageArrayBuffer);
          const backgroundImage = isJpeg
            ? await pdfDoc.embedJpg(imageArrayBuffer)
            : await pdfDoc.embedPng(imageArrayBuffer);
          page.drawImage(backgroundImage, {
            x: 0,
            y: 0,
            width: this.pageWidth,
            height: this.pageHeight,
          });
        } catch (error) {
          console.warn('Using fallback background:', error.message);
          page.drawRectangle({
            x: 0,
            y: 0,
            width: this.pageWidth,
            height: this.pageHeight,
            color: rgb(1, 1, 1),
          });
        }
      } else {
        page.drawRectangle({
          x: 0,
          y: 0,
          width: this.pageWidth,
          height: this.pageHeight,
          color: rgb(1, 1, 1),
        });
      }

      // Main heading: Salary Slip for [Month Year]
      const headingText = `Salary Slip for ${getMonthYear(fromDate)}`;
      const headingWidth = fontBold.widthOfTextAtSize(headingText, this.fontSize + 2);
      page.drawText(headingText, {
        x: (this.pageWidth - headingWidth) / 2,
        y: this.pageHeight - this.margin,
        size: this.fontSize + 2,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Start details below top space
      const detailsStartY = this.pageHeight - this.margin - topSpace;
      const leftColumnX = this.margin;
      const rightColumnX = this.pageWidth / 2 + 20;
      const sectionHeaderColor = rgb(0.2, 0.2, 0.4); // Dark blue for section headers

      // Helper: Draw section header with underline
      const drawSectionHeader = (text, x, y, width) => {
        page.drawText(text, {
          x: x,
          y: y,
          size: this.fontSize + 1,
          font: fontBold,
          color: sectionHeaderColor,
        });
        // Underline
        page.drawLine({
          start: { x: x, y: y - 3 },
          end: { x: x + width, y: y - 3 },
          thickness: 0.5,
          color: sectionHeaderColor,
        });
        return y - lineHeight * 1.5;
      };

      // Helper: Draw label-value pair
      const drawLabelValue = (label, value, x, y) => {
        page.drawText(label, {
          x: x,
          y: y,
          size: this.fontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        const labelWidth = fontBold.widthOfTextAtSize(label, this.fontSize);
        page.drawText(value || '-', {
          x: x + labelWidth,
          y: y,
          size: this.fontSize,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
        return y - lineHeight;
      };

      // Parse schools: try newline first, then comma
      const parseSchools = (schoolsStr) => {
        if (!schoolsStr) return ['None'];
        const byNewline = schoolsStr.split('\n').map(s => s.trim()).filter(s => s);
        if (byNewline.length > 1) return byNewline;
        const byComma = schoolsStr.split(',').map(s => s.trim()).filter(s => s);
        return byComma.length > 0 ? byComma : ['None'];
      };

      // ============================================
      // LEFT COLUMN
      // ============================================
      let yLeft = detailsStartY;

      // SECTION 1: Employee Information
      yLeft = drawSectionHeader('EMPLOYEE INFORMATION', leftColumnX, yLeft, 180);

      yLeft = drawLabelValue('Name: ', name, leftColumnX, yLeft);
      yLeft = drawLabelValue('Designation: ', title, leftColumnX, yLeft);
      yLeft = drawLabelValue('Date of Joining: ', formatDateWithOrdinal(dateOfJoining), leftColumnX, yLeft);

      // Schools
      page.drawText('Schools: ', {
        x: leftColumnX,
        y: yLeft,
        size: this.fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      yLeft -= lineHeight;

      const schoolsList = parseSchools(schools);
      schoolsList.forEach((school) => {
        page.drawText(`• ${school}`, {
          x: leftColumnX + 15,
          y: yLeft,
          size: this.fontSize,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
        yLeft -= lineHeight;
      });

      yLeft -= lineHeight * 0.5;

      // SECTION 2: Bank Details
      yLeft = drawSectionHeader('BANK DETAILS', leftColumnX, yLeft, 120);

      yLeft = drawLabelValue('Bank Name: ', bankName || '-', leftColumnX, yLeft);
      yLeft = drawLabelValue('Account Title: ', accountTitle || '-', leftColumnX, yLeft);
      yLeft = drawLabelValue('Account No: ', accountNumber || '-', leftColumnX, yLeft);

      // ============================================
      // RIGHT COLUMN
      // ============================================
      let yRight = detailsStartY;

      // SECTION 3: Salary Period
      yRight = drawSectionHeader('SALARY PERIOD', rightColumnX, yRight, 130);

      yRight = drawLabelValue('From: ', formatDateWithOrdinal(fromDate), rightColumnX, yRight);
      yRight = drawLabelValue('Till: ', formatDateWithOrdinal(tillDate), rightColumnX, yRight);

      // No of Days
      const daysText = noOfDays === 31 ? `${noOfDays} (normalized)` : `${noOfDays}`;
      yRight = drawLabelValue('Working Days: ', daysText, rightColumnX, yRight);

      yRight -= lineHeight * 0.5;

      // SECTION 4: Payment Details
      yRight = drawSectionHeader('PAYMENT DETAILS', rightColumnX, yRight, 150);

      yRight = drawLabelValue('Basic Salary: ', formatCurrency(basicSalary), rightColumnX, yRight);
      yRight = drawLabelValue('Payment Date: ', formatDateWithOrdinal(paymentDate), rightColumnX, yRight);

      // ============================================
      // EARNINGS & DEDUCTIONS SECTION (Full Width)
      // ============================================
      let yPosition = Math.min(yLeft, yRight) - lineHeight * 1.5;

      // Draw horizontal separator (with space above)
      const separatorY = yPosition + lineHeight;
      page.drawLine({
        start: { x: this.margin, y: separatorY },
        end: { x: this.pageWidth - this.margin, y: separatorY },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });

      // SECTION 5: Earnings (Left side) - start below separator with space
      const earningsX = this.margin;
      const deductionsX = this.pageWidth / 2 + 20;
      let yEarnings = yPosition - lineHeight * 0.5;
      let yDeductions = yPosition - lineHeight * 0.5;

      yEarnings = drawSectionHeader('EARNINGS', earningsX, yEarnings, 100);

      earnings.forEach((earning) => {
        page.drawText(`${earning.category}:`, {
          x: earningsX,
          y: yEarnings,
          size: this.fontSize,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
        page.drawText(formatCurrency(earning.amount), {
          x: earningsX + 140,
          y: yEarnings,
          size: this.fontSize,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
        yEarnings -= lineHeight;
      });

      // Total Earnings
      yEarnings -= lineHeight * 0.3;
      page.drawLine({
        start: { x: earningsX, y: yEarnings + lineHeight * 0.5 },
        end: { x: earningsX + 200, y: yEarnings + lineHeight * 0.5 },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText('Total Earnings:', {
        x: earningsX,
        y: yEarnings,
        size: this.fontSize,
        font: fontBold,
        color: rgb(0, 0.5, 0),
      });
      page.drawText(formatCurrency(totalEarning), {
        x: earningsX + 140,
        y: yEarnings,
        size: this.fontSize,
        font: fontBold,
        color: rgb(0, 0.5, 0),
      });

      // SECTION 6: Deductions (Right side)
      yDeductions = drawSectionHeader('DEDUCTIONS', deductionsX, yDeductions, 120);

      if (deductions.length === 0) {
        page.drawText('None', {
          x: deductionsX,
          y: yDeductions,
          size: this.fontSize,
          font: fontRegular,
          color: rgb(0.5, 0.5, 0.5),
        });
        yDeductions -= lineHeight;
      } else {
        deductions.forEach((deduction) => {
          page.drawText(`${deduction.category}:`, {
            x: deductionsX,
            y: yDeductions,
            size: this.fontSize,
            font: fontRegular,
            color: rgb(0, 0, 0),
          });
          page.drawText(formatCurrency(deduction.amount), {
            x: deductionsX + 140,
            y: yDeductions,
            size: this.fontSize,
            font: fontRegular,
            color: rgb(0, 0, 0),
          });
          yDeductions -= lineHeight;
        });
      }

      // Total Deductions
      yDeductions -= lineHeight * 0.3;
      page.drawLine({
        start: { x: deductionsX, y: yDeductions + lineHeight * 0.5 },
        end: { x: deductionsX + 200, y: yDeductions + lineHeight * 0.5 },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText('Total Deductions:', {
        x: deductionsX,
        y: yDeductions,
        size: this.fontSize,
        font: fontBold,
        color: rgb(0.8, 0, 0),
      });
      page.drawText(formatCurrency(totalDeduction), {
        x: deductionsX + 140,
        y: yDeductions,
        size: this.fontSize,
        font: fontBold,
        color: rgb(0.8, 0, 0),
      });

      // ============================================
      // NET PAYABLE SECTION (Highlighted Box)
      // ============================================
      yPosition = Math.min(yEarnings, yDeductions) - lineHeight * 2;

      // Draw highlighted box for Net Payable
      const boxWidth = 250;
      const boxHeight = 35;
      const boxX = (this.pageWidth - boxWidth) / 2;
      const boxY = yPosition - 5;

      // Box background
      page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(0.95, 0.95, 1), // Light blue background
        borderColor: rgb(0, 0, 0.6),
        borderWidth: 1,
      });

      // Net Payable text (centered in box)
      const netPayText = `NET PAYABLE: ${formatCurrency(netPay)}`;
      const netPayWidth = fontBold.widthOfTextAtSize(netPayText, this.fontSize + 2);
      page.drawText(netPayText, {
        x: boxX + (boxWidth - netPayWidth) / 2,
        y: boxY + 12,
        size: this.fontSize + 2,
        font: fontBold,
        color: rgb(0, 0, 0.6),
      });

      // Footer
      const salaryFooterText = "This is a system generated salary slip and doesn't require signature.";
      const footerWidth = fontRegular.widthOfTextAtSize(salaryFooterText, 10);
      page.drawText(salaryFooterText, {
        x: (this.pageWidth - footerWidth) / 2,
        y: this.margin,
        size: 10,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating salary slip PDF:', error.message);
      toast.error(`Failed to generate salary slip: ${error.message}`);
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