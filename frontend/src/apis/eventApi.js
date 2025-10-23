import axiosClient from './axiosClient';

export const eventApi = {
  create: async ({ name, description, eventDate, location, type }) => {
    const res = await axiosClient.post('/api/events', { name, description, eventDate, location, type });
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
  removeImages: async (eventId, indexes) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/images`, { data: { indexes } });
    return res.data;
  },
  joinByCode: async (code) => {
    const res = await axiosClient.post('/api/events/join', { code });
    return res.data;
  },
  getById: async (id) => {
    const res = await axiosClient.get(`/api/events/${id}`);
    return res.data;
  },
  listMyEvents: async () => {
    const res = await axiosClient.get('/api/events/me/list');
    return res.data;
  }
}


