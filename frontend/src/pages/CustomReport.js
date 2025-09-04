import React, { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "react-toastify";

// Fetch array buffer for background image with timeout
async function fetchArrayBuffer(url) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000); // 5s timeout
    const response = await fetch(url, { mode: "cors", signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

// Validate image format (PNG or JPEG)
async function validateImageFormat(arrayBuffer) {
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJpeg = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
  const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
  if (!isJpeg && !isPng) throw new Error("Invalid image format. Only PNG and JPEG supported.");
  return isJpeg;
}

// Function to parse text into styled runs
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

// Function to draw wrapped text with styles, handling multipage
async function drawWrappedText(pdfDoc, page, xStart, yStart, runs, options) {
  let currentPage = page;
  let currentX = xStart;
  let currentY = yStart;
  const { maxWidth, fontSize, lineHeight, color, pageWidth, pageHeight, margin, footerSpace, fontRegular, drawBackground, drawFooter, bodyTopMargin } = options;

  for (const run of runs) {
    const words = run.text.split(/(\s+)/).filter(word => word); // Split by spaces, keep spaces as separate
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
          currentY = pageHeight - bodyTopMargin; // Use bodyTopMargin from options
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

      // If strikethrough, draw line over the text
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

  // Return the updated y position for the next content and the current page
  return { newY: currentY - lineHeight, newPage: currentPage };
}

// Generate PDF with multipage support, wrapping, bold/italic/strike/mono/numbering/bullets, header on first, footer on all
async function generatePDFWithBackground(to, subject, bodyText, lineSpacing) {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]); // A4 size
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const margin = 50;
    const topSpace = 144; // 2 inches
    const bodyTopMargin = topSpace + 60; // Define bodyTopMargin for consistent top padding
    const fontSize = 12;
    let lineHeight = fontSize + 5; // Default single
    if (lineSpacing === '1.5') lineHeight = fontSize + 8;
    if (lineSpacing === 'double') lineHeight = fontSize + 12;
    const footerSpace = 50;
    const listIndent = 30; // Fixed indent for list text

    // Embed fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Draw background function
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
        currentPage.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(1, 1, 1) }); // White fallback
      }
    };

    // Draw footer function
    const drawFooterFunc = (currentPage, fr, pw, m) => {
      const footerText = "This is a system generated report and doesn’t require signature.";
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
    await drawBackgroundFunc(page, pageWidth, pageHeight);

    // Compact headers on top-right (first page only)
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

    // "To" and "Subject" fields (first page only)
    page.drawText(`To: ${to}`, {
      x: margin,
      y: pageHeight - topSpace - 20,
      size: 12,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });
    const subjectLabel = "Subject: ";
    const subjectLabelWidth = fontBold.widthOfTextAtSize(subjectLabel, 12);
    page.drawText(subjectLabel, {
      x: margin,
      y: pageHeight - topSpace - 40,
      size: 12,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    page.drawText(subject, {
      x: margin + subjectLabelWidth,
      y: pageHeight - topSpace - 40,
      size: 12,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });

    // Start body position
    let yPosition = pageHeight - bodyTopMargin;

    // Body text with formatting, wrapping, and multipage, handling empty lines
    const lines = bodyText.split("\n");
    for (const line of lines) {
      if (yPosition < margin + footerSpace) {
        drawFooterFunc(page, fontRegular, pageWidth, margin);
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        await drawBackgroundFunc(page, pageWidth, pageHeight);
        yPosition = pageHeight - bodyTopMargin; // Use bodyTopMargin for new pages
      }

      if (line.trim() === '') {
        yPosition -= lineHeight;
        continue;
      }

      let isListItem = false;
      let number = null;
      let bullet = false;
      let itemText = line.trim();
      const numMatch = line.match(/^\s*(\d+)\.\s+(.*)$/); // Updated regex
      const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/); // Updated regex
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
          const numberWidth = fontRegular.widthOfTextAtSize(numberText, fontSize);
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
            bodyTopMargin, // Add bodyTopMargin to options
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
            bodyTopMargin, // Add bodyTopMargin to options
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
          bodyTopMargin, // Add bodyTopMargin to options
        });
        yPosition = drawResult.newY;
        page = drawResult.newPage;
      }
    }

    // Regards with space, bold "Regards,", and "Koder Kids" on next line
    if (yPosition < margin + footerSpace + lineHeight * 2) {
      drawFooterFunc(page, fontRegular, pageWidth, margin);
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      await drawBackgroundFunc(page, pageWidth, pageHeight);
      yPosition = pageHeight - bodyTopMargin; // Use bodyTopMargin for new pages
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

    // Draw footer on the last page
    drawFooterFunc(page, fontRegular, pageWidth, margin);

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: "application/pdf" });
  } catch (error) {
    console.error("Error generating PDF:", error.message);
    toast.error(`Failed to generate report: ${error.message}`);
    throw error;
  }
}

