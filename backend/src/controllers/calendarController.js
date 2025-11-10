import {
    getCalendarByEventId,
    getCalendarByDepartmentId,
    createCalendar,
    updateCalendar,
    getCalendarById,
} from "../services/calendarService.js";
import {
    findEventById
} from "../services/eventService.js";
import {
    findDepartmentById
} from "../services/departmentService.js";
import { getRequesterMembership } from "../services/eventMemberService.js";

export const getCalendarsForEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = findEventById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        const calendars = await getCalendarByEventId(eventId);
        return res.status(200).json({ data: calendars });
    } catch (error) {
        console.error('getCalendarForEvent error:', error);
        return res.status(500).json({ message: 'Failed to load calendar' });
    }
};

export const getCalendarsForDepartment = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const department = findEventById(departmentId);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }
        const calendars = await getCalendarByDepartmentId(departmentId);
        return res.status(200).json({ data: calendars });
    } catch (error) {
        console.error('getCalendarForDepartment error:', error);
        return res.status(500).json({ message: 'Failed to load calendar' });
    }
};

export const createCalendarForEntity = async (req, res) => {
    try {

        const { entityType, entityId, calendarData } = req.body;
        let entity;
        if (entityType === 'event') {
            entity = await findEventById(entityId);
            if (!entity) {
                return res.status(404).json({ message: 'Event not found' });
            };
            const requesterMembership = await getRequesterMembership(entityId, req.user?.id);
            isHoOC = requesterMembership?.role === 'HoOC';
            if (!isHoOC) {
                return res.status(403).json({ message: 'Only HoOC can create calendar for event!' });
            }
            const calendar = await createCalendar(calendarData);
            return res.status(200).json({ data: calendar });

        } else if (entityType === 'department') {
            entity = await findDepartmentById(entityId);
            if (!entity) {
                return res.status(404).json({ message: 'Department not found' });
            }
            const requesterMembership = await getRequesterMembership(entityId, req.user?.id);
            isHoDOfDepartment = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId.toString() === entityId;
            if (!isHoDOfDepartment) {
                return res.status(403).json({ message: 'Only HoD of this department can create calendar for this department!' });
            }
            const calendar = await createCalendar(calendarData);
            return res.status(200).json({ data: calendar });
        } else {
            return res.status(400).json({ message: 'Invalid entity type' });
        }
    } catch (error) {
        console.error('createCalendarForEntity error:', error);
        return res.status(500).json({ message: 'Failed to create calendar' });
    }
};
export const updateCalendarForEntity = async (req, res) => {
    try {
        const { calendarId, updateData } = req.body;
        const calendar = await getCalendarById(calendarId);
        if (!calendar) {
            return res.status(404).json({ message: 'Calendar not found' });
        }
        if (calendar.eventId) {
            const requesterMembership = await getRequesterMembership(calendar.eventId, req.user?.id);
            isHoOC = requesterMembership?.role === 'HoOC';
            if (!isHoOC) {
                return res.status(403).json({ message: 'Only HoOC can update calendar for event!' });
            }
        } else if (calendar.departmentId) {
            const requesterMembership = await getRequesterMembership(calendar.departmentId, req.user?.id);
            isHoDOfDepartment = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId.toString() === calendar.departmentId;
            if (!isHoDOfDepartment) {
                return res.status(403).json({ message: 'Only HoD of this department can update calendar for this department!' });
            }
        }
        calendar = await updateCalendar(calendarId, updateData);
        return res.status(200).json({ data: calendar });
    } catch (error) {
        console.error('updateCalendarForEntity error:', error);
        return res.status(500).json({ message: 'Failed to update calendar' });
    }
};
export const updateParticipateStatus = async (req, res) => {
    try {
        const { calendarId } = req.params;
        let calendar = await getCalendarById(calendarId);
        if (!calendar) {
            return res.status(404).json({ message: 'Calendar not found' });
        }
        let eventId;
        if (calendar.departmentId) {
            const department = await findDepartmentById(calendar.departmentId);
            if (!department) {
                return res.status(404).json({ message: 'Department not found' });
            }
            eventId = department.eventId;
        }
        const requesterMembership = await getRequesterMembership(calendar.eventId || eventId, req.user?.id);
        if (!requesterMembership) {
            return res.status(403).json({ message: 'Infficient permissions' });
        }
        const participant = calendar.participants.some(participant => participant.member.toString() === requesterMembership._id.toString());
        if (!participant) {
            return res.status(403).json({ message: 'You are not a participant of this calendar' });
        }
        const { participateStatus, reasonAbsent } = req.body;
        if (participateStatus === 'absent' && !reasonAbsent) {
            return res.status(400).json({ message: 'Reason for absence is required' });
        }
        calendar.participants = calendar.participants.map(participant => {
            if (participant.member.toString() === requesterMembership._id.toString()) {
                participant.participateStatus = participateStatus;
                participant.reasonAbsent = reasonAbsent || '';
            }
            return participant;
        });
        calendar = await updateCalendar(calendarId, calendar);
        return res.status(200).json({
            message: 'Update participate status successfully',
            data: calendar
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update participate status' });
    }
};
export const getMyCalendarInEvent = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(403).json({ message: 'Infficient permissions' });
        };
        const { eventId } = req.params;
        const event = await findEventById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        const membership = await getRequesterMembership(eventId, userId);
        if (!membership) {
            return res.status(403).json({ message: 'You are not a member of this event' });
        }
        const calendars = await getCalendarByEventId(eventId);
        const myCalendars = calendars.filter(calendar =>
            calendar.participants.some(participant => participant.member.toString() === membership._id.toString())
        );
        return res.status(200).json({ data: myCalendars });
    } catch (error) {
        console.error('getMyCalendarInEvent error:', error);
        return res.status(500).json({ message: 'Failed to load calendar' });
    }
};
