// ============================================
// EDIT LEAD MODAL - Update Existing Lead
// ============================================

import React, { useState, useEffect } from 'react';
import { updateLead, fetchBDMs } from '../../api/services/crmService';
import { getUserData } from '../../utils/authHelpers';
import { LEAD_SOURCES } from '../../utils/constants';
import { toast } from 'react-toastify';

export const EditLeadModal = ({ lead, onClose, onSuccess }) => {
  const currentUser = getUserData();
  const isAdmin = currentUser.role === 'Admin';

  const [formData, setFormData] = useState({
    school_name: lead.school_name || '',
    phone: lead.phone || '',
    contact_person: lead.contact_person || '',
    email: lead.email || '',
    address: lead.address || '',
    city: lead.city || '',
    lead_source: lead.lead_source || 'Other',
    estimated_students: lead.estimated_students || '',
    notes: lead.notes || '',
    status: lead.status || 'New',
    assigned_to: lead.assigned_to || '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [bdms, setBdms] = useState([]);
  const [loadingBDMs, setLoadingBDMs] = useState(false);

  // Load BDMs if admin
  useEffect(() => {
    const loadBDMs = async () => {
      if (!isAdmin) return;

      setLoadingBDMs(true);
      try {
        const bdmsData = await fetchBDMs();
        setBdms(bdmsData);
      } catch (error) {
        console.error('Error loading BDMs:', error);
        toast.error('Failed to load BDM list');
      } finally {
        setLoadingBDMs(false);
      }
    };

    loadBDMs();
  }, [isAdmin]);

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

    // At least one required: school_name OR phone
    if (!formData.school_name && !formData.phone) {
      newErrors.general = 'Either School Name or Phone is required';
    }

    // Can't change status from Converted
    if (lead.status === 'Converted' && formData.status !== 'Converted') {
      newErrors.status = 'Cannot change status of a converted lead';
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
      // Clean up empty fields
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== '')
      );

      const response = await updateLead(lead.id, cleanData);
      toast.success('Lead updated successfully');

      // Show automation notification if present
      if (response?.automation) {
        toast.info(response.automation, { autoClose: 5000 });
      }

      onSuccess();
    } catch (error) {
      console.error('❌ Error updating lead:', error);
      if (error.response?.data) {
        // Handle validation errors from backend
        setErrors(error.response.data);
        toast.error('Please fix the errors and try again');
      } else {
        toast.error('Failed to update lead');
      }
    } finally {
      setLoading(false);
    }
  };

  const isConverted = lead.status === 'Converted';

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
            <h3 className="text-2xl font-bold text-gray-900">Edit Lead</h3>
            <p className="mt-1 text-sm text-gray-600">
              Update lead information {isConverted && '(Converted leads are locked)'}
            </p>
          </div>

          {/* Converted Warning */}
          {isConverted && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ This lead has been converted to a school. Status cannot be changed.
              </p>
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* School Name & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  name="school_name"
                  value={formData.school_name}
                  onChange={handleChange}
                  disabled={isConverted}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.school_name ? 'border-red-300' : 'border-gray-300'
                  } ${isConverted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="ABC School"
                />
                {errors.school_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.school_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isConverted}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  } ${isConverted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="+923001234567"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Contact Person & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mr. Ahmed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ahmed@abc.com"
                />
              </div>
            </div>

            {/* Address & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
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

            {/* Lead Source & Estimated Students */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Source
                </label>
                <select
                  name="lead_source"
                  value={formData.lead_source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.values(LEAD_SOURCES).map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Students
                </label>
                <input
                  type="number"
                  name="estimated_students"
                  value={formData.estimated_students}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50"
                  min="0"
                />
              </div>
            </div>

            {/* Status & Assigned To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={isConverted}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.status ? 'border-red-300' : 'border-gray-300'
                  } ${isConverted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status}</p>
                )}
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign to BDM
                  </label>
                  <select
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleChange}
                    disabled={loadingBDMs}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {bdms.map((bdm) => (
                      <option key={bdm.id} value={bdm.id}>
                        {bdm.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about this lead..."
              />
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
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditLeadModal;
