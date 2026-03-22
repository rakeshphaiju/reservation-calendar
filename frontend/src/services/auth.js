import apiClient from './api';

let currentUser = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener(currentUser));
};

const normalizeUser = (data, fallbackUsername = '') => ({
  username: data.username || fallbackUsername,
  email: data.email,
  first_name: data.first_name || data.firstname || '',
  last_name: data.last_name || data.lastname || '',
  calendar_slug: data.calendar_slug,
  calendar_url: data.calendar_url,
  slot_capacity: data.slot_capacity,
  time_slots: data.time_slots,
  bookable_days: data.bookable_days,
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

  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const { data } = await apiClient.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    currentUser = normalizeUser(data, username);
    notify();

    return currentUser;
  },

  register: async (username, email, password) => {
    const { data } = await apiClient.post('/auth/register', { username, email, password });
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
