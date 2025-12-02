/* eslint-disable no-unused-vars */
// services/taskService.js
import mongoose from 'mongoose';
import Task from '../models/task.js';
import EventMember from '../models/eventMember.js';
import Department from '../models/department.js';
import Milestone from '../models/milestone.js';
import Event from '../models/event.js';
import recalcParentsUpward from '../utils/recalcParentTask.js';

export const TASK_TYPES = {
  EPIC: 'epic',
  NORMAL: 'normal',
};

export const TASK_STATUSES = {
  NOT_STARTED: 'chua_bat_dau',
  IN_PROGRESS: 'da_bat_dau',
  DONE: 'hoan_thanh',
  CANCELLED: 'huy',
};

export const STATUS_TRANSITIONS = {
  [TASK_STATUSES.NOT_STARTED]: [TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.CANCELLED],
  [TASK_STATUSES.IN_PROGRESS]: [TASK_STATUSES.DONE, TASK_STATUSES.CANCELLED],
  [TASK_STATUSES.DONE]: [TASK_STATUSES.IN_PROGRESS],
  [TASK_STATUSES.CANCELLED]: [TASK_STATUSES.IN_PROGRESS],
};

const isEpicTask = (task) => task?.taskType === TASK_TYPES.EPIC;
const isNormalTask = (task) => task?.taskType === TASK_TYPES.NORMAL;

// Helper tạo error có statusCode / errors
const makeError = (message, statusCode = 400, extra = {}) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
};

/**
 * 1. Lấy danh sách task theo event/department + filter
 */
export const listTasksByEventOrDepartmentService = async ({ eventId, query }) => {
  const { departmentId, search, status, taskType } = query || {};

  const filter = { eventId };
  if (departmentId) filter.departmentId = departmentId;
  if (search) filter.title = { $regex: search, $options: 'i' };
  if (status) filter.status = status;
  if (taskType && Object.values(TASK_TYPES).includes(taskType)) {
    filter.taskType = taskType;
  }

  const tasks = await Task.find(filter)
    .sort({ createdAt: -1 })
    .populate([
      {
        path: 'assigneeId',
        select: 'userId',
        populate: [{ path: 'userId', model: 'User', select: 'fullName' }],
      },
      { path: 'departmentId', select: 'name' },
      { path: 'createdBy', model: 'User', select: 'fullName' },
    ])
    .lean();

  return tasks;
};

/**
 * 2. Lấy chi tiết task
 */
export const getTaskDetailService = async ({ eventId, taskId }) => {
  const task = await Task.findOne({ _id: taskId, eventId })
    .populate([
      {
        path: 'assigneeId',
        select: 'userId role departmentId',
        populate: [
          { path: 'userId', model: 'User', select: 'fullName email' },
          { path: 'departmentId', model: 'Department', select: 'name' },
        ],
      },
      { path: 'departmentId', select: 'name' },
      { path: 'milestoneId', select: 'name' },
    ])
    .lean();

  return task;
};

/**
 * 3. Lấy chi tiết task theo ban
 */
export const getTaskByDepartmentService = async ({ eventId, taskId, departmentId }) => {
  const deptExists = await Department.exists({ _id: departmentId, eventId });
  if (!deptExists) {
    return { departmentExists: false, task: null };
  }

  const task = await Task.findOne({ _id: taskId, eventId, departmentId })
    .populate([
      {
        path: 'assigneeId',
        select: 'userId role departmentId',
        populate: [
          { path: 'userId', model: 'User', select: 'fullName email' },
          { path: 'departmentId', model: 'Department', select: 'name' },
        ],
      },
      { path: 'departmentId', select: 'name' },
      { path: 'milestoneId', select: 'name' },
    ])
    .lean();

  return { departmentExists: true, task };
};

/**
 * 4. Tạo task (Epic / thường)
 */
