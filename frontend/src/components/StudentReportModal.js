import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas"; // Use html2canvas directly for image generation
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
        `${process.env.REACT_APP_API_URL}/api/student-details/?student_id=${studentId}`
      );
      const attendanceRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/attendance-count/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`
      );
      const lessonsRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/lessons-achieved/?student_id=${studentId}&start_date=${firstDay}&end_date=${lastDay}`
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

      const progressImages = (imagesRes.data.progress_images || []).map(img => {
        if (typeof img === "string") return img;
        if (img && typeof img === "object" && img.signedURL) return img.signedURL;
        return null;
      }).filter(Boolean);

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

  const handleImageError = (e, img) => {
    console.error(`Failed to load image: ${img}, Error: ${e.target.error || 'Unknown error'}`);
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
      scale: 4,
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

        <div
          ref={reportRef}
          id="student-report"
          style={{
            width: "210mm",
            height: "297mm",
            padding: "10mm",
            margin: "auto",
            fontSize: "12px",
            position: "relative",
            background: "white",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            boxSizing: "border-box",
            overflow: "hidden",
            border: "1px solid #ddd",
            fontFamily: "'Helvetica', 'Arial', sans-serif",
          }}
        >
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

          <div
            style={{
              maxHeight: "260mm",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#dfdfdf",
                  color: "white",
                  padding: "0mm",
                  borderRadius: "5px 5px 0 0",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "18px" }}>📊 Monthly Student Report</h2>
                <img
                  src={process.env.PUBLIC_URL + "/logo.png"}
                  alt="School Logo"
                  style={{
                    height: "50px",
                    minWidth: "50px",
                    borderRadius: "3px",
                    objectFit: "contain",
                  }}
                />
              </div>

              <div style={{ padding: "5mm", borderBottom: "1px solid #ccc" }}>
                <p><strong>👤 Student Name:</strong> {studentData?.name || "Loading..."}</p>
                <p><strong>📄 Registration Number:</strong> {studentData?.reg_num || "Loading..."}</p>
                <p><strong>🏫 School:</strong> {studentData?.school || "Loading..."}</p>
                <p><strong>📚 Class:</strong> {studentData?.class || "Loading..."}</p>
                <p><strong>🗓️ Month:</strong> {month}</p>
              </div>

              <div style={{ padding: "5mm", borderBottom: "1px solid #ccc" }}>
                <p>
                  <strong>✅ Attendance:</strong> {attendanceData?.present_days}/
                  {attendanceData?.total_days} days
                </p>
              </div>

              <div
                style={{
                  padding: "5mm",
                  borderBottom: "1px solid #ccc",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                }}
              >
                <h3 style={{ marginBottom: "8mm", fontSize: "16px" }}>📖 Lessons Overview</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f2f2f2", borderBottom: "2px solid #ccc" }}>
                      <th style={{ padding: "4px", border: "1px solid #ccc" }}>📅 Date</th>
                      <th style={{ padding: "4px", border: "1px solid #ccc" }}>📖 Planned Topic</th>
                      <th style={{ padding: "4px", border: "1px solid #ccc" }}>✅ Covered Topic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonsData?.planned_lessons?.slice(0, 5).map((lesson, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #ccc" }}>
                        <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                          {lesson.date || "No Date"}
                        </td>
                        <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                          {lesson.planned_topic || "N/A"}
                        </td>
                        <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                          {lessonsData?.achieved_lessons?.[index] || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  padding: "5mm",
                  textAlign: "center",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                }}
              >
                <h3 style={{ marginBottom: "8mm", fontSize: "16px" }}>🖼️ Progress Images</h3>
                {progressImages.length === 0 && (
                  <p style={{ color: "red", marginBottom: "10px" }}>
                    No progress images available for this student.
                  </p>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gridTemplateRows: "repeat(2, 120px)", // Increased height
                    gap: "8mm", // Increased gap
                  }}
                >
                  {imageSlots.map((img, index) => (
                    <div
                      key={index}
                      style={{
                        width: "100%",
                        height: "120px",
                        border: "1px solid #ccc",
                        borderRadius: "3px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#f9f9f9",
                        overflow: "hidden",
                      }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={`Progress ${index + 1}`}
                          onError={(e) => handleImageError(e, img)}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain", // Use 'contain' for better fit
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: "28px", color: "#999", fontStyle: "italic" }}>
                          📷 No Image
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: "10mm",
                  textAlign: "center",
                  padding: "5mm",
                  borderTop: "2px solid black",
                }}
              >
                <p style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>
                  📌 Teacher’s Signature
                </p>
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                padding: "0mm",
                background: "#e9ecef",
                borderRadius: "5px",
                fontSize: "10px",
                marginTop: "auto",
              }}
            >
              <p style={{ margin: "0", color: "#666" }}>Powered By: {studentData?.school}</p>
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