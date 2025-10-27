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
};