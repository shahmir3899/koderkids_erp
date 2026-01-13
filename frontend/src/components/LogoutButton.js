import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPower } from "react-icons/fi";
import { clearCacheOnLogout } from "../utils/cacheUtils";

function LogoutButton({ style, compact = false }) {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    const handleLogout = () => {
        // Clear cached data first
        clearCacheOnLogout();

        // Then clear all localStorage
        localStorage.clear();

        // Broadcast logout event
        window.dispatchEvent(new Event("storage"));

        // Navigate to login
        navigate("/login", { replace: true });
    };

    const buttonStyles = {
        ...defaultStyles.button,
        ...(isHovered ? defaultStyles.buttonHover : {}),
        ...style,
    };

    return (
        <button
            onClick={handleLogout}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={buttonStyles}
            title="Logout"
            aria-label="Logout"
        >
            <FiPower size={compact ? 16 : 18} />
        </button>
    );
}

const defaultStyles = {
    button: {
        width: "32px",
        height: "32px",
        padding: "0",
        backgroundColor: "rgba(220, 53, 69, 0.9)",
        color: "white",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "50%",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 8px rgba(220, 53, 69, 0.3)",
    },
    buttonHover: {
        backgroundColor: "#dc3545",
        transform: "scale(1.1)",
        boxShadow: "0 4px 12px rgba(220, 53, 69, 0.5)",
    },
};

export default LogoutButton;