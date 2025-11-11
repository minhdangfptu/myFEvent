import { eventApi } from "~/apis/eventApi";
export const eventService = {
    fetchAllPublicEvents: async () => {
        try {
            const response = await eventApi.getAllPublicEvents();
            return response;
        } catch (error) {
            throw error;
        }
    },
    fetchEventById: async (eventId) => {
        try {
            const response = await eventApi.getEventById(eventId);
            return response;
        } catch (error) {
            throw error;
        }
    },
    listMyEvents: async () => {
        try {
            const response = await eventApi.listMyEvents();
            return response;
        } catch (error) {
            throw error;
        }
    },
    getUnassignedMembersByEvent: async (eventId) => {
        try {
            const response = await eventApi.getUnassignedMembersByEvent(eventId);
            return response;
        } catch (error) {
            throw error;
        }
    },
    getMemberDetail: async (eventId, memberId) => {
        try {
            const response = await eventApi.getMemberDetail(eventId, memberId);
            return response;
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