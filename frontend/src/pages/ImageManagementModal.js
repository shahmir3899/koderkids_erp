import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { API_URL, getAuthHeaders } from "../api";

// Custom SVG placeholder for failed image loads
const PlaceholderSVG = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="10" fill="#e0e0e0" />
    <path d="M30 30 L70 70 M70 30 L30 70" stroke="#666" strokeWidth="5" />
    <text x="50" y="50" fontSize="12" textAnchor="middle" fill="#666">Image Unavailable</text>
  </svg>
);

const ImageManagementModal = ({ studentId, selectedMonth, startDate, endDate, mode, onClose }) => {
  const [images, setImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]); // Track selected images
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const imageRefs = useRef({}); // Ref for lazy loading

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      setErrorMessage("");
      console.log("Fetching images - Starting request", { studentId, selectedMonth, startDate, endDate, mode });
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
          );
        }

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

  const handleImageSelect = (img) => {
    if (selectedImages.includes(img.url)) {
      setSelectedImages(selectedImages.filter((url) => url !== img.url));
    } else if (selectedImages.length < 4) {
      setSelectedImages([...selectedImages, img.url]);
    } else {
      toast.error("You can only select up to 4 images.");
    }
  };

  const handleConfirmSelection = () => {
    onClose(selectedImages); // Pass selected images back
  };

  const handleDeleteImage = async (filename) => {
    if (window.confirm("Are you sure you want to delete this image?")) {
      try {
        console.log("Deleting image - Payload:", { studentId, filename });
        await axios.delete(`${API_URL}/api/student-progress-images/${studentId}/${filename}/`, {
          headers: getAuthHeaders(),
        });
        console.log("Delete response:", { status: 204 });
        setImages(images.filter((img) => img.name !== filename));
        setSelectedImages(selectedImages.filter((url) => !images.find((img) => img.name === filename)?.url));
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
    }
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

  const extractDateFromFilename = (filename) => {
    const name = filename.split("?")[0];
    const dateMatch = name.match(/(\d{4})-(\d{2})-(\d{2})_/);
    return dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : "Unknown Date";
  };

  // Lazy loading intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imageRefs.current[entry.target.dataset.index]) {
            entry.target.src = entry.target.dataset.src;
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "50px", threshold: 0.1 }
    );

    Object.values(imageRefs.current).forEach((img) => {
      if (img) observer.observe(img);
    });

    return () => observer.disconnect();
  }, [images]);

  if (isLoading) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.5)", // Transparent overlay
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #e0e0e0 0%, #d3e0ea 100%)", // Grey to blue gradient on modal
            padding: "20px",
            borderRadius: "12px",
            maxWidth: "600px",
            width: "90%",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p style={{ textAlign: "center", color: "#333" }}>Loading images...</p>
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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.5)", // Transparent overlay
      }}
      role="dialog"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #e0e0e0 0%, #d3e0ea 100%)", // Grey to blue gradient on modal
          padding: "20px",
          borderRadius: "12px",
          maxWidth: "800px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" style={{ marginBottom: "10px", fontSize: "1.5rem", color: "#333" }}>
          Student Images
        </h2>
        {errorMessage && (
          <p style={{ color: "#dc3545", marginBottom: "10px", fontWeight: "bold", animation: "blink 1s infinite" }}>
            {errorMessage}
            <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
          </p>
        )}
        {images.length === 0 && !isLoading ? (
          <p style={{ color: "#dc3545", textAlign: "center", fontWeight: "bold" }}>
            No images available for this student.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "15px",
              marginBottom: "15px",
              padding: "10px",
              "@media (max-width: 600px)": {
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              },
            }}
          >
            {images.map((img, index) => (
              <div
                key={img.url + index}
                style={{
                  width: "120px",
                  height: "150px",
                  position: "relative",
                  borderRadius: "8px",
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  boxShadow: selectedImages.includes(img.url) ? "0 0 10px #007bff" : "0 2px 4px rgba(0, 0, 0, 0.1)",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                  },
                }}
                onClick={(e) => {
                  if (e.target.tagName !== "BUTTON") handleImageSelect(img); // Avoid triggering on button click
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedImages.includes(img.url)}
                  onChange={() => handleImageSelect(img)} // Keep for accessibility
                  style={{
                    position: "absolute",
                    top: "5px",
                    left: "5px",
                    width: "20px",
                    height: "20px",
                    cursor: "pointer",
                    zIndex: 10,
                  }}
                  aria-label={`Select image ${index + 1}`}
                />
                <img
                  ref={(el) => (imageRefs.current[index] = el)}
                  data-index={index}
                  data-src={img.url}
                  src={imageRefs.current[index] ? "" : img.url} // Lazy load
                  alt={`Image ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "120px",
                    objectFit: "cover",
                    display: isLoading ? "none" : "block",
                    opacity: 0,
                    animation: "fadeIn 0.5s forwards",
                  }}
                  onLoad={(e) => {
                    console.log(`Image ${index} loaded`);
                    e.target.style.opacity = 1;
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = <PlaceholderSVG />;
                  }}
                />
                <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
                <div
                  style={{
                    textAlign: "center",
                    padding: "5px",
                    fontSize: "12px",
                    color: "#666",
                    background: "rgba(255, 255, 255, 0.8)",
                    borderRadius: "0 0 8px 8px",
                  }}
                >
                  {extractDateFromFilename(img.name)}
                </div>
                <button
                  onClick={() => handleDeleteImage(img.name)}
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    background: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.3s",
                    "&:hover": {
                      background: "#bd2130",
                    },
                    zIndex: 20, // Ensure it stays above the checkbox
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
            onClick={handleConfirmSelection}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(90deg, #007bff, #0056b3)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              marginRight: "10px",
              transition: "all 0.3s",
              "&:hover": {
                background: "linear-gradient(90deg, #0056b3, #003366)",
                transform: "scale(1.05)",
              },
            }}
            aria-label={`Confirm ${selectedImages.length} selected images`}
          >
            Confirm Selection ({selectedImages.length}/4)
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.3s",
              "&:hover": {
                background: "#5a6268",
                transform: "scale(1.05)",
              },
            }}
            aria-label="Close modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageManagementModal;