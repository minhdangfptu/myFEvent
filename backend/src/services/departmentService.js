import Event from '../models/event.js';
import Department from '../models/department.js';
import EventMember from '../models/eventMember.js';
import User from '../models/user.js';
import Task from '../models/task.js';

// Basic helpers
export const ensureEventExists = async (eventId) => {
  const exists = await Event.findOne({ _id: eventId });
  return !!exists;
};

export const ensureDepartmentInEvent = async (eventId, departmentId) => {
  return await Department.findOne({ _id: departmentId, eventId });
};


// Query services
export const findDepartmentsByEvent = async (eventId, { search, skip, limit }) => {
  const filter = { eventId };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    Department.find(filter)
      .populate({ path: 'leaderId', select: 'fullName email avatarUrl' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Department.countDocuments(filter)
  ]);

  return { items, total };
};

export const findDepartmentById = async (departmentId) => {
  return await Department.findOne({ _id: departmentId })
    .populate({ path: 'leaderId', select: 'fullName email avatarUrl' })
    .lean();
};

// Mutations
export const createDepartmentDoc = async (payload) => {
  const department = await Department.create(payload);
  return await Department.findById(department._id)
    .populate({ path: 'leaderId', select: 'fullName email avatarUrl' })
    .lean();
};

export const updateDepartmentDoc = async (departmentId, set) => {
  return await Department.findByIdAndUpdate(
    departmentId,
    { $set: set },
    { new: true }
  ).populate({ path: 'leaderId', select: 'fullName email avatarUrl' }).lean();
};

export const deleteDepartmentDoc = async (departmentId) => {
  return await Department.findByIdAndDelete(departmentId).lean();
};

export const assignHoDToDepartment = async (eventId, department, userId) => {
  const previousLeaderId = department.leaderId?.toString();
  department.leaderId = userId;
  await department.save();

  const targetMembership = await EventMember.findOne({ eventId, userId, status: { $ne: 'deactive' } });
  if (!targetMembership) {
    throw new Error('Người dùng chưa tham gia sự kiện');
  }

  await EventMember.findOneAndUpdate(
    { _id: targetMembership._id },
    { $set: { departmentId: department._id, role: 'HoD' } },
    { new: true }
  );

  if (previousLeaderId && previousLeaderId !== userId) {
    await EventMember.findOneAndUpdate(
      { eventId, userId: previousLeaderId, status: { $ne: 'deactive' } },
      { $set: { departmentId: department._id, role: 'staff' } }
    );
  }

  return await Department.findById(department._id)
    .populate({ path: 'leaderId', select: 'fullName email avatarUrl' })
    .lean();
};

export const ensureUserExists = async (userId) => {
  return await User.findById(userId).lean();
};

export const isUserMemberOfDepartment = async (eventId, departmentId, userId) => {
  const m = await EventMember.findOne({ eventId, userId, departmentId, status: { $ne: 'deactive' } }).lean();
  return !!m;
};

export const addMemberToDepartmentDoc = async (eventId, departmentId, memberId, roleToSet) => {
  return await EventMember.findOneAndUpdate(
    { _id: memberId, status: { $ne: 'deactive' } },
    { $set: { departmentId, ...(roleToSet ? { role: roleToSet } : {}) } },
    { new: true }
  ).populate('userId', 'fullName email avatarUrl');
};

export const removeMemberFromDepartmentDoc = async (eventId, departmentId, memberId) => {
  // ✅ Xử lý tasks: chỉ unassign các task chưa hoàn thành
  // Giữ nguyên các task đã done, chỉ unassign các task todo/in_progress/blocked
  await Task.updateMany(
    {
      eventId,
      assigneeId: memberId,
      status: { $in: ['todo', 'in_progress', 'blocked', 'suggested'] }
    },
    {
      $set: { assigneeId: null }
    }
  );

  return await EventMember.findOneAndUpdate(
    { _id: memberId, departmentId, status: { $ne: 'deactive' } },
    { $set: { departmentId: null, role: 'Member' } },
    { new: true }
  );
};

export const findEventMemberById = async (memberId) => {
  return await EventMember.findOne({ _id: memberId, status: { $ne: 'deactive' } }).lean();
};