export const createTaskService = async ({ eventId, userId, member, body }) => {
  const {
    title,
    description,
    departmentId,
    assigneeId,
    startDate,
    dueDate,
    estimate,
    estimateUnit,
    milestoneId,
    parentId,
    dependencies = [],
    suggestedTeamSize,
    taskType = TASK_TYPES.NORMAL,
  } = body || {};

  if (!departmentId) {
    throw makeError('Thiếu departmentId', 400);
  }

  const errors = [];
  const normalizedTaskType = Object.values(TASK_TYPES).includes(taskType)
    ? taskType
    : TASK_TYPES.NORMAL;
  const isEpic = normalizedTaskType === TASK_TYPES.EPIC;
  const isNormal = normalizedTaskType === TASK_TYPES.NORMAL;

  // Role-based
  if (isEpic && member?.role !== 'HoOC') {
    throw makeError('Chỉ HoOC được tạo Epic task.', 403);
  }
  if (isNormal && !['HoOC', 'HoD'].includes(member?.role)) {
    throw makeError('Chỉ HoOC hoặc HoD được tạo công việc thường.', 403);
  }

  // Không cho parent nằm trong dependencies
  const dependencyIds = Array.isArray(dependencies) ? dependencies.map(String) : [];
  if (parentId && dependencyIds.includes(String(parentId))) {
    errors.push('parentId không được xuất hiện trong dependencies');
  }

  if (isEpic) {
    if (assigneeId) errors.push('Epic task không thể gán trực tiếp cho cá nhân');
    if (parentId) errors.push('Epic task không thể thuộc một epic khác');
  } else {
    if (!parentId) errors.push('Task thường bắt buộc phải thuộc một Epic task');
  }

  // Lấy thông tin sự kiện để kiểm tra validate thời gian
  const event = await Event.findById(eventId).select('createdAt').lean();

  if (startDate && event?.createdAt) {
    const taskStartDate = new Date(startDate);
    const createdAt = new Date(event.createdAt);
    if (taskStartDate < createdAt) {
      errors.push(
        `Thời gian bắt đầu phải sau hoặc bằng thời gian tạo sự kiện (${createdAt.toLocaleString(
          'vi-VN'
        )})`
      );
    }
  }

  if (dueDate && event?.createdAt) {
    const taskDueDate = new Date(dueDate);
    const createdAt = new Date(event.createdAt);
    if (taskDueDate < createdAt) {
      errors.push(
        `Deadline phải sau hoặc bằng thời gian tạo sự kiện (${createdAt.toLocaleString('vi-VN')})`
      );
    }
  }

  if (startDate && dueDate) {
    const taskStartDate = new Date(startDate);
    const taskDueDate = new Date(dueDate);
    if (taskStartDate >= taskDueDate) {
      errors.push('Thời gian bắt đầu phải trước deadline');
    }
  }

  // Kiểm tra tồn tại & cùng event
  const [departmentDoc, assigneeDoc, milestoneOk, parentDoc, depFound] =
    await Promise.all([
      Department.findOne({ _id: departmentId, eventId }).lean(),
      assigneeId
        ? EventMember.findOne({
            _id: assigneeId,
            eventId,
            status: { $ne: 'deactive' },
          })
            .select('departmentId')
            .lean()
        : null,
      milestoneId ? Milestone.exists({ _id: milestoneId, eventId }) : Promise.resolve(true),
      parentId ? Task.findOne({ _id: parentId, eventId }).lean() : null,
      dependencyIds.length
        ? Task.find({ _id: { $in: dependencyIds }, eventId })
            .select('_id taskType')
            .lean()
        : Promise.resolve([]),
    ]);

  if (!departmentDoc) errors.push('departmentId không tồn tại trong event này');
  if (assigneeId && !assigneeDoc) errors.push('assigneeId không tồn tại trong event này');
  if (!milestoneOk) errors.push('milestoneId không tồn tại trong event này');
  if (parentId && !parentDoc) errors.push('parentId không tồn tại trong event này');

  if (assigneeDoc && assigneeDoc.departmentId) {
    if (String(assigneeDoc.departmentId?._id || assigneeDoc.departmentId) !== String(departmentId)) {
      errors.push('Người được giao phải thuộc cùng ban với công việc');
    }
  }

  if (parentDoc) {
    if (!isEpicTask(parentDoc)) {
      errors.push('parentId phải là một Epic task');
    }
    if (String(parentDoc.departmentId) !== String(departmentId)) {
      errors.push('Công việc lớn và và công việc phải thuộc cùng ban');
    }
  }

  if (Array.isArray(depFound)) {
    const foundIds = new Set(depFound.map((d) => String(d._id)));
    const missing = dependencyIds.filter((id) => !foundIds.has(String(id)));
    if (missing.length) {
      errors.push(`dependencies không hợp lệ hoặc không thuộc event: ${missing.join(', ')}`);
    }
  }

  if (errors.length) {
    throw makeError('Dữ liệu không hợp lệ', 400, { errors });
  }

  const task = await Task.create({
    title,
    description,
    eventId,
    departmentId,
    taskType: normalizedTaskType,
    assigneeId: isEpic ? undefined : assigneeId || undefined,
    startDate: startDate || undefined,
    dueDate,
    estimate,
    estimateUnit,
    milestoneId: milestoneId || undefined,
    parentId: isEpic ? undefined : parentId || undefined,
    dependencies: dependencyIds,
    suggestedTeamSize: suggestedTeamSize || undefined,
    createdBy: userId,
  });

  if (isNormal && parentId) {
    await recalcParentsUpward(parentId, eventId);
  }

  return {
    task,
    notifyAssignee: !isEpic && !!assigneeId,
    assigneeId: assigneeId || null,
  };
};

/**
 * 5. Sửa task
 */
