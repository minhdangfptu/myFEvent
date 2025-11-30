import Calendar from '../models/calendar.js';
import Department from '../models/department.js';

export const getCalendarByEventId = async (eventId) => {
    return await Calendar.find({ eventId })
        .populate({
            path: 'participants.member',
            model: 'EventMember',
            populate: {
                path: 'userId',
                model: 'User',
                select: 'fullName email'
            }
        })
        .populate({
            path: 'createdBy',
            model: 'EventMember',
            populate: {
                path: 'userId',
                model: 'User',
                select: '_id'
            }
        })
        .lean();
};
export const getCalendarByDepartmentId = async (departmentId) => {
    return await Calendar.find({ departmentId })
        .populate({
            path: 'participants.member',
            model: 'EventMember',
            populate: {
                path: 'userId',
                model: 'User',
                select: 'fullName email'
            }
        })
        .populate({
            path: 'createdBy',
            model: 'EventMember',
            populate: {
                path: 'userId',
                model: 'User',
                select: '_id'
            }
        })
        .lean();
};

export const getCalendarsInEventScope = async (eventId, startDate = null, endDate = null) => {
    const deptIds = await Department.find({ eventId }).select('_id').lean();
    const departmentIdList = deptIds.map(d => d._id);

    const query = {
        $or: [
            { eventId },
            { departmentId: { $in: departmentIdList } }
        ]
    };

    // Add date range filter if provided
    if (startDate && endDate) {
        query.startAt = {
            $gte: startDate,
            $lte: endDate
        };
    }

    return await Calendar.find(query)
        .select('name startAt endAt location locationType type participants createdBy')
        .populate({
            path: 'participants.member',
            model: 'EventMember',
            select: 'userId',
            populate: {
                path: 'userId',
                model: 'User',
                select: '_id email fullName'
            }
        })
        .populate({
            path: 'createdBy',
            model: 'EventMember',
            select: 'userId'
        })
        .lean();
};

export const createCalendar = async (calendarData) => {
    const calendar = new Calendar(calendarData);
    return await calendar.save();
};
export const updateCalendar = async (calendarId, updateData) => {
    return await Calendar.findByIdAndUpdate(calendarId, updateData, { new: true });
};
export const getCalendarById = async (calendarId) => {
    return await Calendar.findById(calendarId)
        .populate({
            path: 'participants.member',
            model: 'EventMember',
            populate: {
                path: 'userId',
                model: 'User',
                select: 'fullName email'
            }
        }).populate({
            path: 'createdBy',
            model: 'EventMember',
            populate: {
                path: 'userId',
                model: 'User',
                select: '_id'
            }
        })
        .lean();
};


export const addParticipantsToCalendar = async (calendarId, newParticipants) => {
  const calendar = await Calendar.findById(calendarId);
  if (!calendar) return null;
  
  calendar.participants.push(...newParticipants);
  await calendar.save();
  
  return calendar;
};

export const removeParticipantFromCalendar = async (calendarId, memberId) => {
  const calendar = await Calendar.findById(calendarId);
  if (!calendar) return null;
  
  const participantIndex = calendar.participants.findIndex(
    p => p.member.toString() === memberId
  );
  
  if (participantIndex === -1) return null;
  
  calendar.participants.splice(participantIndex, 1);
  await calendar.save();
  
  return calendar;
};