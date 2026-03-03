import apiClient from './api';

const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'auth_username';

export const authService = {
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const response = await apiClient.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, username: returnedUsername } = response.data;
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USERNAME_KEY, returnedUsername || username);

    return { token: access_token, username: returnedUsername || username };
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUsername: () => localStorage.getItem(USERNAME_KEY),
  isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),
};

