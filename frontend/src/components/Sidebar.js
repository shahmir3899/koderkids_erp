import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faUsers,
  faSchool,
  faChartLine,
  faBook,
  faFileAlt,
  faWallet,
  faExchangeAlt,
  faLock,
} from "@fortawesome/free-solid-svg-icons";

function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar toggle state
  const [financeOpen, setFinanceOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const username = localStorage.getItem("username") || "Unknown User";
  const role = localStorage.getItem("role") || "Not Assigned";
  const location = useLocation();

  // Auto-collapse submenus when sidebar is collapsed
  useEffect(() => {
    if (!sidebarOpen) {
      setFinanceOpen(false);
      setProgressOpen(false);
    }
  }, [sidebarOpen]);

  return (
    <aside
      className={`h-screen bg-gray-900 text-white p-4 fixed left-0 top-0 transition-all ${
        sidebarOpen ? "w-64" : "w-16"
      }`}
    >
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-white text-xl p-2 focus:outline-none"
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? "⬅" : "➲"}
      </button>

      {/* Navigation Title */}
      {sidebarOpen && <h2 className="text-lg font-bold">Menu</h2>}

      {/* User Info */}
      {sidebarOpen && (
        <>
          <p className="text-lg font-bold">👤 {username}</p>
          <p className="text-sm italic">🎭 Role: {role}</p>
        </>
      )}

      <ul>
        {/* 🔹 Dashboard */}
        <li
          className={`mb-2 p-2 hover:bg-gray-700 rounded ${
            location.pathname.includes("dashboard") ? "bg-gray-700" : ""
          }`}
        >
          <Link
            to={
              role === "Admin"
                ? "/admindashboard"
                : role === "Teacher"
                ? "/teacherdashboard"
                : "/publicdashboard"
            }
            className="flex items-center"
          >
            <FontAwesomeIcon icon={faHome} className="mr-2" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
        </li>

        {/* 🔹 Admin & Teacher Section */}
        {(role === "Admin" || role === "Teacher") && (
          <>
            <li
              className={`mb-2 p-2 hover:bg-gray-700 rounded ${
                location.pathname === "/students" ? "bg-gray-700" : ""
              }`}
            >
              <Link to="/students" className="flex items-center">
                <FontAwesomeIcon icon={faUsers} className="mr-2" />
                {sidebarOpen && <span>Students</span>}
              </Link>
            </li>
            <li
              className={`mb-2 p-2 hover:bg-gray-700 rounded ${
                location.pathname === "/schools" ? "bg-gray-700" : ""
              }`}
            >
              <Link to="/schools" className="flex items-center">
                <FontAwesomeIcon icon={faSchool} className="mr-2" />
                {sidebarOpen && <span>Schools & Classes</span>}
              </Link>
            </li>

            {/* 🔹 Progress, Lessons & Reports (Collapsible) */}
            <li
              className="mb-2 p-2 hover:bg-gray-700 rounded cursor-pointer flex items-center"
              onClick={() => setProgressOpen(!progressOpen)}
              aria-expanded={progressOpen}
            >
              <FontAwesomeIcon icon={faChartLine} className="mr-2" />
              {sidebarOpen && <span className="flex-1">Progress, Lessons & Reports</span>}
              <span>{progressOpen ? "⇨" : "⇩"}</span>
            </li>
            {progressOpen && (
              <ul className="pl-4">
                <li
                  className={`mb-2 p-2 hover:bg-gray-700 rounded ${
                    location.pathname === "/progress" ? "bg-gray-700" : ""
                  }`}
                >
                  <Link to="/progress" className="flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                    {sidebarOpen && <span>Progress</span>}
                  </Link>
                </li>
                <li
                  className={`mb-2 p-2 hover:bg-gray-700 rounded ${
                    location.pathname === "/lessons" ? "bg-gray-700" : ""
                  }`}
                >
                  <Link to="/lessons" className="flex items-center">
                    <FontAwesomeIcon icon={faBook} className="mr-2" />
                    {sidebarOpen && <span>Lessons</span>}
                  </Link>
                </li>
                <li
                  className={`mb-2 p-2 hover:bg-gray-700 rounded ${
                    location.pathname === "/reports" ? "bg-gray-700" : ""
                  }`}
                >
                  <Link to="/reports" className="flex items-center">
                    <FontAwesomeIcon icon={faFileAlt} className="mr-2" />
                    {sidebarOpen && <span>Reports</span>}
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* 🔹 Admin Only Section */}
        {role === "Admin" && (
          <>
            {/* 🔹 Finance (Collapsible) */}
            <li
              className="mb-2 p-2 hover:bg-gray-700 rounded cursor-pointer flex items-center"
              onClick={() => setFinanceOpen(!financeOpen)}
              aria-expanded={financeOpen}
            >
              <FontAwesomeIcon icon={faWallet} className="mr-2" />
              {sidebarOpen && <span className="flex-1">Finance</span>}
              <span>{financeOpen ? "⇨" : "⇩"}</span>
            </li>
            {financeOpen && (
              <ul className="pl-4">
                <li
                  className={`mb-2 p-2 hover:bg-gray-700 rounded ${
                    location.pathname === "/finance" ? "bg-gray-700" : ""
                  }`}
                >
                  <Link to="/finance" className="flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                    {sidebarOpen && <span>Finance Dashboard</span>}
                  </Link>
                </li>
                <li
                  className={`mb-2 p-2 hover:bg-gray-700 rounded ${
                    location.pathname === "/finance/transactions" ? "bg-gray-700" : ""
                  }`}
                >
                  <Link to="/finance/transactions" className="flex items-center">
                    <FontAwesomeIcon icon={faExchangeAlt} className="mr-2" />
                    {sidebarOpen && <span>Transactions</span>}
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* 🔹 Logout Button */}
        <li className="mb-2 p-2 hover:bg-gray-700 rounded flex items-center">
          <FontAwesomeIcon icon={faLock} className="mr-2" />
          {sidebarOpen && <LogoutButton />}
        </li>
      </ul>
    </aside>
  );
}

export default Sidebar;