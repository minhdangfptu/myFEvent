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
    }
};

export default adminApi;