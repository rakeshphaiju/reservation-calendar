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
  getAll: () => apiClient.get('/reserve').then(handleResponse).catch(handleError),

  getSlots: () => apiClient.get('/reserve/slots').then(handleResponse).catch(handleError),

  create: (data) => apiClient.post('/reserve/add', data).then(handleResponse).catch(handleError),

  getById: (id) => apiClient.get(`/reserve/${id}`).then(handleResponse).catch(handleError),

  delete: (id) => apiClient.delete(`/reserve/${id}`).then(handleResponse).catch(handleError),
};

export default apiClient;