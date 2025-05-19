import React, { useEffect, useState } from "react";
import axios from "axios";
import { getAuthHeaders, getSchools, getClasses, API_URL } from "../api";
import { toast } from 'react-toastify';

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

  // Validate and fetch students
  const fetchStudents = async () => {
    setErrorMessage("");
    setStudents([]);
    setSelectedStudentIds([]);
    setIsSearching(true);

    // Validation for month mode
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

    // Validation for range mode
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
      const currentDate = new Date("2025-05-19");
      if (new Date(startDate) > currentDate || new Date(endDate) > currentDate) {
        setErrorMessage("Dates cannot be in the future (beyond May 19, 2025).");
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
      // Format dates for API
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

      console.log("Students API response:", response.data);

      const studentList = Array.isArray(response.data?.students) ? response.data.students : Array.isArray(response.data) ? response.data : [];
      if (studentList.length === 0) {
        setErrorMessage("No students found for the selected criteria.");
      }
      setStudents(studentList);
    } catch (error) {
      console.error("Error fetching students:", error.response?.data || error.message);
      setErrorMessage(
        error.response?.data?.message || "Failed to fetch students. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch images for a student
  const fetchStudentImages = async (studentId, sessionDate) => {
    try {
      const response = await axios.get(`${API_URL}/api/get-student-images/`, {
        headers: getAuthHeaders(),
        params: {
          student_id: studentId,
          session_date: sessionDate,
        },
      });
      const images = response.data.images || [];
      // Extract filenames from signed URLs
      const imageIds = images.map(img => img.signedURL.split('/').pop().split('?')[0]).slice(0, 4);
      console.log(`Fetched images for student ${studentId}:`, imageIds);
      return imageIds;
    } catch (error) {
      console.error(`Error fetching images for student ${studentId}:`, error.response?.status, error.response?.data || error.message);
      setErrorMessage(`Failed to fetch images for student ${studentId}. Proceeding without images.`);
      return [];
    }
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select/deselect all students
  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(student => student.id));
    }
  };

  // Generate single PDF report
  const handleGenerateReport = async (studentId) => {
    setErrorMessage("");
    setIsGenerating(prev => ({ ...prev, [studentId]: true }));

    try {
      // Determine session_date for image fetching
      const sessionDate = mode === "month"
        ? selectedMonth
        : formatToYYYYMMDD(startDate).slice(0, 7); // YYYY-MM

      // Fetch image IDs
      const imageIds = await fetchStudentImages(studentId, sessionDate);
      const imageIdsString = imageIds.join(',');

      // Build query parameters
      const params = {
        student_id: studentId,
        mode,
        school_id: selectedSchool,
        student_class: selectedClass,
        image_ids: imageIdsString,
      };

      if (mode === "month") {
        params.month = selectedMonth;
      } else {
        params.start_date = formatToYYYYMMDD(startDate);
        params.end_date = formatToYYYYMMDD(endDate);
      }

      // Make API call to generate PDF
      const response = await axios.get(`${API_URL}/api/generate-pdf/`, {
        headers: getAuthHeaders(),
        params,
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
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

  // Generate bulk PDF reports
  const handleGenerateBulkReports = async () => {
    if (selectedStudentIds.length === 0) {
      setErrorMessage("Please select at least one student.");
      toast.warning("Please select at least one student.");
      return;
    }

    setErrorMessage("");
    setIsGeneratingBulk(true);

    try {
      // Determine session_date for image fetching
      const sessionDate = mode === "month"
        ? selectedMonth
        : formatToYYYYMMDD(startDate).slice(0, 7); // YYYY-MM

      // Fetch images for all selected students
      const allImageIds = [];
      for (const studentId of selectedStudentIds) {
        const imageIds = await fetchStudentImages(studentId, sessionDate);
        allImageIds.push(...imageIds);
      }
      const imageIdsString = allImageIds.slice(0, 4).join(',');

      // Build payload
      const payload = {
        student_ids: selectedStudentIds,
        mode,
        school_id: selectedSchool,
        student_class: selectedClass,
        image_ids: imageIdsString,
      };

      if (mode === "month") {
        payload.month = selectedMonth;
      } else {
        payload.start_date = formatToYYYYMMDD(startDate);
        payload.end_date = formatToYYYYMMDD(endDate);
      }

      console.log("Bulk payload:", payload);

      // Make API call to generate bulk PDFs
      const response = await axios.post(`${API_URL}/api/generate-pdf-batch/`, payload, {
        headers: getAuthHeaders(),
        responseType: 'blob',
      });

      // Create download link for ZIP
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const period = mode === "month"
        ? selectedMonth.replace('-', '_')
        : `${formatToYYYYMMDD(startDate).replace(/-/g, '')}_to_${formatToYYYYMMDD(endDate).replace(/-/g, '')}`;
      link.href = url;
      link.setAttribute('download', `student_reports_${period}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Bulk reports generated successfully!");
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
      <h2 className="text-2xl font-bold text-gray-700 mb-6">📊 Monthly Reports</h2>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg" role="alert">
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
            aria-label={isSearching ? "Searching students" : "Search students"}
          >
            {isSearching ? (
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
              <>
                🔍 Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Student List */}
      {Array.isArray(students) && students.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-lg">
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
              aria-label="Generate selected reports"
            >
              {isGeneratingBulk ? (
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
                <>
                  📦 Generate Selected Reports ({selectedStudentIds.length})
                </>
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
                          <>
                            📄 Generate Report
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500">
          {errorMessage || "No students found. Adjust filters and try again."}
        </p>
      )}
    </div>
  );
};

export default ReportsPage;