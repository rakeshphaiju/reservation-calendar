import apiClient from './api';

let currentUser = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener(currentUser));
};

export const authService = {
  init: async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      currentUser = {
        username: data.username,
        calendar_slug: data.calendar_slug,
        calendar_url: data.calendar_url,
        slot_capacity: data.slot_capacity,
      };
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

    currentUser = {
      username: data.username || username,
      calendar_slug: data.calendar_slug,
      calendar_url: data.calendar_url,
      slot_capacity: data.slot_capacity,
    };
    notify();

    return currentUser;
  },

  register: async (username, password) => {
    const { data } = await apiClient.post('/auth/register', { username, password });
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
