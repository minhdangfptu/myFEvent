import {
	getCalendarByEventId,
	getCalendarByDepartmentId,
	createCalendar,
	updateCalendar,
	getCalendarById,
	getCalendarsInEventScope,
    addParticipantsToCalendar,
    removeParticipantFromCalendar

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
    getMembersByDepartmentRaw,
    getEventMemberById,
    getActiveEventMembers

} from "../services/eventMemberService.js";
import {
    notifyMeetingReminder,
    notifyRemovedFromCalendar,
    notifyAddedToCalendar
} from "../services/notificationService.js";
import EventMember from '../models/eventMember.js';

const toIdString = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        if (value._id) return value._id.toString();
        if (typeof value.toString === 'function') return value.toString();
    }
    return null;
};

const resolveCalendarEventId = async (calendar) => {
    if (!calendar) return { eventId: null, department: null };
    if (calendar.eventId) {
        return { eventId: calendar.eventId.toString(), department: null };
    }
    const departmentId = toIdString(calendar.departmentId);
    if (!departmentId) return { eventId: null, department: null };
    const department = await findDepartmentById(departmentId);
    return { eventId: department?.eventId?.toString() || null, department };
};

const isCalendarCreator = (calendar, membershipId) => {
    const creatorId = toIdString(calendar?.createdBy);
    if (!creatorId || !membershipId) return false;
    return creatorId === membershipId.toString();
};

const toParticipantMemberId = (participant) => {
    const memberField = participant?.member;
    if (!memberField) return null;
    if (typeof memberField === 'string') return memberField;
    if (typeof memberField === 'object') {
        if (memberField._id) return memberField._id.toString();
        if (typeof memberField.toString === 'function') return memberField.toString();
    }
    return null;
};

