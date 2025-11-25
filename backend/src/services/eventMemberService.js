import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';


export const ensureEventExists = async (eventId) => {
  const event = await Event.findById(eventId).lean();
  return !!event;
};

export const getMembersByEventRaw = async (eventId) => {
  return await EventMember.find({ 
      eventId, status: { $ne: 'deactive' }, 
    })
    .populate([
      { path: 'userId', select: 'fullName email avatarUrl' },
      { path: 'departmentId', select: 'name' }
    ])
    .sort({ createdAt: -1 })
    .lean();
};


export const groupMembersByDepartment = (members) => {
  const membersByDepartment = {};

  members.forEach(member => {
    const deptName = member.departmentId?.name || 'Chưa phân ban';

    if (!membersByDepartment[deptName]) {
      membersByDepartment[deptName] = [];
    }

    membersByDepartment[deptName].push({
      id: member._id,
      userId: member.userId?._id,
      name: member.userId?.fullName || 'Unknown',
      email: member.userId?.email || '',
      avatar: member.userId?.avatarUrl ||
        `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70) + 1}`,
      role: member.role,
      status: member.status,
      department: deptName,
      departmentId: member.departmentId?._id,
      joinedAt: member.createdAt
    });
  });

  return membersByDepartment;
};


export const getUnassignedMembersRaw = async (eventId) => {
  return await EventMember.find({ 
    eventId, 
    departmentId: null, 
    role: { $ne: 'HoOC' }, // Loại trừ HoOC, lấy tất cả role khác (Member, HoD chưa có ban)
    status: { $ne: 'deactive' }
  })
    .populate('userId', 'fullName email avatarUrl')
    .lean();
};


export const getMembersByDepartmentRaw = async (departmentId) => {
  const members = await EventMember.find({ departmentId, status: { $ne: 'deactive' } })
    .populate('userId', 'fullName email avatarUrl')
    .lean();

  return members.map(member => ({
    _id: member._id,
    id: member._id,
    userId: member.userId?._id,
    name: member.userId?.fullName || 'Unknown',
    email: member.userId?.email || '',
    avatar: member.userId?.avatarUrl ||
      `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70) + 1}`,
    role: member.role,
    status: member.status,
    departmentId: member.departmentId,
    joinedAt: member.createdAt
  }));
};

export const findEventMemberById = async (memberId) => {
  return await EventMember.findOne({ _id: memberId, status: { $ne: 'deactive' } }).lean();
};


export const getRequesterMembership = async (eventId, userId) => {
  if (!userId) return null;
  return await EventMember.findOne({ eventId, userId, status: { $ne: 'deactive' } }).lean();
};

export const countDepartmentMembersExcludingHoOC = async (departmentId) => {
  return await EventMember.countDocuments({ departmentId, role: { $ne: 'HoOC' }, status: { $ne: 'deactive' } });
};

export const countDepartmentMembersIncludingHoOC = async (departmentId) => {
  return await EventMember.countDocuments({ departmentId });
};

export const getMemberInformationForExport = async (eventId) => {
  return await EventMember.find({ eventId })
    .populate([
      { path: 'userId', select: 'fullName email phone' },
      { path: 'departmentId', select: 'name' }
    ])
    .sort({ createdAt: -1 })
    .lean();
};

export const getEventMemberProfileById = async (memberId) => {
  return await EventMember.findOne({ _id: memberId, status: { $ne: 'deactive' } })
    .populate('userId', 'fullName email avatarUrl phone status bio highlight tags verified')
    .populate('departmentId', 'name')
    .lean();
};

export const inactiveEventMember = async (memberId) => {
  return EventMember.findByIdAndUpdate(
    memberId,
    { status: "Deactive" },
    { new: true }
  );
};
export const createEventMember = async (userId, eventId) => {
  return EventMember.create({
    userId,
    eventId,
    role: 'Member',
    status: 'Active'
  });
};
export const getActiveEventMembers = async (eventId) => {
  return await EventMember.find({ 
    eventId: eventId,
    status: 'active'
  })
    .populate('userId', 'fullName email avatarUrl')
    .lean();
};

export const getEventMemberById = async (memberId) => {
  return await EventMember.findById(memberId)
    .populate('userId', '_id fullName')
    .lean();
};
export const getEventMembersByIds = async (memberIds) => {
  return await EventMember.find({ 
    _id: { $in: memberIds } 
  })
    .populate('userId', '_id fullName')
    .lean();
};

