import Milestone from '../models/milestone.js';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';

// Helpers
const ensureEventExists = async (eventId) => {
  const exists = await Event.exists({ _id: eventId });
  return !!exists;
};

// POST /api/events/:eventId/milestones
export const createMilestone = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, description, dueDate, status } = req.body;

    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const milestone = await Milestone.create({
      eventId,
      name,
      description,
      dueDate,
      status
    });

    return res.status(201).json({ data: milestone });
  } catch (error) {
    console.error('createMilestone error:', error);
    return res.status(500).json({ message: 'Failed to create milestone' });
  }
};

// GET /api/events/:eventId/milestones
export const listMilestones = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;
    const status = (req.query.status || '').trim();
    const sortBy = (req.query.sortBy || 'dueDate');
    const sortDir = (req.query.sortDir || 'asc') === 'desc' ? -1 : 1;

    const filter = { eventId };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Milestone.find(filter)
        .sort({ [sortBy]: sortDir, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Milestone.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('listMilestones error:', error);
    return res.status(500).json({ message: 'Failed to load milestones' });
  }
};

// GET /api/events/:eventId/milestones/:milestoneId
export const getMilestoneDetail = async (req, res) => {
  try {
    const { eventId, milestoneId } = req.params;
    const milestone = await Milestone.findOne({ _id: milestoneId, eventId }).lean();
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    return res.status(200).json({ data: milestone });
  } catch (error) {
    console.error('getMilestoneDetail error:', error);
    return res.status(500).json({ message: 'Failed to get milestone detail' });
  }
};

// PATCH /api/events/:eventId/milestones/:milestoneId
export const updateMilestone = async (req, res) => {
  try {
    const { eventId, milestoneId } = req.params;
    // Only HooC can update milestone
    const membership = await EventMember.findOne({ eventId, userId: req.user?.id }).lean();
    if (!membership || membership.role !== 'HooC') {
      return res.status(403).json({ message: 'Only HooC can update milestone' });
    }
    const { name, description, dueDate, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (status !== undefined) updates.status = status;

    const milestone = await Milestone.findOneAndUpdate(
      { _id: milestoneId, eventId },
      { $set: updates },
      { new: true }
    );
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    return res.status(200).json({ data: milestone });
  } catch (error) {
    console.error('updateMilestone error:', error);
    return res.status(500).json({ message: 'Failed to update milestone' });
  }
};

// DELETE /api/events/:eventId/milestones/:milestoneId
export const deleteMilestone = async (req, res) => {
  try {
    const { eventId, milestoneId } = req.params;
    // Only HooC can delete milestone
    const membership = await EventMember.findOne({ eventId, userId: req.user?.id }).lean();
    if (!membership || membership.role !== 'HooC') {
      return res.status(403).json({ message: 'Only HooC can delete milestone' });
    }
    const deleted = await Milestone.findOneAndDelete({ _id: milestoneId, eventId });
    if (!deleted) return res.status(404).json({ message: 'Milestone not found' });
    return res.status(200).json({ message: 'Milestone deleted' });
  } catch (error) {
    console.error('deleteMilestone error:', error);
    return res.status(500).json({ message: 'Failed to delete milestone' });
  }
};