export const getCalendarsForEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await findEventById(eventId);
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
		const department = await findDepartmentById(departmentId);
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
            const isHoOC = requesterMembership?.role === 'HoOC';
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
            const isHoDOfDepartment = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId.toString() === entityId;
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
        let { name, startAt, endAt, locationType, location, meetingDate, startTime, endTime, participantType, departments, coreTeamMembers, notes, attachments } = req.body;

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
                const allMembers = await EventMember.find({
                    eventId,
                    status: { $ne: 'deactive' }
                }).select('_id').lean();
                participants = allMembers.map(member => ({
                    member: member._id,
                    participateStatus: member._id?.toString() === ownerMemberid?.toString() ? 'confirmed' : 'unconfirmed'
                }));
                if (ownerMemberid && !participants.some(p => p.member?.toString() === ownerMemberid.toString())) {
                    participants.unshift({
                        member: ownerMemberid,
                        participateStatus: 'confirmed'
                    });
                }
            } else if (participantType === 'departments') {
                if (!departments) {
                    return res.status(400).json({ message: 'departments is required when participantType is "departments"' });
                }
                let departmentIds;
                if (Array.isArray(departments)) {
                    departmentIds = departments;
                    console.log(departmentIds);
                } else if (typeof departments === 'string') {
                    const trimmed = departments.trim();
                    if (!trimmed) {
                        return res.status(400).json({ message: 'departments cannot be empty' });
                    }
                    try {
                        departmentIds = JSON.parse(trimmed);
                    } catch (e) {
                        return res.status(400).json({ message: 'Invalid departments JSON format: ' + e.message });
                    }
                } else {
                    return res.status(400).json({ message: 'departments must be an array or a JSON string' });
                }
                if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
                    return res.status(400).json({ message: 'departments must be a non-empty array' });
                }
                const selectedMembers = await EventMember.find({
                    eventId,
                    departmentId: { $in: departmentIds },
                    status: { $ne: 'deactive' }
                }).select('_id').lean();
                
                const seen = new Set();
                participants = selectedMembers.map(member => {
                    const idStr = member._id.toString();
                    seen.add(idStr);
                    return {
                        member: member._id,
                        participateStatus: idStr === ownerMemberid?.toString() ? 'confirmed' : 'unconfirmed'
                    };
                });
                if (ownerMemberid && !seen.has(ownerMemberid.toString())) {
                    participants.unshift({
                        member: ownerMemberid,
                        participateStatus: 'confirmed'
                    });
                }
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
                const seen = new Set(memberIds.map(id => id.toString()));
                participants = memberIds.map(memberId => ({
                    member: memberId,
                    participateStatus: (memberId?.toString() === ownerMemberid.toString()) ? 'confirmed' : 'unconfirmed'
                }));
                if (!seen.has(ownerMemberid.toString())) {
                    participants.unshift({
                        member: ownerMemberid,
                        participateStatus: 'confirmed'
                    });
                }
            }
        }

        if (Array.isArray(req.body.participants) && req.body.participants.length > 0) {
            participants = req.body.participants;
        }

        const calendarData = {
            name: name || (notes ? String(notes).substring(0, 100) : `Cuộc họp ${new Date(startAt).toLocaleDateString('vi-VN')}`),
            startAt: startDate,
            endAt: endDate,
            locationType,
            location,
            eventId,
            type: 'event',
            notes: notes || '',
            participants: participants.length > 0 ? participants : [],
            attachments: attachments || [],
            createdBy: ownerMemberid
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
		const requesterMembership = await getRequesterMembership(department.eventId?.toString(), req.user?.id);
        const isHoDOfDepartment = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId.toString() === departmentId;
        if (!isHoDOfDepartment) {
            return res.status(403).json({ message: 'Only HoD of this department can create calendar for this department!' });
        }
        const ownerMemberid = requesterMembership?._id;
		let { name, startAt, endAt, locationType, location, meetingDate, startTime, endTime, participantType, members, notes, attachments } = req.body;
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
		if (participantType === 'all') {
			const allMembers = await EventMember.find({
				departmentId,
				status: { $ne: 'deactive' }
			}).select('_id').lean();
			participants = allMembers.map(member => ({
				member: member._id,
				participateStatus: (member._id?.toString() === ownerMemberid?.toString()) ? 'confirmed' : 'unconfirmed'
			}));
			const ownerIncluded = participants.some(p => p.member?.toString() === ownerMemberid?.toString());
			if (!ownerIncluded && ownerMemberid) {
				participants.unshift({
					member: ownerMemberid,
					participateStatus: 'confirmed'
				});
			}
		} else {
			// Manual selection path: accept `members` or `participants` from body
			let selectedMemberIds = members;
			if ((selectedMemberIds === undefined || selectedMemberIds === null) && Array.isArray(req.body.participants)) {
				// If participants array is provided as full objects, keep as-is below
				selectedMemberIds = null;
			}

			if (selectedMemberIds !== null) {
				if (Array.isArray(selectedMemberIds)) {
					// ok
				} else if (typeof selectedMemberIds === 'string') {
					const trimmed = selectedMemberIds.trim();
					if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
						return res.status(400).json({ message: 'members cannot be empty' });
					}
					try {
						selectedMemberIds = JSON.parse(trimmed);
					} catch (e) {
						return res.status(400).json({ message: 'Invalid members JSON format: ' + e.message });
					}
				} else if (selectedMemberIds !== undefined) {
					return res.status(400).json({
						message: 'members must be an array or a JSON string',
						receivedType: typeof selectedMemberIds
					});
				}

				if (selectedMemberIds !== null) {
					if (!Array.isArray(selectedMemberIds)) {
						return res.status(400).json({ message: 'members must parse to an array' });
					}
					if (selectedMemberIds.length === 0) {
						return res.status(400).json({ message: 'members must be a non-empty array' });
					}
					const seen = new Set(selectedMemberIds.map(id => id?.toString()));
					participants = selectedMemberIds.map(memberId => ({
						member: memberId,
						participateStatus: (memberId?.toString() === ownerMemberid?.toString()) ? 'confirmed' : 'unconfirmed'
					}));
					if (ownerMemberid && !seen.has(ownerMemberid.toString())) {
						participants.unshift({
							member: ownerMemberid,
							participateStatus: 'confirmed'
						});
					}
				}
			}

			// If participants provided directly in body, trust it
			if (participants.length === 0 && Array.isArray(req.body.participants) && req.body.participants.length > 0) {
				participants = req.body.participants;
			}

			if (participants.length === 0) {
				return res.status(400).json({ message: 'At least one participant is required' });
			}
		}

		const calendarData = {
			name: name || (notes ? String(notes).substring(0, 100) : `Cuộc họp ${new Date(startAt).toLocaleDateString('vi-VN')}`),
			startAt: startDate,
			endAt: endDate,
			locationType,
			location,
			departmentId,
			type: 'department',
			notes: notes || '',
			participants: participants.length > 0 ? participants : [],
			attachments: attachments || [],
			createdBy: ownerMemberid
		};

		const calendar = await createCalendar(calendarData);
		return res.status(201).json({ data: calendar });
    } catch (error) {
        console.error('createCalendarForDepartment error:', error.message);
        return res.status(500).json({ message: 'Failed to create calendar' });
    }
}
export const updateCalendarForEvent = async (req, res) => {
    try {
        const { calendarId } = req.params;
        const {  updateData } = req.body;
		let calendar = await getCalendarById(calendarId);
        if (!calendar) {
            return res.status(404).json({ message: 'Calendar not found' });
        }
		// Permission checks
		let ownerMemberid = null;
		if (calendar.eventId) { // Calendar belongs to event
			const requesterMembership = await getRequesterMembership(calendar.eventId?.toString(), req.user?.id);
            const isHoOC = requesterMembership?.role === 'HoOC';
			ownerMemberid = requesterMembership?._id;
            if (!isHoOC) {
                return res.status(403).json({ message: 'Only HoOC can update calendar for event!' });
            }
		} else if (calendar.departmentId) { // Calendar belongs to department
			// For department calendars, permission is HoD of that department within the same event
			const department = await findDepartmentById(calendar.departmentId?.toString());
			if (!department) {
				return res.status(404).json({ message: 'Department not found' });
			}
			const requesterMembership = await getRequesterMembership(department.eventId?.toString(), req.user?.id);
			const isHoDOfDepartment = requesterMembership?.role === 'HoD' && requesterMembership?.departmentId?.toString() === calendar.departmentId?.toString();
			ownerMemberid = requesterMembership?._id;
            if (!isHoDOfDepartment) {
                return res.status(403).json({ message: 'Only HoD of this department can update calendar for this department!' });
            }
        }
		// Validate and normalize update payload
		if (!updateData || typeof updateData !== 'object') {
			return res.status(400).json({ message: 'updateData must be provided' });
		}
		let {
			name,
			startAt,
			endAt,
			meetingDate,
			startTime,
			endTime,
			locationType,
			location,
			notes,
			attachments,
			participants,
			participantType,
			departments,
			coreTeamMembers,
			members
		} = updateData;

		// Derive startAt / endAt from meetingDate + times if provided
		if ((!startAt || !endAt) && meetingDate && startTime) {
			startAt = new Date(`${meetingDate}T${startTime}`).toISOString();
		}
		if ((!endAt || !startAt) && meetingDate && endTime) {
			endAt = new Date(`${meetingDate}T${endTime}`).toISOString();
		}

		// If either startAt or endAt is present, validate both if available
		let startDate, endDate;
		if (startAt) {
			startDate = new Date(startAt);
			if (isNaN(startDate.getTime())) {
				return res.status(400).json({ message: 'Invalid startAt format' });
			}
		}
		if (endAt) {
			endDate = new Date(endAt);
			if (isNaN(endDate.getTime())) {
				return res.status(400).json({ message: 'Invalid endAt format' });
			}
		}
		if (startDate && endDate && startDate >= endDate) {
			return res.status(400).json({ message: 'endAt must be after startAt' });
		}

		// Validate locationType if provided
		if (locationType && !['online', 'offline'].includes(locationType)) {
			return res.status(400).json({ message: 'locationType must be either "online" or "offline"' });
		}

		// Prepare allowed fields to update
		const allowedUpdate = {};
		if (typeof name === 'string') allowedUpdate.name = name;
		if (startDate) allowedUpdate.startAt = startDate;
		if (endDate) allowedUpdate.endAt = endDate;
		if (typeof locationType === 'string') allowedUpdate.locationType = locationType;
		if (typeof location === 'string') allowedUpdate.location = location;
		if (typeof notes === 'string') allowedUpdate.notes = notes;
		if (Array.isArray(attachments)) allowedUpdate.attachments = attachments;
		if (Array.isArray(participants)) allowedUpdate.participants = participants;

		// Rebuild participants like create if participantType provided
		if (participantType) {
			let rebuiltParticipants = [];
			if (calendar.eventId) {
				const eventId = calendar.eventId?.toString();
				if (participantType === 'all') {
					const allMembers = await getMembersByEventRaw(eventId);
					rebuiltParticipants = allMembers.map(member => ({
						member: member._id,
						participateStatus: (member._id?.toString() === ownerMemberid?.toString()) ? 'confirmed' : 'unconfirmed'
					}));
					const ownerIncluded = rebuiltParticipants.some(p => p.member?.toString() === ownerMemberid?.toString());
					if (!ownerIncluded && ownerMemberid) {
						rebuiltParticipants.unshift({ member: ownerMemberid, participateStatus: 'confirmed' });
					}
				} else if (participantType === 'departments') {
					let departmentIds;
					if (Array.isArray(departments)) {
						departmentIds = departments;
					} else if (typeof departments === 'string') {
						const trimmed = departments.trim();
						if (!trimmed) return res.status(400).json({ message: 'departments cannot be empty' });
						try { departmentIds = JSON.parse(trimmed); } catch (e) {
							return res.status(400).json({ message: 'Invalid departments JSON format: ' + e.message });
						}
					} else {
						return res.status(400).json({ message: 'departments must be provided when participantType is "departments"' });
					}
					if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
						return res.status(400).json({ message: 'departments must be a non-empty array' });
					}
					const departmentIdSet = new Set(departmentIds.map(id => id?.toString()));
					const allMembers = await getMembersByEventRaw(eventId);
					const selectedMembers = allMembers.filter(member => {
						const depIdStr = member?.departmentId?._id ? member.departmentId._id.toString() : null;
						return depIdStr && departmentIdSet.has(depIdStr);
					});
					const seen = new Set();
					rebuiltParticipants = selectedMembers.map(member => {
						const idStr = member._id.toString();
						seen.add(idStr);
						return {
							member: member._id,
							participateStatus: idStr === ownerMemberid?.toString() ? 'confirmed' : 'unconfirmed'
						};
					});
					if (ownerMemberid && !seen.has(ownerMemberid.toString())) {
						rebuiltParticipants.unshift({ member: ownerMemberid, participateStatus: 'confirmed' });
					}
				} else if (participantType === 'coreteam') {
					let memberIds;
					if (Array.isArray(coreTeamMembers)) {
						memberIds = coreTeamMembers;
					} else if (typeof coreTeamMembers === 'string') {
						const trimmed = coreTeamMembers.trim();
						if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
							return res.status(400).json({ message: 'coreTeamMembers cannot be empty' });
						}
						try { memberIds = JSON.parse(trimmed); } catch (e) {
							return res.status(400).json({ message: 'Invalid coreTeamMembers JSON format: ' + e.message });
						}
					} else {
						return res.status(400).json({ message: 'coreTeamMembers must be provided when participantType is "coreteam"' });
					}
					if (!Array.isArray(memberIds) || memberIds.length === 0) {
						return res.status(400).json({ message: 'coreTeamMembers must be a non-empty array' });
					}
					const seen = new Set(memberIds.map(id => id?.toString()));
					rebuiltParticipants = memberIds.map(memberId => ({
						member: memberId,
						participateStatus: (memberId?.toString() === ownerMemberid?.toString()) ? 'confirmed' : 'unconfirmed'
					}));
					if (ownerMemberid && !seen.has(ownerMemberid.toString())) {
						rebuiltParticipants.unshift({ member: ownerMemberid, participateStatus: 'confirmed' });
					}
				}
			} else if (calendar.departmentId) {
				const departmentId = calendar.departmentId?.toString();
				if (participantType === 'all') {
					const allMembers = await getMembersByDepartmentRaw(departmentId);
					rebuiltParticipants = allMembers.map(member => ({
						member: member._id,
						participateStatus: (member._id?.toString() === ownerMemberid?.toString()) ? 'confirmed' : 'unconfirmed'
					}));
					const ownerIncluded = rebuiltParticipants.some(p => p.member?.toString() === ownerMemberid?.toString());
					if (!ownerIncluded && ownerMemberid) {
						rebuiltParticipants.unshift({ member: ownerMemberid, participateStatus: 'confirmed' });
					}
				} else {
					let selectedMemberIds = members;
					if (Array.isArray(selectedMemberIds)) {
						// ok
					} else if (typeof selectedMemberIds === 'string') {
						const trimmed = selectedMemberIds.trim();
						if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
							return res.status(400).json({ message: 'members cannot be empty' });
						}
						try { selectedMemberIds = JSON.parse(trimmed); } catch (e) {
							return res.status(400).json({ message: 'Invalid members JSON format: ' + e.message });
						}
					} else {
						return res.status(400).json({ message: 'members must be provided for manual selection' });
					}
					if (!Array.isArray(selectedMemberIds) || selectedMemberIds.length === 0) {
						return res.status(400).json({ message: 'members must be a non-empty array' });
					}
					const seen = new Set(selectedMemberIds.map(id => id?.toString()));
					rebuiltParticipants = selectedMemberIds.map(memberId => ({
						member: memberId,
						participateStatus: (memberId?.toString() === ownerMemberid?.toString()) ? 'confirmed' : 'unconfirmed'
					}));
					if (ownerMemberid && !seen.has(ownerMemberid.toString())) {
						rebuiltParticipants.unshift({ member: ownerMemberid, participateStatus: 'confirmed' });
					}
				}
			}
			allowedUpdate.participants = rebuiltParticipants;
		}

		// No-op guard
		if (Object.keys(allowedUpdate).length === 0) {
			return res.status(200).json({ data: calendar, message: 'No changes detected' });
		}

		await updateCalendar(calendarId, allowedUpdate);
		// Return populated document
		calendar = await getCalendarById(calendarId);
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
        const participant = calendar.participants.some(participant => participant.member._id.toString() === requesterMembership._id.toString());
        if (!participant) {
            return res.status(403).json({ message: 'You are not a participant of this calendar' });
        }
        const { participateStatus, reasonAbsent } = req.body;
        if (participateStatus === 'absent' && !reasonAbsent) {
            return res.status(400).json({ message: 'Reason for absence is required' });
        }
        calendar.participants = calendar.participants.map(participant => {
            const memberId = (participant.member && typeof participant.member === 'object')
                ? (participant.member._id || participant.member)?.toString()
                : (participant.member)?.toString();
            if (memberId === requesterMembership._id.toString()) {
                return {
                    ...participant,
                    participateStatus,
                    reasonAbsent: participateStatus === 'absent' ? (reasonAbsent || '') : ''
                };
            }
            return participant;
        });
        // Only update participants to avoid passing immutable fields accidentally
        calendar = await updateCalendar(calendarId, { participants: calendar.participants });
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
        let calendars = [];
        try {
            calendars = await getCalendarsInEventScope(eventId);
            if (!Array.isArray(calendars)) calendars = [];
        } catch (_) {
            // Fallback to event-only calendars if event-scope query fails
            try {
                calendars = await getCalendarByEventId(eventId);
                if (!Array.isArray(calendars)) calendars = [];
            } catch (__) {
                calendars = [];
            }
        }
        const membershipId = membership._id.toString();
        const myCalendars = calendars.filter(calendar => {
            return Array.isArray(calendar.participants) && calendar.participants.some(participant => {
                const memberField = participant?.member;
                const participantMemberId = (memberField && typeof memberField === 'object')
                    ? (memberField._id || memberField)?.toString()
                    : (memberField)?.toString();
                return participantMemberId === membershipId;
            });
        });
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

