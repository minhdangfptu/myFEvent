import axiosClient from './axiosClient';

export const userApi = {
  getUserRoleByEvent: async (eventId) => {
    const response = await axiosClient.get(`/api/user/events/${eventId}/role`);
    return response.data;
  },
  checkPassword: async (password) => {
    try {
      const response = await axiosClient.post('/api/user/check-password', { password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  changePassword: async ({ currentPassword, newPassword }) => {
    try {
      const response = await axiosClient.post('/api/user/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getProfile: async () => {
    try {
      const response = await axiosClient.get('/api/user/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  updateProfile: async (payload) => {
    try {
      const response = await axiosClient.put('/api/user/profile', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  removeTag: async (value) => {
    try {
      const response = await axiosClient.delete('/api/user/profile/tag', { data: { value } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  sendDeleteOtp: async (email) => {
    try {
      const response = await axiosClient.post('/api/auth/send-delete-otp', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  verifyDeleteOtp: async (email, otp) => {
    try {
      const response = await axiosClient.post('/api/auth/verify-delete-otp', { email, otp });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
