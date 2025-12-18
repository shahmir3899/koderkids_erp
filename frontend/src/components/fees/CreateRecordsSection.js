/**
 * CreateRecordsSection Component
 * Path: frontend/src/components/fees/CreateRecordsSection.js
 */

import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CreateRecordsSection = ({
  schools,
  selectedSchoolId,
  onSchoolChange,
  selectedMonth,
  onMonthChange,
  onCreateMonthly,
  onOpenSingleFeeModal,
  loading,
  loadingStudents,
  successMessage,
}) => {
  return (
    <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Create Fee Records</h2>
      </div>
      
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col">
          <label htmlFor="create-school" className="text-xs text-gray-500 mb-1">
            School
          </label>
          <select
            id="create-school"
            value={selectedSchoolId}
            onChange={(e) => onSchoolChange(e.target.value)}
            className="border border-gray-300 p-2 rounded-md w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select School</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="create-month" className="text-xs text-gray-500 mb-1">
            Month
          </label>
          <DatePicker
            id="create-month"
            selected={selectedMonth}
            onChange={onMonthChange}
            dateFormat="MMM-yyyy"
            showMonthYearPicker
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholderText="Select Month"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1 invisible">Action</label>
          <button
            onClick={onCreateMonthly}
            disabled={!selectedSchoolId || !selectedMonth || loading}
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              !selectedSchoolId || !selectedMonth || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Monthly Records'
            )}
          </button>
        </div>

        <div className="h-10 w-px bg-gray-300 mx-2" />

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1 invisible">Action</label>
          <button
            onClick={onOpenSingleFeeModal}
            disabled={!selectedSchoolId || loading || loadingStudents}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              !selectedSchoolId || loading || loadingStudents
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {loadingStudents ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : (
              '+ Single Record'
            )}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mt-3 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-md flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default CreateRecordsSection;