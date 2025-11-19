import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import 'react-toastify/dist/ReactToastify.css';

function AddStudentPopup({ onClose }) {
    const [formData, setFormData] = useState({
        name: "",
        reg_num: "",
        school: "",
        student_class: "",
        monthly_fee: "",
        phone: "",
        date_of_registration: "",
        gender: "",
        password: "",          // ← NEW
        confirm_password: ""   // ← NEW
    });

    const [schools, setSchools] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // New state for submission status

    useEffect(() => {
        async function fetchSchools() {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem("access");
                if (!token) {
                    setError("Authentication token missing. Please log in again.");
                    return;
                }

                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/schools/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const schoolData = response.data.schools || response.data;
                if (Array.isArray(schoolData)) {
                    setSchools(schoolData);
                } else {
                    setError("Unexpected data format from API.");
                }
            } catch (err) {
                setError("Failed to fetch schools.");
                console.error("Error fetching schools:", err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchSchools();
    }, []);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        console.log(`Changing ${name} to ${value}`);
        setFormData(prev => ({ ...prev, [name]: value }));
    };

  

    const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
        console.log("Form Data before submission:", formData);

        const token = localStorage.getItem("access");
        if (!token) {
            toast.error("Authentication error. Please log in again.", {
                position: "top-right",
                autoClose: 3000,
            });
            setIsSubmitting(false);
            return;
        }

        // ─────── Required field validation (updated to include password) ───────
        if (
            !formData.name ||
            !formData.school ||
            !formData.student_class ||
            !formData.monthly_fee ||
            !formData.phone ||
            !formData.date_of_registration ||
            !formData.gender ||
            !formData.password
        ) {
            toast.error("Please fill all required fields, including password.", {
                position: "top-right",
                autoClose: 4000,
            });
            setIsSubmitting(false);
            return;
        }

        // ─────── Password strength and confirmation check ───────
        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters long.", {
                position: "top-right",
                autoClose: 4000,
            });
            setIsSubmitting(false);
            return;
        }

        if (formData.password !== formData.confirm_password) {
            toast.error("Passwords do not match. Please confirm the password correctly.", {
                position: "top-right",
                autoClose: 4000,
            });
            setIsSubmitting(false);
            return;
        }

        // ─────── Prepare clean payload (exclude unnecessary fields) ───────
        const payload = {
            name: formData.name,
            school: parseInt(formData.school),
            student_class: formData.student_class,
            monthly_fee: parseFloat(formData.monthly_fee),
            phone: formData.phone,
            gender: formData.gender,
            password: formData.password,  // ← Critical: sent to backend
            date_of_registration:
                formData.date_of_registration || new Date().toISOString().split("T")[0],
        };

        console.log("Sending to backend:", payload);

        // ─────── API call ───────
        const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/api/students/`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // ─────── Success: Show login credentials clearly ───────
        toast.success(
            <div style={{ lineHeight: "1.6" }}>
                <strong>Student added successfully!</strong>
                <br />
                <strong>Username (Reg#):</strong> {response.data.reg_num}
                <br />
                <strong>Password:</strong> {formData.password}
                <br />
                <small>Student can now log in immediately.</small>
            </div>,
            {
                position: "top-right",
                autoClose: 10000,
                closeButton: true,
            }
        );

        // Close popup after 3 seconds
        setTimeout(() => {
            onClose();
        }, 3000);

    } catch (err) {
        console.error("Error adding student:", err.response?.data || err.message);
        const errorMsg =
            err.response?.data?.error ||
            err.response?.data?.detail ||
            "Failed to add student. Please try again.";
        toast.error(errorMsg, {
            position: "top-right",
            autoClose: 6000,
        });
    } finally {
        setIsSubmitting(false);
    }
};

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h2 className="modal-header">Add New Student</h2>

                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ClipLoader color="#000000" size={50} />
                    </div>
                )}
                {error && <p style={{ color: "red" }}>{error}</p>}

                <div className="input-group">
                    <label className="label">Name:</label>
                    <input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter student name"
                        className="input"
                    />
                </div>

                <div className="input-group">
                    <label className="label">Registration Number:</label>
                    <input
                        name="reg_num"
                        type="text"
                        value={"Auto Generated by system"}
                        disabled
                        placeholder="Auto-generated"
                        className="input"
                    />
                </div>

                <div className="input-group">
                    <label className="label">School:</label>
                    <select
                        name="school"
                        value={formData.school}
                        onChange={handleInputChange}
                        className="input"
                    >
                        <option value="">Select School</option>
                        {schools.map(school => (
                            <option key={school.id} value={school.id}>
                                {school.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label className="label">Class:</label>
                    <input
                        name="student_class"
                        type="text"
                        value={formData.student_class}
                        onChange={handleInputChange}
                        placeholder="Enter class"
                        className="input"
                    />
                </div>

                <div className="input-group">
                    <label className="label">Monthly Fee:</label>
                    <input
                        name="monthly_fee"
                        type="number"
                        value={formData.monthly_fee}
                        onChange={handleInputChange}
                        placeholder="Enter monthly fee"
                        className="input"
                    />
                </div>

                <div className="input-group">
                    <label className="label">Phone:</label>
                    <input
                        name="phone"
                        type="text"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter phone number"
                        className="input"
                    />
                </div>

                <div className="input-group">
                    <label className="label">Gender:</label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="input"
                    >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                                <div className="input-group">
                    <label className="label">
                        Login Password: <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                        name="password"
                        type="password"
                        value={formData.password || ""}
                        onChange={handleInputChange}
                        placeholder="Set strong password for student login"
                        className="input"
                        required
                    />
                </div>

                <div className="input-group">
                    <label className="label">
                        Confirm Password: <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                        name="confirm_password"
                        type="password"
                        value={formData.confirm_password || ""}
                        onChange={handleInputChange}
                        placeholder="Re-type password"
                        className="input"
                        required
                    />
                </div>
                <div className="input-group">
                    <label className="label">Date of Registration:</label>
                    <input
                        type="date"
                        name="date_of_registration"
                        value={formData.date_of_registration}
                        onChange={handleInputChange}
                        className="input"
                    />
                </div>

                <div className="button-group">
                    <button
                        onClick={handleSubmit}
                        className="submit-button"
                        disabled={isSubmitting} // Optional: Disable the button while submitting
                    >
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                    <button onClick={onClose} className="cancel-button">Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default AddStudentPopup;