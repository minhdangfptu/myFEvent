import axiosClient from './axiosClient';

export const taskApi = {
  getTaskByEvent: async (eventId) => {
    const res = await axiosClient.get(`/api/tasks/${eventId}`);
    return res.data;
  },
  getTaskByEventAndDepartment: async (eventId, departmentId, taskId) => {
    const res = await axiosClient.get(`/api/tasks/${eventId}/${taskId}/${departmentId}`);
    return res.data;
  },
  createTask: async (eventId, data) => {
    const res = await axiosClient.post(`/api/tasks/${eventId}/create-new-task`, data);
    return res.data;
  },
  getTaskDetail: async (eventId, taskId) => {
    const res = await axiosClient.get(`/api/tasks/${eventId}/${taskId}`);
    return res.data;
  },
  editTask: async (eventId, taskId, data) => {
    const res = await axiosClient.patch(`/api/tasks/${eventId}/edit-task/${taskId}`, data);
    return res.data;
  },
  deleteTask: async (eventId, taskId) => {
    const res = await axiosClient.delete(`/api/tasks/${eventId}/${taskId}`);
    console.log(res);
    if (res.status === 403) return res.status
    return res.data;
  },
  // Update status/progress; 'payload' can be a string status or an object { status, progressPct, force }
  updateTaskProgress: async (eventId, taskId, payload) => {
    const body = typeof payload === 'string' ? { status: payload } : (payload || {});
    const res = await axiosClient.patch(`/api/tasks/${eventId}/${taskId}/progress`, body);
    return res.data;
  },
  // Assign task to a memberId (assigneeId)
  assignTask: async (eventId, taskId, assigneeId) => {
    const res = await axiosClient.patch(`/api/tasks/${eventId}/${taskId}/assign`, { assigneeId });
    return res.data;
  },
  // Unassign task
  unassignTask: async (eventId, taskId) => {
    const res = await axiosClient.patch(`/api/tasks/${eventId}/${taskId}/unassign`);
    return res.data;
  },
  
  getTaskStatisticsByMilestone: async (eventId, milestoneId) => {
    console.log('=== TASK API CALL ===');
    console.log('eventId:', eventId);
    console.log('milestoneId:', milestoneId);

    if (!milestoneId) {
      throw new Error('Milestone ID is required');
    }

    const url = `/api/tasks/${eventId}/statistics/${milestoneId}`;
    console.log('API URL:', url);

    try {
      const res = await axiosClient.get(url);

      console.log('=== AXIOS RESPONSE DEBUG ===');
      console.log('Status:', res.status);
      console.log('Raw res:', res);
      console.log('res.data:', res.data);
      console.log('res.data type:', typeof res.data);
      console.log('res.data keys:', res.data ? Object.keys(res.data) : 'null');

      // ✅ CRITICAL: Check response structure
      if (res.data && res.data.data) {
        console.log('✅ Found nested data structure in response');
        console.log('res.data.data:', res.data.data);
        return res.data; // Return { data: { summary, milestone, ... } }
      } else if (res.data && res.data.summary) {
        console.log('✅ Found flat data structure in response');
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

  }

}