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
  getAll: (params) => apiClient.get('/reservations', { params }).then(handleResponse).catch(handleError),

  getCalendars: () => apiClient.get('/calendars').then(handleResponse).catch(handleError),

  getSlots: (ownerSlug) => apiClient
    .get(`/calendars/${ownerSlug}/reservations/slots`)
    .then(handleResponse)
    .catch(handleError),

  getSlotCapacity: () => apiClient
    .get('/dashboard/slot-capacity')
    .then(handleResponse)
    .catch(handleError),

  getMaxWeeks: () => apiClient
    .get('/dashboard/max-weeks')
    .then(handleResponse)
    .catch(handleError),

  getTimeSlots: () => apiClient
    .get('/dashboard/time-slots')
    .then(handleResponse)
    .catch(handleError),

  getBookableDays: () => apiClient
    .get('/dashboard/bookable-days')
    .then(handleResponse)
    .catch(handleError),

  getCalendarDetails: () => apiClient
    .get('/dashboard/calendar-details')
    .then(handleResponse)
    .catch(handleError),

  updateSlotCapacity: (slot_capacity) => apiClient
    .put('/dashboard/slot-capacity', { slot_capacity })
    .then(handleResponse)
    .catch(handleError),

  updateMaxWeeks: (max_weeks) => apiClient
    .put('/dashboard/max-weeks', { max_weeks })
    .then(handleResponse)
    .catch(handleError),

  updateTimeSlots: ({ day_time_slots, date_time_slots }) => apiClient
    .put('/dashboard/time-slots', { day_time_slots, date_time_slots })
    .then(handleResponse)
    .catch(handleError),

  updateBookableDays: (bookable_days) => apiClient
    .put('/dashboard/bookable-days', { bookable_days })
    .then(handleResponse)
    .catch(handleError),

  updateCalendarDetails: (calendar_description, calendar_location) => apiClient
    .put('/dashboard/calendar-details', { calendar_description, calendar_location })
    .then(handleResponse)
    .catch(handleError),

  createCalendar: () => apiClient
    .post('/dashboard/create-calendar')
    .then(handleResponse)
    .catch(handleError),

  makeCalendarPrivate: () => apiClient
    .post('/dashboard/make-calendar-private')
    .then(handleResponse)
    .catch(handleError),

  create: (ownerSlug, data) => apiClient
    .post(`/calendars/${ownerSlug}/reservations/add`, data)
    .then(handleResponse)
    .catch(handleError),

  getByKey: (reservationKey, email) => apiClient
    .get(`/public/reservations/${reservationKey}`, {
      params: { email },
    })
    .then(handleResponse)
    .catch(handleError),

  updateByKey: (reservationKey, email, data) => apiClient
    .put(`/public/reservations/${reservationKey}`, data, {
      params: { email },
    })
    .then(handleResponse)
    .catch(handleError),

  deleteByKey: (reservationKey, email) => apiClient
    .delete(`/public/reservations/${reservationKey}`, {
      params: { email },
    })
    .then(handleResponse)
    .catch(handleError),

  getById: (id) => apiClient.get(`/reservations/${id}`).then(handleResponse).catch(handleError),

  delete: (id) => apiClient.delete(`/reservations/${id}`).then(handleResponse).catch(handleError),
};

export default apiClient;
