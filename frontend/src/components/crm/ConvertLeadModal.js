// ============================================
// CONVERT LEAD MODAL - Convert Lead to School
// ============================================

import React, { useState } from 'react';
import { convertLead } from '../../api/services/crmService';
import { toast } from 'react-toastify';

export const ConvertLeadModal = ({ lead, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    school_name: lead.school_name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    address: lead.address || '',
    city: lead.city || '',
    payment_mode: 'per_student',
    fee_per_student: '',
    monthly_subscription_amount: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.school_name) {
      newErrors.school_name = 'School name is required';
    }

    if (!formData.payment_mode) {
      newErrors.payment_mode = 'Payment mode is required';
    }

    if (formData.payment_mode === 'per_student' && !formData.fee_per_student) {
      newErrors.fee_per_student = 'Fee per student is required for this payment mode';
    }

    if (
      formData.payment_mode === 'monthly_subscription' &&
      !formData.monthly_subscription_amount
    ) {
      newErrors.monthly_subscription_amount =
        'Monthly subscription amount is required for this payment mode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // Clean up data based on payment mode
      const cleanData = {
        school_name: formData.school_name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        payment_mode: formData.payment_mode,
      };

      if (formData.payment_mode === 'per_student') {
        cleanData.fee_per_student = parseFloat(formData.fee_per_student);
      } else {
        cleanData.monthly_subscription_amount = parseFloat(formData.monthly_subscription_amount);
      }

      await convertLead(lead.id, cleanData);
      toast.success(`Lead successfully converted to ${cleanData.school_name}`);
      onSuccess();
    } catch (error) {
      console.error('❌ Error converting lead:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
        toast.error('Please fix the errors and try again');
      } else {
        toast.error('Failed to convert lead');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Convert Lead to School</h3>
            <p className="mt-1 text-sm text-gray-600">
              Convert "{lead.school_name || lead.phone}" into an active school in the system
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* School Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School Name *
              </label>
              <input
                type="text"
                name="school_name"
                value={formData.school_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.school_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="ABC School"
                required
              />
              {errors.school_name && (
                <p className="mt-1 text-sm text-red-600">{errors.school_name}</p>
              )}
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+923001234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="info@abc.com"
                />
              </div>
            </div>

            {/* Address & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rawalpindi"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Mode *
              </label>
              <select
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.payment_mode ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="per_student">Per Student</option>
                <option value="monthly_subscription">Monthly Subscription</option>
              </select>
              {errors.payment_mode && (
                <p className="mt-1 text-sm text-red-600">{errors.payment_mode}</p>
              )}
            </div>

            {/* Conditional Payment Fields */}
            {formData.payment_mode === 'per_student' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fee Per Student (PKR) *
                </label>
                <input
                  type="number"
                  name="fee_per_student"
                  value={formData.fee_per_student}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.fee_per_student ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="5000"
                  min="0"
                  step="0.01"
                  required
                />
                {errors.fee_per_student && (
                  <p className="mt-1 text-sm text-red-600">{errors.fee_per_student}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Subscription Amount (PKR) *
                </label>
                <input
                  type="number"
                  name="monthly_subscription_amount"
                  value={formData.monthly_subscription_amount}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.monthly_subscription_amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="50000"
                  min="0"
                  step="0.01"
                  required
                />
                {errors.monthly_subscription_amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.monthly_subscription_amount}</p>
                )}
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Converting this lead will create a new school in the system
                and mark the lead as "Converted". All scheduled activities will be marked as
                completed.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Converting...' : 'Convert to School'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConvertLeadModal;
