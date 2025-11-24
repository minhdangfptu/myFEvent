import adminApi from "~/apis/adminApi";

const adminService = {
    getPaginatedUsers: async (page, limit, search,status) => {
        return await adminApi.getPaginatedUsers(page, limit, search, status);
    },
    getUserById: async (userId) => {
        return await adminApi.getUserById(userId);
    },
    banUser: async (userId, banReason) => {
        return await adminApi.banUser(userId, banReason);
    },
    unbanUser: async (userId) => {
        return await adminApi.unbanUser(userId);
    },
    getPaginatedEvents: async (page, limit, search, status, eventDate) => {
        return await adminApi.getPaginatedEvents(page, limit, search, status, eventDate);
    },
    getEventDetails: async (eventId) => {
        return await adminApi.getEventDetails(eventId);
    },
    banEvent: async (eventId, banReason) => {
        return await adminApi.banEvent(eventId, banReason);
    },
    unbanEvent: async (eventId) => {
        return await adminApi.unbanEvent(eventId);
    },

};

export default adminService;