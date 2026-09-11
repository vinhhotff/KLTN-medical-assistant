import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Always include HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Intercept 401 Unauthorized errors
    if (error.response?.status === 401) {
      // If unauthorized on protected routes, can trigger auth reset
      console.warn('Unauthorized session detected');
    }
    return Promise.reject(error);
  }
);
