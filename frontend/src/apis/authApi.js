import axiosClient from './axiosClient';

export const authApi = {
  // Login with email and password
  login: async (email, password) => {
    try {
      const response = await axiosClient.post('/api/auth/login', {
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Login with Google
  loginWithGoogle: async (googleToken) => {
    try {
      const response = await axiosClient.post('/api/auth/google-login', {
        token: googleToken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Signup
  signup: async (userData) => {
    try {
      const response = await axiosClient.post('/api/auth/signup', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Refresh access token
  refreshToken: async (refreshToken) => {
    try {
      const response = await axiosClient.post('/api/auth/refresh-token', {
        refreshToken: refreshToken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout: async (refreshToken) => {
    try {
      const response = await axiosClient.post('/api/auth/logout', {
        refreshToken: refreshToken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Logout from all devices
  logoutAllDevices: async () => {
    try {
      const response = await axiosClient.post('/api/auth/logout-all');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};