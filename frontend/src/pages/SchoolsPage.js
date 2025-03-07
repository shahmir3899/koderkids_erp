import React, { useState, useEffect } from "react";
import { getSchoolsWithClasses } from "../api";

function SchoolsPage() {
    const [schools, setSchools] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const schoolsWithClasses = await getSchoolsWithClasses();
                setSchools(schoolsWithClasses);
            } catch (err) {
                setError(err.message || "Failed to load schools. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <p className="text-gray-500 p-6">Loading schools...</p>;
    if (error) return <p className="text-red-500 p-6">{error}</p>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Schools & Classes Overview</h1>
            {schools.length > 0 ? (
                <div className="space-y-6">
                    {schools.map((school) => {
                        // Calculate total students for the school
                        const totalStudents = school.classes.reduce((sum, cls) => sum + cls.strength, 0);

                        return (
                            <div key={school.name} className="border p-4 rounded-lg shadow">
                                <h2 className="text-xl font-semibold">{school.name}</h2>
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