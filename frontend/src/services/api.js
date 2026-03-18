import axios from 'axios';
// import { authService } from './auth';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, config } = error || {};
    const status = response?.status;
    const url = config?.url || '';

    // 401s from /api/auth/me are expected when not logged in; don't redirect.
    const isAuthMe = url.includes('/auth/me');
    const onLoginPage = window.location.pathname === '/login';

    if (status === 401 && !isAuthMe && !onLoginPage) {
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

const handleResponse = (response) => response.data;
const handleError = (error) => {
  console.error('API Call Failed:', error);
  throw error;
};

export const reservationService = {
  getAll: () => apiClient.get('/reservations').then(handleResponse).catch(handleError),

  getCalendars: () => apiClient.get('/calendars').then(handleResponse).catch(handleError),

  getSlots: (ownerSlug) => apiClient
    .get(`/calendars/${ownerSlug}/reservations/slots`)
    .then(handleResponse)
    .catch(handleError),

  create: (ownerSlug, data) => apiClient
    .post(`/calendars/${ownerSlug}/reservations/add`, data)
    .then(handleResponse)
    .catch(handleError),

  getById: (id) => apiClient.get(`/reservations/${id}`).then(handleResponse).catch(handleError),

  delete: (id) => apiClient.delete(`/reservations/${id}`).then(handleResponse).catch(handleError),
};

export default apiClient;