export const editTaskService = async ({ eventId, taskId, userId, member, body }) => {
  const currentTask = await Task.findOne({ _id: taskId, eventId });
  if (!currentTask) {
    throw makeError('Task không tồn tại', 404);
  }

  const isEpic = isEpicTask(currentTask);
  const isNormal = isNormalTask(currentTask);
  const isTaskCreator = currentTask.createdBy && String(currentTask.createdBy) === String(userId);

  // Không cho phép chỉnh sửa task đang ở trạng thái "đang làm"
  if (currentTask.status === TASK_STATUSES.IN_PROGRESS) {
    throw makeError('Không thể chỉnh sửa task khi đang ở trạng thái "Đang làm".', 403);
  }

  if (isEpic && member?.role !== 'HoOC') {
    throw makeError('Chỉ HoOC có quyền chỉnh sửa Epic task.', 403);
  }
  if (isNormal && !['HoOC', 'HoD'].includes(member?.role)) {
    throw makeError('Chỉ HoOC hoặc HoD có quyền chỉnh sửa task thường.', 403);
  }

  const update = { ...(body || {}) };
  if (!Object.keys(update).length) {
    throw makeError('Chưa có thông tin cập nhật', 400);
  }

  const errors = [];

  // Không cho chỉnh sửa các trường nhạy cảm
  delete update.taskType;
  delete update.status;
  delete update.progressPct;
  delete update.createdBy;
  if (isEpic) {
    delete update.assigneeId;
    delete update.parentId;
    delete update.dependencies;
  }

  if (isNormal && update.departmentId && String(update.departmentId) !== String(currentTask.departmentId)) {
    errors.push('Không thể chuyển task thường sang ban khác');
  }

  const deps = Array.isArray(update.dependencies) ? update.dependencies.map(String) : [];
  const targetDepartmentId = update.departmentId || currentTask.departmentId;
  const targetParentId = update.parentId || currentTask.parentId;

  if (isNormal && !targetParentId) {
    errors.push('Task thường phải thuộc một Epic task');
  }

  if (update.parentId && deps.includes(String(update.parentId))) {
    errors.push('parentId không được xuất hiện trong dependencies');
  }

  // Lấy thông tin sự kiện để kiểm tra khoảng thời gian
  const event = await Event.findById(eventId).select('eventStartDate eventEndDate createdAt').lean();

  // Validation startDate
  if (update.startDate) {
    const taskStartDate = new Date(update.startDate);
    const now = new Date();

    // Chỉ validate thời gian phải sau hiện tại nếu thời gian đã thay đổi
    const isStartDateChanged = !currentTask.startDate ||
      new Date(currentTask.startDate).getTime() !== taskStartDate.getTime();

    if (isStartDateChanged && taskStartDate <= now) {
      errors.push('Thời gian bắt đầu phải sau thời điểm hiện tại');
    }

    if (event) {
      if (event.createdAt) {
        const eventCreated = new Date(event.createdAt);
        if (taskStartDate < eventCreated) {
          errors.push(
            `Thời gian bắt đầu phải sau hoặc bằng thời gian tạo sự kiện (${eventCreated.toLocaleString(
              'vi-VN'
            )})`
          );
        }
      }
    }
  }

  // Validation dueDate
  if (update.dueDate) {
    const taskDueDate = new Date(update.dueDate);
    const now = new Date();

    // Chỉ validate thời gian phải sau hiện tại nếu thời gian đã thay đổi
    const isDueDateChanged = !currentTask.dueDate ||
      new Date(currentTask.dueDate).getTime() !== taskDueDate.getTime();

    if (isDueDateChanged && taskDueDate <= now) {
      errors.push('Deadline phải sau thời điểm hiện tại');
    }

    if (event) {
      if (event.createdAt) {
        const eventCreated = new Date(event.createdAt);
        if (taskDueDate < eventCreated) {
          errors.push(
            `Deadline phải sau hoặc bằng thời gian tạo sự kiện (${eventCreated.toLocaleString(
              'vi-VN'
            )})`
          );
        }
      }
    }
  }

  // Kiểm tra startDate < dueDate
  const taskForValidation = update.startDate || update.dueDate ? currentTask : null;
  const finalStartDate = update.startDate
    ? new Date(update.startDate)
    : taskForValidation?.startDate
    ? new Date(taskForValidation.startDate)
    : null;
  const finalDueDate = update.dueDate
    ? new Date(update.dueDate)
    : taskForValidation?.dueDate
    ? new Date(taskForValidation.dueDate)
    : null;

  if (finalStartDate && finalDueDate && finalStartDate >= finalDueDate) {
    errors.push('Thời gian bắt đầu phải trước deadline');
  }

  const [deptDoc, assigneeDoc, milestoneOk, parentDoc, depFound] = await Promise.all([
    update.departmentId ? Department.findOne({ _id: update.departmentId, eventId }).lean() : null,
    update.assigneeId
      ? EventMember.findOne({
          _id: update.assigneeId,
          eventId,
          status: { $ne: 'deactive' },
        })
          .select('departmentId')
          .lean()
      : null,
    update.milestoneId ? Milestone.exists({ _id: update.milestoneId, eventId }) : Promise.resolve(true),
    update.parentId ? Task.findOne({ _id: update.parentId, eventId }).lean() : null,
    deps.length
      ? Task.find({ _id: { $in: deps }, eventId })
          .select('_id taskType')
          .lean()
      : Promise.resolve([]),
  ]);

  if (update.departmentId && !deptDoc) errors.push('departmentId không tồn tại trong event này');
  if (update.assigneeId && !assigneeDoc) errors.push('assigneeId không tồn tại trong event này');
  if (!milestoneOk) errors.push('milestoneId không tồn tại trong event này');
  if (update.parentId && !parentDoc) errors.push('parentId không tồn tại trong event này');

  if (assigneeDoc && targetDepartmentId) {
    if (String(assigneeDoc.departmentId) !== String(targetDepartmentId)) {
      errors.push('Người được giao phải thuộc cùng ban với công việc');
    }
  }

  let effectiveParentDoc = parentDoc;
  if (!effectiveParentDoc && targetParentId && !update.parentId && currentTask.parentId) {
    effectiveParentDoc = await Task.findOne({ _id: currentTask.parentId, eventId }).lean();
  }

  if (isNormal) {
    if (!effectiveParentDoc) {
      errors.push('parentId không tồn tại trong event này');
    } else {
      if (!isEpicTask(effectiveParentDoc)) {
        errors.push('parentId phải là một Epic task');
      }
      if (String(effectiveParentDoc.departmentId) !== String(targetDepartmentId)) {
        errors.push('Epic task và task con phải thuộc cùng ban');
      }
    }
  }

  if (Array.isArray(depFound)) {
    const foundIds = new Set(depFound.map((d) => String(d._id)));
    const missing = deps.filter((id) => !foundIds.has(String(id)));
    if (missing.length) {
      errors.push(`dependencies không hợp lệ hoặc không thuộc event: ${missing.join(', ')}`);
    }
    if (deps.includes(String(taskId))) {
      errors.push('Task không thể phụ thuộc vào chính nó');
    }
  }

  if (errors.length) {
    throw makeError('Tham chiếu không hợp lệ', 400, { errors });
  }

  const result = await Task.findOneAndUpdate(
    { _id: taskId, eventId },
    { $set: { ...update, updatedAt: new Date() } },
    { new: true }
  );

  if (!result) {
    throw makeError('Task không tồn tại', 404);
  }

  return { task: result };
};

