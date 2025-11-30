// ============================================
// PIVOT TABLE VIEWER COMPONENT
// ============================================

import React, { useRef, useEffect, useState } from 'react';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

// Function to dynamically load WebDataRocks
const loadWebDataRocks = () => {
  return new Promise((resolve) => {
    if (window.WebDataRocks) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.webdatarocks.com/latest/webdatarocks.js';
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
};

export const PivotTableViewer = ({ transactions, schools, filters, loading }) => {
  const pivotRef = useRef(null);
  const [isWebDataRocksLoaded, setIsWebDataRocksLoaded] = useState(false);

  // Load WebDataRocks library
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        await loadWebDataRocks();
        setIsWebDataRocksLoaded(true);
      } catch (error) {
        console.error('Failed to load WebDataRocks:', error);
      }
    };

    loadLibrary();
  }, []);

  // Initialize pivot table when data changes
  useEffect(() => {
    if (!filters || transactions.length === 0 || !isWebDataRocksLoaded || !pivotRef.current) {
      if (pivotRef.current && !filters) {
        pivotRef.current.innerHTML = `
          <div style="
            text-align: center;
            padding: 2rem;
            color: #9CA3AF;
            background-color: #F9FAFB;
            border-radius: 8px;
            border: 1px dashed #D1D5DB;
          ">
            Select filters and click "Search Transactions" to view the report.
          </div>
        `;
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
      .filter((tx) => {
        // Filter by selected schools
        if (filters.selectedSchools.length > 0) {
          return filters.selectedSchools.includes(String(tx.school));
        }
        return true;
      })
      .filter((tx) => {
        // Filter by transaction type
        return tx.transaction_type === filters.transactionType;
      })
      .filter((tx) => {
        // Filter by date range
        const txDate = new Date(tx.date);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        return txDate >= startDate && txDate <= endDate;
      })
      .filter((tx) => {
        // Filter by selected categories
        if (filters.selectedCategories.length > 0) {
          return filters.selectedCategories.includes(tx.category);
        }
        return true;
      })
      .map((tx) => ({
        id: tx.id,
        date: new Date(tx.date).toISOString(),
        transaction_type: tx.transaction_type,
        amount: parseFloat(tx.amount),
        category: tx.category,
        school: tx.school ? schoolMap[tx.school] || 'No School' : 'No School',
        from_account: tx.from_account_name || '—',
        to_account: tx.to_account_name || '—',
        notes: tx.notes || '',
      }));

    if (filteredData.length === 0) {
      pivotRef.current.innerHTML = `
        <div style="
          text-align: center;
          padding: 2rem;
          color: #9CA3AF;
          background-color: #F9FAFB;
          border-radius: 8px;
          border: 1px dashed #D1D5DB;
        ">
          No matching transactions found. Adjust filters and try again.
        </div>
      `;
      return;
    }

    // Initialize pivot table
    pivotRef.current.innerHTML = '';
    new window.WebDataRocks({
      container: pivotRef.current,
      toolbar: true,
      height: 430,
      report: {
        dataSource: { data: filteredData },
        slice: {
          rows: [
            { uniqueName: 'school' },
            { uniqueName: 'category' },
          ],
          columns: [
            { uniqueName: 'date', levelName: 'Month' },
          ],
          measures: [
            { uniqueName: 'amount', aggregation: 'sum', format: 'PKRFormat' },
          ],
        },
        formats: [
          {
            name: 'PKRFormat',
            thousandsSeparator: ',',
            decimalSeparator: '.',
            decimalPlaces: 0,
            currencySymbol: 'PKR ',
            currencySymbolAlign: 'left',
            nullValue: '-',
            textAlign: 'right',
          },
        ],
        mapping: {
          school: { caption: 'School' },
          from_account: { caption: 'From Account' },
          to_account: { caption: 'To Account' },
          transaction_type: { caption: 'Transaction Type' },
          date: { caption: 'Date', type: 'date' },
          amount: { caption: 'Amount' },
          category: { caption: 'Category' },
          notes: { caption: 'Notes' },
        },
        options: {
          grid: {
            showFilter: true,
            showHeaders: true,
          },
        },
      },
    });
  }, [filters, transactions, schools, isWebDataRocksLoaded]);

  // Show loading state
  if (loading) {
    return <LoadingSpinner size="medium" message="Loading transactions..." />;
  }

  // Show message if WebDataRocks is still loading
  if (!isWebDataRocksLoaded) {
    return <LoadingSpinner size="medium" message="Loading pivot table library..." />;
  }

  return (
    <div
      ref={pivotRef}
      style={{
        marginTop: '1.5rem',
        minHeight: '400px',
      }}
    />
  );
};