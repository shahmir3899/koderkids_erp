import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import html2pdf from "html2pdf.js";
import PropTypes from "prop-types";

const StudentReportModal = ({ studentId, month, onClose }) => {
  const [studentData, setStudentData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [lessonsData, setLessonsData] = useState(null);
  const [progressImages, setProgressImages] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const reportRef = useRef(null);

  const getMonthDates = (month) => {
    const [year, monthNumber] = month.split("-");
    const firstDay = `${month}-01`;
    const lastDay = new Date(year, monthNumber, 0).toISOString().split("T")[0];
    return { firstDay, lastDay };
  };

  const { firstDay, lastDay } = getMonthDates(month);

  const fetchReportData = useCallback(async () => {
    try {
      const studentRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/student-details/?student_id=${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        }
      );
      const attendanceRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/attendance-count/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        }
      );
      const lessonsRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/lessons-achieved/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        }
      );
      const imagesRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/student-progress-images/?student_id=${studentId}&month=${month}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("access")}` },
        }
      );

      console.log("Raw progress_images response:", imagesRes.data);

      setStudentData(studentRes.data);
      setAttendanceData(attendanceRes.data);
      setLessonsData(lessonsRes.data);

      const progressImages = (imagesRes.data.progress_images || [])
        .map((img) => {
          if (typeof img === "string") return img;
          if (img && typeof img === "object" && img.signedURL) return img.signedURL;
          return null;
        })
        .filter(Boolean);

      console.log("Processed progressImages:", progressImages);

      setProgressImages(progressImages);
      setIsDataLoaded(true);

      if (progressImages.length > 4) {
        setShowImageSelection(true);
      } else if (progressImages.length > 0) {
        setSelectedImages(progressImages);
      } else {
        setErrorMessage("No progress images available for this student.");
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      setErrorMessage("Failed to fetch report data. Please try again.");
    }
  }, [studentId, month, firstDay, lastDay]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

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

  const formattedMonth = new Date(`${month}-01`).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

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
      alert("Report data is still loading. Please wait.");
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
    })
      .then((canvas) => {
        const link = document.createElement("a");
        link.download = `Student_Report_${studentData.name.replace(/\s+/g, "_")}_${studentData.reg_num}.png`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();
        window.open(canvas.toDataURL("image/png", 1.0), "_blank");
        onClose();
      })
      .catch((error) => console.error("Error generating HD image:", error));
  };

  const generatePDF = () => {
    if (!studentData || !attendanceData || !lessonsData) {
      alert("Report data is still loading. Please wait.");
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
      pagebreak: {
        mode: ["css", "legacy"],
        avoid: ["table", "div"],
        after: ["#student-report"],
        strict: true,
      },
    };

    html2pdf()
      .from(element)
      .set(pdfOptions)
      .toPdf()
      .get("pdf")
      .then((pdf) => {
        window.open(pdf.output("bloburl"), "_blank");
        pdf.save(pdfOptions.filename);
        onClose();
      })
      .catch((error) => console.error("Error generating PDF:", error));
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
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

  const imageSlots = [...selectedImages, ...Array(4 - selectedImages.length).fill(null)];
  console.log("imageSlots:", imageSlots);

  // Calculate attendance percentage for status indicator (Improvement 4)
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

        {/* Report Section with Fixed Layout (Improvements 1-9) */}
        <div
          ref={reportRef}
          id="student-report"
          style={{
            width: "210mm", // A4 width (Improvement 8)
            minHeight: "297mm", // A4 height (Improvement 8)
            padding: "10mm", // Consistent padding (Improvement 8)
            backgroundColor: "#f9f9f9", // Off-white background (Improvement 8)
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Subtle shadow (Improvement 8)
            fontFamily: "'Roboto', sans-serif", // Consistent font (Improvement 2)
            color: "#333", // Dark gray text for contrast (Improvement 9)
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Watermark (retained from original) */}
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

          {/* Header (Improvement 1) */}
          <div
            style={{
              background: "linear-gradient(90deg, #4A90E2, #ffffff)", // Blue-to-white gradient
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
                fontFamily: "'Montserrat', sans-serif", // Bolder font for title
                fontSize: "24px", // Larger size
                fontWeight: "bold",
                color: "#333",
                margin: 0,
              }}
            >
              Monthly Student Report
            </h2>
            <img
              src={process.env.PUBLIC_URL + "/logo.png"} // Keep existing logo source
              alt="School Logo"
              style={{ height: "40px", borderRadius: "5px", objectFit: "contain" }}
            />
          </div>

          {/* Main Content Area */}
          <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", gap: "10mm" }}>
            {/* Student Information (Improvements 2, 3, 4) */}
            <div
              style={{
                padding: "5mm",
                borderBottom: "2px solid #4A90E2", // Blue divider (Improvement 3)
                lineHeight: "1.6", // Increased line spacing (Improvement 2)
              }}
            >
              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif", // Consistent font (Improvement 2)
                  fontSize: "18px", // Hierarchy (Improvement 2)
                  fontWeight: "bold",
                  color: "#4A90E2", // Blue color (Improvement 3)
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

            {/* Attendance (Improvements 3, 4) */}
            <div
              style={{
                padding: "5mm",
                backgroundColor: "rgba(46, 204, 113, 0.1)", // Light green background (Improvement 3)
                borderRadius: "5px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)", // Subtle shadow (Improvement 3)
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
                  {attendanceData?.total_days === 0
                    ? "No school days recorded"
                    : `${attendanceData?.present_days}/${attendanceData?.total_days} days (${attendancePercentage.toFixed(2)}%)`}
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: attendanceStatusColor, // Status dot (Improvement 4)
                      marginLeft: "5px",
                    }}
                  />
                </p>
              </div>
            </div>

            {/* Lessons Overview (Improvement 5) */}
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
              {lessonsData?.lessons?.length === 0 ? (
                <p style={{ color: "#666", fontStyle: "italic", fontSize: "14px", textAlign: "center" }}>
                  No lessons found for the selected date range.
                </p>
              ) : (
                <div style={{ maxHeight: "80mm", overflowY: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)", // Box shadow (Improvement 5)
                      borderRadius: "5px", // Rounded corners (Improvement 5)
                      overflow: "hidden",
                    }}
                    aria-label="Lessons achieved for the month" // Accessibility (Improvement 9)
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
                            backgroundColor: index % 2 === 0 ? "#f5f5f5" : "white", // Alternating colors (Improvement 5)
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

            {/* Progress Images (Improvement 6) */}
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
                  gridTemplateColumns: "repeat(2, 1fr)", // 2x2 grid
                  gridTemplateRows: "repeat(2, 60mm)", // Adjusted height to fit better
                  gap: "8mm", // Consistent spacing
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
                      border: "1px solid #ddd", // Borders (Improvement 6)
                      borderRadius: "5px", // Rounded corners (Improvement 6)
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f5f5f5", // Placeholder background (Improvement 6)
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
                          Image {index + 1} {/* Replace with actual date/caption if available */}
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

          {/* Footer (Improvement 7) */}
          <div
            style={{
              borderTop: "1px solid #ddd",
              paddingTop: "5mm",
              fontSize: "10px",
              color: "#666",
              marginTop: "10mm",
              flexShrink: 0, // Prevent footer from shrinking
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: "0 0 5px 0" }}>
                  Teacher’s Signature: <span style={{ borderBottom: "1px dotted #666", display: "inline-block", width: "100px" }}></span>
                </p>
                <p style={{ margin: 0 }}>Generated on: Apr 28, 2025</p>
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
  month: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default StudentReportModal;