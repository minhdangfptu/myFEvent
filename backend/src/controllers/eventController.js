/* eslint-disable no-unused-vars */
// controllers/eventController.js
import { eventService, findEventById } from '../services/eventService.js';
import Event from '../models/event.js';
import Department from '../models/department.js';
import EventMember from '../models/eventMember.js';
import Task from '../models/task.js';
import Risk from '../models/risk.js';
import Calendar from '../models/calendar.js';
import Milestone from '../models/milestone.js';

const ok = (res, status, body) => res.status(status).json(body);
const handle = async (res, fn) => {
  try {
    const result = await fn();
    return;
  } catch (err) {
    const status = err.status || 500;
    const payload = { message: err.message || 'Internal Server Error' };
    if (err.missingFields) payload.missingFields = err.missingFields;
    console.error('EventController error:', err?.message, err?.stack);
    return ok(res, status, payload);
  }
};

// GET /api/events/public
export const listPublicEvents = (req, res) =>
  handle(res, async () => {
    const { page, limit, search, status } = req.query;
    const result = await eventService.listPublicEvents({ page, limit, search, status });
    return ok(res, 200, result);
  });

// GET /api/events/:id (public only)
export const getPublicEventDetail = (req, res) =>
  handle(res, async () => {
    const { id } = req.params;
    const result = await eventService.getPublicEventDetail({ id });
    return ok(res, 200, result);
  });

// GET /api/events/private/:id
export const getPrivateEventDetail = (req, res) =>
  handle(res, async () => {
    const { id } = req.params;
    const result = await eventService.getPrivateEventDetail({ id });
    return ok(res, 200, result);
  });

// POST /api/events
export const createEvent = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const result = await eventService.createEvent({ userId, body: req.body });
    return ok(res, 201, result);
  });

// POST /api/events/join
export const joinEventByCode = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { code } = req.body;
    const result = await eventService.joinEventByCode({ userId, code });
    return ok(res, 200, result);
  });

// GET /api/events/:id/summary
export const getEventSummary = (req, res) =>
  handle(res, async () => {
    const { id } = req.params;
    const result = await eventService.getEventSummary({ id });
    return ok(res, 200, result);
  });

// GET /api/events/me/list
export const listMyEvents = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { page, limit, search } = req.query;
    const result = await eventService.listMyEvents({ userId, page, limit, search });
    return ok(res, 200, result);
  });

// PATCH /api/events/:id
export const updateEvent = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await eventService.updateEvent({ userId, id, body: req.body });
    return ok(res, 200, result);
  });

// DELETE /api/events/:id
export const deleteEvent = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await eventService.deleteEvent({ userId, id });
    return ok(res, 200, result);
  });

// PATCH /api/events/:id/image
export const updateEventImage = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { image } = req.body;
    const result = await eventService.updateEventImage({ userId, id, image });
    return ok(res, 200, result);
  });

// GET /api/events/detail/:id
export const getAllEventDetail = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await eventService.getAllEventDetail({ userId, id });
    return ok(res, 200, result);
  });

