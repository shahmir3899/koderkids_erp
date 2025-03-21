import React from "react";
import { useNavigate } from "react-router-dom";

function LogoutButton() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();  // ✅ Fully clear localStorage
        window.dispatchEvent(new Event("storage"));  // ✅ Broadcast logout event
        navigate("/login", { replace: true });
    };

    return (
        <button 
            onClick={handleLogout}
            style={{
                padding: "10px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
            }}
        >
            Logout
        </button>
    );
}

export default LogoutButton;
