import React from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { clearCacheOnLogout } from "../utils/cacheUtils";  // ← ADD THIS

function LogoutButton() {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear cached data first
        clearCacheOnLogout();  // ← ADD THIS LINE
        
        // Then clear all localStorage
        localStorage.clear();
        
        // Broadcast logout event
        window.dispatchEvent(new Event("storage"));
        
        // Navigate to login
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <FiLogOut size={24} />
        </button>
    );
}

export default LogoutButton;