// GET /api/events/:eventId/ai-detail
// Trả về dữ liệu giàu cho AI: event + departments + members + epics + tasks + risks + calendars + milestones
export const getEventDetailForAI = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { eventId } = req.params;

    // 1) Lấy event cơ bản và kiểm tra quyền truy cập (giống getAllEventDetail)
    const event = await Event.findById(eventId)
      .select(
        'name type description eventStartDate eventEndDate location image status organizerName joinCode createdAt updatedAt'
      )
      .lean();

    if (!event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }

    // Lấy thông tin membership của user hiện tại (để phân quyền)
    let currentUserMembership = null;
    if (userId) {
      currentUserMembership = await EventMember.findOne({
        eventId,
        userId,
        status: { $ne: 'deactive' },
      })
        .populate('departmentId', 'name')
        .lean();
    }

    // Với event private, chỉ cho member xem
    if (event.type !== 'public') {
      if (!currentUserMembership) {
        const err = new Error(
          'Access denied. You are not a member of this event.'
        );
        err.status = 403;
        throw err;
      }
    }

    // Xác định role và quyền của user hiện tại
    const userRole = currentUserMembership?.role || null;
    const userDepartmentId = currentUserMembership?.departmentId?._id || null;

    // 2) Lấy danh sách phòng ban trong event
    const departments = await Department.find({ eventId })
      .select('_id name description leaderId createdAt updatedAt')
      .lean();

    // 3) Lấy danh sách member active + đếm số lượng theo phòng ban và role
    const members = await EventMember.find({
      eventId,
      status: 'active',
    })
      .select('userId departmentId role status')
      .populate('userId', 'name email')
      .populate('departmentId', 'name')
      .lean();

    const memberCountByDept = {};
    const memberCountByRole = { HoOC: 0, HoD: 0, Member: 0 };
    let totalMembers = 0;
    members.forEach((m) => {
      totalMembers += 1;
      const key = m.departmentId ? String(m.departmentId) : 'no_dept';
      memberCountByDept[key] = (memberCountByDept[key] || 0) + 1;
      if (m.role && memberCountByRole[m.role] !== undefined) {
        memberCountByRole[m.role] += 1;
      }
    });

    // 4) Lấy EPIC (taskType='epic') và TASK (taskType='normal')
    const epics = await Task.find({ eventId, taskType: 'epic' })
      .select('_id title description departmentId status')
      .populate('departmentId', 'name')
      .lean();

    const tasks = await Task.find({ eventId, taskType: 'normal' })
      .select(
        '_id title description parentId departmentId status priority startDate dueDate'
      )
      .lean();

    const tasksByEpic = {};
    tasks.forEach((t) => {
      const key = t.parentId ? String(t.parentId) : 'no_epic';
      if (!tasksByEpic[key]) tasksByEpic[key] = [];
      tasksByEpic[key].push({
        _id: t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        startDate: t.startDate,
        dueDate: t.dueDate,
      });
    });

    const epicsWithTasks = epics.map((e) => {
      const key = String(e._id);
      const list = tasksByEpic[key] || [];
      return {
        ...e,
        tasks: list,
        taskCount: list.length,
      };
    });

    // 5) Lấy danh sách members với thông tin chi tiết (role, department)
    // Lọc theo quyền: HoOC xem tất cả, HoD xem ban của mình, Member chỉ xem thông tin chung
    let membersDetail = [];
    if (userRole === 'HoOC') {
      // HoOC xem tất cả
      membersDetail = members.map((m) => ({
        _id: m._id,
        userId: m.userId?._id,
        userName: m.userId?.name,
        userEmail: m.userId?.email,
        role: m.role,
        departmentId: m.departmentId?._id,
        departmentName: m.departmentId?.name,
      }));
    } else if (userRole === 'HoD' && userDepartmentId) {
      // HoD chỉ xem ban của mình + thông tin chung (không có email của member khác ban)
      membersDetail = members
        .filter((m) => 
          !m.departmentId || 
          String(m.departmentId._id) === String(userDepartmentId) ||
          String(m.userId?._id) === String(userId)
        )
        .map((m) => {
          const isOwnDepartment = m.departmentId && String(m.departmentId._id) === String(userDepartmentId);
          const isSelf = String(m.userId?._id) === String(userId);
          return {
            _id: m._id,
            userId: m.userId?._id,
            userName: m.userId?.name,
            userEmail: (isOwnDepartment || isSelf) ? m.userId?.email : undefined, // Chỉ hiện email của ban mình hoặc chính mình
            role: m.role,
            departmentId: m.departmentId?._id,
            departmentName: m.departmentId?.name,
          };
        });
    } else {
      // Member chỉ xem thông tin chung (không có email, chỉ tên và role)
      membersDetail = members.map((m) => ({
        _id: m._id,
        userId: String(m.userId?._id) === String(userId) ? m.userId?._id : undefined, // Chỉ hiện ID của chính mình
        userName: m.userId?.name,
        userEmail: String(m.userId?._id) === String(userId) ? m.userId?.email : undefined, // Chỉ hiện email của chính mình
        role: m.role,
        departmentId: m.departmentId?._id,
        departmentName: m.departmentId?.name,
      }));
    }

    // 6) Lấy danh sách risks (rủi ro) của sự kiện - lọc theo quyền
    let riskQuery = { eventId };
    if (userRole === 'HoD' && userDepartmentId) {
      // HoD chỉ xem risks của ban mình hoặc risks chung (scope = 'event')
      riskQuery = {
        eventId,
        $or: [
          { scope: 'event' },
          { departmentId: userDepartmentId },
        ],
      };
    } else if (userRole === 'Member') {
      // Member chỉ xem risks chung (scope = 'event')
      riskQuery = {
        eventId,
        scope: 'event',
      };
    }
    // HoOC xem tất cả (không filter)
    
    const risks = await Risk.find(riskQuery)
      .select('_id name risk_category impact likelihood risk_status scope departmentId risk_mitigation_plan risk_response_plan occurred_risk')
      .populate('departmentId', 'name')
      .lean();

    // 7) Lấy danh sách calendar events (lịch) sắp tới - lọc theo quyền
    const now = new Date();
    let calendarQuery = {
      eventId,
      startAt: { $gte: now },
    };
    if (userRole === 'HoD' && userDepartmentId) {
      // HoD chỉ xem lịch của ban mình hoặc lịch chung (type = 'event')
      calendarQuery = {
        eventId,
        startAt: { $gte: now },
        $or: [
          { type: 'event' },
          { departmentId: userDepartmentId },
        ],
      };
    } else if (userRole === 'Member') {
      // Member chỉ xem lịch chung (type = 'event')
      calendarQuery = {
        eventId,
        startAt: { $gte: now },
        type: 'event',
      };
    }
    // HoOC xem tất cả (không filter)
    
    const upcomingCalendars = await Calendar.find(calendarQuery)
      .select('_id name type startAt endAt locationType location notes departmentId')
      .populate('departmentId', 'name')
      .sort({ startAt: 1 })
      .limit(20) // Giới hạn 20 sự kiện sắp tới
      .lean();

    // 8) Lấy danh sách milestones (cột mốc) của sự kiện
    const milestones = await Milestone.find({
      eventId,
      isDeleted: false,
    })
      .select('_id name description targetDate')
      .sort({ targetDate: 1 })
      .lean();

    return ok(res, 200, {
      data: {
        event,
        // Thông tin user hiện tại để AI biết role và trả lời phù hợp
        currentUser: currentUserMembership ? {
          role: userRole,
          departmentId: userDepartmentId,
          departmentName: currentUserMembership.departmentId?.name,
          eventName: event.name,
        } : null,
        departments: departments.map((d) => ({
          _id: d._id,
          name: d.name,
          description: d.description,
          leaderId: d.leaderId,
          memberCount: memberCountByDept[String(d._id)] || 0,
        })),
        members: {
          total: totalMembers,
          byDepartment: memberCountByDept,
          byRole: memberCountByRole,
          detail: membersDetail, // Danh sách chi tiết từng member với role và department (đã lọc theo quyền)
        },
        epics: epicsWithTasks,
        risks: risks.map((r) => ({
          _id: r._id,
          name: r.name,
          risk_category: r.risk_category,
          impact: r.impact,
          likelihood: r.likelihood,
          risk_status: r.risk_status,
          scope: r.scope,
          departmentId: r.departmentId?._id,
          departmentName: r.departmentId?.name,
          risk_mitigation_plan: r.risk_mitigation_plan,
          risk_response_plan: r.risk_response_plan,
          has_occurred: r.occurred_risk && r.occurred_risk.length > 0,
        })),
        calendars: upcomingCalendars.map((c) => ({
          _id: c._id,
          name: c.name,
          type: c.type,
          startAt: c.startAt,
          endAt: c.endAt,
          locationType: c.locationType,
          location: c.location,
          notes: c.notes,
          departmentId: c.departmentId?._id,
          departmentName: c.departmentId?.name,
        })),
        milestones: milestones.map((m) => ({
          _id: m._id,
          name: m.name,
          description: m.description,
          targetDate: m.targetDate,
        })),
        summary: {
          totalDepartments: departments.length,
          totalMembers,
          totalEpics: epics.length,
          totalTasks: tasks.length,
          totalRisks: risks.length,
          upcomingCalendarsCount: upcomingCalendars.length,
          totalMilestones: milestones.length,
        },
      },
    });
  });