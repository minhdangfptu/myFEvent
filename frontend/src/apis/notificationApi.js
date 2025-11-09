import axiosClient from './axiosClient';

export const notificationApi = {
  // Lấy tất cả notifications của user hiện tại
  getNotifications: async (params = {}) => {
    const res = await axiosClient.get('/api/notifications', { params });
    return res.data;
  },

  // Lấy số lượng thông báo chưa đọc
  getUnreadCount: async () => {
    const res = await axiosClient.get('/api/notifications/unread-count');
    return res.data;
  },

  // Đánh dấu một notification đã đọc
  markRead: async (notificationId) => {
    const res = await axiosClient.patch(`/api/notifications/${notificationId}/read`);
    return res.data;
  },

  // Đánh dấu tất cả notifications đã đọc
  markAllRead: async () => {
    const res = await axiosClient.patch('/api/notifications/read-all');
    return res.data;
  },
};