export const getAvailableMembers = async (req, res) => {
  try {
    const { eventId, calendarId } = req.params;

    const calendar = await getCalendarById(calendarId);
    if (!calendar) {
      return res.status(404).json({ message: 'Không tìm thấy lịch họp' });
    }

    const { eventId: calendarEventId } = await resolveCalendarEventId(calendar);
    if (!calendarEventId || calendarEventId !== eventId) {
      return res.status(400).json({ message: 'Lịch họp không thuộc sự kiện này' });
    }

    const requesterMembership = await getRequesterMembership(calendarEventId, req.user?.id);
    if (!requesterMembership || !isCalendarCreator(calendar, requesterMembership._id)) {
      return res.status(403).json({ message: 'Bạn không có quyền quản lý người tham gia' });
    }

    const allMembers = await getActiveEventMembers(calendarEventId);
    const currentMemberIds = new Set(
      (calendar.participants || [])
        .map(toParticipantMemberId)
        .filter(Boolean)
    );
    const availableMembers = allMembers.filter(
      member => !currentMemberIds.has(member._id.toString())
    );

    return res.status(200).json({
      message: 'Lấy danh sách thành viên thành công',
      data: availableMembers
    });
  } catch (error) {
    console.error('Error in getAvailableMembers:', error);
    return res.status(500).json({
      message: 'Lỗi server khi lấy danh sách thành viên'
    });
  }
};

