import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { API_URL, getAuthHeaders } from "../api";

const ImageManagementModal = ({ studentId, selectedMonth, startDate, endDate, mode, onClose }) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setErrorMessage("");
      console.log("Fetching images - Starting request", {
        studentId,
        selectedMonth,
        startDate,
        endDate,
        mode,
      });
      try {
        let imageData = [];
        if (mode === "month") {
          const params = { student_id: studentId, month: selectedMonth };
          console.log("Month mode payload:", params);
          const response = await axios.get(`${API_URL}/api/student-progress-images/`, {
            headers: getAuthHeaders(),
            params,
          });
          console.log("Month mode response:", response.data);
          imageData = response.data.progress_images || [];
        } else if (mode === "range") {
          const months = getMonthsBetweenDates(startDate, endDate);
          console.log("Range mode months:", months);
          for (const month of months) {
            const params = { student_id: studentId, month };
            console.log("Range mode payload for month:", params);
            const response = await axios.get(`${API_URL}/api/student-progress-images/`, {
              headers: getAuthHeaders(),
              params,
            });
            console.log("Range mode response for month:", response.data);
            imageData = [...imageData, ...(response.data.progress_images || [])];
          }
          imageData = Array.from(new Set(imageData.map((img) => img.signedURL))).map((url) =>
            imageData.find((img) => img.signedURL === url)
          ); // Deduplicate by signedURL
        }

        // Process images (extract signedURL from objects)
        const validImages = imageData
          .map((img) => ({
            name: img.signedURL.split("/").pop().split("?")[0] || "Unknown",
            url: img.signedURL || "",
          }))
          .filter((img) => img.url);
        console.log("Processed images:", validImages);
        setImages(validImages);
        if (validImages.length === 0) {
          setErrorMessage("No images available for this student.");
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching images:", error.response?.data || error.message);
        setErrorMessage("Failed to load images. Please try again.");
        toast.error(`Failed to load images: ${error.response?.data?.error || error.message}`);
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [studentId, selectedMonth, startDate, endDate, mode]);

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

  const handleDeleteImage = async (filename) => {
    try {
      console.log("Deleting image - Payload:", { studentId, filename });
      await axios.delete(`${API_URL}/api/student-progress-images/${studentId}/${filename}/`, {
        headers: getAuthHeaders(),
      });
      console.log("Delete response:", { status: 204 });
      setImages(images.filter((img) => img.name !== filename));
      toast.success("Image deleted successfully!");
    } catch (error) {
      console.error("Error deleting image:", error.response?.data || error.message);
      const errorMsg =
        error.response?.status === 404
          ? "Image not found."
          : error.response?.status === 403
          ? "You do not have permission to delete this image."
          : "Failed to delete image. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  const extractDateFromFilename = (filename) => {
    const name = filename.split("?")[0];
    const dateMatch = name.match(/(\d{4})-(\d{2})-(\d{2})_/);
    return dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : "Unknown Date";
  };

  if (isLoading) {
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
          <p>Loading images...</p>
        </div>
      </div>
    );
  }

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
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" style={{ marginBottom: "10px" }}>
          Student Images
        </h2>
        {errorMessage && (
          <p style={{ color: "red", marginBottom: "10px" }} role="alert">
            {errorMessage}
          </p>
        )}
        {images.length === 0 ? (
          <p style={{ color: "red", textAlign: "center" }}>No images available for this student.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            {images.map((img, index) => (
              <div
                key={img.url + index}
                style={{
                  width: "100px",
                  height: "130px",
                  position: "relative",
                  border: "2px solid transparent",
                }}
              >
                <img
                  src={img.url}
                  alt={`Image ${index + 1}`}
                  style={{ width: "100%", height: "100px", objectFit: "cover" }}
                  onError={(e) => {
                    e.target.src = "/placeholder.png";
                    e.target.alt = "Image failed to load";
                  }}
                />
                <p style={{ fontSize: "10px", color: "#666", margin: "3px 0", textAlign: "center" }}>
                  {extractDateFromFilename(img.name)}
                </p>
                <button
                  onClick={() => handleDeleteImage(img.name)}
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    background: "red",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  aria-label={`Delete image ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "gray",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageManagementModal;