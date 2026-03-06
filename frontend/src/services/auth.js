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
      currentUser = { username: data.username };
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

    const resolvedUsername = data.username || username;
    currentUser = { username: resolvedUsername };
    notify();

    return currentUser;
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

  getUser: () => currentUser,
  isAuthenticated: () => !!currentUser,

  subscribe: (callback) => {
    listeners.add(callback);
    callback(currentUser);
    return () => listeners.delete(callback);
  },
};

