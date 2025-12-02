import axiosClient from '../apis/axiosClient';

const adminApi = {
    getPaginatedUsers: async (page,limit,search,status) => {
        const response = await axiosClient.get(`/api/admin/users?page=${page}&limit=${limit}&search=${search}&status=${status}`);
        return response.data;
    },
    getUserById: async (userId) => {
        const response = await axiosClient.get(`/api/admin/users/${userId}`);
        return response.data;
    },
    banUser: async (userId, banReason) => {
        const response = await axiosClient.put(`/api/admin/users/${userId}/ban`, { banReason });
        return response.data;
    },
    unbanUser: async (userId) => {
        const response = await axiosClient.put(`/api/admin/users/${userId}/unban`);
        return response.data;
    },
    getPaginatedEvents: async (page, limit, search, status, eventDate) => {
        const response = await axiosClient.get(`/api/admin/events?page=${page}&limit=${limit}&search=${search}&status=${status}&eventDate=${eventDate}`);
        return response.data;
    },
    getEventDetails: async (eventId) => {
        const response = await axiosClient.get(`/api/admin/events/${eventId}`);
        return response.data;
    },
    banEvent: async (eventId, banReason) => {
        const response = await axiosClient.put(`/api/admin/events/${eventId}/ban`, { banReason });
        return response.data;
    },
    unbanEvent: async (eventId) => {
        const response = await axiosClient.put(`/api/admin/events/${eventId}/unban`);
        return response.data;
    },
    // Dashboard APIs
    getDashboardStats: async () => {
        const response = await axiosClient.get('/api/admin/dashboard/stats');
        return response.data;
    },
    getRecentBannedEvents: async (limit = 10) => {
        const response = await axiosClient.get(`/api/admin/dashboard/recent-banned-events?limit=${limit}`);
        return response.data;
    },
    getWeeklyActivity: async () => {
        const response = await axiosClient.get('/api/admin/dashboard/weekly-activity');
        return response.data;
    },
    getRecentEvents: async (type = 'new', limit = 10) => {
        const response = await axiosClient.get(`/api/admin/dashboard/recent-events?type=${type}&limit=${limit}`);
        return response.data;
    }
};

export default adminApi;