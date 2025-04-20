import React, { useRef, useEffect, useState, useMemo } from "react";
import axios from "axios";
import { API_URL, getAuthHeaders } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ClipLoader } from "react-spinners"; // Import ClipLoader
import "webdatarocks/webdatarocks.min.css";
import "webdatarocks/webdatarocks.toolbar.min.js";
import Select from "react-select";





function FinanceDashboard() {
    const [summary, setSummary] = useState({ income: 0, expenses: 0, loans: 0, accounts: [] });
    const [loanSummary, setLoanSummary] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [isRetrying, setIsRetrying] = useState(false); // New state for retry loading
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedSchools, setSelectedSchools] = useState([]);
    const [allDates, setAllDates] = useState(true);  // toggles between full range and custom
    const [startDate, setStartDate] = useState("");  // YYYY-MM format
    const [endDate, setEndDate] = useState("");
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [searchTriggered, setSearchTriggered] = useState(false);
    const [searchParams, setSearchParams] = useState(null);

    const [transactionType, setTransactionType] = useState("Income");


    const [schools, setSchools] = useState([]);


    const schoolOptions = schools.map(school => ({
    value: String(school.id),
    label: school.name
    }));

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
                axios.get(`${API_URL}/api/schools/`, { headers: getAuthHeaders() }),  // ✅ Add this
            ]);
            setSummary(summaryResponse.data);
            setLoanSummary(loanResponse.data);
            setSchools(schoolResponse.data); // ✅ Populate schools list
          
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
                    <p className="text-gray-700">{`Income: Rs ${payload[0].value.toLocaleString()}`}</p>
                    <p className="text-gray-700">{`Expenses: Rs ${payload[1].value.toLocaleString()}`}</p>
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
    const [transactions, setTransactions] = useState([]);
    const categoryOptions = useMemo(() => {
        return Array.from(new Set(transactions.map(tx => tx.category))).sort();
      }, [transactions]);
      
      
      const pivotRef = useRef(null);

      
        useEffect(() => {
          if (
              !searchParams ||
              !searchParams.selectedSchools.length ||
              transactions.length === 0
          ) return;
      
        const {
            selectedSchools: filterSchools,
            transactionType,
            selectedCategories,
            allDates,
            startDate,
            endDate
          } = searchParams;
          
          console.log("🔍 Using filterSchools:", filterSchools);
          console.log("📦 Raw transactions:", transactions.length);
          console.log("🧾 Sample transaction:", transactions[0]);
          console.log("📊 Checking fields in transactions...");
          transactions.forEach((tx, idx) => {
            if (!tx.school_id || !tx.transaction_type || !tx.category || !tx.date || !tx.amount) {
              console.warn(`❌ Incomplete tx at index ${idx}:`, tx);
            }
          });
      
        const filteredData = transactions
        .filter(tx => filterSchools.includes(String(tx.school_id)))

          .filter(tx => tx.transaction_type === transactionType)
          .filter(tx =>
            allDates || (
              startDate && endDate &&
              new Date(tx.date) >= new Date(`${startDate}-01`) &&
              new Date(tx.date) <= new Date(`${endDate}-31`)
            )
          )
          .filter(tx =>
            selectedCategories.length === 0 || selectedCategories.includes(tx.category)
          )
          .map(tx => ({
            date: tx.date,
            transaction_type: tx.transaction_type,
            amount: tx.amount,
            category: tx.category,
            school_id: tx.school_id,
            from_account_id: tx.from_account_id,
            to_account_id: tx.to_account_id,
          }));
      
        if (filteredData.length === 0) {
          console.warn("Pivot skipped: No data after filtering.");
          if (pivotRef.current) {
            pivotRef.current.innerHTML = `<div class="text-gray-500 text-center p-4">No matching data. Adjust filters and click Search again.</div>`;
          }
          return;
        }
      
        if (window.WebDataRocks && pivotRef.current) {
          pivotRef.current.innerHTML = "";
          new window.WebDataRocks({
            container: pivotRef.current,
            toolbar: true,
            height: 430,
            report: {
              dataSource: {
                data: filteredData
              },
              slice: {
                rows: [{ uniqueName: "category" }],
                columns: [
                  { uniqueName: "transaction_type" },
                  { uniqueName: "date", levelName: "Month" }
                ],
                measures: [{ uniqueName: "amount", aggregation: "sum" }]
              },
              mapping: {
                school_id: { caption: "School" },
                from_account_id: { caption: "From Account" },
                to_account_id: { caption: "To Account" },
                transaction_type: { caption: "Transaction Type" },
                date: { caption: "Date" },
                amount: { caption: "Amount" },
                category: { caption: "Category" }
              },
              options: {
                grid: {
                  showFilter: true,
                  showHeaders: true
                }
              }
            }
          });
          return;
        }
      
        const existing = document.querySelector("script[src*='webdatarocks']");
        if (existing) return;
      
        const script = document.createElement("script");
        script.src = "https://cdn.webdatarocks.com/latest/webdatarocks.js";
        script.onload = () => {
          setTimeout(() => {
            if (pivotRef.current) {
              new window.WebDataRocks({
                container: pivotRef.current,
                toolbar: true,
                height: 430,
                report: {
                  dataSource: { data: filteredData },
                  slice: {
                    rows: [{ uniqueName: "category" }],
                    columns: [
                      { uniqueName: "transaction_type" },
                      { uniqueName: "date", levelName: "Month" }
                    ],
                    measures: [{ uniqueName: "amount", aggregation: "sum" }]
                  },
                  mapping: {
                    school_id: { caption: "School" },
                    from_account_id: { caption: "From Account" },
                    to_account_id: { caption: "To Account" },
                    transaction_type: { caption: "Transaction Type" },
                    date: { caption: "Date" },
                    amount: { caption: "Amount" },
                    category: { caption: "Category" }
                  },
                  options: {
                    grid: {
                      showFilter: true,
                      showHeaders: true
                    }
                  }
                }
              });
            }
          }, 50);
        };
        document.body.appendChild(script);
      }, [searchParams]);
      
      

  
      
    

      
      useEffect(() => {
        const fetchTransactions = async () => {
            console.log("🔍 Trying to fetch all 3 transaction types...");
          
            try {
              const [incomeRes, expenseRes, transferRes] = await Promise.all([
                axios.get(`${API_URL}/api/income/`, { headers: getAuthHeaders() }),
                axios.get(`${API_URL}/api/expense/`, { headers: getAuthHeaders() }),
                axios.get(`${API_URL}/api/transfers/`, { headers: getAuthHeaders() }),
              ]);
              

              console.log("✅ Income fetched:", incomeRes.data.length);
              console.log("✅ Expense fetched:", expenseRes.data.length);
              console.log("✅ Transfers fetched:", transferRes.data.length);
              console.log("Total transactions:", transactions.length);
            console.log("Selected schools:", selectedSchools);
            console.log("Transaction type:", transactionType);
            console.log("Start:", startDate, "End:", endDate, "AllDates?", allDates);
            console.log("Selected categories:", selectedCategories);

          
              const allTransactions = [
                ...incomeRes.data.map(tx => ({ ...tx, transaction_type: "Income" })),
                ...expenseRes.data.map(tx => ({ ...tx, transaction_type: "Expense" })),
                ...transferRes.data.map(tx => ({ ...tx, transaction_type: "Transfer" }))
              ];
              setTransactions(allTransactions);  // ✅ This should be added
              console.log("🧾 Total combined transactions:", allTransactions.length);
          
              // the rest of your logic to set state...
            } catch (err) {
              console.error("❌ Failed to fetch combined transactions:", err.message || err);
            }
          };
          
          
      
        fetchTransactions();
      }, []);
      
      

    return (
        <div className="p-6 bg-gray-50 min-h-screen" role="main" aria-label="Finance Dashboard">
            <h1 className="heading-primary">Finance Dashboard</h1>

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
                    <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Interactive Transaction Explorer</h2>
                    <div className="flex flex-col gap-2 mb-4">

                    {selectedSchools.length > 0 ? (
                    
                    <div ref={pivotRef}></div>
                    ) : (
                    <div className="text-center text-gray-500 p-4 border rounded bg-white shadow">
                        Please select a school to view the transactions.
                    </div>
                    
                    )}
                                    <label className="text-gray-700 font-medium">Select School(s):</label>
                <Select
                    options={schoolOptions}
                    isMulti
                    onChange={selected => setSelectedSchools(selected.map(item => item.value))}
                    placeholder="Choose one or more schools"
                />
                </div>
<div className="flex flex-col gap-2 mb-4">
  <div className="flex items-center gap-4">
    <label className="text-gray-700 font-medium">Select Date Range:</label>
    <input
      type="month"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
      disabled={allDates}
      className="border px-2 py-1 rounded"
    />
    <span className="text-gray-600">to</span>
    <input
      type="month"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      disabled={allDates}
      className="border px-2 py-1 rounded"
    />
  </div>

  <div>
    <button
      onClick={() => setAllDates(!allDates)}
      className={`px-3 py-1 rounded ${
        allDates ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800"
      }`}
    >
      {allDates ? "Using All Dates" : "Limit to Selected Range"}
    </button>
  </div>
</div>
<div className="flex flex-col gap-2 mb-4">
  <label className="text-gray-700 font-medium">Transaction Type:</label>
  <div className="flex gap-3">
    <button
      className={`px-4 py-2 rounded ${
        transactionType === "Income" ? "bg-blue-600 text-white" : "bg-gray-200"
      }`}
      onClick={() => setTransactionType("Income")}
    >
      Income
    </button>
    <button
      className={`px-4 py-2 rounded ${
        transactionType === "Expense" ? "bg-blue-600 text-white" : "bg-gray-200"
      }`}
      onClick={() => setTransactionType("Expense")}
    >
      Expense
    </button>
  </div>
  <div className="flex flex-col gap-2 mb-4">
  <label className="text-gray-700 font-medium">Select Categories:</label>
  <div className="flex flex-wrap gap-4">
    {categoryOptions.map((category) => (
      <label key={category} className="flex items-center gap-2">
        <input
          type="checkbox"
          value={category}
          checked={selectedCategories.includes(category)}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedCategories((prev) =>
              prev.includes(value)
                ? prev.filter((c) => c !== value)
                : [...prev, value]
            );
          }}
        />
        <span>{category}</span>
      </label>
    ))}
  </div>
</div>

<div className="mt-4">
  <button
  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
  onClick={() => {
    setSearchParams({
      selectedSchools: [...selectedSchools],
      transactionType,
      selectedCategories: [...selectedCategories],
      allDates,
      startDate,
      endDate,
    });
  }}
  
>
  Search
</button>

</div>

</div>


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