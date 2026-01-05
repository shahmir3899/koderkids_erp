// ============================================
// CREATE ACTIVITY MODAL - Add New Activity
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createActivity, fetchLeads, fetchBDMs } from '../../api/services/crmService';
import { getUserData, getAuthHeaders } from '../../utils/authHelpers';
import { API_URL } from '../../utils/constants';
import { toast } from 'react-toastify';

export const CreateActivityModal = ({ onClose, onSuccess }) => {
  const currentUser = getUserData();
  const isAdmin = currentUser.role === 'Admin';

  const [formData, setFormData] = useState({
    activity_type: 'Call',
    lead: '',
    subject: '',
    description: '',
    assigned_to: '',
    scheduled_date: '',
    status: 'Scheduled',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [leads, setLeads] = useState([]);
  const [bdms, setBdms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Load current user ID and form data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        // Fetch current user ID
        const userResponse = await axios.get(`${API_URL}/api/auth/user/`, {
          headers: getAuthHeaders(),
        });
        const userId = userResponse.data.id;
        setCurrentUserId(userId);

        // For BDM, auto-assign to themselves
        if (!isAdmin) {
          setFormData((prev) => ({ ...prev, assigned_to: userId }));
        }

        // Fetch leads and BDMs
        const [leadsData, bdmsData] = await Promise.all([
          fetchLeads(),
          isAdmin ? fetchBDMs() : Promise.resolve([]),
        ]);
        setLeads(leadsData);
        if (isAdmin) {
          setBdms(bdmsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
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

    if (!formData.activity_type) {
      newErrors.activity_type = 'Activity type is required';
    }
    if (!formData.lead) {
      newErrors.lead = 'Lead is required';
    }
    if (!formData.subject) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Scheduled date is required';
    }
    if (isAdmin && !formData.assigned_to) {
      newErrors.assigned_to = 'Assigned to is required';
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

      // Convert scheduled_date to ISO format if needed
      if (cleanData.scheduled_date) {
        cleanData.scheduled_date = new Date(cleanData.scheduled_date).toISOString();
      }

      const response = await createActivity(cleanData);
      toast.success('Activity created successfully');

      // Show automation notification if present
      if (response?.automation) {
        toast.info(response.automation, { autoClose: 5000 });
      }

      onSuccess();
    } catch (error) {
      console.error('❌ Error creating activity:', error);
      if (error.response?.data) {
        // Handle validation errors from backend
        setErrors(error.response.data);
        toast.error('Please fix the errors and try again');
      } else {
        toast.error('Failed to create activity');
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
            <h3 className="text-2xl font-bold text-gray-900">Create New Activity</h3>
            <p className="mt-1 text-sm text-gray-600">
              Schedule a call or meeting with a lead
            </p>
          </div>

          {/* Loading State */}
          {loadingData ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* General Error */}
              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Activity Type & Lead */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity Type *
                    </label>
                    <select
                      name="activity_type"
                      value={formData.activity_type}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.activity_type ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="Call">Call</option>
                      <option value="Meeting">Meeting</option>
                    </select>
                    {errors.activity_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.activity_type}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead *
                    </label>
                    <select
                      name="lead"
                      value={formData.lead}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.lead ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a lead...</option>
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.school_name || lead.phone} - {lead.status}
                        </option>
                      ))}
                    </select>
                    {errors.lead && (
                      <p className="mt-1 text-sm text-red-600">{errors.lead}</p>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.subject ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Follow-up call regarding pricing"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                  )}
                </div>

                {/* Scheduled Date & Assigned To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduled_date"
                      value={formData.scheduled_date}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.scheduled_date ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.scheduled_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.scheduled_date}</p>
                    )}
                  </div>

                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assign To BDM *
                      </label>
                      <select
                        name="assigned_to"
                        value={formData.assigned_to}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.assigned_to ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select BDM...</option>
                        {bdms.map((bdm) => (
                          <option key={bdm.id} value={bdm.id}>
                            {bdm.full_name}
                          </option>
                        ))}
                      </select>
                      {errors.assigned_to && (
                        <p className="mt-1 text-sm text-red-600">{errors.assigned_to}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes/Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes about this activity..."
                  />
                </div>

                {/* Status (optional - defaults to Scheduled) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
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
                    {loading ? 'Creating...' : 'Create Activity'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateActivityModal;
