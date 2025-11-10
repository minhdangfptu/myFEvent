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
  }
};
export default calendarService;