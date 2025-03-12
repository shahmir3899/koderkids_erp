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
        gender: ""
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

    useEffect(() => {
        async function fetchStudentsAndGenerateRegNum() {
            if (!formData.school) {
                setFormData(prev => ({ ...prev, reg_num: "" }));
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem("access");
                if (!token) {
                    setError("Authentication token missing. Please log in again.");
                    return;
                }

                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/students/`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { school: formData.school }
                });

                const studentList = response.data.students || response.data || [];
                setStudents(studentList);

                const year = new Date().getFullYear().toString().slice(-2);
                const kkPrefix = "KK";
                const selectedSchool = schools.find(s => s.id === parseInt(formData.school));
                const schoolInitials = selectedSchool ? getSchoolInitials(selectedSchool.name) : "";
                const baseRegNum = `${year}-${kkPrefix}-${schoolInitials}-`;

                const allRegNums = studentList
                    .map(student => student.reg_num)
                    .filter(reg => reg && reg.includes(`-${kkPrefix}-${schoolInitials}-`))
                    .map(reg => parseInt(reg.split("-").pop(), 10) || 0);

                const nextNumber = allRegNums.length > 0 
                    ? Math.max(...allRegNums) + 1
                    : 1 + 32;
                const paddedNumber = String(nextNumber).padStart(3, "0");
                const newRegNum = `${baseRegNum}${paddedNumber}`;

                setFormData(prev => ({ ...prev, reg_num: newRegNum }));
            } catch (err) {
                setError("Failed to fetch students. Using default reg_num.");
                console.error("Error fetching students:", err.response?.data || err.message);
                const selectedSchool = schools.find(s => s.id === parseInt(formData.school));
                const schoolInitials = selectedSchool ? getSchoolInitials(selectedSchool.name) : "";
                setFormData(prev => ({ ...prev, reg_num: `25-KK-${schoolInitials}-033` }));
            } finally {
                setLoading(false);
            }
        }
        fetchStudentsAndGenerateRegNum();
    }, [formData.school, schools]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        console.log(`Changing ${name} to ${value}`);
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const getSchoolInitials = (schoolName) => {
        if (!schoolName) return "";
        const words = schoolName.trim().split(" ");
        if (words.length === 1) {
            return words[0].toUpperCase();
        }
        return words
            .map(word => word.charAt(0).toUpperCase())
            .join("")
            .slice(0, 5);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true); // Set submitting state to true
        try {
            console.log("Form Data before submission:", formData);
            const token = localStorage.getItem("access");
            if (!token) {
                toast.error("Authentication error. Please log in again.", {
                    position: "top-right",
                    autoClose: 3000,
                });
                setIsSubmitting(false); // Reset submitting state
                return;
            }

            if (!formData.name || !formData.school || !formData.student_class || 
                !formData.monthly_fee || !formData.phone || !formData.date_of_registration || 
                !formData.gender) {
                toast.error("Please fill all fields.", {
                    position: "top-right",
                    autoClose: 3000,
                });
                setIsSubmitting(false); // Reset submitting state
                return;
            }

            const studentData = {
                ...formData,
                school: parseInt(formData.school),
                date_of_registration: formData.date_of_registration || new Date().toISOString().split('T')[0]
            };

            console.log("Sending to backend:", studentData);
            await axios.post(`${process.env.REACT_APP_API_URL}/api/students/`, studentData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            toast.success("Student added successfully!", {
                position: "top-right",
                autoClose: 3000,
            });

            setTimeout(() => {
                onClose();
            }, 3000);
        } catch (err) {
            console.error("Error adding student:", err.response?.data || err.message);
            toast.error(`Failed to add student! ${err.response?.data?.detail || "Check console."}`, {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setIsSubmitting(false); // Reset submitting state in all cases
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
                        value={formData.reg_num}
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