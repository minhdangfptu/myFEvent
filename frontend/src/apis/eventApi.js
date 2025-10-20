import axiosClient from './axiosClient';

export const eventApi = {
  create: async ({ name, description, eventDate, location, type }) => {
    const res = await axiosClient.post('/api/events', { name, description, eventDate, location, type });
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


