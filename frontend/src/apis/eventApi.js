import axiosClient from './axiosClient';

export const eventApi = {
  getAllPublicEvents: async ({ page = 1, limit = 8, search = '', status = '' } = {}) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      const response = await axiosClient.get(`/api/events/public?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getEventById: async (eventId) => {
    try {
      const response = await axiosClient.get(`/api/events/${eventId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  create: async ({ name, description, eventStartDate, eventEndDate, location, type, organizerName, images }) => {
    // console.log({ name, description, eventStartDate, eventEndDate, location, type, organizerName, images });
    const res = await axiosClient.post('/api/events', { name, description, eventStartDate, eventEndDate, location, type, organizerName, images });
    // console.log(res);
    // Trả về cả status, message và data nếu có
    return {
      status: res.status,
      message: res.data?.message,
      data: res.data?.data || res.data
    };
  },
  replaceImages: async (eventId, images) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/images`, { images });
    return res.data;
  },
  addImages: async (eventId, images) => {
    const res = await axiosClient.post(`/api/events/${eventId}/images`, { images });
    return res.data;
  },
  getEventSummary: async (eventId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/summary`);
    console.log(res)
    return res.data;
  },
  updateEvent: async (eventId, data) => {
    const res = await axiosClient.patch(`/api/events/${eventId}`, data);
    return res.data;
  },
  deleteEvent: async (eventId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}`);
    return res.data;
  },
  joinByCode: async (code) => {
    const res = await axiosClient.post('/api/events/join', { code });
    return res.data;
  },
  getById: async (id) => {
    const res = await axiosClient.get(`/api/events/private/${id}`);
    return res.data;
  },
  replaceEventImages: async (eventId, images) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/images`, { images });
    return res.data;
  },
  listMyEvents: async ({ page = 1, limit = 8, search = '' } = {}) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (search) params.append('search', search);
    const res = await axiosClient.get(`/api/events/me/list?${params.toString()}`);
    return res.data;
  },
  getAllEventDetail: async (eventId) => {
    const res = await axiosClient.get(`/api/events/detail/${eventId}`);
    return res.data;
  },
  debugAuth: async () => {
    const res = await axiosClient.get('/api/auth/profile');
    return res.data;
  },
  getMembersByEvent: async (eventId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/members`);
    return res.data;
  },
  getUnassignedMembersByEvent: async (eventId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/members/unassigned`);
    return res.data;
  },
  getMemberDetail: async (eventId, memberId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/members/${memberId}`);
    return res.data;
  },
  updateMemberRole: async (eventId, memberId, role) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/members/${memberId}/role`, { role });
    return res.data;
  },
  changeMemberDepartment: async (eventId, memberId, departmentId) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/members/${memberId}/department`, { departmentId });
    return res.data;
  },
  removeMemberFromEvent: async (eventId, memberId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/members/${memberId}`);
    return res.data;
  },
  leaveEvent: async (eventId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/members/me`);
    return res.data;
  },
  getCoreTeamList: async (eventId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/members/coreteam`);
    return res.data;
  },
  removeMemberFromEvent: async (eventId, memberId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/members/${memberId}`);
    return res.data;
  },
  
}


