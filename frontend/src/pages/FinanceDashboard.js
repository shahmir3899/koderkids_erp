import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ClipLoader } from "react-spinners"; // Import ClipLoader

function FinanceDashboard() {
    const [summary, setSummary] = useState({ income: 0, expenses: 0, loans: 0, accounts: [] });
    const [loanSummary, setLoanSummary] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [isRetrying, setIsRetrying] = useState(false); // New state for retry loading

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [summaryResponse, loanResponse] = await Promise.all([
                axios.get(`${API_URL}/api/finance-summary/`, { headers: getAuthHeaders() }),
                axios.get(`${API_URL}/api/loan-summary/`, { headers: getAuthHeaders() }),
            ]);
            setSummary(summaryResponse.data);
            setLoanSummary(loanResponse.data);
        } catch (err) {
            setError("Failed to fetch data. Please try again or check your authentication.");
        } finally {
            setIsLoading(false);
        }
    };

    // Retry function with loading state
    const handleRetry = async () => {
        setIsRetrying(true);
        await fetchData();
        setIsRetrying(false);
    };

    // Bar Chart Data
    const barChartData = [
        { name: "Summary", income: summary.income, expenses: summary.expenses },
    ];

    // Custom Tooltip for Bar Chart
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-2 border border-gray-300 rounded shadow">
                    <p className="text-gray-700">{`Income: $${payload[0].value.toLocaleString()}`}</p>
                    <p className="text-gray-700">{`Expenses: $${payload[1].value.toLocaleString()}`}</p>
                </div>
            );
        }
        return null;
    };

    // Sort accounts for the table
    const sortedAccounts = [...summary.accounts].sort((a, b) => {
        if (sortConfig.key) {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
    });

    // Calculate total balance
    const totalBalance = summary.accounts.reduce((acc, account) => acc + account.current_balance, 0);

    // Handle table sorting
    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen" role="main" aria-label="Finance Dashboard">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Finance Dashboard</h1>

            {isLoading && (
                <div className="text-center text-gray-700" role="alert">
                    <ClipLoader color="#000000" size={50} />
                </div>
            )}
            {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded mb-6" role="alert">
                    {error}
                    <button
                        className="ml-4 text-blue-600 hover:underline"
                        onClick={handleRetry}
                        aria-label="Retry fetching data"
                        disabled={isRetrying}
                    >
                        {isRetrying ? "Retrying..." : "Retry"}
                    </button>
                </div>
            )}

            {!isLoading && !error && (
                <div className="grid grid-cols-1 gap-6">
                    {/* Income vs Expenses Bar Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-lg" role="figure" aria-label="Income vs Expenses Chart">
                        <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Income vs Expenses</h2>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData}>
                                    <XAxis dataKey="name" stroke="#888888" />
                                    <YAxis stroke="#888888" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="income" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" fill="#ff6666" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Account Balances Table */}
                    <div className="bg-white p-6 rounded-lg shadow-lg" role="table" aria-label="Account Balances Table">
                        <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Account Balances</h2>
                        {summary.accounts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th
                                                className="p-3 text-left text-gray-700 font-semibold cursor-pointer"
                                                onClick={() => handleSort("account_name")}
                                                scope="col"
                                            >
                                                Account Name {sortConfig.key === "account_name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                            </th>
                                            <th
                                                className="p-3 text-left text-gray-700 font-semibold cursor-pointer"
                                                onClick={() => handleSort("current_balance")}
                                                scope="col"
                                            >
                                                Current Balance {sortConfig.key === "current_balance" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedAccounts.map((account, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors" role="row">
                                                <td className="p-3 border-t border-gray-200 text-gray-600">{account.account_name}</td>
                                                <td
                                                    className={`p-3 border-t border-gray-200 ${
                                                        account.current_balance < 0 ? "text-red-600" : "text-gray-600"
                                                    }`}
                                                >
                                                    {account.current_balance.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold bg-gray-100">
                                            <td className="p-3 text-left text-gray-700">Total</td>
                                            <td className="p-3 text-left text-gray-700">{totalBalance.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500" role="alert">
                                No accounts available.
                            </p>
                        )}
                    </div>

                    {/* Loan Summary Table */}
                    <div className="bg-white p-6 rounded-lg shadow-lg" role="table" aria-label="Loan Summary Table">
                        <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Loan Summary</h2>
                        {loanSummary.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="p-3 text-left text-gray-700 font-semibold" scope="col">
                                                Person
                                            </th>
                                            <th className="p-3 text-left text-gray-700 font-semibold" scope="col">
                                                Total Loan Received
                                            </th>
                                            <th className="p-3 text-left text-gray-700 font-semibold" scope="col">
                                                Total Loan Repaid
                                            </th>
                                            <th className="p-3 text-left text-gray-700 font-semibold" scope="col">
                                                Balance Outstanding
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loanSummary.map((loan, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors" role="row">
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
                            <p className="text-center text-gray-500" role="alert">
                                No loans to display.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default FinanceDashboard;