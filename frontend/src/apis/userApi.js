import axiosClient from './axiosClient';

export const userApi = {
  getUserRoleByEvent: async (eventId) => {
    try {
      const response = await axiosClient.get(`/api/user/events/${eventId}/role`);
      return response.data;
    } catch (error) {
      return error.response?.data || { error: 'Lỗi khi lấy role sự kiện' };
    }
  },
  checkPassword: async (password) => {
    try {
      const response = await axiosClient.post('/api/user/check-password', { password });
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
