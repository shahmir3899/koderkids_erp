/**
 * SingleFeeModal Component - UPDATED
 * Path: frontend/src/components/fees/SingleFeeModal.js
 * 
 * Changes:
 * - Removed manual totalFee input (auto-fetched from student)
 * - Shows student's monthly_fee as read-only
 * - Only paid_amount is editable
 */

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const SingleFeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  loading,
  selectedMonth,
  schoolName,
}) => {
  const [formData, setFormData] = useState({
    studentId: '',
    paidAmount: '0',
    month: selectedMonth,
  });
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        studentId: '',
        paidAmount: '0',
        month: selectedMonth,
      });
      setErrors({});
      setSearchTerm('');
    }
  }, [isOpen, selectedMonth]);

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.reg_num?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected student details
  const selectedStudent = students.find(s => s.id === parseInt(formData.studentId));
  const monthlyFee = selectedStudent?.monthly_fee || 0;

  const validate = () => {
    const newErrors = {};

    if (!formData.studentId) {
      newErrors.studentId = 'Please select a student';
    }

    if (!formData.month) {
      newErrors.month = 'Please select a month';
    }

    const paid = parseFloat(formData.paidAmount || 0);
    if (paid < 0) {
      newErrors.paidAmount = 'Paid amount cannot be negative';
    }
    if (paid > monthlyFee) {
      newErrors.paidAmount = `Paid amount cannot exceed monthly fee (${monthlyFee})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    const result = await onSubmit({
      studentId: parseInt(formData.studentId),
      paidAmount: parseFloat(formData.paidAmount || 0),
      month: formData.month,
      // totalFee is NOT sent - backend auto-fetches from student.monthly_fee
    });

    if (result.success) {
      onClose();
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const balanceDue = monthlyFee - parseFloat(formData.paidAmount || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Single Fee Record</h2>
            {schoolName && (
              <p className="text-sm text-gray-500 mt-1">{schoolName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Month Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={formData.month}
              onChange={(date) => handleChange('month', date)}
              dateFormat="MMM-yyyy"
              showMonthYearPicker
              className={`w-full border rounded-md p-2 ${
                errors.month ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
              placeholderText="Select Month"
            />
            {errors.month && (
              <p className="text-red-500 text-xs mt-1">{errors.month}</p>
            )}
          </div>

          {/* Student Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student <span className="text-red-500">*</span>
            </label>
            
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student by name or reg number..."
              className="w-full border border-gray-300 rounded-md p-2 mb-2 focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={formData.studentId}
              onChange={(e) => handleChange('studentId', e.target.value)}
              className={`w-full border rounded-md p-2 ${
                errors.studentId ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-blue-500`}
              size={5}
            >
              <option value="">-- Select Student --</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.reg_num ? `(${student.reg_num})` : ''} - {student.student_class} - PKR {student.monthly_fee || 0}
                </option>
              ))}
            </select>
            {errors.studentId && (
              <p className="text-red-500 text-xs mt-1">{errors.studentId}</p>
            )}
            {filteredStudents.length === 0 && searchTerm && (
              <p className="text-gray-500 text-xs mt-1">No students found matching "{searchTerm}"</p>
            )}
          </div>

          {/* Selected Student Info Card */}
          {selectedStudent && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-blue-900">{selectedStudent.name}</p>
                  <p className="text-sm text-blue-700">
                    {selectedStudent.student_class} | {selectedStudent.reg_num || 'No Reg #'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600 uppercase">Monthly Fee</p>
                  <p className="text-xl font-bold text-blue-900">PKR {monthlyFee}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium">{schoolName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Fee (Read-Only) */}
          {selectedStudent && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Fee (Auto from Student Record)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">PKR</span>
                <input
                  type="text"
                  value={monthlyFee}
                  readOnly
                  disabled
                  className="w-full border border-gray-200 rounded-md p-2 pl-12 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This is fetched from the student's monthly fee setting
              </p>
            </div>
          )}

          {/* Paid Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">PKR</span>
              <input
                type="number"
                value={formData.paidAmount}
                onChange={(e) => handleChange('paidAmount', e.target.value)}
                className={`w-full border rounded-md p-2 pl-12 ${
                  errors.paidAmount ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter paid amount (default: 0)"
                min="0"
                max={monthlyFee}
                step="0.01"
              />
            </div>
            {errors.paidAmount && (
              <p className="text-red-500 text-xs mt-1">{errors.paidAmount}</p>
            )}
          </div>

          {/* Balance Preview */}
          {selectedStudent && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total Fee</p>
                  <p className="text-lg font-semibold text-gray-900">PKR {monthlyFee}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Paid</p>
                  <p className="text-lg font-semibold text-green-600">
                    PKR {parseFloat(formData.paidAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Balance Due</p>
                  <p className={`text-lg font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    PKR {balanceDue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedStudent}
              className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                loading || !selectedStudent
                  ? 'bg-blue-400 cursor-not-allowed'
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
                'Create Fee Record'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SingleFeeModal;