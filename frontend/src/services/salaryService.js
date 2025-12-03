// services/salaryService.js
import axios from 'axios';
import { getAuthHeaders } from '../api';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const salaryService = {
  // Fetch all teachers for dropdown
  fetchTeachers: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/employees/api/teachers/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Fetch default salary period dates
  fetchDefaultDates: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/employees/api/default-dates/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Fetch specific teacher's profile
  fetchTeacherProfile: async (teacherId) => {
    const response = await axios.get(
      `${API_BASE_URL}/employees/api/teacher/${teacherId}/`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};