// Simple function to parse bodyText to HTML for preview
function parseToHTML(bodyText) {
  let html = '';
  const lines = bodyText.split('\n');
  let inUL = false;
  let inOL = false;

  for (let line of lines) {
    if (line.trim() === '') {
      html += '<br/>'; // Add break for empty line in preview
      continue;
    }

    let parsedLine = line
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~([^~]+)~/g, '<s>$1</s>')
      .replace(/```([^`]+)```/g, '<code>$1</code>');

    const numMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);

    if (numMatch) {
      if (!inOL) {
        if (inUL) html += '</ul>';
        html += '<ol class="list-decimal ml-8">';
        inOL = true;
        inUL = false;
      }
      const item = numMatch[2]
        .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/~([^~]+)~/g, '<s>$1</s>')
        .replace(/```([^`]+)```/g, '<code>$1</code>');
      html += `<li>${item}</li>`;
    } else if (bulletMatch) {
      if (!inUL) {
        if (inOL) html += '</ol>';
        html += '<ul class="list-disc ml-8">';
        inUL = true;
        inOL = false;
      }
      const item = bulletMatch[1]
        .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/~([^~]+)~/g, '<s>$1</s>')
        .replace(/```([^`]+)```/g, '<code>$1</code>');
      html += `<li>${item}</li>`;
    } else {
      if (inUL) {
        html += '</ul>';
        inUL = false;
      }
      if (inOL) {
        html += '</ol>';
        inOL = false;
      }
      html += `<p class="mb-4">${parsedLine}</p>`; // Increased margin for preview spacing
    }
  }

  if (inUL) html += '</ul>';
  if (inOL) html += '</ol>';

  return html;
}

const CustomReport = () => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [lineSpacing, setLineSpacing] = useState("single"); // New state for line spacing
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const textareaRef = useRef(null);
  const [textAreaHeight, setTextAreaHeight] = useState(256); // Initial height in pixels (h-64)

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

    // Adjust cursor position
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
      setErrorMessage("Please enter To, Subject, and Body text.");
      toast.warning("All fields are required.");
      return;
    }
    if (to.length > 100 || subject.length > 100) {
      setErrorMessage("To and Subject must be under 100 characters.");
      toast.warning("Input too long.");
      return;
    }

    setErrorMessage("");
    setIsGenerating(true);

    try {
      const pdfBlob = await generatePDFWithBackground(to, subject, bodyText, lineSpacing);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Custom_Report_${subject.replace(/\s+/g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Report generated successfully!");
    } catch (error) {
      setErrorMessage(`Failed to generate report: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-700 mb-6">📝 Custom Report</h2>

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{errorMessage}</div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col">
          <label className="font-bold mb-1 text-gray-700" htmlFor="to">
            To:
          </label>
          <input
            id="to"
            type="text"
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Enter recipient (e.g., Mr. Babar)"
            maxLength={100}
            aria-required="true"
          />
        </div>

        <div className="flex flex-col">
          <label className="font-bold mb-1 text-gray-700" htmlFor="subject">
            Subject:
          </label>
          <input
            id="subject"
            type="text"
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter report subject"
            maxLength={100}
            aria-required="true"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="bodyText">
              Body Text (use *bold* for bold, _italic_ for italic, ~strike~ for strikethrough, ```mono
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2 bg-white p-2 rounded-t-lg border border-b-0">
              <button
                onClick={() => formatText("bold")}
                className="px-2 py-1 hover:bg-gray-100 rounded"
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => formatText("italic")}
                className="px-2 py-1 hover:bg-gray-100 rounded"
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                onClick={() => formatText("strike")}
                className="px-2 py-1 hover:bg-gray-100 rounded"
                title="Strikethrough"
              >
                <s>S</s>
              </button>
              <button
                onClick={() => formatText("mono")}
                className="px-2 py-1 hover:bg-gray-100 rounded"
                title="Monospace"
              >
                <code>M</code>
              </button>
              <button
                onClick={() => formatText("bullet")}
                className="px-2 py-1 hover:bg-gray-100 rounded"
                title="Bulleted List"
              >
                •
              </button>
              <button
                onClick={() => formatText("number")}
                className="px-2 py-1 hover:bg-gray-100 rounded"
                title="Numbered List"
              >
                1.
              </button>
              <button
                onClick={() => formatText("newline")}
                className="px-2 py-1 hover:bg-gray-100 rounded"
                title="New Line"
              >
                ↵
              </button>
              <button
                onClick={() => formatText("emptyline")}
                className="px-2 py-1 hover:bg-gray-100 rounded"
                title="Empty Line"
              >
                ⏎
              </button>
              <select
                value={lineSpacing}
                onChange={(e) => setLineSpacing(e.target.value)}
                className="px-2 py-1 border rounded hover:bg-gray-100"
                title="Line Spacing"
              >
                <option value="single">Single</option>
                <option value="1.5">1.5</option>
                <option value="double">Double</option>
              </select>
              <label className="font-bold text-gray-700 mr-2" htmlFor="heightSlider">
                Height:
              </label>
              <input
                id="heightSlider"
                type="range"
                min="100"
                max="600"
                value={textAreaHeight}
                onChange={(e) => setTextAreaHeight(parseInt(e.target.value))}
                className="w-24"
                title="Adjust Text Area Height"
              />
              <span className="text-gray-700 ml-2">{textAreaHeight}px</span>
            </div>
            <textarea
              id="bodyText"
              ref={textareaRef}
              className="p-4 border rounded-b-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Enter report content (e.g., *bold text*, _italic text_, ~strikethrough~, ```monospace```, new lines with Enter, - bulleted item, 1. numbered item)"
              aria-required="true"
              style={{ height: `${textAreaHeight}px` }} // Dynamic height
            />
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="font-bold mb-1 text-gray-700">Preview:</h3>
            <div
              className="p-4 bg-white border rounded-lg overflow-y-auto font-sans text-sm leading-relaxed"
              style={{ height: `${textAreaHeight}px` }} // Match body text height
            >
              <div dangerouslySetInnerHTML={{ __html: parseToHTML(bodyText) }} />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerateReport}
        className={`bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 ${
          isGenerating ? "opacity-75 cursor-not-allowed" : "hover:bg-blue-600"
        }`}
        disabled={isGenerating}
        aria-label={isGenerating ? "Generating report" : "Generate report"}
      >
        {isGenerating ? (
          <>
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </>
        ) : (
          <>📄 Generate Report</>
        )}
      </button>
    </div>
  );
};

export default CustomReport;