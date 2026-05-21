import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getDefaultDashboardPath } from "../constants/studentSubtypePolicy";

function ProtectedRoute({ element, allowedRoles, allowedStudentSubtypes }) {
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("access"));
    const role = localStorage.getItem("role");  // ✅ Get user role from storage
    const studentSubtype = localStorage.getItem("studentSubtype") || "";

    useEffect(() => {
        const checkAuth = () => {
            setIsAuthenticated(!!localStorage.getItem("access"));
        };

        window.addEventListener("storage", checkAuth); // ✅ Detect logout events across tabs

        return () => {
            window.removeEventListener("storage", checkAuth); // ✅ Cleanup event listener
        };
    }, []);

    console.log("🔍 Checking authentication. Token:", localStorage.getItem("access"));
    console.log("🔍 User role:", role);
    //console.log("🔍 Username:", username);

    // ✅ If user is not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login"  replace />;
    }

    // ✅ If user is authenticated but role is not allowed, redirect to home
    if (allowedRoles && !allowedRoles.includes(role)) {
        alert("Unauthorized access. Redirecting to home.");
        return <Navigate to="/" replace />;
    }

    if (
        role === "Student" &&
        Array.isArray(allowedStudentSubtypes) &&
        allowedStudentSubtypes.length > 0 &&
        !allowedStudentSubtypes.includes(studentSubtype)
    ) {
        const dashboardPath = getDefaultDashboardPath(role, studentSubtype);
        return <Navigate to={dashboardPath} replace />;
    }

    return element;
}

export default ProtectedRoute;
