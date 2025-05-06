import React, { useState, useEffect } from "react";
import { getSchoolsWithClasses } from "../api";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

function SchoolsPage() {
    const [schools, setSchools] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const schoolsWithClasses = await getSchoolsWithClasses();
                if (!Array.isArray(schoolsWithClasses)) {
                    throw new Error("Invalid data format received from API.");
                }
                setSchools(schoolsWithClasses);
            } catch (err) {
                const errorMessage = err.message || "Failed to load schools. Please try again.";
                setError(errorMessage);
                toast.error(errorMessage);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);
        setLoading(true);
        setIsRetrying(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6 min-h-screen bg-gray-100">
                <ClipLoader color="#000000" size={50} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-500 flex flex-col items-center">
                <p>{error}</p>
                <button
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    aria-label="Retry fetching schools data"
                >
                    {isRetrying ? "Retrying..." : "Retry"}
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Schools & Classes Overview</h1>
            {schools.length > 0 ? (
                <div className="space-y-6">
                    {schools.map((school) => {
                        const totalStudents = school.classes.reduce((sum, cls) => sum + cls.strength, 0);

                        return (
                            <div key={school.id} className="border p-4 rounded-lg shadow">
                                <h2 className="text-xl font-semibold">{school.name}</h2>
                                <p className="text-gray-600">ID: {school.id}</p>
                                <p className="text-gray-600">{school.address}</p>
                                <p className="text-lg font-medium mt-2">Total Students: {totalStudents}</p>
                                <h3 className="text-lg font-medium mt-2">Classes & Strength</h3>
                                <ul className="border border-gray-300 rounded p-2">
                                    {school.classes.length > 0 ? (
                                        school.classes.map((cls, idx) => (
                                            <li key={idx} className="p-1 border-b flex justify-between">
                                                <span>{cls.className}</span>
                                                <span className="font-bold">{cls.strength} students</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-500">No classes available.</li>
                                    )}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-500">No schools available.</p>
            )}
        </div>
    );
}

export default SchoolsPage;