import Department from '../models/department.js';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import User from '../models/user.js';

// Basic helpers
export const ensureEventExists = async (eventId) => {
  const exists = await Event.exists({ _id: eventId });
  return !!exists;
};

export const ensureDepartmentInEvent = async (eventId, departmentId) => {
  return await Department.findOne({ _id: departmentId, eventId });
};

export const getRequesterMembership = async (eventId, userId) => {
  if (!userId) return null;
  return await EventMember.findOne({ eventId, userId }).lean();
};

export const countDepartmentMembersExcludingHoOC = async (departmentId) => {
  return await EventMember.countDocuments({ departmentId, role: { $ne: 'HoOC' } });
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

export const assignHoDToDepartment = async (eventId, department, userId) => {
  const previousLeaderId = department.leaderId?.toString();
  department.leaderId = userId;
  await department.save();

  await EventMember.findOneAndUpdate(
    { eventId, userId },
    { $set: { departmentId: department._id, role: 'HoD' } },
    { upsert: true, new: true }
  );

  if (previousLeaderId && previousLeaderId !== userId) {
    await EventMember.findOneAndUpdate(
      { eventId, userId: previousLeaderId },
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
  const m = await EventMember.findOne({ eventId, userId, departmentId }).lean();
  return !!m;
};

export const addMemberToDepartmentDoc = async (eventId, departmentId, memberId) => {
  return await EventMember.findOneAndUpdate(
    { _id: memberId },
    { $set: { departmentId } },
    { new: true }
  );
};

export const removeMemberFromDepartmentDoc = async (eventId, departmentId, memberId) => {
  return await EventMember.findOneAndUpdate(
    { _id: memberId, departmentId },
    { $set: { departmentId: null, role: 'Member' } },
    { new: true }
  );
};


