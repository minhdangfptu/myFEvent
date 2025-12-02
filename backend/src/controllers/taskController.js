// controllers/taskController.js
import mongoose from 'mongoose';
import ensureEventRole from '../utils/ensureEventRole.js';
import {
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyMajorTaskStatus,
} from '../services/notificationService.js';

import {
  listTasksByEventOrDepartmentService,
  getTaskDetailService,
  getTaskByDepartmentService,
  createTaskService,
  editTaskService,
  deleteTaskService,
  updateTaskProgressService,
  assignTaskService,
  unassignTaskService,
  getEventTaskProgressChartService,
  getEpicTasksForExportService,
  getTaskStatisticsByMilestoneService,
  getBurnupChartDataService,
  getDepartmentBurnupTasksService,
} from '../services/taskService.js';

/**
 * Helper xử lý error từ service
 */
const handleServiceError = (res, err, defaultMessage, defaultStatus = 500) => {
  const status = err?.statusCode || defaultStatus;
  const body = {
    message: status === 500 ? defaultMessage : err.message,
  };
  if (err.errors && status !== 500) {
    body.errors = err.errors;
  }
  if (status === 500) {
    console.error(err);
  }
  return res.status(status).json(body);
};

// GET /api/tasks/:eventId?departmentId=... (HoOC/HoD/Mem)
export const listTasksByEventOrDepartment = async (req, res) => {
  try {
    const { eventId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
    if (!member) {
      return res.status(403).json({ message: 'Không có quyền xem task' });
    }

    const tasks = await listTasksByEventOrDepartmentService({
      eventId,
      query: req.query,
    });

    return res.status(200).json({ data: tasks });
  } catch (err) {
    return handleServiceError(res, err, 'Lỗi lấy danh sách task');
  }
};

// GET /api/tasks/:eventId/:taskId (HoOC/HoD/Mem)
export const getTaskDetail = async (req, res) => {
  try {
    const { eventId, taskId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
    if (!member) {
      return res.status(403).json({ message: 'Không có quyền xem chi tiết task' });
    }

    const task = await getTaskDetailService({ eventId, taskId });
    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    return res.status(200).json({ data: task });
  } catch (err) {
    return handleServiceError(res, err, 'Lỗi lấy chi tiết task');
  }
};

// GET /api/tasks/:eventId/:taskId/department/:departmentId (HoOC/HoD/Mem)
export const getTaskByDepartment = async (req, res) => {
  try {
    const { eventId, taskId, departmentId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
    if (!member) {
      return res.status(403).json({ message: 'Không có quyền xem chi tiết task' });
    }

    const { departmentExists, task } = await getTaskByDepartmentService({
      eventId,
      taskId,
      departmentId,
    });

    if (!departmentExists) {
      return res
        .status(404)
        .json({ message: 'Ban không tồn tại trong sự kiện này' });
    }

    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    return res.status(200).json({ data: task });
  } catch (err) {
    return handleServiceError(res, err, 'Lỗi lấy chi tiết task của ban');
  }
};

// POST /api/task/:eventId/tasks (HoOC/HoD)
export const createTask = async (req, res) => {
  try {
    const { eventId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res
        .status(403)
        .json({ message: 'Chỉ HoOC hoặc HoD được tạo task.' });
    }

    const { task, notifyAssignee, assigneeId } = await createTaskService({
      eventId,
      userId: req.user.id,
      member,
      body: req.body,
    });

    if (notifyAssignee && assigneeId) {
      try {
        await notifyTaskAssigned(eventId, task._id, assigneeId);
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr);
      }
    }

    return res.status(201).json({ data: task });
  } catch (err) {
    return handleServiceError(res, err, 'Tạo task thất bại');
  }
};

// PATCH /api/task/:eventId/edit-task/:taskId (HoOC/HoD)
export const editTask = async (req, res) => {
  try {
    const { eventId, taskId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res
        .status(403)
        .json({ message: 'Chỉ HoOC hoặc HoD được sửa task.' });
    }

    const { task } = await editTaskService({
      eventId,
      taskId,
      userId: req.user.id,
      member,
      body: req.body,
    });

    return res.status(200).json({ data: task });
  } catch (err) {
    return handleServiceError(res, err, 'Sửa task thất bại');
  }
};

// DELETE /api/task/:eventId/:taskId (HoOC/HoD)
export const deleteTask = async (req, res) => {
  try {
    const { eventId, taskId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res
        .status(403)
        .json({ message: 'Chỉ HoOC hoặc HoD được xoá task.' });
    }

    await deleteTaskService({
      eventId,
      taskId,
      userId: req.user.id,
      member,
    });

    return res.status(200).json({ message: 'Đã xoá task thành công.' });
  } catch (err) {
    if (err?.statusCode === 409 && err.meta) {
      return res.status(409).json({
        message: err.message,
        meta: err.meta,
      });
    }
    return handleServiceError(res, err, 'Xoá task thất bại');
  }
};

// PATCH /api/task/:eventId/:taskId/progress (HoOC/HoD/Member)
export const updateTaskProgress = async (req, res) => {
  try {
    const { eventId, taskId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, [
      'HoOC',
      'HoD',
      'Member',
    ]);
    if (!member) {
      return res
        .status(403)
        .json({ message: 'Không có quyền cập nhật tiến độ.' });
    }

    const { task, justDone, isMajorTaskWithoutParent } =
      await updateTaskProgressService({
        eventId,
        taskId,
        userId: req.user.id,
        body: req.body,
      });

    if (justDone) {
      try {
        await notifyTaskCompleted(eventId, taskId);
        if (isMajorTaskWithoutParent) {
          await notifyMajorTaskStatus(eventId, taskId, true);
        }
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr);
      }
    }

    return res
      .status(200)
      .json({ message: 'Update Task progress successfully', data: task });
  } catch (err) {
    return handleServiceError(res, err, 'Cập nhật progress thất bại');
  }
};

// PATCH /api/task/:eventId/:taskId/assign (HoOC/HoD)
export const assignTask = async (req, res) => {
  try {
    const { eventId, taskId } = req.params;
    const { assigneeId } = req.body || {};

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res
        .status(403)
        .json({ message: 'Chỉ HoOC hoặc HoD được gán task.' });
    }

    const { task, notifyAssignee } = await assignTaskService({
      eventId,
      taskId,
      assigneeId,
    });

    if (notifyAssignee && assigneeId) {
      try {
        await notifyTaskAssigned(eventId, taskId, assigneeId);
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr);
      }
    }

    return res.status(200).json({ data: task });
  } catch (err) {
    return handleServiceError(res, err, 'Gán task thất bại');
  }
};

