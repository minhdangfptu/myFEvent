import axiosClient from "./axiosClient";
const calendarApi = {
  getCalendarsByEventId: (eventId) => {
    const url = `/events/${eventId}/calendars`;
    return axiosClient.get(url);
  },
  getCalendarEventDetail: (eventId, calendarId) => {
    const url = `/events/${eventId}/calendars/${calendarId}`;
    return axiosClient.get(url);
  },
  createCalendarEvent: (eventId, data) => {
    const url = `/events/${eventId}/calendars`;
    return axiosClient.post(url, data);
  },
  updateCalendarEvent: (eventId, calendarId, data) => {
    const url = `/events/${eventId}/calendars/${calendarId}`;
    return axiosClient.patch(url, data);
  },
  deleteCalendarEvent: (eventId, calendarId) => {
    const url = `/events/${eventId}/calendars/${calendarId}`;
    return axiosClient.delete(url);
  },
  getMyCalendarInEvent: (eventId) => {
    const url = `/events/${eventId}/my-calendars`;
    return axiosClient.get(url);
  }
};
export default calendarApi;