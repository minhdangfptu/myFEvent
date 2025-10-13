/* eslint-disable no-undef */
import axios from 'axios';
import { baseUrl } from '../config';
const axiosClient = axios.create({
  baseURL: `${baseUrl}`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor - Thêm token vào mọi request
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

// Response interceptor - Xử lý refresh token
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Nếu gặp lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Gọi API refresh token
        const response = await axios.post(
          `${baseUrl}/reptitist/auth/refresh-token`,
          {
            refresh_token: refreshToken,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        const newAccessToken = response.data.access_token;

        if (newAccessToken) {
          // Lưu token mới
          localStorage.setItem('access_token', newAccessToken);
          
          // Thêm token mới vào request gốc
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          // Retry request gốc
          return axiosClient(originalRequest);
        } else {
          throw new Error('No access token in refresh response');
        }

      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear tokens và redirect về login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Dispatch custom event để AuthContext biết user đã logout
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Chỉ redirect nếu không phải là trang login/signup
        if (!window.location.pathname.includes('/Login') && 
            !window.location.pathname.includes('/SignUp')) {
          window.location.href = '/Login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;