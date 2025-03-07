import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

function FinanceDashboard() {
    const [summary, setSummary] = useState({ income: 0, expenses: 0, loans: 0, accounts: [] });
    const [loanSummary, setLoanSummary] = useState([]); // New state for loan summary

    useEffect(() => {
        fetchSummary();
        fetchLoanSummary(); // Fetch loan summary data
    }, []);

    const fetchSummary = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/finance-summary/`, { headers: getAuthHeaders() });
            setSummary(response.data);
        } catch (error) {
            console.error("Error fetching finance summary:", error);
        }
    };

    const fetchLoanSummary = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/loan-summary/`, { headers: getAuthHeaders() });
            setLoanSummary(response.data);
        } catch (error) {
            console.error("Error fetching loan summary:", error);
        }
    };

    const filteredAccounts = summary.accounts.filter(account => account.current_balance > 0);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Main Heading */}
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Finance Dashboard</h1>
    
            {/* Charts and Table Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income vs Expenses Bar Chart */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Income vs Expenses</h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[summary]}>
                                <XAxis dataKey="name" stroke="#888888" />
                                <YAxis stroke="#888888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Bar dataKey="income" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expenses" fill="#ff6666" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
    
                {/* Account Balances Pie Chart */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Account Balances</h2>
                    {filteredAccounts.length > 0 ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={filteredAccounts}
                                        dataKey="current_balance"
                                        nameKey="account_name"
                                        outerRadius={120}
                                        label
                                    >
                                        {filteredAccounts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"][index % 4]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">No positive account balances available.</p>
                    )}
                </div>
            </div>
    
            {/* Loan Summary Table */}
            <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Loan Summary</h2>
                {loanSummary.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-3 text-left text-gray-700 font-semibold">Person</th>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Total Loan Received</th>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Total Loan Repaid</th>
                                    <th className="p-3 text-left text-gray-700 font-semibold">Balance Outstanding</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loanSummary.map((loan, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 border-t border-gray-200 text-gray-600">{loan.person}</td>
                                        <td className="p-3 border-t border-gray-200 text-gray-600">{loan.total_received}</td>
                                        <td className="p-3 border-t border-gray-200 text-gray-600">{loan.total_paid}</td>
                                        <td className="p-3 border-t border-gray-200 text-gray-600">{loan.balance_outstanding}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500">No loans to display.</p>
                )}
            </div>
        </div>
    );
}

export default FinanceDashboard;