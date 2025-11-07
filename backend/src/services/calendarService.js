import Calendar from '../models/calendar.js';

export const getCalendarByEventId = async (eventId) => {
    return await Calendar.findOne({ eventId });
};

export const getCalendarByDepartmentId = async (departmentId) => {
    return await Calendar.findOne({ departmentId });
};

export const createCalendar = async (calendarData) => {
    const calendar = new Calendar(calendarData);
    return await calendar.save();
};
export const updateCalendar = async (calendarId, updateData) => {
    return await Calendar.findByIdAndUpdate(calendarId, updateData, { new: true });
};
export const getCalendarById = async (calendarId) => {
    return await Calendar.findById(calendarId);
};