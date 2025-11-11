import calendarApi from "~/apis/calendarApi";
const calendarService = {
  getCalendarsByEventId: async (eventId) => {
    try {
        const response = await calendarApi.getCalendarsByEventId(eventId);
        return response.data;
    } catch (error) {
        throw error;
    }
  },
  getMyCalendarInEvent: async (eventId) => {
    try {
        const response = await calendarApi.getMyCalendarInEvent(eventId);
        return response.data;
    } catch (error) {
        throw error;
    }
  },
  createCalendarForEvent: async (eventId, data) => {
    try {
        const response = await calendarApi.createCalendarForEvent(eventId, data);
        return response;
    } catch (error) {
        throw error;
    }
  },
  getCalendarEventDetail: async (eventId, calendarId) => {
    try {
        const response = await calendarApi.getCalendarEventDetail(eventId, calendarId);
        return response.data;
    } catch (error) {
        throw error;
    }
  },
};
export default calendarService;