import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import User from '../models/user.js';
import Department from '../models/department.js';


export const ensureEventExists = async (eventId) => {
  const event = await Event.findById(eventId).lean();
  return !!event;
};

export const getMembersByEventRaw = async (eventId) => {
  console.time('[getMembersByEventRaw] Total time');

  // WORKAROUND: populate userId bị chậm cực kỳ (54s!) → Query riêng và map
  console.time('[getMembersByEventRaw] Find EventMembers');
  const members = await EventMember.find({
      eventId, status: { $ne: 'deactive' },
    })
    .sort({ createdAt: -1 })
    .lean();
  console.timeEnd('[getMembersByEventRaw] Find EventMembers');
  console.log(`[getMembersByEventRaw] Found ${members.length} members`);

  // Get unique userIds and departmentIds
  const userIds = [...new Set(members.map(m => m.userId).filter(Boolean))];
  const deptIds = [...new Set(members.map(m => m.departmentId).filter(Boolean))];

  console.time('[getMembersByEventRaw] Query Users & Departments');
  const [users, departments] = await Promise.all([
    // Cloudinary URL (ngắn gọn) thay vì base64, không còn gây timeout
    User.find({ _id: { $in: userIds } }).select('fullName email avatarUrl').lean(),
    Department.find({ _id: { $in: deptIds } }).select('name').lean()
  ]);
  console.timeEnd('[getMembersByEventRaw] Query Users & Departments');

  // Create maps for fast lookup
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  const deptMap = new Map(departments.map(d => [d._id.toString(), d]));

  // Map data manually
  console.time('[getMembersByEventRaw] Map data');
  const result = members.map(member => ({
    ...member,
    userId: member.userId ? userMap.get(member.userId.toString()) || null : null,
    departmentId: member.departmentId ? deptMap.get(member.departmentId.toString()) || null : null
  }));
  console.timeEnd('[getMembersByEventRaw] Map data');

  console.timeEnd('[getMembersByEventRaw] Total time');

  return result;
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
      // Sử dụng Cloudinary avatarUrl nếu có, fallback về UI Avatars
      avatar: member.userId?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.userId?.fullName || 'User')}&background=random&size=128`,
      role: member.role,
      department: deptName
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
    .populate('userId', 'fullName email verified avatarUrl') // Include avatarUrl from Cloudinary
    .lean();
};


export const getMembersByDepartmentRaw = async (departmentId) => {
  const members = await EventMember.find({ departmentId, status: { $ne: 'deactive' } })
    .populate('userId', 'fullName email verified avatarUrl') // Include avatarUrl from Cloudinary
    .lean();

  return members.map(member => ({
    _id: member._id,
    id: member._id,
    userId: member.userId?._id,
    name: member.userId?.fullName || 'Unknown',
    email: member.userId?.email || '',
    verified: member.userId?.verified || false,
    // Sử dụng Cloudinary avatarUrl nếu có, fallback về UI Avatars
    avatar: member.userId?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.userId?.fullName || 'User')}&background=random&size=128`,
    role: member.role,
    departmentId: member.departmentId,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt
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
    { status: "deactive" },
    { new: true }
  );
};
export const getActiveEventMembers = async (eventId) => {
  return await EventMember.find({
    eventId: eventId,
    status: 'active'
  })
    .populate('userId', 'fullName email') // Removed avatarUrl (base64 images cause timeout)
    .lean();
};

export const getEventMemberById = async (memberId) => {
  return await EventMember.findById(memberId)
    .populate('userId', '_id fullName')
    .lean();
};



