import React, { useState, useEffect } from "react";

function SchoolsPage() {
    const [schools, setSchools] = useState([]);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_API_URL}/api/schools/`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        })
            .then((res) => res.json())
            .then((data) => setSchools(data))
            .catch((error) => console.error("Error fetching schools:", error));
    }, []);

    return (
        <div className="flex flex-col items-center p-6">
            <h1 className="text-2xl font-bold">Schools & Classes</h1>
            <ul className="w-full border border-gray-300 rounded p-4">
                {schools.length > 0 ? (
                    schools.map((school, index) => (
                        <li key={index} className="p-2 border-b">{school.name}</li>
                    ))
                ) : (
                    <li className="text-gray-500">No schools available.</li>
                )}
            </ul>
        </div>
    );
}

export default SchoolsPage;
