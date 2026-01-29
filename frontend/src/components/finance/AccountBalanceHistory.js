// ============================================
// ACCOUNT BALANCE HISTORY COMPONENT
// ============================================
// Location: src/components/finance/AccountBalanceHistory.js
//
// Shows historical balance changes for selected account
// with monthly or weekly data points

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL, getAuthHeaders } from '../../api';
import { formatLocalDate } from '../../utils/dateFormatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

export const AccountBalanceHistory = ({ accounts }) => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [timeframe, setTimeframe] = useState('monthly'); // 'weekly' or 'monthly'
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================

  // Set first account as default when accounts load
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  // Fetch balance history when account or timeframe changes
  useEffect(() => {
    if (selectedAccount) {
      fetchBalanceHistory();
    }
  }, [selectedAccount, timeframe]);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchBalanceHistory = async () => {
    setLoading(true);
    try {
      // Fetch all transactions for this account
      const [incomeRes, expenseRes, transferRes] = await Promise.all([
        axios.get(`${API_URL}/api/income/`, { 
          headers: getAuthHeaders(),
          params: { limit: 1000 } // Get more data for history
        }),
        axios.get(`${API_URL}/api/expense/`, { 
          headers: getAuthHeaders(),
          params: { limit: 1000 }
        }),
        axios.get(`${API_URL}/api/transfers/`, { 
          headers: getAuthHeaders(),
          params: { limit: 1000 }
        }),
      ]);

      // Combine all transactions
      const allTransactions = [
        ...incomeRes.data.results.map(tx => ({ ...tx, type: 'income' })),
        ...expenseRes.data.results.map(tx => ({ ...tx, type: 'expense' })),
        ...transferRes.data.results.map(tx => ({ ...tx, type: 'transfer' })),
      ];

      // Filter transactions for selected account
      const accountTransactions = allTransactions.filter(tx => 
        tx.from_account === selectedAccount || tx.to_account === selectedAccount
      );

      // Sort by date (oldest first for balance calculation)
      accountTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate balance history
      const history = calculateBalanceHistory(accountTransactions);
      setBalanceHistory(history);
    } catch (error) {
      console.error('Error fetching balance history:', error);
      toast.error('Failed to load balance history');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // BALANCE CALCULATION
  // ============================================

  const calculateBalanceHistory = (transactions) => {
    if (transactions.length === 0) return [];

    // Get the account's initial balance (we'll work backwards from current)
    const account = accounts.find(acc => acc.id === selectedAccount);
    if (!account) return [];

    // Calculate running balance
    let runningBalance = 0;
    const transactionsWithBalance = transactions.map(tx => {
      const amount = parseFloat(tx.amount || 0);
      
      // Determine if this is a credit or debit for this account
      if (tx.to_account === selectedAccount) {
        // Money coming IN
        runningBalance += amount;
      } else if (tx.from_account === selectedAccount) {
        // Money going OUT
        runningBalance -= amount;
      }

      return {
        date: new Date(tx.date),
        balance: runningBalance,
        amount: amount,
        type: tx.type,
      };
    });

    // Adjust all balances so the final one matches current balance
    const lastBalance = transactionsWithBalance[transactionsWithBalance.length - 1]?.balance || 0;
    const currentBalance = account.current_balance;
    const adjustment = currentBalance - lastBalance;

    transactionsWithBalance.forEach(item => {
      item.balance += adjustment;
    });

    // Group by timeframe
    if (timeframe === 'monthly') {
      return groupByMonth(transactionsWithBalance);
    } else {
      return groupByWeek(transactionsWithBalance);
    }
  };

  // ============================================
  // GROUPING FUNCTIONS
  // ============================================

  const groupByMonth = (transactions) => {
    const grouped = {};
    
    transactions.forEach(tx => {
      const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = tx.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!grouped[monthKey] || tx.date > grouped[monthKey].date) {
        grouped[monthKey] = {
          date: tx.date,
          label: monthLabel,
          balance: tx.balance,
        };
      }
    });

    return Object.values(grouped).sort((a, b) => a.date - b.date);
  };

  const groupByWeek = (transactions) => {
    const grouped = {};
    
    transactions.forEach(tx => {
      const weekStart = getWeekStart(tx.date);
      const weekKey = formatLocalDate(weekStart);
      const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!grouped[weekKey] || tx.date > grouped[weekKey].date) {
        grouped[weekKey] = {
          date: tx.date,
          label: weekLabel,
          balance: tx.balance,
        };
      }
    });

    return Object.values(grouped).sort((a, b) => a.date - b.date);
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const selectedAccountName = useMemo(() => {
    const account = accounts.find(acc => acc.id === selectedAccount);
    return account ? account.account_name : '';
  }, [accounts, selectedAccount]);

  const currentBalance = useMemo(() => {
    const account = accounts.find(acc => acc.id === selectedAccount);
    return account ? account.current_balance : 0;
  }, [accounts, selectedAccount]);

  const balanceChange = useMemo(() => {
    if (balanceHistory.length < 2) return 0;
    const first = balanceHistory[0].balance;
    const last = balanceHistory[balanceHistory.length - 1].balance;
    return last - first;
  }, [balanceHistory]);

  const percentageChange = useMemo(() => {
    if (balanceHistory.length < 2 || balanceHistory[0].balance === 0) return 0;
    const first = balanceHistory[0].balance;
    const last = balanceHistory[balanceHistory.length - 1].balance;
    return ((last - first) / Math.abs(first)) * 100;
  }, [balanceHistory]);

  // ============================================
  // CUSTOM TOOLTIP
  // ============================================

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '1rem',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#374151' }}>
            {data.label}
          </p>
          <p style={{ margin: 0, color: '#059669', fontWeight: '600' }}>
            Balance: PKR {data.balance.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // ============================================
  // RENDER
  // ============================================

  if (!accounts || accounts.length === 0) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <p style={{ color: '#6B7280', margin: 0 }}>
          No accounts available
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Account Selector */}
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Select Account
          </label>
          <select
            value={selectedAccount || ''}
            onChange={(e) => setSelectedAccount(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
              backgroundColor: 'white',
            }}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_name} (PKR {acc.current_balance.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe Selector */}
        <div style={{ flex: 0, minWidth: '150px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#374151',
              fontSize: '0.875rem',
            }}
          >
            Timeframe
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
              backgroundColor: 'white',
            }}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Current Balance */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #BFDBFE',
          }}
        >
          <p style={{ fontSize: '0.75rem', color: '#1E40AF', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
            CURRENT BALANCE
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>
            PKR {currentBalance.toLocaleString()}
          </p>
        </div>

        {/* Balance Change */}
        <div
          style={{
            backgroundColor: balanceChange >= 0 ? '#ECFDF5' : '#FEF2F2',
            padding: '1rem',
            borderRadius: '8px',
            border: `1px solid ${balanceChange >= 0 ? '#A7F3D0' : '#FECACA'}`,
          }}
        >
          <p style={{ 
            fontSize: '0.75rem', 
            color: balanceChange >= 0 ? '#059669' : '#DC2626', 
            margin: '0 0 0.25rem 0', 
            fontWeight: '600' 
          }}>
            CHANGE
          </p>
          <p style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: balanceChange >= 0 ? '#059669' : '#DC2626', 
            margin: 0 
          }}>
            {balanceChange >= 0 ? '+' : ''}PKR {balanceChange.toLocaleString()}
          </p>
        </div>

        {/* Percentage Change */}
        <div
          style={{
            backgroundColor: percentageChange >= 0 ? '#ECFDF5' : '#FEF2F2',
            padding: '1rem',
            borderRadius: '8px',
            border: `1px solid ${percentageChange >= 0 ? '#A7F3D0' : '#FECACA'}`,
          }}
        >
          <p style={{ 
            fontSize: '0.75rem', 
            color: percentageChange >= 0 ? '#059669' : '#DC2626', 
            margin: '0 0 0.25rem 0', 
            fontWeight: '600' 
          }}>
            % CHANGE
          </p>
          <p style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: percentageChange >= 0 ? '#059669' : '#DC2626', 
            margin: 0 
          }}>
            {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <LoadingSpinner message="Loading balance history..." />
        </div>
      ) : balanceHistory.length === 0 ? (
        <div style={{ 
          padding: '3rem', 
          textAlign: 'center',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }}>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '1rem' }}>
            No transaction history available for {selectedAccountName}
          </p>
        </div>
      ) : (
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balanceHistory}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="label" 
                stroke="#6B7280"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#6B7280"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '1rem' }}
                formatter={() => selectedAccountName}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fill="url(#colorBalance)"
                name={selectedAccountName}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Info Text */}
      {balanceHistory.length > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#EFF6FF',
          borderRadius: '8px',
          border: '1px solid #BFDBFE'
        }}>
          <p style={{ fontSize: '0.875rem', color: '#1E40AF', margin: 0 }}>
            📊 Showing {balanceHistory.length} data points for <strong>{selectedAccountName}</strong> 
            {' '}({timeframe === 'monthly' ? 'Monthly' : 'Weekly'} view)
          </p>
        </div>
      )}
    </div>
  );
};