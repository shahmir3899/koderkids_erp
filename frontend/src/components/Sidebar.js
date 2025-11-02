import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTachometerAlt,
  faUsers,
  faUser,
  faSchool,
  faChartLine,
  faChalkboardUser,
  faRobot,
  faFileAlt,
  faFileInvoiceDollar,
  faExchangeAlt,
  faLock,
  faBoxesPacking,
  faChartBar,
  faGraduationCap,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import LogoutButton from "./LogoutButton"; // Assuming this is a custom component

function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false); // Recovered collapsible section
  const [hoveredItem, setHoveredItem] = useState(null);

  const username = localStorage.getItem("fullName") || "Unknown";
  const role = localStorage.getItem("role") || "Unknown";
  const location = useLocation();

  useEffect(() => {
    if (!sidebarOpen) {
      setFinanceOpen(false);
      setStudentsOpen(false);
      setInventoryOpen(false);
      setCustomOpen(false);
      setProgressOpen(false);
    }
  }, [sidebarOpen]);

  const getItemStyle = (isSelected, itemId) => ({
    padding: "0.75rem",
    borderRadius: "0.5rem",
    transition: "background-color 150ms ease-in-out",
    backgroundColor: isSelected ? "#C4B5FD" : (hoveredItem === itemId ? "#7C3AED" : "#5B21B6"),
    fontWeight: isSelected ? 600 : 500,
    cursor: "pointer",
  });

  return (
    <aside
      style={{
        height: "100vh",
        backgroundColor: "#6D28D9",
        color: "white",
        padding: "1.5rem 1rem",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "all 300ms ease-in-out",
        width: sidebarOpen ? "16rem" : "4rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    > 
      {/* Toggle Button */}
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
          position: "absolute",
          right: "1rem",
          top: "1rem",
        }}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? "⇽" : "→"}
      </button>

      {/* Conditional Logo Section */}
      {sidebarOpen && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "1.5rem",
            fontSize: "1.125rem",
            fontWeight: 600,
          }}
        >
          <img
            src="whiteLogo.png"
            alt="KoderKids Logo"
            style={{ width: "8rem", height: "4rem", marginRight: "0.5rem" }}
          />
        </div>
      )}
      {!sidebarOpen && (
        <div style={{ height: "5.5rem" }} /> // Spacer matching logo height (4rem) + marginBottom (1.5rem)
      )}

      {/* Menu List - Scrollable */}
      <ul
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingBottom: "4rem",
        }}
      >
        {/* Hide scrollbar in WebKit */}
        <style>
          {`
            ul::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        {/* Dashboard */}
        <li
          style={getItemStyle(location.pathname.includes("dashboard"), "dashboard")}
          onMouseEnter={() => setHoveredItem("dashboard")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Link
            to={
              role === "Admin"
                ? "/admindashboard"
                : role === "Teacher"
                ? "/teacherdashboard"
                : role === "Student"
                ? "/student-dashboard"
                : "/publicdashboard"
            }
            style={{ display: "flex", alignItems: "center" }}
          >
            <FontAwesomeIcon icon={faTachometerAlt} style={{ marginRight: "0.75rem" }} />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
        </li>

        {/* Admin & Teacher Section */}
        {(role === "Admin" || role === "Teacher") && (
          <>
            {/* Students & Fee */}
            <li
              style={getItemStyle(false, "students-fee")}
              onMouseEnter={() => setHoveredItem("students-fee")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setStudentsOpen(!studentsOpen)}
              aria-expanded={studentsOpen}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Students & Fee</span>}
                {sidebarOpen && <span>{studentsOpen ? "▲" : "▼"}</span>}
              </div>
            </li>
            {studentsOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li
                  style={getItemStyle(location.pathname === "/students", "students")}
                  onMouseEnter={() => setHoveredItem("students")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/students" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faUser} style={{ marginRight: "0.75rem" }} />
                    <span>Students</span>
                  </Link>
                </li>
                <li
                  style={getItemStyle(location.pathname === "/fee", "fee")}
                  onMouseEnter={() => setHoveredItem("fee")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/fee" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ marginRight: "0.75rem" }} />
                    <span>Fee</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* School & Classes */}
            <li
              style={getItemStyle(location.pathname === "/schools", "schools")}
              onMouseEnter={() => setHoveredItem("schools")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link to="/schools" style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faSchool} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span>School & Classes</span>}
              </Link>
            </li>

            {/* Recovered Progress, Lessons & Reports (Collapsible) */}
            <li
              style={getItemStyle(false, "progress")}
              onMouseEnter={() => setHoveredItem("progress")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setProgressOpen(!progressOpen)}
              aria-expanded={progressOpen}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faUser} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Students Data</span>}
                {sidebarOpen && <span>{progressOpen ? "▲" : "▼"}</span>}
              </div>
            </li>
            {progressOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li
                  style={getItemStyle(location.pathname === "/progress", "progress-sub")}
                  onMouseEnter={() => setHoveredItem("progress-sub")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/progress" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.75rem" }} />
                    <span>Progress</span>
                  </Link>
                </li>
                <li
                  style={getItemStyle(location.pathname === "/lessons", "lessons")}
                  onMouseEnter={() => setHoveredItem("lessons")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/lessons" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChalkboardUser} style={{ marginRight: "0.75rem" }} />
                    <span>Lessons</span>
                  </Link>
                </li>
                <li
                  style={getItemStyle(location.pathname === "/reports", "report")}
                  onMouseEnter={() => setHoveredItem("report")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/reports" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "0.75rem" }} />
                    <span>Report</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* Inventory */}
            <li
              style={getItemStyle(false, "inventory")}
              onMouseEnter={() => setHoveredItem("inventory")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setInventoryOpen(!inventoryOpen)}
              aria-expanded={inventoryOpen}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faBoxesPacking} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Inventory</span>}
                {sidebarOpen && <span>{inventoryOpen ? "▲" : "▼"}</span>}
              </div>
            </li>
            {inventoryOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li
                  style={getItemStyle(location.pathname === "/inventory-dashboard", "invt-dashboard")}
                  onMouseEnter={() => setHoveredItem("invt-dashboard")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/inventory-dashboard" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "0.75rem" }} />
                    <span>Invt Dashboard</span>
                  </Link>
                </li>
                <li
                  style={getItemStyle(location.pathname === "/inventory", "invt-mgmt")}
                  onMouseEnter={() => setHoveredItem("invt-mgmt")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/inventory" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faBoxesPacking} style={{ marginRight: "0.75rem" }} />
                    <span>Invt Mgmt</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {role === "Admin" && (
          <>
            {/* Finance */}
            <li
              style={getItemStyle(false, "finance")}
              onMouseEnter={() => setHoveredItem("finance")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setFinanceOpen(!financeOpen)}
              aria-expanded={financeOpen}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faWallet} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Finance</span>}
                {sidebarOpen && <span>{financeOpen ? "▲" : "▼"}</span>}
              </div>
            </li>
            {financeOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li
                  style={getItemStyle(location.pathname === "/finance", "fin-dashboard")}
                  onMouseEnter={() => setHoveredItem("fin-dashboard")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/finance" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "0.75rem" }} />
                    <span>Fin Dashboard</span>
                  </Link>
                </li>
                <li
                  style={getItemStyle(location.pathname === "/finance/transactions", "transactions")}
                  onMouseEnter={() => setHoveredItem("transactions")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/finance/transactions" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faExchangeAlt} style={{ marginRight: "0.75rem" }} />
                    <span>Transactions</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* Custom */}
            <li
              style={getItemStyle(false, "custom")}
              onMouseEnter={() => setHoveredItem("custom")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setCustomOpen(!customOpen)}
              aria-expanded={customOpen}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Custom</span>}
                {sidebarOpen && <span>{customOpen ? "▲" : "▼"}</span>}
              </div>
            </li>
            {customOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li
                  style={getItemStyle(location.pathname === "/custom-report", "custom-report")}
                  onMouseEnter={() => setHoveredItem("custom-report")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/custom-report" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.75rem" }} />
                    <span>Custom Report</span>
                  </Link>
                </li>
                <li
                  style={getItemStyle(location.pathname === "/salary-slip", "salary-slip")}
                  onMouseEnter={() => setHoveredItem("salary-slip")}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link to="/salary-slip" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ marginRight: "0.75rem" }} />
                    <span>Salary Slip</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}
        {/* ✅ STUDENT DASHBOARD - NEW
        {role === "Student" && (
          <li
            style={getItemStyle(location.pathname === "/student-dashboard", "student-dashboard")}
            onMouseEnter={() => setHoveredItem("student-dashboard")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link to="/student-dashboard" style={{ display: "flex", alignItems: "center" }}>
              <FontAwesomeIcon icon={faGraduationCap} style={{ marginRight: "0.75rem" }} />
              {sidebarOpen && <span>My Dashboard</span>}
            </Link>
          </li>
        )} */}
        {/* Robot Chat */}
        <li
          style={getItemStyle(location.pathname === "/robot-chat", "robot-chat")}
          onMouseEnter={() => setHoveredItem("robot-chat")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Link to="/robot-chat" style={{ display: "flex", alignItems: "center" }}>
  <FontAwesomeIcon icon={faRobot} style={{ marginRight: "0.75rem" }} />
  {sidebarOpen && <span>Robot Chat</span>}
</Link>
        </li>
      </ul>

      {/* Bottom Footer - Name/Role and Logout */}
      {sidebarOpen && (
        <div
          style={{
            backgroundColor: "#6D28D9",
            padding: "1rem 0 0.5rem",
            marginTop: "auto",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{username}</p>
            <p style={{ fontSize: "0.875rem", fontStyle: "italic", margin: 0 }}>{role}</p>
          </div>
          <LogoutButton style={{ backgroundColor: "red", color: "white", padding: "0.5rem 1rem", borderRadius: "0.25rem" }} />
        </div>
      )}
      {!sidebarOpen && (
        <div
          style={{
            marginTop: "auto",
            padding: "0.75rem 0",
          }}
        >
          <FontAwesomeIcon icon={faLock} style={{ display: "block", textAlign: "center" }} />
        </div>
      )}
    </aside>
  );
}

export default Sidebar;