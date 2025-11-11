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
import {
    getRequesterMembership,
    getMembersByEventRaw,
    getMembersByDepartmentRaw
} from "../services/eventMemberService.js";

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
export const createCalendarForEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await findEventById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        const requesterMembership = await getRequesterMembership(eventId, req.user?.id);
        const isHoOC = requesterMembership?.role === 'HoOC';
        if (!isHoOC) {
            return res.status(403).json({ message: 'Only HoOC can create calendar for event!' });
        }
        const ownerMemberid = requesterMembership?._id;
        let { name, startAt, endAt, locationType, location, meetingDate, startTime, endTime, participantType, departments, coreTeamMembers, notes } = req.body;
        const files = req.files || [];
        const attachments = files.map(file => file.originalname || file.filename);

        if (!startAt && meetingDate && startTime) {
            startAt = new Date(`${meetingDate}T${startTime}`).toISOString();
        }
        if (!endAt && meetingDate && endTime) {
            endAt = new Date(`${meetingDate}T${endTime}`).toISOString();
        }

        if (!startAt || !endAt || !locationType || !location) {
            return res.status(400).json({
                message: 'Missing required fields: startAt/endAt (or meetingDate+startTime/endTime), locationType, location'
            });
        }

        if (!name) {
            name = notes ? notes.substring(0, 100) : `Cuộc họp ${new Date(startAt).toLocaleDateString('vi-VN')}`;
        }

        if (!['online', 'offline'].includes(locationType)) {
            return res.status(400).json({
                message: 'locationType must be either "online" or "offline"'
            });
        }

        const startDate = new Date(startAt);
        const endDate = new Date(endAt);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        if (startDate >= endDate) {
            return res.status(400).json({ message: 'endAt must be after startAt' });
        }

        let participants = [];
        if (participantType) {
            if (participantType === 'all') {
                const allMembers = await getMembersByEventRaw(eventId);
                participants = allMembers.map(member => ({
                    member: member._id,
                    participateStatus: 'unconfirmed'
                }));
            } else if (participantType === 'departments') {
                if (!departments) {
                    return res.status(400).json({ message: 'departments is required when participantType is "departments"' });
                }
                let departmentIds;
                if (Array.isArray(departments)) {
                    departmentIds = departments;
                } else if (typeof departments === 'string') {
                    const trimmed = departments.trim();
                    if (!trimmed) {
                        return res.status(400).json({ message: 'departments cannot be empty' });
                    }
                    try {
                        departmentIds = JSON.parse(trimmed);
                        departmentIds.push(ownerMemberid);
                    } catch (e) {
                        return res.status(400).json({ message: 'Invalid departments JSON format: ' + e.message });
                    }
                } else {
                    return res.status(400).json({ message: 'departments must be an array or a JSON string' });
                }
                if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
                    return res.status(400).json({ message: 'departments must be a non-empty array' });
                }
                const allMembers = await getMembersByEventRaw(eventId);
                const selectedMembers = allMembers.filter(member =>
                    member.departmentId && departmentIds.includes(member.departmentId.toString())
                );
                selectedMembers.push({
                    member: ownerMemberid,
                    participateStatus: 'confirmed'
                });
                participants = selectedMembers.map(member => ({
                    member: member._id,
                    participateStatus: 'unconfirmed'
                }));
            } else if (participantType === 'coreteam') {
                if (coreTeamMembers === undefined || coreTeamMembers === null) {
                    return res.status(400).json({
                        message: 'coreTeamMembers is required when participantType is "coreteam"',
                        received: { coreTeamMembers, participantType }
                    });
                }

                let memberIds;
                if (Array.isArray(coreTeamMembers)) {
                    memberIds = coreTeamMembers;
                } else if (typeof coreTeamMembers === 'string') {
                    const trimmed = coreTeamMembers.trim();
                    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
                        return res.status(400).json({
                            message: 'coreTeamMembers cannot be empty',
                            received: trimmed
                        });
                    }
                    try {
                        memberIds = JSON.parse(trimmed);
                        memberIds.push(ownerMemberid);
                    } catch (e) {
                        console.error('JSON parse error for coreTeamMembers:', e.message, 'value:', trimmed);
                        return res.status(400).json({
                            message: 'Invalid coreTeamMembers JSON format: ' + e.message,
                            received: trimmed.substring(0, 100)
                        });
                    }
                } else {
                    return res.status(400).json({
                        message: 'coreTeamMembers must be an array or a JSON string',
                        receivedType: typeof coreTeamMembers,
                        received: coreTeamMembers
                    });
                }

                if (!Array.isArray(memberIds)) {
                    return res.status(400).json({
                        message: 'coreTeamMembers must parse to an array',
                        parsedType: typeof memberIds,
                        parsed: memberIds
                    });
                }

                if (memberIds.length === 0) {
                    return res.status(400).json({ message: 'coreTeamMembers must be a non-empty array' });
                }
                participants.push({
                    member: ownerMemberid,
                    participateStatus: 'confirmed'
                });
                participants = memberIds.map(memberId => ({
                    member: memberId,
                    participateStatus: 'unconfirmed'
                }));
            }
        }

        if (req.body.participants && Array.isArray(req.body.participants)) {
            participants = req.body.participants;
        }

        const calendarData = {
            name,
            startAt: startDate,
            endAt: endDate,
            locationType,
            location,
            eventId,
            type: 'event',
            participants: participants.length > 0 ? participants : [],
            attachments: attachments || []
        };

        const calendar = await createCalendar(calendarData);
        return res.status(201).json({ data: calendar });
    } catch (error) {
        console.error('createCalendarForEvent error:', error.message);

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message).join(', ');
            return res.status(400).json({ message: 'Validation error: ' + messages });
        }

        // Handle other errors
        const errorMessage = error?.message || 'Unknown error occurred';
        return res.status(500).json({ message: 'Failed to create calendar: ' + errorMessage });
    }
};
export const createCalendarForDepartment = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const department = await findDepartmentById(departmentId);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }
        const requesterMembership = await getRequesterMembership(departmentId, req.user?.id);
        isHoDOfDepartment = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId.toString() === departmentId;
        if (!isHoDOfDepartment) {
            return res.status(403).json({ message: 'Only HoD of this department can create calendar for this department!' });
        }
        const calendar = await createCalendar(req.body);
        return res.status(200).json({ data: calendar });
    } catch (error) {
        console.error('createCalendarForDepartment error:', error);
        return res.status(500).json({ message: 'Failed to create calendar' });
    }
}
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
export const getCalendarDetail = async (req, res) => {
    try {
        const { calendarId } = req.params;
        const calendar = await getCalendarById(calendarId);
        if (!calendar) {
            return res.status(404).json({ message: 'Calendar not found' });
        }
        return res.status(200).json({ data: calendar });
    } catch (error) {
        console.error('getCalendarDetail error:', error);
        return res.status(500).json({ message: 'Failed to load calendar detail' });
    }
}