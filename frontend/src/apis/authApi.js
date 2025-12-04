import axiosClient from './axiosClient';

export const authApi = {
  // Login with email and password
  login: async (email, password) => {
    try {
      const response = await axiosClient.post('/api/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  googleLogin: async ({ credential, g_csrf_token }) => {
    return axiosClient.post("/api/auth/google", { credential, g_csrf_token })
      .then(res => res.data);
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
  // Resend verification
  resendVerification: async (email) => {
    try {
      const response = await axiosClient.post('/api/auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Verify 6-digit code
  verifyEmailCode: async ({ email, code }) => {
    try {
      const response = await axiosClient.post('/api/auth/verify-email', { email, code });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Refresh access token (send both keys to be compatible with backend variants)
  refreshToken: async (refreshToken) => {
    try {
      const response = await axiosClient.post('/api/auth/refresh-token', {
        token: refreshToken,
        refreshToken: refreshToken,
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
        refreshToken: refreshToken,
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
  },

  // Request password reset email
  forgotPassword: async (email) => {
    try {
      const response = await axiosClient.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reset password with token
  resetPassword: async ({ token, newPassword }) => {
    try {
      const response = await axiosClient.post('/api/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

};
