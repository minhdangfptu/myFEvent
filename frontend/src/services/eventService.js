import { eventApi } from "~/apis/eventApi";

const unwrapResponse = (payload) => {
    let current = payload;
    const visited = new Set();
    while (
        current &&
        typeof current === "object" &&
        !Array.isArray(current) &&
        !visited.has(current) &&
        (current.data !== undefined || current.result !== undefined || current.payload !== undefined)
    ) {
        visited.add(current);
        current = current.data ?? current.result ?? current.payload;
    }
    return current;
};

export const eventService = {
    fetchAllPublicEvents: async () => {
        try {
            const response = await eventApi.getAllPublicEvents();
            return unwrapResponse(response);
        } catch (error) {
            throw error;
        }
    },
    fetchEventById: async (eventId) => {
        try {
            const response = await eventApi.getEventById(eventId);
            return unwrapResponse(response);
        } catch (error) {
            throw error;
        }
    },
    listMyEvents: async () => {
        try {
            const response = await eventApi.listMyEvents();
            return unwrapResponse(response);
        } catch (error) {
            throw error;
        }
    },
    getUnassignedMembersByEvent: async (eventId) => {
        try {
            const response = await eventApi.getUnassignedMembersByEvent(eventId);
            return unwrapResponse(response);
        } catch (error) {
            throw error;
        }
    },
    getMemberDetail: async (eventId, memberId) => {
        try {
            const response = await eventApi.getMemberDetail(eventId, memberId);
            return unwrapResponse(response);
        } catch (error) {
            throw error;
        }
    },
    getCoreTeamList: async (eventId) => {
        try {
            const response = await eventApi.getCoreTeamList(eventId);
            return response;
        } catch (error) {
            throw error;
        }
    },
};