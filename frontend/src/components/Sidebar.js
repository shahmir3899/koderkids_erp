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
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faChevronDown,
  faWallet,
  faCog,
  faTasks,
  faClipboardCheck,
} from "@fortawesome/free-solid-svg-icons";
import LogoutButton from "./LogoutButton";

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const [financeOpen, setFinanceOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [studentsDataOpen, setStudentsDataOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const username = localStorage.getItem("fullName") || "Unknown";
  const role = localStorage.getItem("role") || "Unknown";
  const location = useLocation();

  // Local state for internal use
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(true);

  // Use props if provided, otherwise use internal state
  const currentSidebarOpen = sidebarOpen !== undefined ? sidebarOpen : internalSidebarOpen;
  const currentSetSidebarOpen = setSidebarOpen || setInternalSidebarOpen;

  useEffect(() => {
    if (!currentSidebarOpen) {
      setFinanceOpen(false);
      setStudentsOpen(false);
      setCustomOpen(false);
      setStudentsDataOpen(false);
      setCrmOpen(false);
      setTasksOpen(false);
    }
  }, [currentSidebarOpen]);


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
        width: currentSidebarOpen ? "14rem" : "4rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Toggle */}
      <button
        onClick={() => currentSetSidebarOpen(!currentSidebarOpen)}
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
        {currentSidebarOpen ? <FontAwesomeIcon icon={faChevronLeft} /> : <FontAwesomeIcon icon={faChevronRight} />}
      </button>

      {/* Logo */}
      {currentSidebarOpen && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1rem" }}>
          <img src="/whiteLogo.png" alt="Logo" style={{ maxWidth: "100%", maxHeight: "3rem" }} />
        </div>
      )}
      {!currentSidebarOpen && <div style={{ height: "5.5rem" }} />}

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
                : role === "BDM"
                ? "/crm/dashboard"
                : "/publicdashboard"
            }
            style={{ display: "flex", alignItems: "center" }}
          >
            <FontAwesomeIcon icon={faTachometerAlt} style={{ marginRight: "0.75rem" }} />
            {currentSidebarOpen && <span>Dashboard</span>}
          </Link>
        </li>

        {/* Students & Fee - Admin/Teacher */}
        {(role === "Admin" || role === "Teacher") && (
          <>
            <li
              style={getItemStyle(false, "students-fee")}
              onMouseEnter={() => setHoveredItem("students-fee")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => currentSidebarOpen && setStudentsOpen(!studentsOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.75rem" }} />
                {currentSidebarOpen && <span style={{ flex: 1 }}>Students & Fee</span>}
                {currentSidebarOpen && (
                  <FontAwesomeIcon icon={studentsOpen ? faChevronUp : faChevronDown} />
                )}
              </div>
            </li>
            {studentsOpen && currentSidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                <li style={getItemStyle(location.pathname === "/students", "students")}>
                  <Link to="/students" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.75rem" }} />
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

        {/* School Data - Admin/Teacher */}
        {(role === "Admin" || role === "Teacher") && (
          <li
            style={getItemStyle(location.pathname === "/schools", "schools")}
            onMouseEnter={() => setHoveredItem("schools")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link to="/schools" style={{ display: "flex", alignItems: "center" }}>
              <FontAwesomeIcon icon={faSchool} style={{ marginRight: "0.75rem" }} />
              {currentSidebarOpen && <span>School Data</span>}
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
              onClick={() => currentSidebarOpen && setStudentsDataOpen(!studentsDataOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.75rem" }} />
                {currentSidebarOpen && <span style={{ flex: 1 }}>Students Data</span>}
                {currentSidebarOpen && (
                  <FontAwesomeIcon icon={studentsDataOpen ? faChevronUp : faChevronDown} />
                )}
              </div>
            </li>
            {studentsDataOpen && currentSidebarOpen && (
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
                    <span>Lesson</span>
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

        {/* Inventory Dashboard - Admin/Teacher */}
        {(role === "Admin" || role === "Teacher") && (
          <li
            style={getItemStyle(location.pathname === "/inventory-dashboard", "inventory-dashboard")}
            onMouseEnter={() => setHoveredItem("inventory-dashboard")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link to="/inventory-dashboard" style={{ display: "flex", alignItems: "center" }}>
              <FontAwesomeIcon icon={faBoxesPacking} style={{ marginRight: "0.75rem" }} />
              {currentSidebarOpen && <span>Inventory Dashboard</span>}
            </Link>
          </li>
        )}

        {/* Finance & Custom - Admin Only */}
        {role === "Admin" && (
          <>
            <li
              style={getItemStyle(false, "finance")}
              onMouseEnter={() => setHoveredItem("finance")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => currentSidebarOpen && setFinanceOpen(!financeOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faWallet} style={{ marginRight: "0.75rem" }} />
                {currentSidebarOpen && <span style={{ flex: 1 }}>Finance</span>}
                {currentSidebarOpen && (
                  <FontAwesomeIcon icon={financeOpen ? faChevronUp : faChevronDown} />
                )}
              </div>
            </li>
            {financeOpen && currentSidebarOpen && (
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
              onClick={() => currentSidebarOpen && setCustomOpen(!customOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.75rem" }} />
                {currentSidebarOpen && <span style={{ flex: 1 }}>Custom</span>}
                {currentSidebarOpen && (
                  <FontAwesomeIcon icon={customOpen ? faChevronUp : faChevronDown} />
                )}
              </div>
            </li>
            {customOpen && currentSidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                <li style={getItemStyle(location.pathname === "/salary-slip", "salary-slip")}>
                  <Link to="/salary-slip" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ marginRight: "0.75rem" }} />
                    <span>Salary Slip Generator</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/custom-report", "custom-report")}>
                  <Link to="/custom-report" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "0.75rem" }} />
                    <span>Custom Report</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* CRM - Admin Only */}
        {role === "Admin" && (
          <>
            <li
              style={getItemStyle(false, "crm")}
              onMouseEnter={() => setHoveredItem("crm")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => currentSidebarOpen && setCrmOpen(!crmOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.75rem" }} />
                {currentSidebarOpen && <span style={{ flex: 1 }}>CRM</span>}
                {currentSidebarOpen && (
                  <FontAwesomeIcon icon={crmOpen ? faChevronUp : faChevronDown} />
                )}
              </div>
            </li>
            {crmOpen && currentSidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                <li style={getItemStyle(location.pathname === "/crm/admin-dashboard", "crm-admin-dashboard")}>
                  <Link to="/crm/admin-dashboard" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: "0.75rem" }} />
                    <span>Admin Dashboard</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/crm/leads", "crm-leads")}>
                  <Link to="/crm/leads" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.75rem" }} />
                    <span>Leads</span>
                  </Link>
                </li>
                <li style={getItemStyle(location.pathname === "/crm/activities", "crm-activities")}>
                  <Link to="/crm/activities" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.75rem" }} />
                    <span>Activities</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* Tasks Management - Admin/Teacher/BDM */}
        {role !== "Student" && (
          <>
            <li
              style={getItemStyle(false, "tasks")}
              onMouseEnter={() => setHoveredItem("tasks")}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => currentSidebarOpen && setTasksOpen(!tasksOpen)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faTasks} style={{ marginRight: "0.75rem" }} />
                {currentSidebarOpen && <span style={{ flex: 1 }}>Tasks</span>}
                {currentSidebarOpen && (
                  <FontAwesomeIcon icon={tasksOpen ? faChevronUp : faChevronDown} />
                )}
              </div>
            </li>
            {tasksOpen && currentSidebarOpen && (
              <ul style={{ paddingLeft: "0.75rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                {role === "Admin" && (
                  <li style={getItemStyle(location.pathname === "/task-management", "task-management")}>
                    <Link to="/task-management" style={{ display: "flex", alignItems: "center" }}>
                      <FontAwesomeIcon icon={faCog} style={{ marginRight: "0.75rem" }} />
                      <span>Manage Tasks</span>
                    </Link>
                  </li>
                )}
                <li style={getItemStyle(location.pathname === "/my-tasks", "my-tasks")}>
                  <Link to="/my-tasks" style={{ display: "flex", alignItems: "center" }}>
                    <FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: "0.75rem" }} />
                    <span>My Tasks</span>
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}

        {/* Settings - Admin Only */}
        {role === "Admin" && (
          <li
            style={getItemStyle(location.pathname === "/settings", "settings")}
            onMouseEnter={() => setHoveredItem("settings")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link to="/settings" style={{ display: "flex", alignItems: "center" }}>
              <FontAwesomeIcon icon={faCog} style={{ marginRight: "0.75rem" }} />
              {currentSidebarOpen && <span>Settings</span>}
            </Link>
          </li>
        )}

        {/* Leads - BDM Only (Direct Link) */}
        {role === "BDM" && (
          <>
            <li
              style={getItemStyle(location.pathname === "/crm/leads", "crm-leads")}
              onMouseEnter={() => setHoveredItem("crm-leads")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link to="/crm/leads" style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.75rem" }} />
                {currentSidebarOpen && <span>Leads</span>}
              </Link>
            </li>
            <li
              style={getItemStyle(location.pathname === "/crm/activities", "crm-activities")}
              onMouseEnter={() => setHoveredItem("crm-activities")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link to="/crm/activities" style={{ display: "flex", alignItems: "center" }}>
                <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.75rem" }} />
                {currentSidebarOpen && <span>Activities</span>}
              </Link>
            </li>
          </>
        )}

        {/* Student: Simple Progress */}
        {role === "Student" && (
          <li
            style={getItemStyle(location.pathname === "/student-progress", "progress")}
            onMouseEnter={() => setHoveredItem("progress")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link to="/student-progress" style={{ display: "flex", alignItems: "center" }}>
              <FontAwesomeIcon icon={faChartLine} style={{ marginRight: "0.75rem" }} />
              {currentSidebarOpen && <span>Progress</span>}
            </Link>
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
            {currentSidebarOpen && <span>Robot Chat</span>}
          </Link>
        </li>
      </ul>

      {/* Footer */}
      {currentSidebarOpen && (
        <div style={{ backgroundColor: "#6D28D9", padding: "1rem 0 0.5rem", marginTop: "auto" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{username}</p>
            <p style={{ fontSize: "0.875rem", fontStyle: "italic", margin: 0 }}>{role}</p>
          </div>
          <LogoutButton style={{ backgroundColor: "red", color: "white", padding: "0.5rem 1rem", borderRadius: "0.25rem" }} />
        </div>
      )}
      {!currentSidebarOpen && (
        <div style={{ marginTop: "auto", padding: "0.75rem 0" }}>
          <FontAwesomeIcon icon={faLock} style={{ display: "block", textAlign: "center" }} />
        </div>
      )}
    </aside>
  );
}

export default Sidebar;