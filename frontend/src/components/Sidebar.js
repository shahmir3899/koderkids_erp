import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
  faBoxesPacking,
  faChartBar,
} from "@fortawesome/free-solid-svg-icons";
import LogoutButton from "./LogoutButton"; // Assuming this is a custom component

function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const username = localStorage.getItem("username") || "Unknown User";
  const role = localStorage.getItem("role") || "Not Assigned";
  const location = useLocation();

  useEffect(() => {
    if (!sidebarOpen) {
      setFinanceOpen(false);
      setProgressOpen(false);
      setStudentsOpen(false);
      setInventoryOpen(false);
      setCustomOpen(false);
    }
  }, [sidebarOpen]);

  return (
    <aside
      style={{
        height: "100vh",
        backgroundColor: "#111827",
        color: "white",
        padding: "1rem",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "all 300ms ease-in-out",
        width: sidebarOpen ? "16rem" : "4rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          color: "white",
          fontSize: "1.25rem",
          padding: "0.5rem",
          outline: "none",
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? "⬅" : "➲"}
      </button>

      {sidebarOpen && (
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "1rem",
          }}
        >
          Menu
        </h2>
      )}

      {sidebarOpen && (
        <>
          <p
            style={{
              fontSize: "1.125rem",
              fontWeight: 500,
              marginBottom: "0.25rem",
            }}
          >
            👤 {username}
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              fontStyle: "italic",
              marginBottom: "1rem",
            }}
          >
            🎭 Role: {role}
          </p>
        </>
      )}

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {/* Dashboard */}
        <li
          style={{
            padding: "0.5rem",
            borderRadius: "0.25rem",
            transition: "colors 150ms ease-in-out",
            backgroundColor: location.pathname.includes("dashboard") ? "#374151" : "transparent",
          }}
        >
          <Link
            to={
              role === "Admin"
                ? "/admindashboard"
                : role === "Teacher"
                ? "/teacherdashboard"
                : "/publicdashboard"
            }
            style={{ display: "flex", alignItems: "center" }}
          >
            <FontAwesomeIcon icon={faHome} style={{ marginRight: "0.5rem" }} />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
        </li>

        {/* Admin & Teacher Section */}
        {(role === "Admin" || role === "Teacher") && (
          <>
            {/* Students & Fee (Collapsible) */}
            <li
              style={{
                padding: "0.5rem",
                borderRadius: "0.25rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "colors 150ms ease-in-out",
              }}
              onClick={() => sidebarOpen && setStudentsOpen(!studentsOpen)}
              aria-expanded={studentsOpen}
            >
              <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.5rem" }} />
              {sidebarOpen && <span style={{ flex: 1 }}>Students & Fee</span>}
              {sidebarOpen && <span>{studentsOpen ? "▲" : "▼"}</span>}
            </li>
            {studentsOpen && (
              <ul style={{ paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/students" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/students" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Students</span>}
                  </Link>
                </li>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/fee" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/fee" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faWallet} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Fee</span>}
                  </Link>
                </li>
              </ul>
            )}

            {/* Schools */}
            <li
              style={{
                padding: "0.5rem",
                borderRadius: "0.25rem",
                transition: "colors 150ms ease-in-out",
                backgroundColor: location.pathname === "/schools" ? "#374151" : "transparent",
              }}
            >
              <Link to="/schools" style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faSchool} style={{ marginRight: "0.5rem" }} />
                {sidebarOpen && <span>Schools & Classes</span>}
              </Link>
            </li>

            {/* Progress, Lessons & Reports */}
            <li
              style={{
                padding: "0.5rem",
                borderRadius: "0.25rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "colors 150ms ease-in-out",
              }}
              onClick={() => sidebarOpen && setProgressOpen(!progressOpen)}
              aria-expanded={progressOpen}
            >
              <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.5rem" }} />
              {sidebarOpen && <span style={{ flex: 1 }}>Progress, Lessons & Reports</span>}
              {sidebarOpen && <span>{progressOpen ? "▲" : "▼"}</span>}
            </li>
            {progressOpen && (
              <ul style={{ paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/progress" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/progress" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Progress</span>}
                  </Link>
                </li>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/lessons" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/lessons" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faBook} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Lessons</span>}
                  </Link>
                </li>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/reports" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/reports" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Reports</span>}
                  </Link>
                </li>
              </ul>
            )}

            {/* Inventory Section */}
            <li
              style={{
                padding: "0.5rem",
                borderRadius: "0.25rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "colors 150ms ease-in-out",
              }}
              onClick={() => sidebarOpen && setInventoryOpen(!inventoryOpen)}
              aria-expanded={inventoryOpen}
            >
              <FontAwesomeIcon icon={faBoxesPacking} style={{ marginRight: "0.5rem" }} />
              {sidebarOpen && <span style={{ flex: 1 }}>Inventory</span>}
              {sidebarOpen && <span>{inventoryOpen ? "▲" : "▼"}</span>}
            </li>
            {inventoryOpen && (
              <ul style={{ paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/inventory-dashboard" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/inventory-dashboard" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Inventory Dashboard</span>}
                  </Link>
                </li>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/inventory" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/inventory" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faBoxesPacking} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Inventory Mgmt</span>}
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* Admin Only Section */}
        {role === "Admin" && (
          <>
            {/* Finance Section */}
            <li
              style={{
                padding: "0.5rem",
                borderRadius: "0.25rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "colors 150ms ease-in-out",
              }}
              onClick={() => sidebarOpen && setFinanceOpen(!financeOpen)}
              aria-expanded={financeOpen}
            >
              <FontAwesomeIcon icon={faWallet} style={{ marginRight: "0.5rem" }} />
              {sidebarOpen && <span style={{ flex: 1 }}>Finance</span>}
              {sidebarOpen && <span>{financeOpen ? "▲" : "▼"}</span>}
            </li>
            {financeOpen && (
              <ul style={{ paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/finance" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/finance" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Finance Dashboard</span>}
                  </Link>
                </li>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/finance/transactions" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/finance/transactions" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faExchangeAlt} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Transactions</span>}
                  </Link>
                </li>
              </ul>
            )}

            {/* Custom Section */}
            <li
              style={{
                padding: "0.5rem",
                borderRadius: "0.25rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "colors 150ms ease-in-out",
              }}
              onClick={() => sidebarOpen && setCustomOpen(!customOpen)}
              aria-expanded={customOpen}
            >
              <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.5rem" }} />
              {sidebarOpen && <span style={{ flex: 1 }}>Custom</span>}
              {sidebarOpen && <span>{customOpen ? "▲" : "▼"}</span>}
            </li>
            {customOpen && (
              <ul style={{ paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/custom-report" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/custom-report" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Custom Report</span>}
                  </Link>
                </li>
                <li
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                    transition: "colors 150ms ease-in-out",
                    backgroundColor: location.pathname === "/salary-slip" ? "#374151" : "transparent",
                  }}
                >
                  <Link to="/salary-slip" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faWallet} style={{ marginRight: "0.5rem" }} />
                    {sidebarOpen && <span>Salary Slip</span>}
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* 🤖 Robot Chat (Independent) */}
        <li
          style={{
            padding: "0.5rem",
            borderRadius: "0.25rem",
            transition: "colors 150ms ease-in-out",
            backgroundColor: location.pathname === "/robot-chat" ? "#374151" : "transparent",
          }}
        >
          <Link to="/robot-chat" style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: "0.5rem" }}>🤖</span>
            {sidebarOpen && <span>Robot Chat</span>}
          </Link>
        </li>

        {/* 🔐 Logout */}
        <li
          style={{
            padding: "0.5rem",
            borderRadius: "0.25rem",
            display: "flex",
            alignItems: "center",
            transition: "colors 150ms ease-in-out",
          }}
        >
          <FontAwesomeIcon icon={faLock} style={{ marginRight: "0.5rem" }} />
          {sidebarOpen && <LogoutButton />}
        </li>
      </ul>
    </aside>
  );
}

export default Sidebar;