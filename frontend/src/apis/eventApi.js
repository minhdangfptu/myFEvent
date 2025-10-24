import axiosClient from './axiosClient';

export const eventApi = {
  create: async ({ name, description, eventDate, location, type, organizerName }) => {
    const res = await axiosClient.post('/api/events', { name, description, eventDate, location, type, organizerName });
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
  listMyEvents: async () => {
    const res = await axiosClient.get('/api/events/me/list');
    return res.data;
  },
  getMyEvents: async () => {
    const res = await axiosClient.get('/api/events/me/list');
    return res.data;
  },
  debugAuth: async () => {
    const res = await axiosClient.get('/api/auth/profile');
    return res.data;
  }
}


