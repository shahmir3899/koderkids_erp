import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
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
import LogoutButton from "./LogoutButton";

function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [studentsDataOpen, setStudentsDataOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const username = localStorage.getItem("fullName") || "Unknown";
  const role = localStorage.getItem("role") || "Unknown";
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sidebarOpen) {
      setFinanceOpen(false);
      setStudentsOpen(false);
      setInventoryOpen(false);
      setCustomOpen(false);
      setStudentsDataOpen(false);
    }
  }, [sidebarOpen]);

  // Fixed: Toggle for non-students, navigate for students
  const handleStudentsDataClick = () => {
    if (user?.role === "Student") {
      navigate("/student-progress");
    } else {
      setStudentsDataOpen(prev => !prev);
    }
  };

  const getItemStyle = (isSelected, itemId) => ({
    padding: "0.75rem",
    borderRadius: "0.5rem",
    transition: "background-color 150ms ease-in-out",
    backgroundColor: isSelected
      ? "#C4B5FD"
      : hoveredItem === itemId
      ? "#7C3AED"
      : "#5B21B6",
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
      {/* Toggle */}
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
      >
        {sidebarOpen ? "Left Arrow" : "Right Arrow"}
      </button>

      {/* Logo */}
      {sidebarOpen && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
          <img src="whiteLogo.png" alt="Logo" style={{ width: "8rem", height: "4rem" }} />
        </div>
      )}
      {!sidebarOpen && <div style={{ height: "5.5rem" }} />}

      {/* Menu */}
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
        <style>{`ul::-webkit-scrollbar { display: none; }`}</style>

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

        {/* Students & Fee - Admin/Teacher */}
        {(role === "Admin" || role === "Teacher") && (
          <>
            <li
              style={getItemStyle(false, "students-fee")}
              onMouseEnter={() => setHoveredItem("students-fee")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setStudentsOpen(!studentsOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Students & Fee</span>}
                {sidebarOpen && <span>{studentsOpen ? "Up Arrow" : "Down Arrow"}</span>}
              </div>
            </li>
            {studentsOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                <li style={getItemStyle(location.pathname === "/students", "students")}>
                  <Link to="/students" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faUser} style={{ marginRight: "0.75rem" }} />
                    <span>Students</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/fee", "fee")}>
                  <Link to="/fee" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ marginRight: "0.75rem" }} />
                    <span>Fee</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* School & Classes - Admin/Teacher */}
        {(role === "Admin" || role === "Teacher") && (
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
        )}

        {/* Students Data (Progress, Lessons, Report) - Admin/Teacher */}
        {(role === "Admin" || role === "Teacher") && (
          <>
            <li
              style={getItemStyle(false, "students-data")}
              onMouseEnter={() => setHoveredItem("students-data")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={handleStudentsDataClick}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Students Data</span>}
                {sidebarOpen && <span>{studentsDataOpen ? "Up Arrow" : "Down Arrow"}</span>}
              </div>
            </li>
            {studentsDataOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                <li style={getItemStyle(location.pathname === "/progress", "progress")}>
                  <Link to="/progress" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.75rem" }} />
                    <span>Progress</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/lessons", "lessons")}>
                  <Link to="/lessons" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChalkboardUser} style={{ marginRight: "0.75rem" }} />
                    <span>Lessons</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/reports", "report")}>
                  <Link to="/reports" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "0.75rem" }} />
                    <span>Report</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* Inventory - Admin/Teacher */}
        {(role === "Admin" || role === "Teacher") && (
          <>
            <li
              style={getItemStyle(false, "inventory")}
              onMouseEnter={() => setHoveredItem("inventory")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setInventoryOpen(!inventoryOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faBoxesPacking} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Inventory</span>}
                {sidebarOpen && <span>{inventoryOpen ? "Up Arrow" : "Down Arrow"}</span>}
              </div>
            </li>
            {inventoryOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                <li style={getItemStyle(location.pathname === "/inventory-dashboard", "invt-dashboard")}>
                  <Link to="/inventory-dashboard" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "0.75rem" }} />
                    <span>Invt Dashboard</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/inventory", "invt-mgmt")}>
                  <Link to="/inventory" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faBoxesPacking} style={{ marginRight: "0.75rem" }} />
                    <span>Invt Mgmt</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* Finance & Custom - Admin Only */}
        {role === "Admin" && (
          <>
            <li
              style={getItemStyle(false, "finance")}
              onMouseEnter={() => setHoveredItem("finance")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setFinanceOpen(!financeOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faWallet} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Finance</span>}
                {sidebarOpen && <span>{financeOpen ? "Up Arrow" : "Down Arrow"}</span>}
              </div>
            </li>
            {financeOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                <li style={getItemStyle(location.pathname === "/finance", "fin-dashboard")}>
                  <Link to="/finance" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "0.75rem" }} />
                    <span>Fin Dashboard</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/finance/transactions", "transactions")}>
                  <Link to="/finance/transactions" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faExchangeAlt} style={{ marginRight: "0.75rem" }} />
                    <span>Transactions</span>
                  </Link>
                </li>
              </ul>
            )}

            <li
              style={getItemStyle(false, "custom")}
              onMouseEnter={() => setHoveredItem("custom")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => sidebarOpen && setCustomOpen(!customOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.75rem" }} />
                {sidebarOpen && <span style={{ flex: 1 }}>Custom</span>}
                {sidebarOpen && <span>{customOpen ? "Up Arrow" : "Down Arrow"}</span>}
              </div>
            </li>
            {customOpen && sidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                <li style={getItemStyle(location.pathname === "/custom-report", "custom-report")}>
                  <Link to="/custom-report" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.75rem" }} />
                    <span>Custom Report</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/salary-slip", "salary-slip")}>
                  <Link to="/salary-slip" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ marginRight: "0.75rem" }} />
                    <span>Salary Slip</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* Student: Simple Progress */}
        {role === "Student" && (
          <li
            style={getItemStyle(location.pathname === "/student-progress", "progress")}
            onMouseEnter={() => setHoveredItem("progress")}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={handleStudentsDataClick}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.75rem" }} />
              {sidebarOpen && <span>Progress</span>}
            </div>
          </li>
        )}

        {/* Robot Chat - All */}
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

      {/* Footer */}
      {sidebarOpen && (
        <div style={{ backgroundColor: "#6D28D9", padding: "1rem 0 0.5rem", marginTop: "auto" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{username}</p>
            <p style={{ fontSize: "0.875rem", fontStyle: "italic", margin: 0 }}>{role}</p>
          </div>
          <LogoutButton style={{ backgroundColor: "red", color: "white", padding: "0.5rem 1rem", borderRadius: "0.25rem" }} />
        </div>
      )}
      {!sidebarOpen && (
        <div style={{ marginTop: "auto", padding: "0.75rem 0" }}>
          <FontAwesomeIcon icon={faLock} style={{ display: "block", textAlign: "center" }} />
        </div>
      )}
    </aside>
  );
}

export default Sidebar;