export const addParticipants = async (req, res) => {
  try {
    const { eventId, calendarId } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        message: 'memberIds phải là array và không được rỗng'
      });
    }

    const calendar = await getCalendarById(calendarId);
    if (!calendar) {
      return res.status(404).json({ message: 'Không tìm thấy lịch họp' });
    }

    const { eventId: calendarEventId } = await resolveCalendarEventId(calendar);
    if (!calendarEventId || calendarEventId !== eventId) {
      return res.status(400).json({ message: 'Lịch họp không thuộc sự kiện này' });
    }

    const requesterMembership = await getRequesterMembership(calendarEventId, req.user?.id);
    if (!requesterMembership || !isCalendarCreator(calendar, requesterMembership._id)) {
      return res.status(403).json({ message: 'Bạn không có quyền thêm người tham gia' });
    }

    const existingMemberIds = new Set(
      (calendar.participants || [])
        .map(toParticipantMemberId)
        .filter(Boolean)
    );
    const newMemberIds = memberIds
      .map(id => id?.toString())
      .filter(id => id && !existingMemberIds.has(id));

    if (newMemberIds.length === 0) {
      return res.status(400).json({
        message: 'Tất cả thành viên đã có trong lịch họp'
      });
    }

    const newParticipants = newMemberIds.map(memberId => ({
      member: memberId,
      participateStatus: 'unconfirmed',
    }));

    await addParticipantsToCalendar(calendarId, newParticipants);

    await notifyAddedToCalendar(
      eventId,
      calendarId,
      newMemberIds,
      calendar.name
    );

    const updatedCalendar = await getCalendarById(calendarId);

    return res.status(200).json({
      message: `Đã thêm ${newMemberIds.length} người tham gia`,
      data: updatedCalendar
    });
  } catch (error) {
    console.error('Error in addParticipants:', error);
    return res.status(500).json({
      message: 'Lỗi server khi thêm người tham gia'
    });
  }
};

