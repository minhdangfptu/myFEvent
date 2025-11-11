import axiosClient from "./axiosClient";
const calendarApi = {
  getCalendarsByEventId: (eventId) => {
    const url = `/api/events/${eventId}/calendars`;
    return axiosClient.get(url);
  },
  getCalendarEventDetail: (eventId, calendarId) => {
    const url = `/api/events/${eventId}/calendars/${calendarId}`;
    return axiosClient.get(url);
  },
  createCalendarForEvent: (eventId, data) => {
    const url = `/api/events/${eventId}/calendars/create-calendar-for-event`;
    return axiosClient.post(url, data);
  },
  createCalendarForDepartment: (eventId, departmentId, data) => {
    const url = `/api/events/${eventId}/departments/${departmentId}/calendars/create-calendar-for-department`;
    return axiosClient.post(url, data);
  },
  updateCalendar: (eventId, calendarId, data) => {
    const url = `/api/events/${eventId}/calendars/${calendarId}`;
    return axiosClient.put(url, data);
  },
  deleteCalendarEvent: (eventId, calendarId) => {
    const url = `/api/events/${eventId}/calendars/${calendarId}`;
    return axiosClient.delete(url);
  },
  getMyCalendarInEvent: (eventId) => {
    const url = `/api/events/${eventId}/calendars/my-event-calendars`;
    return axiosClient.get(url);
  },
  updateParticipateStatus: (eventId, calendarId, data) => {
    const url = `/api/events/${eventId}/calendars/${calendarId}/participate-status`;
    return axiosClient.patch(url, data);
  }

};
export default calendarApi;