/**
 * 6. Xoá task
 */
export const deleteTaskService = async ({ eventId, taskId, userId, member }) => {
  const task = await Task.findOne({ _id: taskId, eventId });
  if (!task) {
    throw makeError('Task không tồn tại', 404);
  }

  const isEpic = isEpicTask(task);
  const isNormal = isNormalTask(task);
  const isTaskCreator = task.createdBy && String(task.createdBy) === String(userId);

  // Không cho phép xóa task đang ở trạng thái "đang làm"
  if (task.status === TASK_STATUSES.IN_PROGRESS) {
    throw makeError('Không thể xóa task khi đang ở trạng thái "Đang làm".', 403);
  }

  if (isEpic && member?.role !== 'HoOC') {
    throw makeError('Chỉ HoOC được xóa Epic task.', 403);
  }

  // Normal task: HoOC, HoD hoặc người tạo task được xóa
  if (isNormal && !['HoOC', 'HoD'].includes(member?.role) && !isTaskCreator) {
    throw makeError('Chỉ HoOC, HoD hoặc người tạo task được xóa task thường.', 403);
  }

  const [dependents, children] = await Promise.all([
    Task.countDocuments({ eventId, dependencies: task._id }),
    Task.countDocuments({ eventId, parentId: task._id }),
  ]);

  if (dependents || children) {
    throw makeError('Không thể xóa vì công việc lớn đang có công việc', 409, {
      meta: { dependents, children },
    });
  }

  await Task.findOneAndDelete({ _id: taskId, eventId });

  if (task.parentId) {
    await recalcParentsUpward(task.parentId, eventId);
  }

  return { deleted: true };
};

/**
 * 7. Cập nhật progress task
 */
export const updateTaskProgressService = async ({ eventId, taskId, userId, body }) => {
  const { status, progressPct } = body || {};
  const ALLOWED = Object.values(TASK_STATUSES);

  const task = await Task.findOne({ _id: taskId, eventId });
  if (!task) {
    throw makeError('Task không tồn tại', 404);
  }

  const isEpic = isEpicTask(task);
  if (isEpic) {
    throw makeError(
      'Epic task tự động cập nhật trạng thái dựa trên task con, không thể chỉnh thủ công.',
      403
    );
  }

  if (!task.assigneeId) {
    throw makeError('Task chưa được giao cho thành viên nên không thể cập nhật trạng thái.', 403);
  }

  const memberships = await EventMember.find({ userId, eventId });
  const isAssignee = memberships.some((m) => String(m._id) === String(task.assigneeId));
  if (!isAssignee) {
    throw makeError('Chỉ người được giao công việc mới được cập nhật trạng thái công việc đó', 403);
  }

  if (status && !ALLOWED.includes(status)) {
    throw makeError('Trạng thái không hợp lệ.', 400);
  }

  if (typeof progressPct !== 'undefined') {
    const pct = Number(progressPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw makeError('progressPct phải trong khoảng 0..100.', 400);
    }
    task.progressPct = pct;
  }

  let depsNotDone = 0;
  if (status && (status === TASK_STATUSES.IN_PROGRESS || status === TASK_STATUSES.DONE)) {
    const deps = task.dependencies || [];
    if (deps.length) {
      depsNotDone = await Task.countDocuments({
        _id: { $in: deps },
        eventId,
        status: { $ne: TASK_STATUSES.DONE },
      });
    }
  }

  const isStarting =
    status === TASK_STATUSES.IN_PROGRESS && task.status === TASK_STATUSES.NOT_STARTED;
  const isFinishing = status === TASK_STATUSES.DONE;

  if ((isStarting || isFinishing) && depsNotDone > 0) {
    throw makeError('Chưa thể thực hiện: còn task phụ thuộc chưa hoàn thành.', 409);
  }

  if (status && !STATUS_TRANSITIONS[task.status]?.includes(status)) {
    throw makeError(
      `Không thể chuyển từ ${task.status} → ${status} với vai trò hiện tại.`,
      409
    );
  }

  if (status) {
    task.status = status;
    if (status === TASK_STATUSES.DONE && typeof progressPct === 'undefined') {
      task.progressPct = 100;
    }
    if (status === TASK_STATUSES.CANCELLED && typeof progressPct === 'undefined') {
      task.progressPct = 0;
    }
  }

  await task.save();

  if (task.parentId) {
    await recalcParentsUpward(task.parentId, eventId);
  }

  const justDone = status === TASK_STATUSES.DONE;
  const isMajorTaskWithoutParent = !task.parentId;

  return { task, justDone, isMajorTaskWithoutParent };
};

