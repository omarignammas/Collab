import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const API_BASE_URL = `${API_ORIGIN}/api/v1`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // A 403 with no body means Spring Security's JWT filter silently declined
    // to authenticate the request (expired/invalid token) before it ever
    // reached our controllers — our own access-denied responses always carry
    // a `message`, so an empty one here is indistinguishable from an expired
    // session and should be treated the same as a 401.
    const isStaleSession = status === 401 || (status === 403 && !error.response?.data?.message);
    if (isStaleSession) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;