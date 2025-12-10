/**
 * FeeFilters Component
 * Path: frontend/src/components/fees/FeeFilters.js
 */

import React, { useCallback } from 'react';
import DatePicker from 'react-datepicker';
import debounce from 'lodash/debounce';
import 'react-datepicker/dist/react-datepicker.css';

const FeeFilters = ({
  schools,
  classes,
  filters,
  onFilterChange,
  onExportPDF,
  loading,
  hasData,
}) => {
  const debouncedSearch = useCallback(
    debounce((value) => {
      onFilterChange({ searchTerm: value });
    }, 300),
    [onFilterChange]
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col min-w-[180px]">
          <label htmlFor="filter-school" className="text-xs text-gray-500 mb-1">
            School
          </label>
          <select
            id="filter-school"
            value={filters.schoolId}
            onChange={(e) => onFilterChange({ schoolId: e.target.value })}
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col min-w-[140px]">
          <label htmlFor="filter-class" className="text-xs text-gray-500 mb-1">
            Class
          </label>
          <select
            id="filter-class"
            value={filters.studentClass}
            onChange={(e) => onFilterChange({ studentClass: e.target.value })}
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Classes</option>
            {classes.map((cls, index) => (
              <option key={index} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="filter-month" className="text-xs text-gray-500 mb-1">
            Month
          </label>
          <DatePicker
            id="filter-month"
            selected={filters.month}
            onChange={(date) => onFilterChange({ month: date })}
            dateFormat="MMM-yyyy"
            showMonthYearPicker
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col flex-1 min-w-[200px]">
          <label htmlFor="filter-search" className="text-xs text-gray-500 mb-1">
            Search
          </label>
          <input
            id="filter-search"
            type="text"
            onChange={handleSearchChange}
            placeholder="Search by student name..."
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={onExportPDF}
          disabled={loading || !hasData}
          className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
            loading || !hasData
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default FeeFilters;