/**
 * 8. Gán task
 */
export const assignTaskService = async ({ eventId, taskId, assigneeId }) => {
  if (!assigneeId) {
    throw makeError('Thiếu thông tin người assign', 400);
  }

  const assigneeDoc = await EventMember.findOne({
    _id: assigneeId,
    eventId,
    status: { $ne: 'deactive' },
  })
    .select('departmentId')
    .lean();

  if (!assigneeDoc) {
    throw makeError('Người được gán không tồn tại trong sự kiện này', 404);
  }

  const task = await Task.findOne({ _id: taskId, eventId });
  if (!task) {
    throw makeError('Task không tồn tại', 404);
  }

  if (isEpicTask(task)) {
    throw makeError('Không thể gán Epic task cho thành viên.', 400);
  }

  if (assigneeDoc.departmentId && task.departmentId) {
    if (String(assigneeDoc.departmentId) !== String(task.departmentId)) {
      throw makeError('Người được gán phải thuộc cùng ban với task.', 403);
    }
  }

  task.assigneeId = assigneeId;
  await task.save();

  return { task, notifyAssignee: true, assigneeId };
};

/**
 * 9. Hủy gán task
 */
export const unassignTaskService = async ({ eventId, taskId }) => {
  const task = await Task.findOne({ _id: taskId, eventId });
  if (!task) {
    throw makeError('Task không tồn tại', 404);
  }
  if (isEpicTask(task)) {
    throw makeError('Epic task không có assignee để huỷ.', 400);
  }
  if (!task.parentId && !task.assigneeId) {
    throw makeError(
      'Task parent (giao cho ban) vốn không có assignee. Không thể huỷ gán.',
      400
    );
  }
  if (!task.assigneeId) {
    return { task };
  }

  task.assigneeId = null;
  await task.save();

  return { task };
};

/**
 * 10. Thống kê tiến độ event (status → count)
 */
export const getEventTaskProgressChartService = async ({ eventId }) => {
  const match = {};

  if (mongoose.Types.ObjectId.isValid(eventId)) {
    match.eventId = new mongoose.Types.ObjectId(eventId);
  } else {
    match.eventId = eventId;
  }

  const stats = await Task.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return stats;
};

/**
 * 11. Lấy epic/major tasks để export Excel
 */
