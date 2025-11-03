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
  const [sessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [fetchError, setFetchError] = useState(null);  // New: Track fetch errors

  useEffect(() => {
    if (authLoading) return;

    const init = async () => {
      if (!user) {
        toast.error("You must be logged in");
        setLoading(false);
        return;
      }
      if (user.role !== "Student") {
        toast.error("Access denied");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching student data...");  // Debug
        const profileRes = await axios.get(`${API_URL}/api/my-student-data/`, {
          headers: getAuthHeaders(),
        });
        console.log("Profile response:", profileRes.data);  // Debug
        const data = profileRes.data;
        setStudentData({
          id: data.id,
          name: data.name || `${user.first_name} ${user.last_name}`.trim(),
          school: data.school,
          class: data.class,
        });

        console.log("Fetching images...");  // Debug
        const imgRes = await axios.get(
          `${API_URL}/api/get-student-images/?student_id=${data.id}&session_date=${sessionDate}`,
          { headers: getAuthHeaders() }
        );
        console.log("Images response:", imgRes.data);  // Debug
        if (imgRes.data.images?.length) {
          setCurrentImage(imgRes.data.images[0].url);
        }
      } catch (err) {
        console.error("Fetch error:", err.response || err);  // Debug
        setFetchError("Failed to load your progress. Check console for details.");
        toast.error("Failed to load your progress");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [authLoading, user, sessionDate]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ClipLoader size={50} color="#3B82F6" />
      </div>
    );
  }

  if (fetchError || !studentData) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">{fetchError || "Access denied or data unavailable."}</p>
      </div>
    );
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processingToast = toast.info("Processing Image...", { autoClose: false });

    new Compressor(file, {
      quality: 0.7,
      maxWidth: 800,
      maxHeight: 800,
      mimeType: file.type,
      success: (compressed) => {
        const compressedFile = new File([compressed], file.name, { type: file.type });
        setSelectedFile(compressedFile);
        toast.dismiss(processingToast);
        toast.success("Image processed successfully!");
      },
      error: (err) => {
        console.error("Compression error:", err);
        toast.dismiss(processingToast);
        toast.error("Failed to process image");
      },
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !studentData?.id) {
      toast.error("Select an image first and ensure profile is loaded");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("student_id", studentData.id);
    formData.append("file", selectedFile);
    formData.append("date", sessionDate);

    try {
      console.log("Uploading image...");  // Debug
      const res = await axios.post(
        `${API_URL}/api/upload-student-image/`,
        formData,
        { headers: getAuthHeaders() }
      );
      console.log("Upload response:", res.data);  // Debug
      if (res.data.signedURL) {
        setCurrentImage(res.data.signedURL);
      }
      setSelectedFile(null);
      toast.success("Uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err.response || err);  // Debug
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImage || !studentData?.id) return;

    const filename= currentImage.split("/").pop().split("?")[0];
    try {
      await axios.delete(
        `${API_URL}/api/student-progress-images/${studentData.id}/${filename}/`,
        { headers: getAuthHeaders() }
      );
      setCurrentImage(null);
      toast.success("Deleted");
    } catch (err) {
      console.error("Delete error:", err);  // Debug
      toast.error("Delete failed");
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
              disabled={!selectedFile || isUploading || !studentData?.id}
              className={`px-6 py-2 rounded-lg text-white ${
                selectedFile && !isUploading && studentData?.id
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