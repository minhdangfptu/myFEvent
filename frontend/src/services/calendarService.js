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
  createCalendarForDepartment: async (eventId, departmentId, data) => {
    try {
        const response = await calendarApi.createCalendarForDepartment(eventId, departmentId, data);
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
  updateParticipateStatus: async (eventId, calendarId, data) => {
    try {
        const response = await calendarApi.updateParticipateStatus(eventId, calendarId, data);
        return response.data;
    } catch (error) {
        throw error;
    }
  },
  updateCalendar: async (eventId, calendarId, data) => {
    try {
        const response = await calendarApi.updateCalendar(eventId, calendarId, data);
        return response.data;
    } catch (error) {
        throw error;
    }
  },
  getAvailableMembers: async (eventId, calendarId) => {
    try {
        const response = await calendarApi.getAvailableMembers(eventId, calendarId);
        return response.data;
    } catch (error) {
        throw error;
    }
  },
  addParticipants: async (eventId, calendarId, memberIds) => {
    try {
        const response = await calendarApi.addParticipants(eventId, calendarId, memberIds);
        return response.data;
    } catch (error) {
        throw error;
    }
  },
  removeParticipant: async (eventId, calendarId, memberId) => {
    try {
        const response = await calendarApi.removeParticipant(eventId, calendarId, memberId);
        return response.data;
    } catch (error) {
        throw error;
    }
  },
  sendReminder: async (eventId, calendarId, target) => {
    try {
        const response = await calendarApi.sendReminder(eventId, calendarId, target);
        return response.data;
    } catch (error) {
        throw error;
    }
  }
};
export default calendarService;