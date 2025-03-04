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

            {/* User Info */}
            <p className="text-lg font-bold">👤 {username}</p>
            <p className="text-sm italic">🎭 Role: {role}</p>

            <ul>
                {/* 🔹 Dashboard (Role-Based) */}
                <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                    🏠 <Link to={
                        role === "Admin" ? "/admindashboard" :
                        role === "Teacher" ? "/teacherdashboard" :
                        "/publicdashboard"
                    } className="ml-2">Dashboard</Link>
                </li>

                {/* 🔹 Admin & Teacher Only */}
                {(role === "Admin" || role === "Teacher") && (
                    <>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📋 <Link to="/students" className="ml-2">Students</Link>
                        </li>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            🏫 <Link to="/schools" className="ml-2">Schools & Classes</Link>
                        </li>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📈 <Link to="/progress" className="ml-2">Progress</Link>
                        </li>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📚 <Link to="/lessons" className="ml-2">Lessons</Link>
                        </li>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📊 <Link to="/reports" className="ml-2">Reports</Link>
                        </li>
                    </>
                )}

                {/* 🔹 Admin Only */}
                {role === "Admin" && (
                    <>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            💰 <Link to="/fee" className="ml-2">Fee Management</Link>
                        </li>
                        <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                            📊 <Link to="/reports" className="ml-2">Reports & Analytics</Link>
                        </li>
                    </>
                )}

                {/* 🔹 General Settings */}
                <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                    ⚙️ <Link to="/settings" className="ml-2">Settings</Link>
                </li>

                {/* 🔹 Logout Button */}
                <li className="mb-2 p-2 hover:bg-gray-700 rounded">
                    🔒 <LogoutButton />
                </li>
            </ul>
        </aside>
    );
}

export default Sidebar;
