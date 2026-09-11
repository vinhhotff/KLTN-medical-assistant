import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Always include HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dual Auth Transport: attach Bearer token from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mediassist_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear localStorage on unauthorized
      localStorage.removeItem('mediassist_token');
      localStorage.removeItem('mediassist_user');
    }
    return Promise.reject(error);
  }
);
