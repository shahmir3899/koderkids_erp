import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { saveAs } from "file-saver"; // Import for downloading PDF

// Utility functions
const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split("-");
  const date = new Date(`${year}-${month}-${day}`);
  return date instanceof Date && !isNaN(date) && date.getFullYear() === parseInt(year);
};

const extractDateFromFilename = (filename) => {
  const name = filename.split("/").pop().split("?")[0];
  const dateMatch = name.match(/(\d{4})(\d{2})(\d{2})|(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    if (dateMatch[1]) {
      const [, year, month, day] = dateMatch;
      return `${year}-${month}-${day}`;
    } else {
      return dateMatch[4] + "-" + dateMatch[5] + "-" + dateMatch[6];
    }
  }
  return "Unknown Date";
};

const getMonthsBetweenDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = new Set();
  let current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    months.add(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }
  return Array.from(months);
};

const splitLessonsIntoPages = (lessons) => {
  const maxRowsPerPage = 10;
  const chunks = [];
  for (let i = 0; i < lessons.length; i += maxRowsPerPage) {
    chunks.push(lessons.slice(i, i + maxRowsPerPage));
  }
  return chunks;
};

const StudentReportModal = ({ onClose, studentId, mode, selectedMonth, startDate, endDate }) => {
  const [studentData, setStudentData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [lessonsData, setLessonsData] = useState(null);
  const [progressImages, setProgressImages] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Loading student details...");
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef(null);

  const fetchReportData = useCallback(async () => {
    setErrorMessage("");
    setIsDataLoaded(false);
    try {
      let fromDate = "";
      let toDate = "";
      let reportMonth = "";

      if (mode === "month" && selectedMonth && isValidDate(`${selectedMonth}-01`)) {
        const [year, monthNum] = selectedMonth.split("-").map(Number);
        const lastDate = new Date(year, monthNum, 0).getDate();
        fromDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
        toDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDate).padStart(2, "0")}`;
        reportMonth = selectedMonth;
      } else if (mode === "range" && startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
        fromDate = startDate;
        toDate = endDate;
      } else {
        setErrorMessage("Invalid date selection. Please use YYYY-MM-DD format.");
        setIsDataLoaded(true);
        return;
      }

      const headers = {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      };

      const axiosInstance = axios.create();

      setLoadingMessage("Loading student details...");
      const studentRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/student-details/?student_id=${studentId}`,
        { headers }
      );
      if (studentRes.data) setStudentData(studentRes.data);

      setLoadingMessage("Fetching attendance data...");
      const attendanceRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/attendance-count/?student_id=${studentId}&start_date=${fromDate}&end_date=${toDate}`,
        { headers }
      );
      if (attendanceRes.data) setAttendanceData(attendanceRes.data);

      setLoadingMessage("Fetching lessons data...");
      const lessonsRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/lessons-achieved/?student_id=${studentId}&start_date=${fromDate}&end_date=${toDate}`,
        { headers }
      );
      if (lessonsRes.data) setLessonsData(lessonsRes.data);

      setLoadingMessage("Fetching progress images...");
      let allProgressImages = [];
      if (mode === "month") {
        const imagesRes = await axiosInstance.get(
          `${process.env.REACT_APP_API_URL}/api/student-progress-images/?student_id=${studentId}&month=${reportMonth}`,
          { headers }
        );
        if (imagesRes.data) {
          allProgressImages = (imagesRes.data.progress_images || [])
            .map((img) => (typeof img === "string" ? img : img?.signedURL || null))
            .filter(Boolean);
        }
      } else if (mode === "range") {
        const months = getMonthsBetweenDates(startDate, endDate);
        for (const month of months) {
          const imagesRes = await axiosInstance.get(
            `${process.env.REACT_APP_API_URL}/api/student-progress-images/?student_id=${studentId}&month=${month}`,
            { headers }
          );
          if (imagesRes.data) {
            allProgressImages = [
              ...allProgressImages,
              ...(imagesRes.data.progress_images || [])
                .map((img) => (typeof img === "string" ? img : img?.signedURL || null))
                .filter(Boolean),
            ];
          }
        }
        allProgressImages = Array.from(new Set(allProgressImages));
      }

      const preloadPromises = allProgressImages.map((url) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = resolve;
          img.onerror = () => resolve();
        });
      });
      await Promise.all(preloadPromises);

      setProgressImages(allProgressImages);
      if (allProgressImages.length > 4) setShowImageSelection(true);
      else if (allProgressImages.length > 0) setSelectedImages(allProgressImages);

      setIsDataLoaded(true);
    } catch (error) {
      console.error("Error in fetchReportData:", error.message);
      setErrorMessage("Failed to fetch report data: " + error.message);
      setIsDataLoaded(true);
    }
  }, [studentId, mode, selectedMonth, startDate, endDate]);

  useEffect(() => {
    if (studentId) fetchReportData();
  }, [studentId, mode, selectedMonth, startDate, endDate, fetchReportData]);

  const toggleImageSelection = useCallback(
    (img) => {
      setErrorMessage("");
      if (selectedImages.includes(img)) {
        setSelectedImages(selectedImages.filter((i) => i !== img));
      } else if (selectedImages.length < 4) {
        setSelectedImages([...selectedImages, img]);
      } else {
        setErrorMessage("You can only select up to 4 images.");
      }
    },
    [selectedImages]
  );

  const formattedMonth = mode === "month" && selectedMonth
    ? new Date(`${selectedMonth}-01`).toLocaleString("en-US", { month: "short", year: "numeric" })
    : mode === "range" && startDate && endDate
    ? `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
    : "";

  const handleImageError = (e, img) => {
    console.error(`Failed to load image: ${img}`);
    e.target.src = "/placeholder.png";
    e.target.alt = "Image failed to load";
  };

  const handleConfirmSelection = () => {
    if (selectedImages.length > 0) setShowImageSelection(false);
  };

  const generatePDF = async () => {
    if (!studentData || !attendanceData || !lessonsData) {
      alert("Report data is still loading or incomplete. Please wait or fix errors.");
      return;
    }

    if (progressImages.length > 4 && showImageSelection) {
      alert("Please confirm your image selection before generating the PDF.");
      return;
    }

    setGenerating(true);

    try {
      console.log("Calling backend /api/generate-pdf/ endpoint..."); // Debug log
      const payload = {
        studentData: {
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
        selectedImages: selectedImages,
        formattedMonth: formattedMonth,
        attendancePercentage: attendanceData.total_days > 0 ? (attendanceData.present_days / attendanceData.total_days) * 100 : 0,
        attendanceStatusColor: attendanceData.total_days > 0
          ? (attendanceData.present_days / attendanceData.total_days) * 100 > 80
            ? "green"
            : (attendanceData.present_days / attendanceData.total_days) * 100 < 60
            ? "red"
            : "orange"
          : "gray",
      };

      const headers = {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
        "Content-Type": "application/json",
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/generate-pdf/`,
        payload,
        { headers, responseType: "blob" }
      );

      console.log("Backend response received, initiating download..."); // Debug log
      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      saveAs(pdfBlob, `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateHDImage = () => {
    alert("HD Image generation is currently disabled. Use PDF for now.");
    return;
  };

  if (!isDataLoaded) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "600px",
            width: "100%",
          }}
        >
          <p>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  const imageSlots = [...selectedImages, ...Array(4 - selectedImages.length).fill(null)];
  const attendancePercentage = attendanceData?.total_days > 0
    ? (attendanceData.present_days / attendanceData.total_days) * 100
    : 0;
  const attendanceStatusColor = attendancePercentage > 80 ? "green" : attendancePercentage < 60 ? "red" : "orange";

  const lessonChunks = lessonsData?.lessons?.length > 0 ? splitLessonsIntoPages(lessonsData.lessons) : [];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "20px",
        zIndex: 1000,
      }}
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "800px",
          width: "100%",
          height: "auto",
          overflowY: "auto",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" style={{ marginBottom: "10px" }}>
          Student Report Preview
        </h2>
        {errorMessage && (
          <p style={{ color: "red", marginBottom: "10px" }} role="alert">
            {errorMessage}
          </p>
        )}
        {generating && (
          <p style={{ color: "blue", marginBottom: "10px" }}>
            Generating file, please wait...
          </p>
        )}

        {showImageSelection && (
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ marginBottom: "10px" }}>Select Progress Images (up to 4)</h3>
            {progressImages.length === 0 ? (
              <p style={{ color: "red" }}>No images available for selection.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                {progressImages.map((img, index) => (
                  <div
                    key={img + index}
                    onClick={() => toggleImageSelection(img)}
                    onKeyDown={(e) => e.key === "Enter" && toggleImageSelection(img)}
                    style={{
                      width: "100px",
                      height: "130px",
                      position: "relative",
                      cursor: "pointer",
                      border: selectedImages.includes(img) ? "2px solid blue" : "2px solid transparent",
                    }}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={selectedImages.includes(img)}
                    aria-label={`Select image ${index + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Progress ${index + 1}`}
                      onError={(e) => handleImageError(e, img)}
                      loading="lazy"
                      style={{ width: "100%", height: "100px", objectFit: "cover" }}
                    />
                    <p style={{ fontSize: "10px", color: "#666", margin: "3px 0", textAlign: "center" }}>
                      {extractDateFromFilename(img)}
                    </p>
                    {selectedImages.includes(img) && (
                      <span
                        style={{
                          position: "absolute",
                          top: "5px",
                          right: "5px",
                          background: "green",
                          color: "white",
                          borderRadius: "50%",
                          padding: "2px 6px",
                        }}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p style={{ marginBottom: "10px" }}>{selectedImages.length} / 4 selected</p>
            <button
              onClick={handleConfirmSelection}
              disabled={selectedImages.length === 0}
              style={{
                padding: "10px 20px",
                background: selectedImages.length > 0 ? "blue" : "gray",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: selectedImages.length > 0 ? "pointer" : "not-allowed",
                marginRight: "10px",
              }}
            >
              Confirm Selection
            </button>
          </div>
        )}

        <div
          ref={reportRef}
          id="student-report"
          style={{
            width: "100%",
            maxWidth: "210mm",
            padding: "10mm",
            backgroundColor: "#fff",
            fontFamily: "'Roboto', sans-serif",
            color: "#333",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "linear-gradient(90deg, #4A90E2, #ffffff)",
              padding: "10mm",
              borderRadius: "5px",
              marginBottom: "10mm",
              textAlign: "center",
            }}
          >
            <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "24px", color: "#333", margin: 0 }}>
              Monthly Student Report
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10mm" }}>
            <div style={{ padding: "5mm", borderBottom: "2px solid #4A90E2" }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "18px", color: "#4A90E2", marginBottom: "5px" }}>
                Student Details
              </h3>
              <p style={{ margin: "3px 0" }}><strong>Name:</strong> {studentData?.name || "Loading..."}</p>
              <p style={{ margin: "3px 0" }}><strong>Registration Number:</strong> {studentData?.reg_num || "Loading..."}</p>
              <p style={{ margin: "3px 0" }}><strong>School:</strong> {studentData?.school || "Loading..."}</p>
              <p style={{ margin: "3px 0" }}><strong>Class:</strong> {studentData?.class || "Loading..."}</p>
              <p style={{ margin: "3px 0" }}><strong>Month:</strong> {formattedMonth}</p>
            </div>

            <div style={{ padding: "5mm", backgroundColor: "rgba(46, 204, 113, 0.1)", borderRadius: "5px" }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", color: "#4A90E2", marginBottom: "3px" }}>
                Attendance
              </h3>
              <p style={{ margin: 0 }}>
                {attendanceData?.total_days === 0 || !attendanceData
                  ? "No school days recorded"
                  : `${attendanceData?.present_days || 0}/${attendanceData?.total_days || 0} days (${attendancePercentage.toFixed(2)}%)`}
                <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: attendanceStatusColor, marginLeft: "5px" }} />
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", color: "#4A90E2", marginBottom: "5px" }}>
                Lessons Overview
              </h3>
              {lessonChunks.length === 0 || !lessonsData ? (
                <p style={{ color: "#666", fontStyle: "italic", textAlign: "center" }}>No lessons found for the selected date range.</p>
              ) : (
                lessonChunks.map((chunk, chunkIndex) => (
                  <table
                    key={chunkIndex}
                    style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10mm", pageBreakBefore: chunkIndex > 0 ? "always" : "auto" }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#4A90E2", color: "white" }}>
                        <th style={{ padding: "8px", textAlign: "left" }}>Date</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>Planned Topic</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>Achieved Topic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((lesson, index) => (
                        <tr key={index} style={{ backgroundColor: (chunkIndex * 10 + index) % 2 === 0 ? "#f5f5f5" : "white" }}>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                            {new Date(lesson.date).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) || "N/A"}
                          </td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>{lesson.planned_topic || "N/A"}</td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                            {lesson.achieved_topic || "N/A"}
                            {lesson.planned_topic === lesson.achieved_topic && lesson.achieved_topic && <span style={{ color: "green", marginLeft: "5px" }}>✓</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))
              )}
            </div>

            <div>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", color: "#4A90E2", marginBottom: "5px", textAlign: "center" }}>
                Progress Images
              </h3>
              {progressImages.length === 0 && <p style={{ color: "red", textAlign: "center" }}>No progress images available for this student.</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8mm", padding: "5mm" }}>
                {imageSlots.map((img, index) => (
                  <div
                    key={index}
                    style={{ border: "1px solid #ddd", borderRadius: "5px", textAlign: "center", padding: "5mm" }}
                  >
                    {img ? (
                      <div>
                        <img
                          src={img}
                          alt={`Progress ${index + 1}`}
                          onError={(e) => handleImageError(e, img)}
                          style={{ maxWidth: "100%", maxHeight: "100px", objectFit: "contain" }}
                        />
                        <p style={{ fontSize: "10px", color: "#666" }}>Image {index + 1}</p>
                      </div>
                    ) : (
                      <span style={{ fontSize: "28px", color: "#999", fontStyle: "italic" }}>📷 No Image</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #ddd", paddingTop: "5mm", fontSize: "10px", color: "#666", marginTop: "10mm" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: "0 0 5px 0" }}>Teacher’s Signature: <span style={{ borderBottom: "1px dotted #666", width: "100px", display: "inline-block" }}></span></p>
                <p style={{ margin: "0" }}>Generated on: May 16, 2025, 09:23 PM PKT</p>
              </div>
              <div style={{ backgroundColor: "#e5e5e5", padding: "3px 10px", borderRadius: "3px" }}>
                Powered by {studentData?.school || "School Name"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <button
              onClick={generateHDImage}
              disabled={generating}
              style={{
                padding: "10px 20px",
                background: generating ? "gray" : "blue",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: generating ? "not-allowed" : "pointer",
                marginRight: "10px",
              }}
            >
              📸 Generate HD Image
            </button>
            <button
              onClick={generatePDF}
              disabled={generating}
              style={{
                padding: "10px 20px",
                background: generating ? "gray" : "green",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: generating ? "not-allowed" : "pointer",
              }}
            >
              📄 Generate PDF
            </button>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            style={{
              padding: "10px 20px",
              background: "red",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: generating ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

StudentReportModal.propTypes = {
  studentId: PropTypes.string.isRequired,
  mode: PropTypes.string.isRequired,
  selectedMonth: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default StudentReportModal;