export const removeParticipant = async (req, res) => {
  try {
    const { eventId, calendarId, memberId } = req.params;

    const calendar = await getCalendarById(calendarId);
    if (!calendar) {
      return res.status(404).json({ message: 'Không tìm thấy lịch họp' });
    }

    const { eventId: calendarEventId } = await resolveCalendarEventId(calendar);
    if (!calendarEventId || calendarEventId !== eventId) {
      return res.status(400).json({ message: 'Lịch họp không thuộc sự kiện này' });
    }

    const requesterMembership = await getRequesterMembership(calendarEventId, req.user?.id);
    if (!requesterMembership || !isCalendarCreator(calendar, requesterMembership._id)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa người tham gia' });
    }

    const creatorId = toIdString(calendar.createdBy);
    if (creatorId === memberId) {
      return res.status(400).json({
        message: 'Không thể xóa người tạo cuộc họp'
      });
    }

    const participantExists = (calendar.participants || []).some(
      participant => toParticipantMemberId(participant) === memberId
    );

    if (!participantExists) {
      return res.status(404).json({
        message: 'Không tìm thấy người tham gia trong lịch họp'
      });
    }

    const eventMember = await getEventMemberById(memberId);

    await removeParticipantFromCalendar(calendarId, memberId);

    if (eventMember && eventMember.userId) {
      await notifyRemovedFromCalendar(
        eventId,
        calendarId,
        toIdString(eventMember.userId),
        calendar.name
      );
    }

    const updatedCalendar = await getCalendarById(calendarId);

    return res.status(200).json({
      message: 'Đã xóa người tham gia',
      data: updatedCalendar
    });
  } catch (error) {
    console.error('Error in removeParticipant:', error);
    return res.status(500).json({
      message: 'Lỗi server khi xóa người tham gia'
    });
  }
};

