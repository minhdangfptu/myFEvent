import axios from "axios";
import axiosClient from "./axiosClient";
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
    }
};