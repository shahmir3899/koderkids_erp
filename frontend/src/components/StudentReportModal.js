import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import PropTypes from "prop-types";

// Utility function to validate date string
const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split("-");
  const date = new Date(`${year}-${month}-${day}`);
  return date instanceof Date && !isNaN(date) && date.getFullYear() === parseInt(year);
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
  const reportRef = useRef(null);

  const getDateList = () => {
    const dates = [];
    if (mode === "month" && selectedMonth && isValidDate(`${selectedMonth}-01`)) {
      const [year, month] = selectedMonth.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month - 1, day));
      }
    } else if (mode === "range" && startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
      let current = new Date(startDate);
      const end = new Date(endDate);
      if (end < current) {
        setErrorMessage("End date must be after start date.");
        return [];
      }
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    return dates;
  };

  const dateList = getDateList();
  const reportData = [];

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
        reportMonth = new Date(startDate).toISOString().slice(0, 7);
      } else {
        setErrorMessage("Invalid date selection. Please use YYYY-MM-DD format.");
        setIsDataLoaded(true);
        return;
      }

      const headers = {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      };

      const axiosInstance = axios.create();

      // Fetch student details
      setLoadingMessage("Loading student details...");
      const studentRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/student-details/?student_id=${studentId}`,
        { headers }
      );
      if (studentRes.data) {
        setStudentData(studentRes.data);
      } else {
        setErrorMessage((prev) => prev + " Failed to fetch student details. ");
      }

      // Fetch attendance data
      setLoadingMessage("Fetching attendance data...");
      const attendanceRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/attendance-count/?student_id=${studentId}&start_date=${fromDate}&end_date=${toDate}`,
        { headers }
      );
      if (attendanceRes.data) {
        setAttendanceData(attendanceRes.data);
      } else {
        setErrorMessage((prev) => prev + " Failed to fetch attendance data. ");
      }

      // Fetch lessons data
      setLoadingMessage("Fetching lessons data...");
      const lessonsRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/lessons-achieved/?student_id=${studentId}&start_date=${fromDate}&end_date=${toDate}`,
        { headers }
      );
      if (lessonsRes.data) {
        setLessonsData(lessonsRes.data);
      } else {
        setErrorMessage((prev) => prev + " Failed to fetch lessons data. ");
      }

      // Fetch progress images
      setLoadingMessage("Fetching progress images...");
      const imagesRes = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/api/student-progress-images/?student_id=${studentId}&month=${reportMonth}`,
        { headers }
      );
      if (imagesRes.data) {
        const progressImages = (imagesRes.data.progress_images || [])
          .map((img) => (typeof img === "string" ? img : img?.signedURL || null))
          .filter(Boolean);
        setProgressImages(progressImages);
        if (progressImages.length > 4) {
          setShowImageSelection(true);
        } else if (progressImages.length > 0) {
          setSelectedImages(progressImages);
        }
      } else {
        setErrorMessage((prev) => prev + " Failed to fetch progress images. ");
      }

      setIsDataLoaded(true);
    } catch (error) {
      console.error("Error in fetchReportData:", error.message);
      setErrorMessage("Failed to fetch report data: " + error.message);
      setIsDataLoaded(true);
    }
  }, [studentId, mode, selectedMonth, startDate, endDate]);

  useEffect(() => {
    if (studentId) {
      fetchReportData();
    }
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
    console.error(`Failed to load image: ${img}, Error: ${e.target.error || "Unknown error"}`);
    e.target.src = "/placeholder.png";
    e.target.alt = "Image failed to load";
  };

  const handleConfirmSelection = () => {
    if (selectedImages.length > 0) {
      setShowImageSelection(false);
    }
  };

  const generateHDImage = () => {
    if (!studentData || !attendanceData || !lessonsData) {
      alert("Report data is still loading or incomplete. Please wait or fix errors.");
      return;
    }

    if (progressImages.length > 4 && showImageSelection) {
      alert("Please confirm your image selection before generating the image.");
      return;
    }

    const element = reportRef.current;
    if (!element) {
      console.error("Report container not found!");
      return;
    }

    html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: true,
      width: element.scrollWidth,
      height: element.scrollHeight,
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      window.open(canvas.toDataURL("image/png", 1.0), "_blank");
      onClose();
    }).catch((error) => console.error("Error generating HD image:", error));
  };

  const generatePDF = () => {
    if (!studentData || !attendanceData || !lessonsData) {
      alert("Report data is still loading or incomplete. Please wait or fix errors.");
      return;
    }

    if (progressImages.length > 4 && showImageSelection) {
      alert("Please confirm your image selection before generating the PDF.");
      return;
    }

    const element = reportRef.current;
    if (!element) {
      console.error("Report container not found!");
      return;
    }

    const pdfOptions = {
      margin: [5, 5, 5, 5],
      filename: `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: ["table", "div"], after: ["#student-report"], strict: "true" },
    };

    html2pdf().from(element).set(pdfOptions).toPdf().get("pdf").then((pdf) => {
      window.open(pdf.output("bloburl"), "_blank");
      pdf.save(pdfOptions.filename);
      onClose();
    }).catch((error) => console.error("Error generating PDF:", error));
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

  // Calculate attendance percentage for status indicator
  const attendancePercentage = attendanceData?.total_days > 0
    ? (attendanceData.present_days / attendanceData.total_days) * 100
    : 0;
  const attendanceStatusColor = attendancePercentage > 80 ? "green" : attendancePercentage < 60 ? "red" : "orange";

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
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 id="modal-title" style={{ marginBottom: "10px" }}>
          Student Report Preview
        </h2>
        {errorMessage && (
          <p style={{ color: "red", marginBottom: "10px" }} role="alert">
            {errorMessage}
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
                      height: "100px",
                      position: "relative",
                      cursor: "pointer",
                      border: selectedImages.includes(img)
                        ? "2px solid blue"
                        : "2px solid transparent",
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
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
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
            <p style={{ marginBottom: "10px" }}>
              {selectedImages.length} / 4 selected
            </p>
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

        {/* Report Section with Fixed Layout */}
        <div
          ref={reportRef}
          id="student-report"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "10mm",
            backgroundColor: "#f9f9f9",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            fontFamily: "'Roboto', sans-serif",
            color: "#333",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Watermark */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              fontSize: "30px",
              color: "rgba(0, 0, 0, 0.05)",
              pointerEvents: "none",
              maxWidth: "150mm",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {studentData?.school}
          </div>

          {/* Header */}
          <div
            style={{
              background: "linear-gradient(90deg, #4A90E2, #ffffff)",
              padding: "10mm",
              borderRadius: "5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10mm",
            }}
          >
            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#333",
                margin: 0,
              }}
            >
              Monthly Student Report
            </h2>
            <img
              src={process.env.PUBLIC_URL + "/logo.png"}
              alt="School Logo"
              style={{ height: "40px", borderRadius: "5px", objectFit: "contain" }}
            />
          </div>

          {/* Main Content Area */}
          <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", gap: "10mm" }}>
            {/* Student Information */}
            <div
              style={{
                padding: "5mm",
                borderBottom: "2px solid #4A90E2",
                lineHeight: "1.6",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#4A90E2",
                  marginBottom: "5px",
                }}
              >
                <span style={{ fontSize: "20px", marginRight: "5px" }}>📚</span> Student Details
              </h3>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>Student Name:</strong> {studentData?.name || "Loading..."}
              </p>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>Registration Number:</strong> {studentData?.reg_num || "Loading..."}
              </p>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>School:</strong> {studentData?.school || "Loading..."}
              </p>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>Class:</strong> {studentData?.class || "Loading..."}
              </p>
              <p style={{ margin: "3px 0", fontSize: "14px" }}>
                <strong>Month:</strong> {formattedMonth}
              </p>
            </div>

            {/* Attendance */}
            <div
              style={{
                padding: "5mm",
                backgroundColor: "rgba(46, 204, 113, 0.1)",
                borderRadius: "5px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "20px", color: "#2ECC71" }}>✅</span>
              <div>
                <h3
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#4A90E2",
                    marginBottom: "3px",
                  }}
                >
                  Attendance
                </h3>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {attendanceData?.total_days === 0 || !attendanceData
                    ? "No school days recorded"
                    : `${attendanceData?.present_days || 0}/${attendanceData?.total_days || 0} days (${attendancePercentage.toFixed(2)}%)`}
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: attendanceStatusColor,
                      marginLeft: "5px",
                    }}
                  />
                </p>
              </div>
            </div>

            {/* Lessons Overview */}
            <div style={{ flex: "1 1 auto", overflow: "auto" }}>
              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#4A90E2",
                  marginBottom: "5px",
                }}
              >
                <span style={{ fontSize: "20px", marginRight: "5px" }}>📖</span> Lessons Overview
              </h3>
              {lessonsData?.lessons?.length === 0 || !lessonsData ? (
                <p style={{ color: "#666", fontStyle: "italic", fontSize: "14px", textAlign: "center" }}>
                  No lessons found for the selected date range.
                </p>
              ) : (
                <div style={{ maxHeight: "80mm", overflowY: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                      borderRadius: "5px",
                      overflow: "hidden",
                    }}
                    aria-label="Lessons achieved for the month"
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#4A90E2", color: "white" }}>
                        <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>📅 Date</th>
                        <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>Planned Topic</th>
                        <th style={{ padding: "8px", textAlign: "left", fontWeight: "bold" }}>Achieved Topic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lessonsData?.lessons?.map((lesson, index) => (
                        <tr
                          key={index}
                          style={{
                            backgroundColor: index % 2 === 0 ? "#f5f5f5" : "white",
                          }}
                        >
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                            {new Date(lesson.date).toLocaleDateString("en-US", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }) || "N/A"}
                          </td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                            {lesson.planned_topic || "N/A"}
                          </td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                            {lesson.achieved_topic || "N/A"}
                            {lesson.planned_topic === lesson.achieved_topic && lesson.achieved_topic && (
                              <span style={{ color: "green", marginLeft: "5px" }}>✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Progress Images */}
            <div>
              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#4A90E2",
                  marginBottom: "5px",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "20px", marginRight: "5px" }}>🖼️</span> Progress Images
              </h3>
              {progressImages.length === 0 && (
                <p style={{ color: "red", marginBottom: "10px", textAlign: "center" }}>
                  No progress images available for this student.
                </p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gridTemplateRows: "repeat(2, 60mm)",
                  gap: "8mm",
                  padding: "5mm",
                  backgroundColor: "white",
                  borderRadius: "5px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                }}
              >
                {imageSlots.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "1px solid #ddd",
                      borderRadius: "5px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f5f5f5",
                      overflow: "hidden",
                    }}
                  >
                    {img ? (
                      <div style={{ textAlign: "center", width: "100%" }}>
                        <img
                          src={img}
                          alt={`Progress ${index + 1}`}
                          onError={(e) => handleImageError(e, img)}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            borderRadius: "5px",
                          }}
                        />
                        <p style={{ fontSize: "10px", color: "#666", margin: "3px 0" }}>
                          Image {index + 1}
                        </p>
                      </div>
                    ) : (
                      <span style={{ fontSize: "28px", color: "#999", fontStyle: "italic" }}>
                        📷 No Image
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid #ddd",
              paddingTop: "5mm",
              fontSize: "10px",
              color: "#666",
              marginTop: "10mm",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: "0 0 5px 0" }}>
                  Teacher’s Signature: <span style={{ borderBottom: "1px dotted #666", display: "inline-block", width: "100px" }}></span>
                </p>
                <p style={{ margin: 0 }}>Generated on: May 05, 2025</p>
              </div>
              <div
                style={{
                  backgroundColor: "#e5e5e5",
                  padding: "3px 10px",
                  borderRadius: "3px",
                }}
              >
                Powered by {studentData?.school || "School Name"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <button
              onClick={generateHDImage}
              style={{
                padding: "10px 20px",
                background: "blue",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              📸 Generate HD Image
            </button>
            <button
              onClick={generatePDF}
              style={{
                padding: "10px 20px",
                background: "green",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              📄 Generate PDF
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "red",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
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