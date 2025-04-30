import React, { useRef, useEffect, useState, useMemo } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ClipLoader } from "react-spinners";
import "webdatarocks/webdatarocks.min.css";
import Select from "react-select";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { format } from "date-fns";

// New function to dynamically load WebDataRocks
const loadWebDataRocks = () => {
  return new Promise((resolve) => {
    if (window.WebDataRocks) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.webdatarocks.com/latest/webdatarocks.js";
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
};

function FinanceDashboard() {
  // **State Declarations**
  const [summary, setSummary] = useState({ income: 0, expenses: 0, loans: 0, accounts: [] });
  const [loanSummary, setLoanSummary] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [schools, setSchools] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [transactionType, setTransactionType] = useState("Income");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [dateMin] = useState(new Date(2024, 0, 1)); // Jan 2024
  const [dateMax] = useState(new Date(2025, 11, 31)); // Dec 2025
  const [sliderRange, setSliderRange] = useState([dateMin.getTime(), dateMax.getTime()]);
  const [searchParams, setSearchParams] = useState(null);
  const pivotRef = useRef(null);
  const [isWebDataRocksLoaded, setIsWebDataRocksLoaded] = useState(false); // Track WebDataRocks loading

  // **Derived Values**
  const netBalance = summary.income - summary.expenses;
  const schoolOptions = schools.map((school) => ({
    value: String(school.id),
    label: school.name,
  }));

  const categoryOptions = useMemo(() => {
    if (transactionType === "Income") {
      return incomeCategories;
    } else if (transactionType === "Expense") {
      return expenseCategories;
    }
    return [];
  }, [transactionType, incomeCategories, expenseCategories]);

  // **Fetch Initial Data**
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryResponse, loanResponse, schoolResponse] = await Promise.all([
        axios.get(`${API_URL}/api/finance-summary/`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/loan-summary/`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/schools/`, { headers: getAuthHeaders() }),
      ]);
      setSummary(summaryResponse.data);
      setLoanSummary(loanResponse.data);
      setSchools(schoolResponse.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError("Authentication failed. Please log in again.");
      } else if (err.response && err.response.status === 404) {
        setError("Data not found. Please check the server or try again.");
      } else {
        setError("Failed to fetch data. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // **Fetch Transactions and Categories**
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const [incomeRes, expenseRes, transferRes] = await Promise.all([
          axios.get(`${API_URL}/api/income/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/expense/`, { headers: getAuthHeaders() }),
          axios.get(`${API_URL}/api/transfers/`, { headers: getAuthHeaders() }),
        ]);

        const incomeTxs = incomeRes.data.map((tx) => ({ ...tx, transaction_type: "Income" }));
        const expenseTxs = expenseRes.data.map((tx) => ({ ...tx, transaction_type: "Expense" }));
        const transferTxs = transferRes.data.map((tx) => ({ ...tx, transaction_type: "Transfer" }));

        const allTransactions = [...incomeTxs, ...expenseTxs, ...transferTxs];
        setTransactions(allTransactions);

        const incomeCats = Array.from(new Set(incomeTxs.map((tx) => tx.category))).sort();
        setIncomeCategories(incomeCats);

        const expenseCats = Array.from(new Set(expenseTxs.map((tx) => tx.category))).sort();
        setExpenseCategories(expenseCats);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        setError("Failed to load transactions. Some features may be limited.");
      }
    };
    fetchTransactions();
  }, []);

  // **Pivot Table Setup**
  useEffect(() => {
    if (!searchParams || transactions.length === 0 || !isWebDataRocksLoaded) {
      // Display placeholder message if no search params or WebDataRocks not loaded
      if (pivotRef.current) {
        pivotRef.current.innerHTML = `<div class="text-gray-500 text-center p-4">Select filters and click "Search Transactions" to view the report.</div>`;
      }
      return;
    }

    // Create school name mapping
    const schoolMap = schools.reduce((map, school) => {
      map[school.id] = school.name;
      return map;
    }, {});

    // Filter and map transactions
    const filteredData = transactions
      .filter(
        (tx) =>
          selectedSchools.length === 0 || selectedSchools.includes(String(tx.school_id))
      )
      .filter((tx) => tx.transaction_type === searchParams.transactionType)
      .filter((tx) => {
        const txDate = new Date(tx.date);
        const start = new Date(searchParams.startDate);
        const end = new Date(searchParams.endDate);
        return txDate >= start && txDate <= end;
      })
      .filter(
        (tx) =>
          selectedCategories.length === 0 || selectedCategories.includes(tx.category)
      )
      .map((tx) => ({
        id: tx.id,
        date: new Date(tx.date).toISOString(),
        transaction_type: tx.transaction_type,
        amount: tx.amount,
        category: tx.category,
        school: schoolMap[tx.school_id] || "Unknown",
        from_account: tx.from_account_name || "—",
        to_account: tx.to_account_name || "—",
        notes: tx.notes || "",
      }));

    if (filteredData.length === 0) {
      if (pivotRef.current) {
        pivotRef.current.innerHTML = `<div class="text-gray-500 text-center p-4">No matching transactions found. Adjust filters and try again.</div>`;
      }
      return;
    }

    // Initialize pivot table
    const initializePivot = () => {
      pivotRef.current.innerHTML = "";
      new window.WebDataRocks({
        container: pivotRef.current,
        toolbar: true,
        height: 430,
        report: {
          dataSource: { data: filteredData },
          slice: {
            rows: [
              { uniqueName: "school" },
              { uniqueName: "category" },
            ],
            columns: [
              { uniqueName: "date", levelName: "Month" },
            ],
            measures: [
              { uniqueName: "amount", aggregation: "sum", format: "PKRFormat" },
            ],
          },
          formats: [
            {
              name: "PKRFormat",
              thousandsSeparator: ",",
              decimalSeparator: ".",
              decimalPlaces: 0,
              currencySymbol: "PKR ",
              currencySymbolAlign: "left",
              nullValue: "-",
              textAlign: "right",
            },
          ],
          mapping: {
            school: { caption: "School" },
            from_account: { caption: "From Account" },
            to_account: { caption: "To Account" },
            transaction_type: { caption: "Transaction Type" },
            date: { caption: "Date", type: "date" },
            amount: { caption: "Amount" },
            category: { caption: "Category" },
            notes: { caption: "Notes" },
          },
          options: { grid: { showFilter: true, showHeaders: true } },
        },
      });
    };

    initializePivot();
  }, [searchParams, transactions, selectedSchools, selectedCategories, schools, isWebDataRocksLoaded]);

  // **Handle Search Button Click**
  const handleSearch = async () => {
    // Load WebDataRocks if not already loaded
    if (!isWebDataRocksLoaded) {
      await loadWebDataRocks();
      setIsWebDataRocksLoaded(true);
    }
    // Set search params to trigger pivot table
    setSearchParams({
      selectedSchools,
      transactionType,
      selectedCategories,
      startDate: new Date(sliderRange[0]).toISOString().split("T")[0],
      endDate: new Date(sliderRange[1]).toISOString().split("T")[0],
    });
  };

  // **Helper Functions**
  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchData();
    setIsRetrying(false);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedAccounts = [...summary.accounts].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const totalBalance = summary.accounts.reduce((acc, account) => acc + account.current_balance, 0);

  const barChartData = [{ name: "Summary", income: summary.income, expenses: summary.expenses }];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="text-gray-700 font-medium">{`Income: PKR ${payload[0].value.toLocaleString()}`}</p>
          <p className="text-gray-700 font-medium">{`Expenses: PKR ${payload[1].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
  };

  // **Render UI**
  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-green-50 min-h-screen font-sans">
      <h1 className="text-4xl font-bold text-blue-800 mb-8 text-center">Finance Dashboard</h1>

      {/** Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <ClipLoader color="#1E40AF" size={60} />
        </div>
      )}

      {/** Error State */}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      {/** Main Dashboard Content */}
      {!isLoading && !error && (
        <div className="space-y-8">
          {/** Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-100 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-green-800">Total Income</h3>
              <p className="text-3xl font-bold text-green-600">PKR {summary.income.toLocaleString()}</p>
            </div>
            <div className="bg-red-100 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-red-800">Total Expenses</h3>
              <p className="text-3xl font-bold text-red-600">PKR {summary.expenses.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-blue-800">Net Balance</h3>
              <p className={`text-3xl font-bold ${netBalance < 0 ? "text-red-600" : "text-blue-600"}`}>
                PKR {netBalance.toLocaleString()}
              </p>
            </div>
          </div>

          {/** Chart and Account Balances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/** Income vs Expenses Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-blue-800 mb-4">Income vs Expenses</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <XAxis dataKey="name" stroke="#4B5563" />
                    <YAxis stroke="#4B5563" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="income" fill="#34D399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#F87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/** Account Balances Table */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-blue-800 mb-4">Account Balances</h2>
              {summary.accounts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-100">
                        <th
                          className="p-4 text-left text-blue-800 font-semibold cursor-pointer"
                          onClick={() => handleSort("account_name")}
                        >
                          Account Name{" "}
                          {sortConfig.key === "account_name" &&
                            (sortConfig.direction === "asc" ? "↑" : "↓")}
                        </th>
                        <th
                          className="p-4 text-left text-blue-800 font-semibold cursor-pointer"
                          onClick={() => handleSort("current_balance")}
                        >
                          Balance{" "}
                          {sortConfig.key === "current_balance" &&
                            (sortConfig.direction === "asc" ? "↑" : "↓")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAccounts.map((account, index) => (
                        <tr key={index} className="hover:bg-blue-50 transition-colors">
                          <td className="p-4 border-t border-blue-200 text-gray-700">
                            {account.account_name}
                          </td>
                          <td
                            className={`p-4 border-t border-blue-200 ${
                              account.current_balance < 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            PKR {account.current_balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-blue-100">
                        <td className="p-4 text-left text-blue-800">Total</td>
                        <td className="p-4 text-left text-blue-800">
                          PKR {totalBalance.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500">No accounts available.</p>
              )}
            </div>
          </div>

          {/** Transaction Explorer */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-800 mb-4">
              Transaction Explorer
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schools
                </label>
                <Select
                  isMulti
                  options={schoolOptions}
                  onChange={(selected) =>
                    setSelectedSchools(selected.map((s) => s.value))
                  }
                  placeholder="Select schools..."
                  className="basic-multi-select"
                  classNamePrefix="select"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    {format(new Date(sliderRange[0]), "MMM yyyy")}
                  </span>
                  <Slider
                    range
                    min={dateMin.getTime()}
                    max={dateMax.getTime()}
                    step={30 * 24 * 60 * 60 * 1000}
                    value={sliderRange}
                    onChange={setSliderRange}
                    allowCross={false}
                    trackStyle={{ backgroundColor: "#1E40AF" }}
                    handleStyle={{ borderColor: "#1E40AF" }}
                  />
                  <span className="text-gray-600">
                    {format(new Date(sliderRange[1]), "MMM yyyy")}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type
                </label>
                <div className="flex gap-3">
                  {["Income", "Expense", "Transfer"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setTransactionType(type);
                        setSelectedCategories([]);
                      }}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        transactionType === type
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                {categoryOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {categoryOptions.map((category) => (
                      <div
                        key={category}
                        onClick={() => {
                          setSelectedCategories((prev) =>
                            prev.includes(category)
                              ? prev.filter((c) => c !== category)
                              : [...prev, category]
                          );
                        }}
                        className={`cursor-pointer px-4 py-2 rounded-lg shadow-sm border transition-colors ${
                          selectedCategories.includes(category)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-blue-100"
                        }`}
                      >
                        {category}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No categories available for this transaction type.</p>
                )}
              </div>
            </div>
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition w-full md:w-auto"
              onClick={handleSearch}
            >
              Search Transactions
            </button>
            <div ref={pivotRef} className="mt-6"></div>
          </div>

          {/** Loan Summary Table */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-800 mb-4">Loan Summary</h2>
            {loanSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="p-4 text-left text-blue-800 font-semibold">
                        Person
                      </th>
                      <th className="p-4 text-left text-blue-800 font-semibold">
                        Total Received
                      </th>
                      <th className="p-4 text-left text-blue-800 font-semibold">
                        Total Repaid
                      </th>
                      <th className="p-4 text-left text-blue-800 font-semibold">
                        Balance Outstanding
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanSummary.map((loan, index) => (
                      <tr key={index} className="hover:bg-blue-50 transition-colors">
                        <td className="p-4 border-t border-blue-200 text-gray-700">
                          {loan.person || "N/A"}
                        </td>
                        <td className="p-4 border-t border-blue-200 text-gray-700">
                          PKR {(loan.total_received || 0).toLocaleString()}
                        </td>
                        <td className="p-4 border-t border-blue-200 text-gray-700">
                          PKR {(loan.total_paid || 0).toLocaleString()}
                        </td>
                        <td className="p-4 border-t border-blue-200 text-gray-700">
                          PKR {(loan.balance_outstanding || 0).toLocaleString()}
                        </td>
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
      )}
    </div>
  );
}

export default FinanceDashboard;