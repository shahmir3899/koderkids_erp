import axios from 'axios';
import { API_URL, getAuthHeaders, getJsonHeaders } from '../api';

export const getNotificationSettings = async () => {
  const response = await axios.get(
    `${API_URL}/employees/notifications/settings/`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateNotificationSettings = async (data) => {
  const response = await axios.put(
    `${API_URL}/employees/notifications/settings/`,
    data,
    { headers: getJsonHeaders() }
  );
  return response.data;
};