export const getEpicTasksForExportService = async (eventId) => {
  try {
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return [];
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    const totalTasks = await Task.countDocuments({ eventId: eventObjectId });

    let [epicTasks, subTaskCounts] = await Promise.all([
      Task.find({ eventId: eventObjectId, taskType: TASK_TYPES.EPIC })
        .populate('departmentId', 'name')
        .populate('milestoneId', 'name')
        .sort({ startDate: 1, title: 1 })
        .lean(),
      Task.aggregate([
        {
          $match: {
            eventId: eventObjectId,
            parentId: { $ne: null },
            taskType: { $ne: TASK_TYPES.EPIC },
          },
        },
        {
          $group: {
            _id: '$parentId',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    if (epicTasks.length === 0 && totalTasks > 0) {
      const [majorTasks, majorSubCounts] = await Promise.all([
        Task.find({ eventId: eventObjectId, parentId: null })
          .populate('departmentId', 'name')
          .populate('milestoneId', 'name')
          .sort({ startDate: 1, title: 1 })
          .lean(),
        Task.aggregate([
          {
            $match: {
              eventId: eventObjectId,
              parentId: { $ne: null },
            },
          },
          {
            $group: {
              _id: '$parentId',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      epicTasks = majorTasks;
      subTaskCounts = majorSubCounts;
    }

    const subTaskCountMap = {};
    subTaskCounts.forEach((item) => {
      if (item?._id) {
        subTaskCountMap[item._id.toString()] = item.count;
      }
    });

    return epicTasks.map((task) => ({
      id: task._id?.toString(),
      title: task.title,
      description: task.description || '',
      departmentName: task.departmentId?.name || '',
      status: task.status || TASK_STATUSES.NOT_STARTED,
      milestoneName: task.milestoneId?.name || '',
      startDate: task.startDate || null,
      endDate: task.dueDate || null,
      subTaskCount: subTaskCountMap[task._id?.toString()] || 0,
      taskType: task.taskType || TASK_TYPES.EPIC,
    }));
  } catch (error) {
    console.error('Error fetching epic tasks for export:', error);
    return [];
  }
};

/**
 * 12. Thống kê task theo milestone (tổng + theo ban)
 */
export const getTaskStatisticsByMilestoneService = async ({ eventId, milestoneId }) => {
  const eventObjectId = new mongoose.Types.ObjectId(eventId);
  const milestoneObjectId = milestoneId ? new mongoose.Types.ObjectId(milestoneId) : null;

  let milestoneInfo = null;
  if (milestoneObjectId) {
    milestoneInfo = await Milestone.findOne({
      _id: milestoneObjectId,
      eventId: eventObjectId,
    }).lean();

    if (!milestoneInfo) {
      return { notFound: true };
    }
  }

  const filter = { eventId: eventObjectId };
  if (milestoneObjectId) {
    filter.milestoneId = milestoneObjectId;
  }

  const statisticsAggregation = await Task.aggregate([
    { $match: filter },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              totalTasks: { $sum: 1 },
              totalMajorTasks: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$assigneeId', null] },
                        { $eq: [{ $type: '$assigneeId' }, 'missing'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalAssignedTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$assigneeId', null] },
                        { $ne: [{ $type: '$assigneeId' }, 'missing'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              completedTasks: {
                $sum: {
                  $cond: [{ $eq: ['$status', TASK_STATUSES.DONE] }, 1, 0],
                },
              },
              completedMajorTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$assigneeId', null] },
                            { $eq: [{ $type: '$assigneeId' }, 'missing'] },
                          ],
                        },
                        { $eq: ['$status', TASK_STATUSES.DONE] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              completedAssignedTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $and: [
                            { $ne: ['$assigneeId', null] },
                            { $ne: [{ $type: '$assigneeId' }, 'missing'] },
                          ],
                        },
                        { $eq: ['$status', TASK_STATUSES.DONE] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        byDepartment: [
          {
            $match: {
              departmentId: { $ne: null },
            },
          },
          {
            $group: {
              _id: '$departmentId',
              totalMajorTasks: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$assigneeId', null] },
                        { $eq: [{ $type: '$assigneeId' }, 'missing'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              completedMajorTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$assigneeId', null] },
                            { $eq: [{ $type: '$assigneeId' }, 'missing'] },
                          ],
                        },
                        { $eq: ['$status', TASK_STATUSES.DONE] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalAssignedTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$assigneeId', null] },
                        { $ne: [{ $type: '$assigneeId' }, 'missing'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              completedAssignedTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $and: [
                            { $ne: ['$assigneeId', null] },
                            { $ne: [{ $type: '$assigneeId' }, 'missing'] },
                          ],
                        },
                        { $eq: ['$status', TASK_STATUSES.DONE] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              remainingAssignedTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $and: [
                            { $ne: ['$assigneeId', null] },
                            { $ne: [{ $type: '$assigneeId' }, 'missing'] },
                          ],
                        },
                        { $ne: ['$status', TASK_STATUSES.DONE] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalTasks: { $sum: 1 },
              completedTasks: {
                $sum: {
                  $cond: [{ $eq: ['$status', TASK_STATUSES.DONE] }, 1, 0],
                },
              },
              majorTaskIds: {
                $push: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$assigneeId', null] },
                        { $eq: [{ $type: '$assigneeId' }, 'missing'] },
                      ],
                    },
                    '$_id',
                    null,
                  ],
                },
              },
            },
          },
        ],
      },
    },
  ]);

  const [aggregationResult] = statisticsAggregation;
  const overallStats =
    aggregationResult.overall[0] || {
      totalTasks: 0,
      totalMajorTasks: 0,
      totalAssignedTasks: 0,
      completedTasks: 0,
      completedMajorTasks: 0,
      completedAssignedTasks: 0,
    };
  const departmentStats = aggregationResult.byDepartment || [];

  const departmentIds = departmentStats.map((stat) => stat._id).filter(Boolean);

  const departments = await Department.find({
    _id: { $in: departmentIds },
    eventId: eventObjectId,
  })
    .select('_id name')
    .lean();

  const departmentMap = new Map(
    departments.map((dept) => [dept._id.toString(), dept.name])
  );

  const allMajorTaskIds = departmentStats.flatMap((stat) =>
    stat.majorTaskIds.filter((id) => id !== null)
  );

  let childTasksStats = [];
  if (allMajorTaskIds.length > 0) {
    const childFilter = {
      eventId: eventObjectId,
      parentId: { $in: allMajorTaskIds },
    };
    if (milestoneObjectId) {
      childFilter.milestoneId = milestoneObjectId;
    }

    childTasksStats = await Task.aggregate([
      { $match: childFilter },
      {
        $group: {
          _id: '$departmentId',
          totalChildTasks: { $sum: 1 },
          remainingChildTasks: {
            $sum: {
              $cond: [{ $ne: ['$status', TASK_STATUSES.DONE] }, 1, 0],
            },
          },
        },
      },
    ]);
  }

  const childTasksMap = new Map(
    childTasksStats.map((stat) => [
      stat._id?.toString() || 'null',
      {
        total: stat.totalChildTasks,
        remaining: stat.remainingChildTasks,
      },
    ])
  );

  const departmentProgress = departmentStats
    .map((stat) => {
      const departmentName = departmentMap.get(stat._id.toString());
      if (!departmentName) return null;

      const childStats = childTasksMap.get(stat._id.toString()) || {
        total: 0,
        remaining: 0,
      };

      const majorProgress =
        stat.totalMajorTasks > 0
          ? (stat.completedMajorTasks / stat.totalMajorTasks) * 100
          : 0;

      const assignedProgress =
        stat.totalAssignedTasks > 0
          ? (stat.completedAssignedTasks / stat.totalAssignedTasks) * 100
          : 0;

      const overallProgress =
        stat.totalTasks > 0
          ? (stat.completedTasks / stat.totalTasks) * 100
          : 0;

      return {
        departmentId: stat._id,
        departmentName,
        majorTasksCompleted: stat.completedMajorTasks,
        majorTasksTotal: stat.totalMajorTasks,
        majorTasksProgress: Math.round(majorProgress * 10) / 10,
        assignedTasksCompleted: stat.completedAssignedTasks,
        assignedTasksTotal: stat.totalAssignedTasks,
        remainingAssignedTasks: stat.remainingAssignedTasks,
        assignedTasksProgress: Math.round(assignedProgress * 10) / 10,
        childTasksCompleted: childStats.total - childStats.remaining,
        childTasksTotal: childStats.total,
        remainingChildTasks: childStats.remaining,
        overallProgress: Math.round(overallProgress * 10) / 10,
      };
    })
    .filter(Boolean);

  const overallProgress =
    overallStats.totalMajorTasks > 0
      ? (overallStats.completedMajorTasks / overallStats.totalMajorTasks) * 100
      : 0;

  let remainingDays = null;
  if (milestoneInfo?.targetDate) {
    const targetDate = new Date(milestoneInfo.targetDate);
    const now = new Date();
    targetDate.setHours(23, 59, 59, 999);
    now.setHours(0, 0, 0, 0);

    const diffTime = targetDate - now;
    remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    remainingDays = Math.max(0, remainingDays);
  }

  const completedMajorTasksPercentage =
    overallStats.totalMajorTasks > 0
      ? Math.round(
          (overallStats.completedMajorTasks / overallStats.totalMajorTasks) * 1000
        ) / 10
      : 0;

  const completedAssignedTasksPercentage =
    overallStats.totalAssignedTasks > 0
      ? Math.round(
          (overallStats.completedAssignedTasks / overallStats.totalAssignedTasks) *
            1000
        ) / 10
      : 0;

  return {
    notFound: false,
    summary: {
      totalTasks: overallStats.totalTasks,
      totalMajorTasks: overallStats.totalMajorTasks,
      totalAssignedTasks: overallStats.totalAssignedTasks,
      completedTasks: overallStats.completedTasks,
      completedMajorTasks: overallStats.completedMajorTasks,
      completedAssignedTasks: overallStats.completedAssignedTasks,
      completedMajorTasksPercentage,
      completedAssignedTasksPercentage,
    },
    milestone: milestoneInfo
      ? {
          id: milestoneInfo._id,
          name: milestoneInfo.name,
          startDate: milestoneInfo.startDate,
          targetDate: milestoneInfo.targetDate,
          remainingDays,
          overallProgress: Math.round(overallProgress * 10) / 10,
        }
      : null,
    departmentProgress,
  };
};

/**
 * Helper: generate date range cho burnup
 */
const generateDateRange = (startDate, endDate, intervalDays = 2) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const fallbackStart = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
      const fallbackEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return generateDateRange(fallbackStart, fallbackEnd, intervalDays);
    }

    if (start > end) {
      return generateDateRange(end, start, intervalDays);
    }

    const dates = [];
    const current = new Date(start);

    let iterations = 0;
    const maxIterations = 50;

    while (current <= end && iterations < maxIterations) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + intervalDays);
      iterations++;
    }

    if (dates.length > 0 && dates[dates.length - 1].getTime() !== end.getTime()) {
      dates.push(new Date(end));
    }

    if (dates.length < 2) {
      dates.push(new Date(end));
    }

    return dates;
  } catch (error) {
    console.error('Error in generateDateRange:', error);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return [weekAgo, now];
  }
};

/**
 * Helper: thống kê major tasks theo ban cho burnup
 */
const getDepartmentMajorTaskStats = (majorTasks) => {
  const tasksByDept = {};

  majorTasks.forEach((task) => {
    const deptId =
      task.departmentId?._id?.toString() ||
      task.departmentId?.toString() ||
      'unassigned';
    const deptName = task.departmentId?.name || 'Chưa phân ban';

    if (!tasksByDept[deptId]) {
      tasksByDept[deptId] = {
        departmentId: deptId,
        departmentName: deptName,
        tasks: [],
      };
    }

    tasksByDept[deptId].tasks.push(task);
  });

  const departmentStats = Object.values(tasksByDept).map((dept) => {
    const totalTasks = dept.tasks.length;
    const completedTasks = dept.tasks.filter((t) => t.status === TASK_STATUSES.DONE).length;
    const inProgressTasks = dept.tasks.filter(
      (t) => t.status === TASK_STATUSES.IN_PROGRESS
    ).length;
    const notStartedTasks = dept.tasks.filter(
      (t) => t.status === TASK_STATUSES.NOT_STARTED
    ).length;
    const cancelledTasks = dept.tasks.filter(
      (t) => t.status === TASK_STATUSES.CANCELLED
    ).length;

    return {
      departmentId: dept.departmentId,
      departmentName: dept.departmentName,
      majorTasksTotal: totalTasks,
      majorTasksCompleted: completedTasks,
      majorTasksInProgress: inProgressTasks,
      majorTasksTodo: notStartedTasks,
      majorTasksBlocked: cancelledTasks,
      majorTasksProgress:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      tasks: dept.tasks.map((task) => ({
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        progressPct: task.progressPct,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        startDate: task.startDate,
        dueDate: task.dueDate,
        estimate: task.estimate,
        estimateUnit: task.estimateUnit,
      })),
    };
  });

  return departmentStats;
};

/**
 * 13. Burnup chart data cho milestone
 */
export const getBurnupChartDataService = async ({ eventId, milestoneId }) => {
  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) {
    return { notFound: true };
  }

  let startDate = milestone.startDate;
  let endDate = milestone.targetDate;

  if (!startDate) {
    startDate = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  }

  if (!endDate) {
    endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  const majorTasks = await Task.find({
    eventId,
    milestoneId,
    assigneeId: { $exists: false },
  })
    .populate('departmentId', 'name')
    .sort({ createdAt: 1 });

  if (majorTasks.length === 0) {
    const alternativeTasks = await Task.find({
      eventId,
      milestoneId,
      $or: [
        { assigneeId: { $exists: false } },
        { assigneeId: null },
        { assigneeId: undefined },
      ],
    })
      .populate('departmentId', 'name')
      .sort({ createdAt: 1 });

    majorTasks.push(...alternativeTasks);
  }

  const dateRange = generateDateRange(startDate, endDate, 2);

  const burnupData = [];
  const today = new Date();

  for (const targetDate of dateRange) {
    const tasksInScopeByDate = majorTasks.filter(
      (task) => new Date(task.createdAt) <= targetDate
    );

    const completedTasksByDate = majorTasks.filter((task) => {
      const isCompleted = task.status === TASK_STATUSES.DONE;
      const wasCreatedByDate = new Date(task.createdAt) <= targetDate;
      const wasCompletedByDate =
        isCompleted && new Date(task.updatedAt) <= targetDate;
      return wasCreatedByDate && wasCompletedByDate;
    });

    const totalDays = Math.ceil(
      (endDate - startDate) / (24 * 60 * 60 * 1000)
    );
    const daysPassed = Math.ceil(
      (targetDate - startDate) / (24 * 60 * 60 * 1000)
    );
    const idealProgress = Math.min(Math.max(daysPassed / totalDays, 0), 1);
    const idealTasksCompleted = Math.floor(
      tasksInScopeByDate.length * idealProgress
    );

    burnupData.push({
      date: targetDate.toISOString().split('T')[0],
      displayDate: targetDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      }),
      totalMajorTasks: tasksInScopeByDate.length,
      completedMajorTasks: completedTasksByDate.length,
      idealMajorTasks: idealTasksCompleted,
      completionRate:
        tasksInScopeByDate.length > 0
          ? Math.round(
              (completedTasksByDate.length / tasksInScopeByDate.length) * 100
            )
          : 0,
    });
  }

  const currentStats = {
    totalMajorTasks: majorTasks.length,
    completedMajorTasks: majorTasks.filter(
      (t) => t.status === TASK_STATUSES.DONE
    ).length,
    inProgressMajorTasks: majorTasks.filter(
      (t) => t.status === TASK_STATUSES.IN_PROGRESS
    ).length,
    todoMajorTasks: majorTasks.filter(
      (t) => t.status === TASK_STATUSES.NOT_STARTED
    ).length,
    blockedMajorTasks: majorTasks.filter(
      (t) => t.status === TASK_STATUSES.CANCELLED
    ).length,
    overallProgress:
      majorTasks.length > 0
        ? Math.round(
            (majorTasks.filter((t) => t.status === TASK_STATUSES.DONE).length /
              majorTasks.length) *
              100
          )
        : 0,
  };

  const departmentStats = getDepartmentMajorTaskStats(majorTasks);

  return {
    notFound: false,
    milestone: {
      id: milestone._id,
      name: milestone.name,
      startDate: milestone.startDate,
      targetDate: milestone.targetDate,
      remainingDays: Math.ceil(
        (endDate - today) / (24 * 60 * 60 * 1000)
      ),
    },
    burnupData,
    currentStats,
    departmentStats,
    debug: {
      totalTasksFound: majorTasks.length,
      dateRangePoints: dateRange.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  };
};

/**
 * 14. Burnup chi tiết theo ban
 */
export const getDepartmentBurnupTasksService = async ({
  eventId,
  milestoneId,
  departmentId,
}) => {
  const majorTasks = await Task.find({
    eventId,
    milestoneId,
    departmentId,
    assigneeId: { $exists: false },
  })
    .populate('departmentId', 'name')
    .sort({ createdAt: 1 });

  const cancelledTasks = majorTasks.filter(
    (t) => t.status === TASK_STATUSES.CANCELLED
  );
  const tasksByStatus = {
    done: majorTasks.filter((t) => t.status === TASK_STATUSES.DONE),
    in_progress: majorTasks.filter(
      (t) => t.status === TASK_STATUSES.IN_PROGRESS
    ),
    todo: majorTasks.filter((t) => t.status === TASK_STATUSES.NOT_STARTED),
    blocked: cancelledTasks,
    cancelled: cancelledTasks,
  };

  const stats = {
    total: majorTasks.length,
    completed: tasksByStatus.done.length,
    inProgress: tasksByStatus.in_progress.length,
    todo: tasksByStatus.todo.length,
    cancelled: tasksByStatus.cancelled.length,
    completionRate:
      majorTasks.length > 0
        ? Math.round((tasksByStatus.done.length / majorTasks.length) * 100)
        : 0,
  };

  return {
    departmentId,
    departmentName: majorTasks[0]?.departmentId?.name || 'Unknown Department',
    stats,
    tasksByStatus,
    allTasks: majorTasks.map((task) => ({
      id: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      progressPct: task.progressPct,
      estimate: task.estimate,
      estimateUnit: task.estimateUnit,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      startDate: task.startDate,
      dueDate: task.dueDate,
    })),
  };
};
export { getEpicTasksForExportService as getEpicTasksForExport };
