import React, { useEffect, useState } from "react";
import axios from "axios";
import { getAuthHeaders, getSchools, getClasses, API_URL } from "../api";
import { toast } from 'react-toastify';
import { PDFDocument } from 'pdf-lib';

// Date utility functions (unchanged)
const isValidMonth = (monthStr) => {
  if (!monthStr) return false;
  return /^\d{4}-\d{2}$/.test(monthStr) && new Date(`${monthStr}-01`).getFullYear() >= 2000;
};

const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};

const formatToMMDDYYYY = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-");
    if (!year || !month) return "";
    return `${month.padStart(2, "0")}/01/${year}`;
  } catch (error) {
    console.error("Error in formatToMMDDYYYY:", error.message);
    return "";
  }
};

const formatToYYYYMMDD = (dateStr) => {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-");
    if (!year || !month) return "";
    return `${year}-${month.padStart(2, "0")}-${day || "01".padStart(2, "0")}`;
  } catch (error) {
    console.error("Error in formatToYYYYMMDD:", error.message);
    return "";
  }
};

// PDF background functions (unchanged)
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

async function validateImageFormat(arrayBuffer, url) {
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJpeg = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
  const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
  if (!isJpeg && !isPng) {
    console.error(`Invalid image format for ${url}: First bytes: ${firstBytes}`);
    throw new Error(`Invalid image format for ${url}. Only PNG and JPEG are supported.`);
  }
  return isJpeg;
}

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
    let backgroundImage = isJpeg ? await newPdf.embedJpg(imageArrayBuffer) : await newPdf.embedPng(imageArrayBuffer);
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

const ReportsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mode, setMode] = useState("month");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState({});
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [includeBackground, setIncludeBackground] = useState({});
  const [textColor, setTextColor] = useState('#333333');
  const [headerColor, setHeaderColor] = useState('#4a90e2');
  const [rowColor, setRowColor] = useState('#f0f8ff');
  const [previewStudentId, setPreviewStudentId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [imageRotations, setImageRotations] = useState({});

  useEffect(() => {
    const fetchSchoolList = async () => {
      try {
        const schoolData = await getSchools();
        setSchools(schoolData);
      } catch (error) {
        console.error("Error loading schools:", error);
        setErrorMessage("Failed to load schools. Please try again.");
      }
    };
    fetchSchoolList();
  }, []);

  useEffect(() => {
    const fetchClassList = async () => {
      if (!selectedSchool) {
        setClasses([]);
        return;
      }
      try {
        const classData = await getClasses(selectedSchool);
        setClasses(classData);
      } catch (error) {
        console.error("Error loading classes:", error);
        setErrorMessage("Failed to load classes. Please try again.");
      }
    };
    fetchClassList();
  }, [selectedSchool]);

  useEffect(() => {
    if (students.length > 0) {
      const initialToggleState = students.reduce((acc, student) => {
        acc[student.id] = true;
        return acc;
      }, {});
      setIncludeBackground(initialToggleState);
    }
  }, [students]);

  const fetchStudents = async () => {
    setErrorMessage("");
    setIsSearching(true);
    setStudents([]);
    setSelectedStudentIds([]);

    if (mode === "month") {
      if (!selectedMonth || !isValidMonth(selectedMonth)) {
        setErrorMessage("Please select a valid month (YYYY-MM).");
        setIsSearching(false);
        return;
      }
      if (!selectedSchool || !selectedClass) {
        setErrorMessage("Please select a school and class.");
        setIsSearching(false);
        return;
      }
    }

    if (mode === "range") {
      if (!startDate || !endDate || !isValidDate(startDate) || !isValidDate(endDate)) {
        setErrorMessage("Please select valid start and end dates.");
        setIsSearching(false);
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setErrorMessage("End date must be after start date.");
        setIsSearching(false);
        return;
      }
      const currentDate = new Date("2025-05-27");
      if (new Date(startDate) > currentDate || new Date(endDate) > currentDate) {
        setErrorMessage("Dates cannot be in the future (beyond May 27, 2025).");
        setIsSearching(false);
        return;
      }
      if (!selectedSchool || !selectedClass) {
        setErrorMessage("Please select a school and class.");
        setIsSearching(false);
        return;
      }
    }

    try {
      const sessionDate = mode === "month"
        ? formatToMMDDYYYY(`${selectedMonth}-01`)
        : formatToMMDDYYYY(startDate);
      const formattedStartDate = mode === "month"
        ? formatToYYYYMMDD(`${selectedMonth}-01`)
        : formatToYYYYMMDD(startDate);
      const formattedEndDate = mode === "month"
        ? formatToYYYYMMDD(`${selectedMonth}-${new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]), 0).getDate()}`)
        : formatToYYYYMMDD(endDate);

      if (!sessionDate || !formattedStartDate || !formattedEndDate) {
        setErrorMessage("Invalid date format. Please ensure dates are correctly formatted.");
        setIsSearching(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/students-prog/`, {
        headers: getAuthHeaders(),
        params: {
          school_id: selectedSchool,
          class_id: selectedClass,
          session_date: sessionDate,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        },
      });

      const studentList = Array.isArray(response.data?.students) ? response.data.students : Array.isArray(response.data) ? response.data : [];
      if (studentList.length === 0) {
        setErrorMessage("No students found for the selected criteria.");
      }
      setStudents(studentList);
    } catch (error) {
      console.error("Error fetching students:", error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || "Failed to fetch students. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(student => student.id));
    }
  };

  const handleGenerateReport = async (studentId, imageIds = [], imageRotations = []) => {
    setErrorMessage("");
    setIsGenerating(prev => ({ ...prev, [studentId]: true }));

    try {
      const params = {
        student_id: studentId,
        mode,
        school_id: selectedSchool,
        student_class: selectedClass,
        text_color: textColor,
        header_color: headerColor,
        row_color: rowColor,
        image_ids: imageIds.join(','), // Send selected image IDs
        image_rotations: imageRotations.join(','), // Send rotations
      };

      if (mode === "month") {
        params.month = selectedMonth;
      } else {
        params.start_date = formatToYYYYMMDD(startDate);
        params.end_date = formatToYYYYMMDD(endDate);
      }

      const response = await axios.get(`${API_URL}/api/generate-pdf/`, {
        headers: getAuthHeaders(),
        params,
        responseType: 'blob',
      });

      let finalBlob = response.data;

      if (includeBackground[studentId]) {
        const backgroundImageUrl = '/bg.png';
        finalBlob = await addBackgroundToPDF(response.data, backgroundImageUrl);
      }

      const url = window.URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      const period = mode === "month"
        ? selectedMonth.replace('-', '_')
        : `${formatToYYYYMMDD(startDate).replace(/-/g, '')}_to_${formatToYYYYMMDD(endDate).replace(/-/g, '')}`;
      link.href = url;
      link.setAttribute('download', `student_report_${studentId}_${period}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error.response?.status, error.response?.data || error.message);
      const errorMsg = error.response?.status === 400
        ? "Invalid request parameters."
        : error.response?.status === 403
        ? "You do not have permission to generate this report."
        : "Failed to generate report. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleGenerateBulkReports = async () => {
    if (selectedStudentIds.length === 0) {
      setErrorMessage("Please select at least one student.");
      toast.warning("Please select at least one student.");
      return;
    }

    setErrorMessage("");
    setIsGeneratingBulk(true);

    try {
      for (const studentId of selectedStudentIds) {
        await handleGenerateReport(studentId);
      }

      toast.success("All reports generated successfully!");
    } catch (error) {
      console.error("Error generating bulk reports:", error.response?.status, error.response?.data || error.message);
      const errorMsg = error.response?.status === 400
        ? "Invalid request parameters."
        : error.response?.status === 403
        ? "You do not have permission to generate these reports."
        : error.response?.status === 500
        ? "Server error occurred while generating reports."
        : "Failed to generate bulk reports. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const handlePreview = async (studentId) => {
    setErrorMessage("");
    try {
      const params = {
        student_id: studentId,
        mode,
        school_id: selectedSchool,
        student_class: selectedClass,
      };

      if (mode === "month") {
        params.month = selectedMonth;
      } else {
        params.start_date = formatToYYYYMMDD(startDate);
        params.end_date = formatToYYYYMMDD(endDate);
      }

      const response = await axios.get(`${API_URL}/api/student-report-data/`, {
        headers: getAuthHeaders(),
        params,
      });

      setPreviewData(response.data.data);
      setImageRotations(response.data.data.images.reduce((acc, img) => ({ ...acc, [img]: 0 }), {}));
      setPreviewStudentId(studentId);
    } catch (error) {
      console.error("Error fetching preview data:", error);
      toast.error("Failed to load preview data.");
    }
  };

  const rotateImage = (imageUrl, direction) => {
    setImageRotations(prev => ({
      ...prev,
      [imageUrl]: (prev[imageUrl] + (direction === 'left' ? -90 : 90)) % 360
    }));
  };

  const generateReportFromPreview = () => {
    if (!previewStudentId || !previewData) return;
    const imageIds = previewData.images.map(url => url.split('/').pop());
    const imageRotations = previewData.images.map(url => imageRotations[url] || 0);
    handleGenerateReport(previewStudentId, imageIds, imageRotations);
    setPreviewStudentId(null);
    setPreviewData(null);
    setImageRotations({});
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <style>
        {`
          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
          }
          .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #fff;
            border: 1px solid #ccc;
            transition: 0.4s;
            border-radius: 20px;
          }
          .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: #ccc;
            transition: 0.4s;
            border-radius: 50%;
          }
          input:checked + .slider {
            background-color: #2196F3;
          }
          input:checked + .slider:before {
            transform: translateX(20px);
            background-color: #fff;
          }
          .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }
          .modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 794px; /* A4 width at 96dpi */
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          .modal-content img {
            width: 320px;
            height: 200px;
            object-fit: cover;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          .image-grid {
            display: grid;
            grid-template-columns: repeat(2, 320px);
            gap: 20px;
            margin-bottom: 20px;
          }
          .image-container {
            position: relative;
            text-align: center;
          }
          .rotate-buttons {
            margin-top: 10px;
            display: flex;
            justify-content: center;
            gap: 10px;
          }
        `}
      </style>
      <h2 className="text-2xl font-bold text-gray-700 mb-6">📊 Monthly Reports</h2>

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg" role="alert" aria-live="assertive">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-4 items-center mb-4">
        <label className="flex items-center">
          <input
            type="radio"
            value="month"
            checked={mode === "month"}
            onChange={() => setMode("month")}
            className="mr-2"
            aria-label="Select month mode"
          />
          <span className="text-gray-700">Month</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="range"
            checked={mode === "range"}
            onChange={() => setMode("range")}
            className="mr-2"
            aria-label="Select date range mode"
          />
          <span className="text-gray-700">Date Range</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col min-w-[200px]">
          <label className="font-bold mb-1 text-gray-700">Month:</label>
          <input
            type="month"
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:opacity-50"
            value={selectedMonth}
            disabled={mode === "range"}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Select month"
          />
        </div>
        <div className="flex flex-col min-w-[200px]">
          <label className="font-bold mb-1 text-gray-700">Start Date:</label>
          <input
            type="date"
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:opacity-50"
            value={startDate}
            disabled={mode === "month"}
            onChange={(e) => setStartDate(e.target.value)}
            max="2025-05-27"
            aria-label="Select start date"
          />
        </div>
        <div className="flex flex-col min-w-[200px]">
          <label className="font-bold mb-1 text-gray-700">End Date:</label>
          <input
            type="date"
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:opacity-50"
            value={endDate}
            disabled={mode === "month"}
            onChange={(e) => setEndDate(e.target.value)}
            max="2025-05-27"
            aria-label="Select end date"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col min-w-[200px]">
          <label className="font-bold mb-1 text-gray-700">Text Color:</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="p-1 border rounded-lg"
          />
        </div>
        <div className="flex flex-col min-w-[200px]">
          <label className="font-bold mb-1 text-gray-700">Header Color:</label>
          <input
            type="color"
            value={headerColor}
            onChange={(e) => setHeaderColor(e.target.value)}
            className="p-1 border rounded-lg"
          />
        </div>
        <div className="flex flex-col min-w-[200px]">
          <label className="font-bold mb-1 text-gray-700">Row Color:</label>
          <input
            type="color"
            value={rowColor}
            onChange={(e) => setRowColor(e.target.value)}
            className="p-1 border rounded-lg"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="font-bold mb-1 text-gray-700">School:</label>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            aria-label="Select school"
          >
            <option value="">-- Select School --</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="font-bold mb-1 text-gray-700">Class:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={!selectedSchool}
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:opacity-50"
            aria-label="Select class"
          >
            <option value="">-- Select Class --</option>
            {classes.map((className, index) => (
              <option key={index} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-[200px]">
          <button
            onClick={fetchStudents}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-7 ${
              isSearching ? "opacity-75 cursor-not-allowed" : "hover:bg-blue-600"
            }`}
            disabled={isSearching}
            aria-label={isSearching ? "Searching students" : "Search students"}
          >
            {isSearching ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Searching...
              </>
            ) : (
              <>🔍 Search</>
            )}
          </button>
        </div>
      </div>

      {previewStudentId && previewData && (
        <div className="modal">
          <div className="modal-content" style={{ backgroundImage: `url('/bg.png')`, backgroundSize: 'cover' }}>
            <button
              onClick={() => {
                setPreviewStudentId(null);
                setPreviewData(null);
                setImageRotations({});
              }}
              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded"
            >
              Close
            </button>
            <h1 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '20px', color: textColor }}>
              {previewData.student.school}
            </h1>
            <h2 style={{ fontSize: '24px', margin: '20px 0 10px', borderBottom: '1px solid #ccc', color: textColor }}>
              Monthly Student Report
            </h2>
            <h3 style={{ fontSize: '20px', margin: '20px 0 10px', color: textColor }}>Student Details</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <th style={{ border: '1px solid #bbb', padding: '8px', backgroundColor: headerColor, color: 'white' }}>Name</th>
                  <td style={{ border: '1px solid #bbb', padding: '8px', backgroundColor: rowColor }}>{previewData.student.name}</td>
                </tr>
                <tr>
                  <th style={{ border: '1px solid #bbb', padding: '8px', backgroundColor: headerColor, color: 'white' }}>Registration Number</th>
                  <td style={{ border: '1px solid #bbb', padding: '8px' }}>{previewData.student.reg_num}</td>
                </tr>
                <tr>
                  <th style={{ border: '1px solid #bbb', padding: '8px', backgroundColor: headerColor, color: 'white' }}>Class</th>
                  <td style={{ border: '1px solid #bbb', padding: '8px', backgroundColor: rowColor }}>{previewData.student.class}</td>
                </tr>
                <tr>
                  <th style={{ border: '1px solid #bbb', padding: '8px', backgroundColor: headerColor, color: 'white' }}>Reporting Period</th>
                  <td style={{ border: '1px solid #bbb', padding: '8px' }}>
                    {mode === 'month' ? new Date(`${selectedMonth}-01`).toLocaleString('default', { month: 'long', year: 'numeric' }) : `${startDate} to ${endDate}`}
                  </td>
                </tr>
              </tbody>
            </table>
            <h3 style={{ fontSize: '20px', margin: '20px 0 10px', color: textColor }}>Attendance</h3>
            <p style={{ fontSize: '16px', marginBottom: '20px', color: textColor }}>
              {previewData.attendance.present}/{previewData.attendance.total_days} days ({previewData.attendance.percentage.toFixed(1)}%)
            </p>
            <h3 style={{ fontSize: '20px', margin: '20px 0 10px', color: textColor }}>Lessons Overview</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th style={{ border: '2px solid #bbb', padding: '8px', backgroundColor: headerColor, color: 'white' }}>Date</th>
                  <th style={{ border: '2px solid #bbb', padding: '8px', backgroundColor: headerColor, color: 'white' }}>Planned Topic</th>
                  <th style={{ border: '2px solid #bbb', padding: '8px', backgroundColor: headerColor, color: 'white' }}>Achieved Topic</th>
                </tr>
              </thead>
              <tbody>
                {previewData.lessons.map((lesson, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'transparent' : rowColor }}>
                    <td style={{ border: '2px solid #bbb', padding: '8px' }}>{lesson.date}</td>
                    <td style={{ border: '2px solid #bbb', padding: '8px' }}>{lesson.planned_topic}</td>
                    <td style={{ border: '2px solid #bbb', padding: '8px' }}>
                      {lesson.achieved_topic}
                      {lesson.planned_topic === lesson.achieved_topic && <span style={{ color: 'green', marginLeft: '8px' }}>✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 style={{ fontSize: '20px', margin: '20px 0 10px', color: textColor }}>Progress Images</h3>
            <div className="image-grid">
              {previewData.images.slice(0, 4).map((img, index) => (
                <div key={index} className="image-container">
                  {img ? (
                    <>
                      <img
                        src={img}
                        alt={`Progress ${index + 1}`}
                        style={{ transform: `rotate(${imageRotations[img] || 0}deg)` }}
                      />
                      <div className="rotate-buttons">
                        <button
                          onClick={() => rotateImage(img, 'left')}
                          className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                        >
                          Rotate Left
                        </button>
                        <button
                          onClick={() => rotateImage(img, 'right')}
                          className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                        >
                          Rotate Right
                        </button>
                      </div>
                    </>
                  ) : (
                    <p>Image Not Available</p>
                  )}
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={generateReportFromPreview}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                Generate PDF
              </button>
            </div>
            <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '20px', color: '#666' }}>
              Teacher's Signature: ____________________ | Generated: {new Date().toLocaleString()} | Powered by Koder Kids
            </p>
          </div>
        </div>
      )}

      {Array.isArray(students) && students.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-lg" aria-live="polite">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700">📋 Student List</h3>
            <button
              onClick={handleGenerateBulkReports}
              className={`bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isGeneratingBulk || selectedStudentIds.length === 0
                  ? "opacity-75 cursor-not-allowed"
                  : "hover:bg-purple-600"
              }`}
              disabled={isGeneratingBulk || selectedStudentIds.length === 0}
              aria-label={`Generate reports for ${selectedStudentIds.length} selected students`}
            >
              {isGeneratingBulk ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>📄 Generate Selected Reports ({selectedStudentIds.length})</>
              )}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-gray-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === students.length && students.length > 0}
                      onChange={toggleSelectAll}
                      className="mr-2"
                      aria-label="Select all students"
                    />
                  </th>
                  <th className="p-3 text-left text-gray-700 font-semibold">Student Name</th>
                  <th className="p-3 text-left text-gray-700 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 border-t border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="mr-2"
                        aria-label={`Select ${student.name}`}
                      />
                    </td>
                    <td className="p-3 border-t border-gray-200 text-gray-600">{student.name}</td>
                    <td className="p-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={includeBackground[student.id] || false}
                            onChange={() => setIncludeBackground(prev => ({
                              ...prev,
                              [student.id]: !prev[student.id],
                            }))}
                            aria-label={`Include background image for ${student.name}`}
                          />
                          <span className="slider"></span>
                        </label>
                        <button
                          onClick={() => handlePreview(student.id)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                          aria-label={`Preview report for ${student.name}`}
                        >
                          👀 Preview
                        </button>
                        <button
                          onClick={() => handleGenerateReport(student.id)}
                          className={`bg-green-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            isGenerating[student.id] ? "opacity-75 cursor-not-allowed" : "hover:bg-green-600"
                          }`}
                          disabled={isGenerating[student.id]}
                          aria-label={`Generate report for ${student.name}`}
                        >
                          {isGenerating[student.id] ? (
                            <>
                              <svg
                                className="animate-spin h-5 w-5 mr-2 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Generating...
                            </>
                          ) : (
                            <>📄 Generate Report</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500" aria-live="polite">
          {errorMessage || "No students found. Adjust filters and try again."}
        </p>
      )}
    </div>
  );
};

export default ReportsPage;