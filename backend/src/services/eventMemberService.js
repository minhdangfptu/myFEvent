import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';

export const ensureEventExists = async (eventId) => {
  const event = await Event.findById(eventId).lean();
  return !!event;
};

export const getMembersByEventRaw = async (eventId) => {
  return await EventMember.find({ eventId })
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
      avatar: member.userId?.avatarUrl || `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70) + 1}`,
      role: member.role,
      department: member.departmentId?.name || 'Chưa phân ban',
      departmentId: member.departmentId?._id,
      joinedAt: member.createdAt
    });
  });
  return membersByDepartment;
};

export const getUnassignedMembersRaw = async (eventId) => {
  return await EventMember.find({ eventId, departmentId: null, role: 'Member' })
    .populate('userId', 'fullName email')
    .lean();
};

export const getMembersByDepartmentRaw = async (departmentId) => {
  const members = await EventMember.find({ departmentId })
    .populate('userId', 'fullName email avatarUrl')
    .lean();
  return members.map(member => ({
    _id: member._id,
    id: member._id,
    userId: member.userId?._id,
    name: member.userId?.fullName || 'Unknown',
    email: member.userId?.email || '',
    avatar: member.userId?.avatarUrl || `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70) + 1}`,
    role: member.role,
    departmentId: member.departmentId,
    joinedAt: member.createdAt
  }));
};

export const findEventMemberById = async (memberId) => {
  return await EventMember.findOne({ _id: memberId }).lean();
};

export const getRequesterMembership = async (eventId, userId) => {
  if (!userId) return null;
  return await EventMember.findOne({ eventId, userId }).lean();
};
export const countDepartmentMembersExcludingHoOC = async (departmentId) => {
  return await EventMember.countDocuments({ departmentId, role: { $ne: 'HoOC' } });
};


