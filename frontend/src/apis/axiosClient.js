import axios from 'axios';
import { baseUrl } from '../config';

const axiosClient = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - Add token to every request
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh token API
        const response = await axios.post(
          `${baseUrl}/api/auth/refresh-token`,
          {
            refreshToken: refreshToken,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        const newAccessToken = response.data.accessToken;

        if (newAccessToken) {
          // Save new token
          localStorage.setItem('access_token', newAccessToken);
          
          // Add new token to original request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          // Retry original request
          return axiosClient(originalRequest);
        } else {
          throw new Error('No access token in refresh response');
        }

      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Dispatch custom event for AuthContext
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Only redirect if not already on login/signup page
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/signup')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;