// PATCH /api/task/:eventId/:taskId/unassign (HoOC/HoD)
export const unassignTask = async (req, res) => {
  try {
    const { eventId, taskId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res
        .status(403)
        .json({ message: 'Chỉ HoOC hoặc HoD được huỷ gán task.' });
    }

    const { task } = await unassignTaskService({ eventId, taskId });

    return res.status(200).json({ data: task });
  } catch (err) {
    return handleServiceError(res, err, 'Huỷ gán task thất bại');
  }
};

// GET /api/task/:eventId/progress (HoOC/HoD)
export const getEventTaskProgressChart = async (req, res) => {
  try {
    const { eventId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được xem chart.' });
    }

    const stats = await getEventTaskProgressChartService({ eventId });

    return res.status(200).json({ data: stats });
  } catch (err) {
    return handleServiceError(res, err, 'Lỗi lấy chart tiến độ');
  }
};

// GET /api/tasks/:eventId/statistics/:milestoneId? (HoOC/HoD)
export const getTaskStatisticsByMilestone = async (req, res) => {
  try {
    const { eventId, milestoneId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được xem thống kê.' });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'eventId không hợp lệ' });
    }

    if (milestoneId && !mongoose.Types.ObjectId.isValid(milestoneId)) {
      return res.status(400).json({ message: 'milestoneId không hợp lệ' });
    }

    const result = await getTaskStatisticsByMilestoneService({
      eventId,
      milestoneId,
    });

    if (result.notFound) {
      return res
        .status(404)
        .json({ message: 'Milestone không tồn tại trong event này.' });
    }

    return res.status(200).json({
      data: {
        summary: result.summary,
        milestone: result.milestone,
        departmentProgress: result.departmentProgress,
      },
    });
  } catch (err) {
    return handleServiceError(res, err, 'Lỗi lấy thống kê task');
  }
};

// GET /api/tasks/burnup/:eventId/:milestoneId (HoOC/HoD)
export const getBurnupChartData = async (req, res) => {
  try {
    const { eventId, milestoneId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được xem chart.' });
    }

    const result = await getBurnupChartDataService({ eventId, milestoneId });

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found',
      });
    }

    return res.json({
      success: true,
      data: {
        milestone: result.milestone,
        burnupData: result.burnupData,
        currentStats: result.currentStats,
        departmentStats: result.departmentStats,
        debug: result.debug,
      },
    });
  } catch (error) {
    return handleServiceError(res, error, 'Server error');
  }
};

// GET /api/tasks/department-burnup/:eventId/:milestoneId/:departmentId (HoOC/HoD)
export const getDepartmentBurnupTasks = async (req, res) => {
  try {
    const { eventId, milestoneId, departmentId } = req.params;

    const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
    if (!member) {
      return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được xem chart.' });
    }

    const data = await getDepartmentBurnupTasksService({
      eventId,
      milestoneId,
      departmentId,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleServiceError(res, error, 'Server error');
  }
};

/**
 * Hàm tiện ích cho export Excel, giữ signature cũ,
 * giờ chỉ gọi service.
 */
export const getEpicTasksForExport = async (eventId) => {
  return getEpicTasksForExportService(eventId);
};
