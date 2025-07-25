import React, { useEffect, useState } from "react";
import axios from "axios";
import { getAuthHeaders, getSchools, getClasses, API_URL } from "../api";
import { toast } from 'react-toastify';
import { PDFDocument } from 'pdf-lib';
import ImageManagementModal from "./ImageManagementModal"; // Import new modal

// Function to validate YYYY-MM format
const isValidMonth = (monthStr) => {
  if (!monthStr) return false;
  return /^\d{4}-\d{2}$/.test(monthStr) && new Date(`${monthStr}-01`).getFullYear() >= 2000;
};

// Function to validate date string
const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};

// Function to format to MM/DD/YYYY
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

// Function to format to YYYY-MM-DD
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

// Function to fetch array buffer from URL with detailed logging
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

// Function to validate image format
async function validateImageFormat(arrayBuffer, url) {
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJpeg = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8; // JPEG signature
  const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47; // PNG signature
  if (!isJpeg && !isPng) {
    console.error(`Invalid image format for ${url}: First bytes: ${firstBytes}`);
    throw new Error(`Invalid image format for ${url}. Only PNG and JPEG are supported.`);
  }
  return isJpeg;
}

// Function to add background image to PDF using the alternative approach
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
  const [showImageModal, setShowImageModal] = useState(false); // New state for modal
  const [modalStudentId, setModalStudentId] = useState(null); // Track student ID for modal

  // Fetch schools on component mount
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

  // Fetch classes when selectedSchool changes
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

  // Initialize toggle state for each student when students are fetched
  useEffect(() => {
    if (students.length > 0) {
      const initialToggleState = students.reduce((acc, student) => {
        acc[student.id] = true; // Default to true (include background)
        return acc;
      }, {});
      setIncludeBackground(initialToggleState);
    }
  }, [students]);

  // Validate and fetch students
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

  // Toggle student selection for bulk generation
  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select/deselect all students for bulk generation
  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(student => student.id));
    }
  };

  const handleViewImages = (studentId) => {
    setModalStudentId(studentId);
    setShowImageModal(true);
  };
  // Generate single PDF report with or without background based on toggle
  // Generate single PDF report with or without background based on toggle
// Generate single PDF report with or without background based on toggle
const handleGenerateReport = async (studentId) => {
  setErrorMessage("");
  setIsGenerating(prev => ({ ...prev, [studentId]: true }));

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

    const response = await axios.get(`${API_URL}/api/generate-pdf/`, {
      headers: getAuthHeaders(),
      params,
      responseType: 'blob',
    });

    let finalBlob = response.data;

    // Validate blob
    if (!(finalBlob instanceof Blob)) {
      throw new Error("Invalid PDF response: Not a blob");
    }
    console.log(`Received blob size: ${finalBlob.size} bytes`); // Debug log

    // Add background image if toggle is enabled for this student
    if (includeBackground[studentId]) {
      const backgroundImageUrl = '/bg.png';
      finalBlob = await addBackgroundToPDF(response.data, backgroundImageUrl);
      console.log(`Blob size after adding background: ${finalBlob.size} bytes`); // Debug log
    }

    // Trigger download with updated filename
    const url = window.URL.createObjectURL(finalBlob);
    console.log(`Generated URL for download: ${url}`); // Debug log

    const link = document.createElement('a');
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name.replace(/\s+/g, '_') : 'Unknown';

    let month, year;
    if (mode === "month") {
      const [yearStr, monthStr] = selectedMonth.split('-');
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
      console.log("Attempting to trigger download..."); // Debug log
      link.click();
      console.log("Download triggered successfully"); // Debug log
      toast.success("Report downloaded successfully!");
    } catch (downloadError) {
      console.error("Error triggering download:", downloadError);
      throw new Error("Failed to initiate download. Please check browser settings.");
    } finally {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("Error generating report:", error.message);
    const errorMsg = error.response?.status === 400
      ? "Invalid request parameters."
      : error.response?.status === 403
      ? "You do not have permission to generate this report."
      : error.response?.status === 404
      ? "Student data not found. Please check your selection."
      : error.message || "Failed to generate report. Please try again.";
    setErrorMessage(errorMsg);
    toast.error(errorMsg);
  } finally {
    setIsGenerating(prev => ({ ...prev, [studentId]: false }));
  }
};

  // Generate multiple individual PDF reports with or without background based on toggle
  const handleGenerateBulkReports = async () => {
    if (selectedStudentIds.length === 0) {
      setErrorMessage("Please select at least one student.");
      toast.warning("Please select at least one student.");
      return;
    }

    setErrorMessage("");
    setIsGeneratingBulk(true);

    try {
      // Sequentially generate reports for each student
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
      `}
    </style>
    <h2 className="text-2xl font-bold text-gray-700 mb-6">📊 Monthly Reports</h2>

    {/* Error Message */}
    {errorMessage && (
      <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg" role="alert" aria-live="assertive">
        {errorMessage}
      </div>
    )}

    {/* Mode Selection */}
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

    {/* Date Inputs */}
    <div className="flex flex-wrap gap-4 mb-6">
      {/* Month Selector */}
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

      {/* Start Date */}
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

      {/* End Date */}
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

    {/* School and Class Selection */}
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

    {/* Student List */}
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
                        onClick={() => handleViewImages(student.id)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors hover:bg-blue-600 flex items-center gap-2"
                        aria-label={`View images for ${student.name}`}
                      >
                        🖼️ View Images
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

    {/* Render Image Management Modal */}
    {showImageModal && (
      <ImageManagementModal
        studentId={modalStudentId}
        selectedMonth={selectedMonth}
        startDate={startDate}
        endDate={endDate}
        mode={mode}
        onClose={() => {
          setShowImageModal(false);
          setModalStudentId(null);
        }}
      />
    )}
  </div>
);
};

export default ReportsPage;