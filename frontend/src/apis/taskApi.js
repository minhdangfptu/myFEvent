import axiosClient from './axiosClient';

export const taskApi = {
  getTaskByEvent: async (eventId, config = {}) => {
    const res = await axiosClient.get(`/api/tasks/${eventId}`, config);
    return res.data;
  },
  getTaskByEventAndDepartment: async (eventId, departmentId, taskId, config = {}) => {
    const res = await axiosClient.get(`/api/tasks/${eventId}/${taskId}/${departmentId}`, config);
    return res.data;
  },
  createTask: async (eventId, data, config = {}) => {
    const res = await axiosClient.post(`/api/tasks/${eventId}/create-new-task`, data, config);
    return res.data;
  },
  getTaskDetail: async (eventId, taskId, config = {}) => {
    const res = await axiosClient.get(`/api/tasks/${eventId}/${taskId}`, config);
    return res.data;
  },
  editTask: async (eventId, taskId, data, config = {}) => {
    const res = await axiosClient.patch(`/api/tasks/${eventId}/edit-task/${taskId}`, data, config);
    return res.data;
  },
  deleteTask: async (eventId, taskId, config = {}) => {
    try {
      const res = await axiosClient.delete(`/api/tasks/${eventId}/${taskId}`, config);
      // Nếu status là 403, trả về status code để frontend xử lý
      if (res.status === 403) return res.status;
      return res.data;
    } catch (error) {
      // Re-throw error để frontend có thể xử lý chi tiết
      throw error;
    }
  },
  // Update status/progress; 'payload' can be a string status or an object { status, progressPct, force }
  updateTaskProgress: async (eventId, taskId, payload, config = {}) => {
    const body = typeof payload === 'string' ? { status: payload } : (payload || {});
    const res = await axiosClient.patch(`/api/tasks/${eventId}/${taskId}/progress`, body, config);
    return res.data;
  },
  // Assign task to a memberId (assigneeId)
  assignTask: async (eventId, taskId, assigneeId, config = {}) => {
    const res = await axiosClient.patch(`/api/tasks/${eventId}/${taskId}/assign`, { assigneeId }, config);
    return res.data;
  },
  // Unassign task
  unassignTask: async (eventId, taskId, config = {}) => {
    const res = await axiosClient.patch(`/api/tasks/${eventId}/${taskId}/unassign`, undefined, config);
    return res.data;
  },

  getTaskStatisticsByMilestone: async (eventId, milestoneId) => {
    if (!milestoneId) {
      throw new Error('Milestone ID is required');
    }
    const url = `/api/tasks/${eventId}/statistics/${milestoneId}`;
    try {
      const res = await axiosClient.get(url);
      if (res.data && res.data.data) {
        return res.data; // Return { data: { summary, milestone, ... } }
      } else if (res.data && res.data.summary) {
        return res.data; // Return { summary, milestone, ... }
      } else {
        console.log('❌ Unexpected response structure');
        console.log('Available keys:', res.data ? Object.keys(res.data) : 'none');
        return res.data;
      }
    } catch (error) {
      console.error('❌ Axios error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  getBurnupData: async (eventId, milestoneId) => {
    const res = await axiosClient.get(`/api/tasks/${eventId}/burnup-data/${milestoneId}`);
    return res.data;
  },
  getDepartmentBurnupData: async (eventId, milestoneId) => {
    const res = await axiosClient.patch(`/api/tasks/${eventId}/burnup-data/${milestoneId}`);
    return res.data;
  },

}