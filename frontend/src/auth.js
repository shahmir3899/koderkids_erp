import { useState, useEffect } from "react";

export const useAuth = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // ✅ Read correct keys from localStorage
        const storedUsername = localStorage.getItem("username");
        const storedRole = localStorage.getItem("role");  // Note: "rol" instead of "role"

        console.log("🔍 Retrieved from LocalStorage -> Username:", storedUsername, "| Role:", storedRole);

        if (storedUsername && storedRole) {
            setUser({
                username: storedUsername,
                role: storedRole.toLowerCase(),  // ✅ Normalize case for comparison
            });
        }
    }, []);

    return { user };
};
