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
  updateCalendarEvent: (eventId, calendarId, data) => {
    const url = `/api/events/${eventId}/calendars/${calendarId}`;
    return axiosClient.patch(url, data);
  },
  deleteCalendarEvent: (eventId, calendarId) => {
    const url = `/api/events/${eventId}/calendars/${calendarId}`;
    return axiosClient.delete(url);
  },
  getMyCalendarInEvent: (eventId) => {
    const url = `/api/events/${eventId}/calendars/my-event-calendars`;
    return axiosClient.get(url);
  }
};
export default calendarApi;