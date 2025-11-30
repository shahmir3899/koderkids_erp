// ============================================
// USE EXPORT LESSONS - Export Hook for Lesson Plans
// ============================================
// Location: src/hooks/useExportLessons.js

import { useCallback } from 'react';
import { toast } from 'react-toastify';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';

/**
 * useExportLessons Hook - Handles image, PDF, and print exports for lesson plans
 * @param {Object} options
 * @param {string} options.exportElementId - ID of the element to export (default: 'lessonTableExport')
 * @param {string} options.schoolName - School name for filename
 * @param {string} options.className - Class name for filename
 * @param {string} options.dateRange - Date range string for filename
 * @returns {Object} Export handlers and loading state
 */
export const useExportLessons = ({
  exportElementId = 'lessonTableExport',
  schoolName = '',
  className = '',
  dateRange = '',
} = {}) => {
  
  /**
   * Generates a sanitized filename
   */
  const generateFilename = useCallback((extension) => {
    const sanitizedSchool = schoolName.replace(/[^a-zA-Z0-9]/g, '_') || 'School';
    const sanitizedClass = className.replace(/[^a-zA-Z0-9]/g, '_') || 'Class';
    const sanitizedDate = dateRange.replace(/[^a-zA-Z0-9]/g, '_') || 'DateRange';
    return `LessonPlan_${sanitizedSchool}_${sanitizedClass}_${sanitizedDate}.${extension}`;
  }, [schoolName, className, dateRange]);

  /**
   * Prepares the export element for rendering
   */
  const prepareElementForExport = useCallback((element) => {
    element.style.position = 'relative';
    element.style.left = '0px';
    element.style.opacity = '1';
    element.style.visibility = 'visible';
  }, []);

  /**
   * Resets the export element after rendering
   */
  const resetElementAfterExport = useCallback((element) => {
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.opacity = '0';
    element.style.visibility = 'hidden';
  }, []);

  /**
   * Download as Image (PNG)
   */
  const handleDownloadImage = useCallback(() => {
    setTimeout(() => {
      const element = document.getElementById(exportElementId);
      if (!element) {
        toast.error('Export element not found.');
        return;
      }

      toast.info('Generating image, please wait...');
      prepareElementForExport(element);

      html2canvas(element, {
        scale: 2,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(exportElementId);
          if (clonedElement) {
            clonedElement.style.display = 'block';
          }
        },
      })
        .then((canvas) => {
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = generateFilename('png');
          link.click();
          toast.success('Image downloaded successfully!');
          resetElementAfterExport(element);
        })
        .catch((error) => {
          console.error('Error generating image:', error);
          toast.error('Failed to generate image.');
          resetElementAfterExport(element);
        });
    }, 500);
  }, [exportElementId, generateFilename, prepareElementForExport, resetElementAfterExport]);

  /**
   * Download as PDF
   */
  const handleDownloadPdf = useCallback(() => {
    setTimeout(() => {
      const element = document.getElementById(exportElementId);
      if (!element) {
        toast.error('Export element not found.');
        return;
      }

      toast.info('Generating PDF, please wait...');
      prepareElementForExport(element);

      const options = {
        margin: [15, 10, 15, 10],
        filename: generateFilename('pdf'),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById(exportElementId);
            if (clonedElement) {
              clonedElement.style.display = 'block';
            }
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' },
      };

      html2pdf()
        .set(options)
        .from(element)
        .save()
        .then(() => {
          toast.success('PDF downloaded successfully!');
          resetElementAfterExport(element);
        })
        .catch((error) => {
          console.error('Error generating PDF:', error);
          toast.error('Failed to generate PDF.');
          resetElementAfterExport(element);
        });
    }, 500);
  }, [exportElementId, generateFilename, prepareElementForExport, resetElementAfterExport]);

  /**
   * Print the lesson plan
   */
  const handlePrint = useCallback(() => {
    setTimeout(() => {
      const element = document.getElementById(exportElementId);
      if (!element) {
        toast.error('Export element not found.');
        return;
      }

      const printContent = element.outerHTML;
      const printWindow = window.open('', '_blank');

      printWindow.document.write(`
        <html>
          <head>
            <title>Lesson Plan - ${schoolName} - ${className}</title>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 20mm;
                text-align: center;
              }
              .export-container {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
              }
              .logo {
                width: 120px;
                margin-right: 20px;
              }
              .header-text {
                text-align: left;
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                color: #333;
              }
              .subtitle {
                font-size: 16px;
                color: #666;
                margin-top: 5px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 14px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #f4f4f4;
                font-weight: bold;
                color: #333;
              }
              tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              tr:hover {
                background-color: #f1f1f1;
              }
              @media print {
                body { margin: 10mm; }
              }
            </style>
          </head>
          <body>
            <div class="export-container">
              ${printContent}
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    }, 500);
  }, [exportElementId, schoolName, className]);

  return {
    handleDownloadImage,
    handleDownloadPdf,
    handlePrint,
  };
};

export default useExportLessons;