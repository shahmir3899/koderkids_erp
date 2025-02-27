import React from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

function Sidebar() {
    const username = localStorage.getItem("username") || "Unknown User";
    const role = localStorage.getItem("role") || "Not Assigned";

    console.log("Sidebar User Data:", username, role);

    return (
        <aside className="w-64 h-screen bg-gray-900 text-white p-4 fixed left-0 top-0">
            <h2 className="text-lg font-bold mb-4">Navigation</h2>

            <p className="text-lg font-bold">👤 {username}</p>
            <p className="text-sm italic">🎭 Role: {role}</p>

            <ul>
                <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                    🏠 <Link to="/" className="ml-2">Home</Link>
                </li>

                {(role === "Admin" || role === "Teacher") && (
                    <>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📋 <Link to="/students" className="ml-2">Students</Link>
                        </li>

                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            🏫 <Link to="/schools" className="ml-2">Schools & Classes</Link>
                        </li>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📈 <Link to="/progress">Progress</Link></li>  {/* ✅ Restore Progress Page */}
                             {/* ✅ New Reports Page Button */}
        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
            📊 <Link to="/reports" className="ml-2">Reports</Link>
        </li>

                        {/* ✅ New Lessons Page Button */}
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📚 <Link to="/lessons" className="ml-2">Lessons</Link>
                        </li>
                    </>
                )}

                {role === "Admin" && (
                    <>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            💰 <Link to="/fee" className="ml-2">Fee</Link>
                        </li>

                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📊 <Link to="/reports" className="ml-2">Reports & Analytics</Link>
                        </li>
                    </>
                )}

                <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                    ⚙️ <Link to="/settings" className="ml-2">Settings</Link>
                </li>

                <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                    🔒 <LogoutButton />
                </li>
            </ul>
        </aside>
    );
}

export default Sidebar;
