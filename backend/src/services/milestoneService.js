import Milestone from '../models/milestone.js';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import Task from '../models/task.js';

export const ensureEventExists = async (eventId) => {
  const exists = await Event.exists({ _id: eventId });
  return !!exists;
};

export const checkDuplicateMilestone = async (eventId, name) => {
  const existing = await Milestone.findOne({
    eventId,
    name: name.trim(),
    isDeleted: false
  }).lean();
  return !!existing;
};

export const createMilestoneDoc = async (payload) => {
  return await Milestone.create(payload);
};

export const listMilestonesByEvent = async (eventId, { status, skip, limit, sortBy, sortDir }) => {
  const filter = { eventId, isDeleted: false };
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Milestone.find(filter)
      .sort({ [sortBy]: sortDir, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Milestone.countDocuments(filter)
  ]);
  return { items, total };
};

export const findMilestoneDetail = async (eventId, milestoneId) => {
  const milestone = await Milestone.findOne({ _id: milestoneId, eventId }).lean();
  if (!milestone) return null;

  // Query tasks - CHỈ LẤY EPIC TASKS (công việc lớn)
  const allTasks = await Task.find({
    milestoneId: milestoneId,
    eventId: eventId,
    taskType: 'epic' // Chỉ lấy công việc lớn (epic tasks)
  }).lean();

  // Select only needed fields
  const tasks = allTasks.map(t => ({
    _id: t._id,
    title: t.title,
    status: t.status,
    departmentId: t.departmentId
  }));

  return { milestone, tasks };
};

export const getEventMembership = async (eventId, userId) => {
  if (!userId) return null;
  return await EventMember.findOne({ eventId, userId, status: { $ne: 'deactive' } }).lean();
};

export const updateMilestoneDoc = async (eventId, milestoneId, updates) => {
  return await Milestone.findOneAndUpdate(
    { _id: milestoneId, eventId },
    { $set: updates },
    { new: true }
  ).lean();
};

export const softDeleteMilestoneIfNoTasks = async (eventId, milestoneId) => {
  const deleted = await Milestone.findOne({ _id: milestoneId, eventId });
  if (!deleted) return { code: 'NOT_FOUND' };
  const tasks = await Task.find({ milestoneId });
  if (tasks.length > 0) return { code: 'HAS_TASKS' };
  deleted.isDeleted = true;
  await deleted.save();
  return { code: 'OK' };
};
















