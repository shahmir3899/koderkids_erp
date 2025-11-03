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
        console.log("Fetching student data from:", `${API_URL}/api/students/my-data/`);
        const profileRes = await axios.get(`${API_URL}/api/students/my-data/`, {
          headers: getAuthHeaders(),
        });
        console.log("Profile response:", profileRes.data);

        const data = profileRes.data;
        setStudentData({
          id: data.id,
          name: data.name,
          school: data.school,
          class: data.class,
        });

        // Fetch image after studentData is set
        try {
          console.log("Fetching image for student ID:", data.id);
          const imgRes = await axios.get(
            `${API_URL}/api/get-student-images/?student_id=${data.id}&session_date=${sessionDate}`,
            { headers: getAuthHeaders() }
          );
          console.log("Images response:", imgRes.data);
          if (imgRes.data.images?.length > 0) {
            setCurrentImage(imgRes.data.images[0].url);
          }
        } catch (imgErr) {
          console.warn("No image found or image fetch failed:", imgErr);
          // Don't block UI if image fails
        }
      } catch (err) {
        console.error("Profile fetch failed:", err.response || err);
        setFetchError("Failed to load your profile. Check console.");
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [authLoading, user, sessionDate]);

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
      mimeType: file.type,
      success: (compressed) => {
        const compressedFile = new File([compressed], file.name, { type: file.type });
        setSelectedFile(compressedFile);
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
  if (!currentImage || !studentData?.id) return;

  try {
    const url = new URL(currentImage);
    const filename = url.pathname.split('/').pop();

    await axios.delete(
      `${API_URL}/api/student-progress-images/${studentData.id}/${filename}`,
      { headers: getAuthHeaders() }
    );

    setCurrentImage(null);
    toast.success("Image deleted");
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