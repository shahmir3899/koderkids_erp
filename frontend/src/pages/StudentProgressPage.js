// StudentProgressPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { useAuth } from "../auth";
import Compressor from "compressorjs";
import { getAuthHeaders } from "../api";

const API_URL = process.env.REACT_APP_API_URL;

const StudentProgressPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [sessionDate] = useState(new Date().toISOString().split("T")[0]);

useEffect(() => {
  if (authLoading) return;

  const init = async () => {
    try {
      // 1. Get profile
      const profileRes = await axios.get(`${API_URL}/api/students/my-data/`, {
        headers: getAuthHeaders(),
      });
      const data = profileRes.data;

      const student = {
        id: data.id,
        name: data.name,
        school: data.school,
        class: data.class,
      };
      setStudentData(student);

      // 2. Get image using correct endpoint
      const imgRes = await axios.get(`${API_URL}/api/student-images/`, {
        headers: getAuthHeaders(),
        params: {
          school: student.school,
          class: student.class,
          session_date: sessionDate,
          student_id: student.id,
        },
      });

      const images = imgRes.data?.images || [];
      if (images.length > 0) {
        setCurrentImage(images[0]);
      }
    } catch (err) {
      console.error("Fetch failed:", err.response || err);
      toast.error("Failed to load profile or image");
    } finally {
      setLoading(false);
    }
  };

  init();
}, [authLoading, sessionDate]);

  // -----------------------------------------------------------------
  // RENDER: Loading
  // -----------------------------------------------------------------
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="#3B82F6" />
      </div>
    );
  }

  // -----------------------------------------------------------------
  // RENDER: Error
  // -----------------------------------------------------------------
  if (fetchError) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500 text-center">{fetchError}</p>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // RENDER: CRITICAL — Wait for studentData before accessing .name
  // -----------------------------------------------------------------
  if (!studentData) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading student profile...</p>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // SAFE: studentData exists → render UI
  // -----------------------------------------------------------------
  const handleFileSelect = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const processingToast = toast.info("Processing image...", { autoClose: false });

  new Compressor(file, {
    quality: 0.7,
    maxWidth: 800,
    maxHeight: 800,
    success: (compressed) => {
      // FORCE .jpg
      const baseName = file.name.split('.').slice(0, -1).join('.') || 'image';
      const jpgFile = new File([compressed], `${baseName}.jpg`, {
        type: 'image/jpeg',
      });

      setSelectedFile(jpgFile);
      toast.dismiss(processingToast);
      toast.success("Image ready!");
    },
    error: () => {
      toast.dismiss(processingToast);
      toast.error("Failed to process image");
    },
  });
};

  const handleUpload = async () => {
  if (!selectedFile || !studentData?.id) {
    toast.error("Please select an image");
    return;
  }

  setIsUploading(true);
  const formData = new FormData();

  formData.append("student_id", studentData.id);
  formData.append("image", selectedFile);        // ← MUST BE "image"
  formData.append("session_date", sessionDate);  // ← MUST BE "session_date"

  try {
    console.log("Uploading with payload:", {
      student_id: studentData.id,
      session_date: sessionDate,
      file: selectedFile.name
    });

    const res = await axios.post(
      `${API_URL}/api/upload-student-image/`,
      formData,
      { headers: getAuthHeaders() }
    );

    console.log("Upload success:", res.data);

    // Backend returns: image_url
    setCurrentImage(res.data.image_url);
    setSelectedFile(null);
    toast.success("Uploaded successfully!");
  } catch (err) {
    console.error("Upload error:", err.response?.data || err);
    toast.error(err.response?.data?.error || "Upload failed");
  } finally {
    setIsUploading(false);
  }
};

 const handleDelete = async () => {
  if (!currentImage || !studentData?.id) {
    toast.error("No image to delete.");
    return;
  }

  let filename = null;

  try {
    // Parse URL safely
    const url = new URL(currentImage);
    const pathParts = url.pathname.split("/");
    filename = pathParts[pathParts.length - 1]; // Safely get last part

    // Remove query parameters (e.g., ?token=abc)
    const queryIndex = filename.indexOf("?");
    if (queryIndex !== -1) {
      filename = filename.substring(0, queryIndex);
    }

    // If still empty or invalid, fallback
    if (!filename || filename.trim() === "") {
      throw new Error("Invalid filename from URL");
    }
  } catch (err) {
    // Fallback: assume currentImage is already a filename (e.g., from upload response)
    filename = typeof currentImage === "string" ? currentImage : null;
    if (!filename) {
      toast.error("Invalid image URL or filename.");
      return;
    }

    // Clean query params just in case
    const queryIndex = filename.indexOf("?");
    if (queryIndex !== -1) {
      filename = filename.substring(0, queryIndex);
    }
  }

  // --- Now safely force .jpg ---
  if (typeof filename !== "string") {
    toast.error("Invalid filename format.");
    return;
  }

  const lowerFilename = filename.toLowerCase();
  if (!lowerFilename.endsWith('.jpg')) {
    // Strip extension and force .jpg
    const dotIndex = filename.lastIndexOf('.');
    filename = (dotIndex !== -1 ? filename.substring(0, dotIndex) : filename) + '.jpg';
  }

  // --- Final validation ---
  if (!/^\d{4}-\d{2}-\d{2}_[a-zA-Z0-9]+\.jpg$/.test(filename)) {
    toast.error("Filename format not supported for deletion.");
    return;
  }

  try {
    const deleteUrl = `${API_URL}/api/student-progress-images/${studentData.id}/${filename}/`;
    console.log("Deleting:", deleteUrl);

    await axios.delete(deleteUrl, { headers: getAuthHeaders() });

    setCurrentImage(null);
    toast.success("Image deleted!");
  } catch (err) {
    console.error("Delete failed:", err.response || err);
    toast.error(err.response?.data?.error || "Failed to delete image");
  }
};

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">My Daily Progress</h1>

        <div className="mb-6 text-center text-gray-700">
          <p className="text-lg"><strong>{studentData.name}</strong></p>
          <p>{studentData.school} • Class {studentData.class}</p>
          <p className="text-sm text-gray-500 mt-2">Date: {sessionDate}</p>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4 text-center">
            Upload Today’s Progress
          </h3>

          {currentImage ? (
            <div className="flex flex-col items-center gap-4 mb-6">
              <img
                src={currentImage}
                alt="Progress"
                className="w-64 h-64 object-cover rounded-lg border shadow-lg"
              />
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete Image
              </button>
            </div>
          ) : (
            <p className="text-center text-gray-500 italic mb-6">
              No image uploaded.
            </p>
          )}

          <div className="flex justify-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="upload-input"
            />
            <label
              htmlFor="upload-input"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600"
            >
              Choose Image
            </label>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={`px-6 py-2 rounded-lg text-white ${
                selectedFile && !isUploading
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgressPage;