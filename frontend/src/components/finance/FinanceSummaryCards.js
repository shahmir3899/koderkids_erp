// ============================================
// FINANCE SUMMARY CARDS COMPONENT
// ============================================

import React from 'react';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

const SummaryCard = ({ title, value, color }) => {
  const colorStyles = {
    green: {
      background: '#D1FAE5',
      titleColor: '#065F46',
      valueColor: '#059669',
    },
    red: {
      background: '#FEE2E2',
      titleColor: '#7F1D1D',
      valueColor: '#DC2626',
    },
    blue: {
      background: '#DBEAFE',
      titleColor: '#1E3A8A',
      valueColor: '#2563EB',
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div style={{
      backgroundColor: style.background,
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: style.titleColor,
        margin: '0 0 0.5rem 0',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: style.valueColor,
        margin: 0,
      }}>
        PKR {value.toLocaleString()}
      </p>
    </div>
  );
};

export const FinanceSummaryCards = ({ summary, loading }) => {
  if (loading) {
    return <LoadingSpinner size="medium" message="Loading summary..." />;
  }

  const netBalance = summary.income - summary.expenses;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem',
    }}>
      <SummaryCard
        title="Total Income"
        value={summary.income}
        color="green"
      />
      <SummaryCard
        title="Total Expenses"
        value={summary.expenses}
        color="red"
      />
      <SummaryCard
        title="Net Balance"
        value={netBalance}
        color={netBalance >= 0 ? 'blue' : 'red'}
      />
    </div>
  );
};