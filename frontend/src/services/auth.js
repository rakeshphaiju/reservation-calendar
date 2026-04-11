import apiClient from './api';

let currentUser = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener(currentUser));
};

const normalizeUser = (data, fallbackEmail = '') => ({
  email: data.email || fallbackEmail,
  service_name: data.service_name,
  first_name: data.first_name || data.firstname || '',
  last_name: data.last_name || data.lastname || '',
  calendar_slug: data.calendar_slug,
  calendar_created: data.calendar_created ?? true,
  calendar_url: data.calendar_url,
  slot_capacity: data.slot_capacity,
  max_weeks: data.max_weeks,
  time_slots: data.time_slots,
  day_time_slots: data.day_time_slots,
  bookable_days: data.bookable_days,
  calendar_description: data.calendar_description,
  calendar_location: data.calendar_location,
});

export const authService = {
  init: async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      currentUser = normalizeUser(data);
    } catch {
      currentUser = null;
    }
    notify();
    return currentUser;
  },

  login: async (email, password, rememberMe = false) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    params.append('remember_me', rememberMe);

    const { data } = await apiClient.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    currentUser = normalizeUser(data, email);
    notify();

    return currentUser;
  },

  register: async (email, serviceName, password) => {
    const { data } = await apiClient.post('/auth/register', {
      email,
      service_name: serviceName,
      password,
    });
    currentUser = null;
    notify();

    return data;
  },

  logout: async () => {
    try {
      await apiClient.post('/logout');
    } catch (e) {
      console.warn('Logout request failed:', e);
    } finally {
      currentUser = null;
      notify();
    }
  },

  deleteAccount: async () => {
    await apiClient.delete('/auth/account');
    currentUser = null;
    notify();
  },

  setUser: (user) => {
    currentUser = user;
    notify();
    return currentUser;
  },

  getUser: () => currentUser,
  isAuthenticated: () => !!currentUser,

  subscribe: (callback) => {
    listeners.add(callback);
    callback(currentUser);
    return () => listeners.delete(callback);
  },
};
