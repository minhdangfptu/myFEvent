import ensureEventRole from '../utils/ensureEventRole.js';
import {
  ensureEventExists,
  createMilestoneDoc,
  listMilestonesByEvent,
  findMilestoneDetail,
  getEventMembership,
  updateMilestoneDoc,
  softDeleteMilestoneIfNoTasks
} from '../services/milestoneService.js';

// POST /api/events/:eventId/milestones
export const createMilestone = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, description, targetDate, status } = req.body;

    if (!name || !targetDate || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const milestone = await createMilestoneDoc({ eventId, name, description, targetDate, status });
    return res.status(201).json({ data: milestone });
  } catch (error) {
    console.error('createMilestone error:', error.message);
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

    const { items, total } = await listMilestonesByEvent(eventId, { status, skip, limit, sortBy, sortDir });

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
    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'staff']);
    if (!member) return res.status(403).json({ message: 'Can not view milestone detail!' });
    const result = await findMilestoneDetail(eventId, milestoneId);
    if (!result) return res.status(404).json({ message: 'Milestone not found' });
    const { milestone, tasks } = result;
    const payload = {
      id: String(milestone._id),
      name: milestone.name,
      date: milestone.targetDate,
      status: milestone.status || 'upcoming',
      description: milestone.description || '',
      relatedTasks: (tasks || []).map(t => ({
        id: String(t._id),
        name: t.name,
        status: t.status
      }))
    };
    return res.status(200).json({ data: payload });
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
    const membership = await getEventMembership(eventId, req.user?.id);
    if (!membership || membership.role !== 'HoOC') {
      return res.status(403).json({ message: 'Only HoOC can update milestone' });
    }
    const { name, description, dueDate, status } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (status !== undefined) updates.status = status;

    const milestone = await updateMilestoneDoc(eventId, milestoneId, updates);
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
    const membership = await getEventMembership(eventId, req.user?.id);
    if (!membership || membership.role !== 'HoOC') {
      return res.status(403).json({ message: 'Only HoOC can delete milestone' });
    }
    const result = await softDeleteMilestoneIfNoTasks(eventId, milestoneId);
    if (result.code === 'NOT_FOUND') return res.status(404).json({ message: 'Milestone not found' });
    if (result.code === 'HAS_TASKS') return res.status(400).json({ message: 'Milestone has tasks' });
    return res.status(200).json({ message: 'Milestone deleted' });
  } catch (error) {
    console.error('deleteMilestone error:', error);
    return res.status(500).json({ message: 'Failed to delete milestone' });
  }
};


