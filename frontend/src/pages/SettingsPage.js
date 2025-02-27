import React, { useState } from "react";

function SettingsPage() {
    const [schoolName, setSchoolName] = useState("Koder Kids Academy");
    const [feeAmount, setFeeAmount] = useState(1500);
    const [role, setRole] = useState("Admin");

    return (
        <div className="flex flex-col items-center p-6">
            <h1 className="text-2xl font-bold">Settings</h1>

            <div className="w-full max-w-md border p-4 rounded">
                <label className="block mb-2">School Name:</label>
                <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full p-2 border rounded"
                />

                <label className="block mt-4 mb-2">Fee Amount (PKR):</label>
                <input
                    type="number"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    className="w-full p-2 border rounded"
                />

                <label className="block mt-4 mb-2">User Role:</label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2 border rounded"
                >
                    <option value="Admin">Admin</option>
                    <option value="User">User</option>
                </select>

                <button className="bg-green-500 text-white px-4 py-2 rounded mt-4">Save Changes</button>
            </div>
        </div>
    );
}

export default SettingsPage;
