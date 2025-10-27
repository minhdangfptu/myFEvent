import axiosClient from './axiosClient';

export const milestoneApi = {
  // Lấy danh sách tất cả milestones của một event
  listMilestonesByEvent: async (eventId, params = {}) => {
    const res = await axiosClient.get(`/api/events/${eventId}/milestones`, { params });
    return res.data;
  },

  // Lấy chi tiết một milestone
  getMilestoneDetail: async (eventId, milestoneId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/milestones/${milestoneId}`);
    return res.data;
  },

  // Tạo milestone mới
  createMilestone: async (eventId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/milestones`, data);
    return res.data;
  },

  // Cập nhật milestone
  updateMilestone: async (eventId, milestoneId, data) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/milestones/${milestoneId}`, data);
    return res.data;
  },

  // Xóa milestone
  deleteMilestone: async (eventId, milestoneId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/milestones/${milestoneId}`);
    return res.data;
  }
};


