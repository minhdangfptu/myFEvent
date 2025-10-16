import axiosClient from './axiosClient';

export const authApi = {
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

  loginWithGoogle: async (googleToken) => {
    try {
      const response = await axiosClient.post('/api/auth/google-login', {
        google_token: googleToken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  signup: async (userData) => {
    try {
      const response = await axiosClient.post('/api/auth/signup', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  refreshToken: async (refreshToken) => {
    try {
      const response = await axiosClient.post('/api/auth/refresh-token', {
        refresh_token: refreshToken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  logout: async (refreshToken) => {
    try {
        console.log('Revoking refresh token:', refreshToken);
      const response = await axiosClient.post('/api/auth/logout', {
        refreshToken: refreshToken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  logoutAllDevices: async () => {
    try {
      const response = await axiosClient.post('/api/auth/logout-all');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