export const sendReminder = async (req, res) => {
  try {
    const { eventId, calendarId } = req.params;
    const { target } = req.body;

    if (!['unconfirmed', 'all'].includes(target)) {
      return res.status(400).json({
        message: 'Target phải là "unconfirmed" hoặc "all"'
      });
    }

    const calendar = await getCalendarById(calendarId);
    if (!calendar) {
      return res.status(404).json({ message: 'Không tìm thấy lịch họp' });
    }

    const { eventId: calendarEventId } = await resolveCalendarEventId(calendar);
    if (!calendarEventId || calendarEventId !== eventId) {
      return res.status(400).json({ message: 'Lịch họp không thuộc sự kiện này' });
    }

    const requesterMembership = await getRequesterMembership(calendarEventId, req.user?.id);
    if (!requesterMembership || !isCalendarCreator(calendar, requesterMembership._id)) {
      return res.status(403).json({ message: 'Bạn không có quyền gửi nhắc nhở' });
    }

    let targetParticipants = calendar.participants || [];
    if (target === 'unconfirmed') {
      targetParticipants = targetParticipants.filter(
        participant => participant.participateStatus === 'unconfirmed'
      );
    }

    if (targetParticipants.length === 0) {
      return res.status(400).json({
        message: target === 'unconfirmed'
          ? 'Không có người tham gia nào chưa phản hồi'
          : 'Không có người tham gia nào'
      });
    }

    await notifyMeetingReminder(
      eventId,
      calendarId,
      targetParticipants,
      calendar.name,
      calendar.startAt
    );

    const targetText = target === 'all'
      ? 'tất cả người tham gia'
      : 'những người chưa phản hồi';

    return res.status(200).json({
      message: `Đã gửi nhắc nhở đến ${targetParticipants.length} ${targetText}`,
      count: targetParticipants.length
    });
  } catch (error) {
    console.error('Error in sendReminder:', error);
    return res.status(500).json({
      message: 'Lỗi server khi gửi nhắc nhở'
    });
  }
};