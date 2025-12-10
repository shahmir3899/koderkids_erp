/**
 * FeeSummaryHeader Component
 * Path: frontend/src/components/fees/FeeSummaryHeader.js
 */

import React from 'react';
import { format } from 'date-fns';

const formatCurrency = (value) => {
  const num = parseFloat(value || 0);
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const FeeSummaryHeader = ({
  schoolName,
  studentClass,
  month,
  totals,
}) => {
  const monthDisplay = month ? format(month, 'MMM yyyy') : 'N/A';
  const classDisplay = studentClass || 'All Classes';

  const collectionRate = totals.total_fee > 0 
    ? ((totals.paid_amount / totals.total_fee) * 100).toFixed(1)
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="font-semibold text-gray-900">{schoolName}</span>
        </div>
        
        <span className="text-gray-300">|</span>
        
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-gray-700">{classDisplay}</span>
        </div>
        
        <span className="text-gray-300">|</span>
        
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-gray-700">{monthDisplay}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Total Fee</p>
          <p className="text-xl font-bold text-blue-900">PKR {formatCurrency(totals.total_fee)}</p>
          <p className="text-xs text-blue-500">{totals.count} records</p>
        </div>

        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Collected</p>
          <p className="text-xl font-bold text-green-900">PKR {formatCurrency(totals.paid_amount)}</p>
          <p className="text-xs text-green-500">{collectionRate}% collected</p>
        </div>

        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Outstanding</p>
          <p className="text-xl font-bold text-red-900">PKR {formatCurrency(totals.balance_due)}</p>
          <p className="text-xs text-red-500">{(100 - collectionRate).toFixed(1)}% pending</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Collection Rate</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  parseFloat(collectionRate) >= 80 ? 'bg-green-500' :
                  parseFloat(collectionRate) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <span className="text-lg font-bold text-gray-900">{collectionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeSummaryHeader;