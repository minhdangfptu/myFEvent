import axiosClient from './axiosClient';

export const userApi = {
  getUserRoleByEvent: async (eventId) => {
    try {
      const response = await axiosClient.get(`/api/user/events/${eventId}/role`);
      return response.data;
    } catch (error) {
      return error.response?.data || { error: 'Lỗi khi lấy role sự kiện' };
    }
  }
};
