import ensureEventRole from '../utils/ensureEventRole.js';
import {
  ensureEventExists,
  checkDuplicateMilestone,
  createMilestoneDoc,
  listMilestonesByEvent,
  findMilestoneDetail,
  getEventMembership,
  updateMilestoneDoc,
  softDeleteMilestoneIfNoTasks
} from '../services/milestoneService.js';
import * as agendaService from '../services/agendaService.js';

// POST /api/events/:eventId/milestones
export const createMilestone = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, description, targetDate } = req.body;

    if (!name || !targetDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!(await ensureEventExists(eventId))) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check for duplicate milestone name in the same event
    const isDuplicate = await checkDuplicateMilestone(eventId, name);
    if (isDuplicate) {
      return res.status(409).json({ 
        message: 'Tên cột mốc này đã tồn tại trong sự kiện' 
      });
    }

    // 1. Create milestone first
    const milestone = await createMilestoneDoc({
      eventId,
      name: name.trim(),
      description,
      targetDate
    });
    
    // 2. Create agenda document for this milestone
    try {
      const agendaPayload = {
        milestoneId: milestone._id
      };
      
      const agenda = await agendaService.createAgendaDoc(agendaPayload);
      
      try {
        const { notifyAgendaCreated } = await import('../services/notificationService.js');
        await notifyAgendaCreated(eventId, agenda._id, milestone._id);
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Không throw error, chỉ log
      }
      
      
      // Return milestone with agenda info
      return res.status(201).json({ 
        data: milestone,
        agenda: {
          _id: agenda._id,
          milestoneId: agenda.milestoneId,
          created: true
        },
        message: 'Milestone and agenda created successfully'
      });
      
    } catch (agendaError) {
      console.warn(`⚠️ Failed to create agenda for milestone ${milestone._id}:`, agendaError.message);
      return res.status(201).json({ 
        data: milestone,
        agenda: {
          created: false,
          error: agendaError.message
        },
        message: 'Milestone created successfully, but agenda creation failed'
      });
    }
    
  } catch (error) {
    console.error('createMilestone error:', error.message);
    
    // Handle duplicate key error from MongoDB unique index
    if (error.code === 11000 || error.name === 'MongoServerError') {
      return res.status(409).json({ 
        message: 'Tên cột mốc này đã tồn tại trong sự kiện' 
      });
    }
    
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
    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
    if (!member) return res.status(403).json({ message: 'Can not view milestone detail!' });
    const result = await findMilestoneDetail(eventId, milestoneId);
    if (!result) return res.status(404).json({ message: 'Milestone not found' });
    const { milestone, tasks } = result;
    
    const mapTaskStatus = (status) => {
      const statusMap = {
        'chua_bat_dau': 'todo',
        'da_bat_dau': 'in_progress',
        'hoan_thanh': 'done',
        'huy': 'cancelled'
      };
      return statusMap[status] || 'todo';
    };
    
    const relatedTasks = (tasks || []).map(t => ({
      id: String(t._id),
      name: t.title || 'Không có tên',
      status: mapTaskStatus(t.status),
      departmentId: t.departmentId ? String(t.departmentId) : null
    }));
    
    const payload = {
      id: String(milestone._id),
      name: milestone.name,
      date: milestone.targetDate,
      description: milestone.description || '',
      relatedTasks: relatedTasks
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
    const { name, description, dueDate } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.dueDate = dueDate;

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
      return res.status(403).json({ message: 'Chỉ HoOC mới có quyền xóa cột mốc' });
    }
    const result = await softDeleteMilestoneIfNoTasks(eventId, milestoneId);
    if (result.code === 'NOT_FOUND') return res.status(404).json({ message: 'Không tìm thấy cột mốc' });
    if (result.code === 'HAS_TASKS') return res.status(400).json({ message: 'Không thể xóa cột mốc vì còn công việc liên quan' });
    return res.status(200).json({ message: 'Xóa cột mốc thành công' });
  } catch (error) {
    console.error('deleteMilestone error:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa cột mốc' });
  }
};


