import axiosClient from './axiosClient';

export const eventApi = {
  getAllPublicEvents: async () => {
    try {
      const response = await axiosClient.get('/api/events/public');
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
  create: async ({ name, description, eventDate, location, type, organizerName, images }) => {
    const res = await axiosClient.post('/api/events', { name, description, eventDate, location, type, organizerName, images });
    return res.data;
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
  listMyEvents: async () => {
    const res = await axiosClient.get('/api/events/me/list');
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
    const res = await axiosClient.get(`/api/events/${eventId}/unassigned-members`);
    return res.data;
  }
}


