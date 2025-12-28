// ============================================
// USE REPORT GENERATION - Hook for Student Report PDF Generation
// ============================================
// Location: src/hooks/useReportGeneration.js
//
// Extracts PDF generation logic from ReportsPage
// Handles single and bulk report generation with background images

import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { PDFDocument } from 'pdf-lib';
import { getAuthHeaders, API_URL } from '../api';

/**
 * Fetch array buffer from URL
 */
async function fetchArrayBuffer(url) {
  console.log(`Attempting to fetch: ${url}`);
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      console.error(`Fetch failed: ${url} returned status ${response.status}`);
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log(`Successfully fetched: ${url}, size: ${arrayBuffer.byteLength} bytes`);
    return arrayBuffer;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

/**
 * Validate image format (PNG or JPEG)
 */
async function validateImageFormat(arrayBuffer, url) {
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJpeg = firstBytes[0] === 0xff && firstBytes[1] === 0xd8;
  const isPng =
    firstBytes[0] === 0x89 &&
    firstBytes[1] === 0x50 &&
    firstBytes[2] === 0x4e &&
    firstBytes[3] === 0x47;
  if (!isJpeg && !isPng) {
    console.error(`Invalid image format for ${url}: First bytes: ${firstBytes}`);
    throw new Error(`Invalid image format for ${url}. Only PNG and JPEG are supported.`);
  }
  return isJpeg;
}

/**
 * Add background image to PDF
 */
async function addBackgroundToPDF(pdfBlob, backgroundImageUrl) {
  try {
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const originalPdf = await PDFDocument.load(pdfArrayBuffer);
    const imageArrayBuffer = await fetchArrayBuffer(backgroundImageUrl);

    if (!imageArrayBuffer) {
      console.warn('Background image fetch failed; proceeding without background');
      toast.warn('Unable to load background image; downloading PDF without background.');
      return pdfBlob;
    }

    const isJpeg = await validateImageFormat(imageArrayBuffer, backgroundImageUrl);
    const newPdf = await PDFDocument.create();
    const backgroundImage = isJpeg
      ? await newPdf.embedJpg(imageArrayBuffer)
      : await newPdf.embedPng(imageArrayBuffer);

    const originalPages = originalPdf.getPages();

    for (let i = 0; i < originalPages.length; i++) {
      const originalPage = originalPages[i];
      const { width, height } = originalPage.getSize();
      const newPage = newPdf.addPage([width, height]);
      newPage.drawImage(backgroundImage, { x: 0, y: 0, width, height });
      const embeddedPage = await newPdf.embedPage(originalPage);
      newPage.drawPage(embeddedPage, { x: 0, y: 0, width, height });
    }

    const newPdfBytes = await newPdf.save();
    return new Blob([newPdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error adding background to PDF:', error.message);
    toast.error('Failed to add background image to PDF; downloading without background.');
    return pdfBlob;
  }
}

/**
 * Format date to YYYY-MM-DD
 */
const formatToYYYYMMDD = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month) return '';
    return `${year}-${month.padStart(2, '0')}-${day || '01'.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error in formatToYYYYMMDD:', error.message);
    return '';
  }
};

/**
 * Get last day of month
 */
const getLastDayOfMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

/**
 * useReportGeneration Hook
 * @param {Object} options
 * @param {Array} options.students - List of students
 * @param {string} options.selectedSchool - Selected school ID
 * @param {string} options.selectedClass - Selected class
 * @param {string} options.mode - 'month' or 'range'
 * @param {string} options.selectedMonth - Selected month (YYYY-MM)
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {Object} options.includeBackground - Object mapping studentId to boolean
 * @param {Object} options.selectedImages - Object mapping studentId to selected images array
 * @param {string} options.backgroundImageUrl - URL of background image (default: '/bg.png')
 */
export const useReportGeneration = ({
  students = [],
  selectedSchool,
  selectedClass,
  mode,
  selectedMonth,
  startDate,
  endDate,
  includeBackground = {},
  selectedImages = {},
  backgroundImageUrl = '/bg.png',
}) => {
  const [isGenerating, setIsGenerating] = useState({});
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [error, setError] = useState(null);
  // ✅ ADD THESE LINES:
  // Cleanup ref
  const isMounted = useRef(true);

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Get formatted date range based on mode
   */
  const getDateRange = useCallback(() => {
    if (mode === 'month') {
      const formattedStart = formatToYYYYMMDD(`${selectedMonth}-01`);
      const lastDay = getLastDayOfMonth(selectedMonth);
      const formattedEnd = formatToYYYYMMDD(`${selectedMonth}-${lastDay}`);
      return { formattedStart, formattedEnd };
    } else {
      return {
        formattedStart: formatToYYYYMMDD(startDate),
        formattedEnd: formatToYYYYMMDD(endDate),
      };
    }
  }, [mode, selectedMonth, startDate, endDate]);

  /**
   * Generate single PDF report
   */
  const generateReport = useCallback(
    async (studentId) => {
      if (!isMounted.current) return false;

      setError(null);
      setIsGenerating((prev) => ({ ...prev, [studentId]: true }));

      try {
        const headers = getAuthHeaders();
        const { formattedStart, formattedEnd } = getDateRange();

        // Fetch all required data in parallel
        const [studentRes, attendanceRes, lessonsRes] = await Promise.all([
          axios.get(`${API_URL}/api/student-details/?student_id=${studentId}`, { headers }),
          axios.get(
            `${API_URL}/api/attendance/count/?student_id=${studentId}&start_date=${formattedStart}&end_date=${formattedEnd}`,
            { headers }
          ),
          axios.get(
            `${API_URL}/api/lessons/achieved/?student_id=${studentId}&start_date=${formattedStart}&end_date=${formattedEnd}`,
            { headers }
          ),
        ]);
        if (!isMounted.current) return false;

        const studentData = studentRes.data;
        const attendanceData = attendanceRes.data;
        const lessonsData = lessonsRes.data;
        const selectedImg = selectedImages[studentId] || [];

        if (!studentData || !attendanceData || !lessonsData) {
          throw new Error('Report data is incomplete. Please wait or fix errors.');
        }

        // Prepare payload
        const payload = {
          studentData: {
            student_id: studentId,
            school_id: selectedSchool,
            student_class: selectedClass,
            name: studentData.name,
            reg_num: studentData.reg_num,
            school: studentData.school,
            class: studentData.class,
          },
          attendanceData: {
            present_days: attendanceData.present_days || 0,
            total_days: attendanceData.total_days || 0,
          },
          lessonsData: { lessons: lessonsData.lessons || [] },
          selectedImages: selectedImg,
          mode: mode,
          month: selectedMonth,
          start_date: mode === 'range' ? formattedStart : undefined,
          end_date: mode === 'range' ? formattedEnd : undefined,
        };

        // Generate PDF
        const response = await axios.post(`${API_URL}/api/generate-pdf/`, payload, {
          headers: { ...headers, 'Content-Type': 'application/json' },
          responseType: 'blob',
        });
        if (!isMounted.current) return false;

        let finalBlob = response.data;

        if (!(finalBlob instanceof Blob)) {
          throw new Error('Invalid PDF response: Not a blob');
        }
        console.log(`Received blob size: ${finalBlob.size} bytes`);

        // Add background if enabled
        if (includeBackground[studentId]) {
          finalBlob = await addBackgroundToPDF(response.data, backgroundImageUrl);
          console.log(`Blob size after adding background: ${finalBlob.size} bytes`);
          if (!isMounted.current) return false;

        }

        // Create download link
        const url = window.URL.createObjectURL(finalBlob);
        console.log(`Generated URL for download: ${url}`);

        const link = document.createElement('a');
        const student = students.find((s) => s.id === studentId);
        const studentName = student ? student.name.replace(/\s+/g, '_') : 'Unknown';

        let month, year;
        if (mode === 'month') {
          const [yearStr] = selectedMonth.split('-');
          year = yearStr;
          month = new Date(`${selectedMonth}-01`).toLocaleString('default', { month: 'long' });
        } else {
          const date = new Date(startDate);
          year = date.getFullYear();
          month = date.toLocaleString('default', { month: 'long' });
        }

        const filename = `${studentName}_${month}_${year}_Report.pdf`;
        link.setAttribute('download', filename);
        link.href = url;

        try {
          document.body.appendChild(link);
          console.log('Attempting to trigger download...');
          link.click();
          console.log('Download triggered successfully');
          if (isMounted.current) {
            toast.success(`Report generated for ${student?.name || 'student'}!`);
          }
        } catch (downloadError) {
          console.error('Error triggering download:', downloadError);
          throw new Error('Failed to initiate download. Please check browser settings.');
        } finally {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }

        return true;
      } catch (error) {
        if (!isMounted.current) return false;

        console.error('Error generating report:', error.message);
        const errorMsg =
          error.response?.status === 400
            ? 'Invalid request parameters.'
            : error.response?.status === 403
            ? 'You do not have permission to generate this report.'
            : error.response?.status === 404
            ? 'Student data not found. Please check your selection.'
            : error.message || 'Failed to generate report. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      } finally {
        if (isMounted.current) {

        setIsGenerating((prev) => ({ ...prev, [studentId]: false }));
      }}
    },
    [
      students,
      selectedSchool,
      selectedClass,
      mode,
      selectedMonth,
      startDate,
      endDate,
      includeBackground,
      selectedImages,
      backgroundImageUrl,
      getDateRange,
    ]
  );

  /**
   * Generate bulk PDF reports for selected students
   */
  const generateBulkReports = useCallback(
  async (selectedStudentIds) => {
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student.');
      toast.warning('Please select at least one student.');
      return false;
    }

    // ✅ CHECK 1: Don't start if unmounted
    if (!isMounted.current) return false;

    setError(null);
    setIsGeneratingBulk(true);

    try {
      let successCount = 0;
      for (const studentId of selectedStudentIds) {
        // ✅ CHECK 2: Stop bulk generation if unmounted
        if (!isMounted.current) return false;
        
        const success = await generateReport(studentId);
        if (success) successCount++;
      }

      // ✅ CHECK 3: Only show success if mounted
      if (!isMounted.current) return false;

      if (successCount === selectedStudentIds.length) {
        toast.success('All reports generated successfully!');
      } else {
        toast.warning(`Generated ${successCount} of ${selectedStudentIds.length} reports.`);
      }

      return true;
    } catch (error) {
      // ✅ CHECK 4: Don't show errors if unmounted
      if (!isMounted.current) return false;
      
      console.error('Error generating bulk reports:', error.message);
      const errorMsg =
        error.response?.status === 400
          ? 'Invalid request parameters.'
          : error.response?.status === 403
          ? 'You do not have permission to generate these reports.'
          : error.response?.status === 500
          ? 'Server error occurred while generating reports.'
          : 'Failed to generate bulk reports. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      // ✅ CHECK 5: Only clear loading if mounted
      if (isMounted.current) {
        setIsGeneratingBulk(false);
      }
    }
  },
  [generateReport]
);

  return {
    generateReport,
    generateBulkReports,
    isGenerating,
    isGeneratingBulk,
    error,
    setError,
  };
};

export default useReportGeneration;