import Task from '../models/task.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';
import Department from '../models/department.js'
import Milestone from '../models/milestone.js'
import Event from '../models/event.js';
import {
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyMajorTaskStatus,
} from '../services/notificationService.js';
import mongoose from 'mongoose';
import eventMember from '../models/eventMember.js';
import recalcParentsUpward from '../utils/recalcParentTask.js';

const TASK_TYPES = {
    EPIC: 'epic',
    NORMAL: 'normal'
};

const TASK_STATUSES = {
    NOT_STARTED: 'chua_bat_dau',
    IN_PROGRESS: 'da_bat_dau',
    DONE: 'hoan_thanh',
    CANCELLED: 'huy'
};

const STATUS_TRANSITIONS = {
    [TASK_STATUSES.NOT_STARTED]: [TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.CANCELLED],
    [TASK_STATUSES.IN_PROGRESS]: [TASK_STATUSES.DONE, TASK_STATUSES.CANCELLED],
    [TASK_STATUSES.DONE]: [TASK_STATUSES.IN_PROGRESS],
    [TASK_STATUSES.CANCELLED]: [TASK_STATUSES.IN_PROGRESS]
};

const isEpicTask = (task) => task?.taskType === TASK_TYPES.EPIC;
const isNormalTask = (task) => task?.taskType === TASK_TYPES.NORMAL;
// GET /api/tasks/:eventId?departmentId=...: (HoOC/HoD/Mem)
//http://localhost:8080/api/tasks/68fd264703c943724fa8cbff?departmentId=6500000000000000000000a1
export const listTasksByEventOrDepartment = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { departmentId, search, status, taskType } = req.query;
        // Check quyền
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) return res.status(403).json({ message: 'Không có quyền xem task' });
        // Build filter
        let filter = { eventId };
        if (departmentId) filter.departmentId = departmentId;
        if (search) filter.title = { $regex: search, $options: 'i' };
        if (status) filter.status = status;
        if (taskType && Object.values(TASK_TYPES).includes(taskType)) {
            filter.taskType = taskType;
        }
        // Add populate for assigneeId, departmentId, and createdBy (with name fields)
        const tasks = await Task.find(filter)
            .sort({ createdAt: -1 })
            .populate([
                {
                    path: 'assigneeId',
                    select: 'userId',
                    populate: [
                        { path: 'userId', model: 'User', select: 'fullName' }
                    ]
                },
                { path: 'departmentId', select: 'name' },
                { path: 'createdBy', model: 'User', select: 'fullName' }
            ])
            .lean();
        return res.status(200).json({ data: tasks });
    } catch (err) { return res.status(500).json({ message: 'Lỗi lấy danh sách task' }); }
};

// GET /api/tasks/:eventId/:taskId (HoOC/HoD/Mem)
export const getTaskDetail = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;

        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) return res.status(403).json({ message: 'Không có quyền xem chi tiết task' });

        const task = await Task.findOne({ _id: taskId, eventId })
            .populate([
                {
                    path: 'assigneeId',
                    select: 'userId role departmentId',
                    populate: [
                        { path: 'userId', model: 'User', select: 'fullName email' }, // Removed avatarUrl (base64 images cause timeout)
                        { path: 'departmentId', model: 'Department', select: 'name' }
                    ]
                },
                { path: 'departmentId', select: 'name' },
                { path: 'milestoneId', select: 'name' }
            ])
            .lean();

        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });

        return res.status(200).json({ data: task });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy chi tiết task' });
    }
};

export const getTaskByDepartment = async (req, res) => {
    try {
        const { eventId, taskId, departmentId } = req.params;

        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) return res.status(403).json({ message: 'Không có quyền xem chi tiết task' });
        // Validate department thuộc event
        const deptExists = await Department.exists({ _id: departmentId, eventId });
        if (!deptExists) return res.status(404).json({ message: 'Ban không tồn tại trong sự kiện này' });

        const task = await Task.findOne({ _id: taskId, eventId, departmentId })
            .populate([
                {
                    path: 'assigneeId',
                    select: 'userId role departmentId',
                    populate: [
                        { path: 'userId', model: 'User', select: 'fullName email' }, // Removed avatarUrl (base64 images cause timeout)
                        { path: 'departmentId', model: 'Department', select: 'name' }
                    ]
                },
                { path: 'departmentId', select: 'name' },
                { path: 'milestoneId', select: 'name' }
            ])
            .lean();

        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });

        return res.status(200).json({ data: task });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi lấy chi tiết task của ban' });
    }
};


// POST /api/task/:eventId/tasks (HoOC/HoD)
export const createTask = async (req, res) => {
    try {
        const { eventId } = req.params;

        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được tạo task.' });

        const {
            title, description, departmentId, assigneeId,
            startDate, dueDate, estimate, estimateUnit, milestoneId, parentId,
            dependencies = [], suggestedTeamSize, taskType = TASK_TYPES.NORMAL
        } = req.body;

        if (!departmentId) return res.status(400).json({ message: 'Thiếu departmentId' });

        // Gom lỗi
        const errors = [];
        const normalizedTaskType = Object.values(TASK_TYPES).includes(taskType) ? taskType : TASK_TYPES.NORMAL;
        const isEpic = normalizedTaskType === TASK_TYPES.EPIC;
        const isNormal = normalizedTaskType === TASK_TYPES.NORMAL;

        if (isEpic && member.role !== 'HoOC') {
            return res.status(403).json({ message: 'Chỉ HoOC được tạo Epic task.' });
        }
        if (isNormal && !['HoOC', 'HoD'].includes(member.role)) {
            return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được tạo công việc thường.' });
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
        // Validation startDate phải sau hoặc bằng ngày tạo sự kiện
        if (startDate && event?.createdAt) {
            const taskStartDate = new Date(startDate);
            const createdAt = new Date(event.createdAt);
            if (taskStartDate < createdAt) {
                errors.push(`Thời gian bắt đầu phải sau hoặc bằng thời gian tạo sự kiện (${createdAt.toLocaleString('vi-VN')})`);
            }
        }
        // Validation dueDate phải sau hoặc bằng ngày tạo sự kiện
        if (dueDate && event?.createdAt) {
            const taskDueDate = new Date(dueDate);
            const createdAt = new Date(event.createdAt);
            if (taskDueDate < createdAt) {
                errors.push(`Deadline phải sau hoặc bằng thời gian tạo sự kiện (${createdAt.toLocaleString('vi-VN')})`);
            }
        }
        // Kiểm tra startDate < dueDate như cũ
        if (startDate && dueDate) {
            const taskStartDate = new Date(startDate);
            const taskDueDate = new Date(dueDate);
            if (taskStartDate >= taskDueDate) {
                errors.push('Thời gian bắt đầu phải trước deadline');
            }
        }

        if (errors.length) return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors });

        // Kiểm tra tồn tại & cùng event
        const [
            departmentDoc,
            assigneeDoc,
            milestoneOk,
            parentDoc,
            depFound
        ] = await Promise.all([
            Department.findOne({ _id: departmentId, eventId }).lean(),
            assigneeId ? EventMember.findOne({ _id: assigneeId, eventId, status: { $ne: 'deactive' } }).select('departmentId').lean() : null,
            milestoneId ? Milestone.exists({ _id: milestoneId, eventId }) : Promise.resolve(true),
            parentId ? Task.findOne({ _id: parentId, eventId }).lean() : null,
            dependencyIds.length
                ? Task.find({ _id: { $in: dependencyIds }, eventId }).select('_id taskType').lean()
                : Promise.resolve([])
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
                errors.push('Epic task và task con phải thuộc cùng ban');
            }
        }

        if (Array.isArray(depFound)) {
            const foundIds = new Set(depFound.map(d => String(d._id)));
            const missing = dependencyIds.filter(id => !foundIds.has(String(id)));
            if (missing.length) errors.push(`dependencies không hợp lệ hoặc không thuộc event: ${missing.join(', ')}`);
        }

        if (errors.length) return res.status(400).json({ message: 'Tham chiếu không hợp lệ', errors });

        // Tạo task
        const t = await Task.create({
            title,
            description,
            eventId,
            departmentId,
            taskType: normalizedTaskType,
            assigneeId: isEpic ? undefined : (assigneeId || undefined),
            startDate: startDate || undefined,
            dueDate,
            estimate,
            estimateUnit,
            milestoneId: milestoneId || undefined,
            parentId: isEpic ? undefined : (parentId || undefined),
            dependencies: dependencyIds,
            suggestedTeamSize: suggestedTeamSize || undefined,
            createdBy: req.user.id
        });

        // Thông báo khi giao việc cho Member
        if (!isEpic && assigneeId) {
            try {
                await notifyTaskAssigned(eventId, t._id, assigneeId);
            } catch (notifyErr) {
                console.error('Error sending notification:', notifyErr);
                // Không fail request nếu notification lỗi
            }
        }

        if (isNormal && parentId) {
            await recalcParentsUpward(parentId, eventId);
        }

        return res.status(201).json({ data: t });
    } catch (err) {
        // console.error(err);
        return res.status(500).json({ message: 'Tạo task thất bại' });
    }
};

// PATCH /api/task/:eventId/edit-task/:taskId (HoOC/HoD)
export const editTask = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;

        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được sửa task.' });

        // Kiểm tra task hiện tại
        const currentTask = await Task.findOne({ _id: taskId, eventId });
        if (!currentTask) return res.status(404).json({ message: 'Task không tồn tại' });

        const isEpic = isEpicTask(currentTask);
        const isNormal = isNormalTask(currentTask);

        if (isEpic && member.role !== 'HoOC') {
            return res.status(403).json({ message: 'Chỉ HoOC có quyền chỉnh sửa Epic task.' });
        }
        if (isNormal && !['HoOC', 'HoD'].includes(member.role)) {
            return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD có quyền chỉnh sửa task thường.' });
        }

        if (isNormal && currentTask.status !== TASK_STATUSES.NOT_STARTED) {
            return res.status(403).json({
                message: 'Không thể chỉnh sửa task thường sau khi đã bắt đầu. Vui lòng cập nhật trạng thái thông qua API updateTaskProgress.'
            });
        }

        const update = { ...(req.body || {}) };
        if (!update) return res.status(404).json({ message: "Chưa có thông tin cập nhật" })

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
        const event = await Event.findById(eventId).select('eventStartDate eventEndDate').lean();
        
        // Validation startDate: phải sau ngày hiện tại và trong khoảng thời gian sự kiện
        if (update.startDate) {
            const now = new Date();
            
            const taskStartDate = new Date(update.startDate);

            // Kiểm tra startDate phải sau thời điểm hiện tại
            if (taskStartDate <= now) {
                errors.push('Thời gian bắt đầu phải sau thời điểm hiện tại');
            }

            if (event) {
                if (event.eventStartDate) {
                    const eventStart = new Date(event.eventStartDate);
                    if (taskStartDate < eventStart) {
                        errors.push(`Thời gian bắt đầu phải sau hoặc bằng thời gian bắt đầu sự kiện (${eventStart.toLocaleString('vi-VN')})`);
                    }
                }
                if (event.eventEndDate) {
                    const eventEnd = new Date(event.eventEndDate);
                    if (taskStartDate > eventEnd) {
                        errors.push(`Thời gian bắt đầu phải trước hoặc bằng thời gian kết thúc sự kiện (${event.eventEndDate.toLocaleString('vi-VN')})`);
                    }
                }
            }
        }

        // Validation dueDate: phải sau ngày hiện tại và trong khoảng thời gian sự kiện
        if (update.dueDate) {
            const now = new Date();
            
            const taskDueDate = new Date(update.dueDate);

            // Kiểm tra dueDate phải sau thời điểm hiện tại
            if (taskDueDate <= now) {
                errors.push('Deadline phải sau thời điểm hiện tại');
            }

            if (event) {
                if (event.eventStartDate) {
                    const eventStart = new Date(event.eventStartDate);
                    if (taskDueDate < eventStart) {
                        errors.push(`Deadline phải sau hoặc bằng thời gian bắt đầu sự kiện (${eventStart.toLocaleString('vi-VN')})`);
                    }
                }
                if (event.eventEndDate) {
                    const eventEnd = new Date(event.eventEndDate);
                    if (taskDueDate > eventEnd) {
                        errors.push(`Deadline phải trước hoặc bằng thời gian kết thúc sự kiện (${event.eventEndDate.toLocaleString('vi-VN')})`);
                    }
                }
            }
        }

        // Kiểm tra startDate < dueDate
        // Nếu cả hai đều được update, kiểm tra. Nếu chỉ một trong hai được update, cần lấy giá trị hiện tại của task
        const taskForValidation = (update.startDate || update.dueDate) ? currentTask : null;
        const finalStartDate = update.startDate ? new Date(update.startDate) : (taskForValidation?.startDate ? new Date(taskForValidation.startDate) : null);
        const finalDueDate = update.dueDate ? new Date(update.dueDate) : (taskForValidation?.dueDate ? new Date(taskForValidation.dueDate) : null);
        
        if (finalStartDate && finalDueDate && finalStartDate >= finalDueDate) {
            errors.push('Thời gian bắt đầu phải trước deadline');
        }
        // Validate tồn tại/cùng event
        const [
            deptDoc,
            assigneeDoc,
            milestoneOk,
            parentDoc,
            depFound
        ] = await Promise.all([
            update.departmentId ? Department.findOne({ _id: update.departmentId, eventId }).lean() : null,
            update.assigneeId ? EventMember.findOne({ _id: update.assigneeId, eventId, status: { $ne: 'deactive' } }).select('departmentId').lean() : null,
            update.milestoneId ? Milestone.exists({ _id: update.milestoneId, eventId }) : Promise.resolve(true),
            update.parentId ? Task.findOne({ _id: update.parentId, eventId }).lean() : null,
            deps.length ? Task.find({ _id: { $in: deps }, eventId }).select('_id taskType').lean() : Promise.resolve([])
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
            const foundIds = new Set(depFound.map(d => String(d._id)));
            const missing = deps.filter(id => !foundIds.has(String(id)));
            if (missing.length) {
                errors.push(`dependencies không hợp lệ hoặc không thuộc event: ${missing.join(', ')}`);
            }
            if (deps.includes(String(taskId))) {
                errors.push('Task không thể phụ thuộc vào chính nó');
            }
        }

        if (errors.length) {
            return res.status(400).json({ message: 'Tham chiếu không hợp lệ', errors });
        }

        // Cập nhật (không thay đổi logic khác)
        const result = await Task.findOneAndUpdate(
            { _id: taskId, eventId },
            { $set: { ...update, updatedAt: new Date() } },
            { new: true }
        );

        if (!result) return res.status(404).json({ message: 'Task không tồn tại' });
        return res.status(200).json({ data: result });
    } catch (err) {
        return res.status(500).json({ message: 'Sửa task thất bại' });
    }
};

// DELETE /api/task/:eventId/:taskId (HoOC/HoD)
export const deleteTask = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được xoá task.' });
        
        // Kiểm tra task hiện tại trước khi xóa
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        
        const isEpic = isEpicTask(task);
        const isNormal = isNormalTask(task);

        if (isEpic && member.role !== 'HoOC') {
            return res.status(403).json({ message: 'Chỉ HoOC được xóa Epic task.' });
        }
        if (isNormal && member.role !== 'HoD') {
            return res.status(403).json({ message: 'Chỉ HoD được xóa task thường.' });
        }

        // Không cho phép xóa task khi status là "đã bắt đầu"
        if (task.status === TASK_STATUSES.IN_PROGRESS) {
            return res.status(403).json({ 
                message: 'Không thể xóa task khi đang ở trạng thái "đã bắt đầu".' 
            });
        }
        
        // Kiểm tra dependencies và children
        const dependents = await Task.countDocuments({ eventId, dependencies: task._id });
        const children = await Task.countDocuments({ eventId, parentId: task._id });
        if (dependents || children) {
            return res.status(409).json({
                message: 'Không xóa được vì đang có task phụ thuộc',
                meta: { dependents, children }
            });
        }
        
        // Xóa task
        await Task.findOneAndDelete({ _id: taskId, eventId });
        if (task.parentId) {
            await recalcParentsUpward(task.parentId, eventId);
        }
        return res.status(200).json({ message: 'Đã xoá task thành công.' });
    } catch (err) { return res.status(500).json({ message: 'Xoá task thất bại' }); }
};

// PATCH /api/task/:eventId/:taskId/progress
export const updateTaskProgress = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;

        // Cho phép HoOC/HoD/Member gọi API
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) return res.status(403).json({ message: 'Không có quyền cập nhật tiến độ.' });

        const { status, progressPct } = req.body || {};
        const ALLOWED = Object.values(TASK_STATUSES);

        // 1) Lấy task
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });

        const isEpic = isEpicTask(task);
        if (isEpic) {
            return res.status(403).json({ message: 'Epic task tự động cập nhật trạng thái dựa trên task con, không thể chỉnh thủ công.' });
        }

        // 2) Task chưa được assign không cho chỉnh
        if (!task.assigneeId) {
            return res.status(403).json({ message: 'Task chưa được giao cho thành viên nên không thể cập nhật trạng thái.' });
        }

        // 3) Quyền - người được assign (dù vai trò nào) mới được cập nhật trạng thái task
        // Lấy tất cả membership của user trong event này
        const memberships = await eventMember.find({ userId: req.user.id, eventId });
        const isAssignee = memberships.some(m => String(m._id) === String(task.assigneeId));
        if (!isAssignee) {
            return res.status(403).json({ message: 'Chỉ người được assign task mới được cập nhật trạng thái.' });
        }

        // 4) Validate input
        if (status && !ALLOWED.includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }
        if (typeof progressPct !== 'undefined') {
            const pct = Number(progressPct);
            if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
                return res.status(400).json({ message: 'progressPct phải trong khoảng 0..100.' });
            }
            task.progressPct = pct;
        }

        // 5) Ràng buộc dependency (prerequisites)
        let depsNotDone = 0;
        if (status && (status === TASK_STATUSES.IN_PROGRESS || status === TASK_STATUSES.DONE)) {
            const deps = task.dependencies || [];
            if (deps.length) {
                depsNotDone = await Task.countDocuments({
                    _id: { $in: deps },     // chỉ các task có _id nằm trong danh sách dependencies
                    eventId,                // thuộc cùng event (tránh đếm nhầm event khác)
                    status: { $ne: TASK_STATUSES.DONE } // có trạng thái KHÁC 'hoan_thanh'  → nghĩa là chưa xong
                });
            }
        }

        const isStarting = status === TASK_STATUSES.IN_PROGRESS && task.status === TASK_STATUSES.NOT_STARTED;
        const isFinishing = status === TASK_STATUSES.DONE;

        if ((isStarting || isFinishing) && depsNotDone > 0) {
            return res.status(409).json({ message: 'Chưa thể thực hiện: còn task phụ thuộc chưa hoàn thành.' });
        }

        if (status && !STATUS_TRANSITIONS[task.status]?.includes(status)) {
            return res.status(409).json({ message: `Không thể chuyển từ ${task.status} → ${status} với vai trò hiện tại.` });
        }

        // 6) Áp trạng thái
        if (status) {
            task.status = status;
            if (status === TASK_STATUSES.DONE && typeof progressPct === 'undefined') task.progressPct = 100;
            if (status === TASK_STATUSES.CANCELLED && typeof progressPct === 'undefined') task.progressPct = 0;
        }

        await task.save();

        // 7) Recalculate parent theo rule parent
        await recalcParentsUpward(task.parentId, eventId);

        // 8) Thông báo khi task hoàn thành
        if (status === TASK_STATUSES.DONE) {
            try {
                await notifyTaskCompleted(eventId, taskId);
                
                // Kiểm tra nếu là task lớn (không có parentId)
                if (!task.parentId) {
                    await notifyMajorTaskStatus(eventId, taskId, true);
                }
            } catch (notifyErr) {
                console.error('Error sending notification:', notifyErr);
                // Không fail request nếu notification lỗi
            }
        }

        return res.status(200).json({ message: "Update Task progress successfully", data: task });
    } catch (err) {
        console.error('ERR updateTaskProgress:', err);
        return res.status(500).json({ message: 'Cập nhật progress thất bại', err });
    }
};



// PATCH /api/task/:eventId/:taskId/assign (HoOC/HoD)
export const assignTask = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được gán task.' });
        const { assigneeId } = req.body;
        if (!assigneeId) return res.status(404).json({ message: 'Thiếu thông tin người assign' })
        // Kiểm tra EventMember thuộc đúng event
        const assigneeDoc = await EventMember.findOne({ _id: assigneeId, eventId, status: { $ne: 'deactive' } }).select('departmentId').lean();
        if (!assigneeDoc) {
            return res.status(404).json({ message: 'Người được gán không tồn tại trong sự kiện này' });
        }
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        if (isEpicTask(task)) {
            return res.status(400).json({ message: 'Không thể gán Epic task cho thành viên.' });
        }
        if (assigneeDoc.departmentId && task.departmentId && String(assigneeDoc.departmentId) !== String(task.departmentId)) {
            return res.status(403).json({ message: 'Người được gán phải thuộc cùng ban với task.' });
        }
        task.assigneeId = assigneeId;
        await task.save();
        
        // Thông báo cho Member được giao việc
        try {
            await notifyTaskAssigned(eventId, taskId, assigneeId);
        } catch (notifyErr) {
            console.error('Error sending notification:', notifyErr);
            // Không fail request nếu notification lỗi
        }
        
        return res.status(200).json({ data: task });
    } catch (err) { return res.status(500).json({ message: 'Gán task thất bại' }); }
};

// PATCH /api/task/:eventId/:taskId/unassign (HoOC/HoD)
export const unassignTask = async (req, res) => {
    try {
      const { eventId, taskId } = req.params;
      // Chỉ HoOC/HoD
      const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
      if (!member) return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được huỷ gán task.' });
      // Tìm task
      const task = await Task.findOne({ _id: taskId, eventId });
      if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
      if (isEpicTask(task)) {
        return res.status(400).json({ message: 'Epic task không có assignee để huỷ.' });
      }
      if (!task.parentId && !task.assigneeId) {
        return res.status(400).json({ message: 'Task parent (giao cho ban) vốn không có assignee. Không thể huỷ gán.' });
      }
      if (!task.assigneeId) {
        return res.status(200).json({ data: task }); 
      }
      // Huỷ gán
      task.assigneeId = null; // hoặc = null đều được nếu schema cho phép
      await task.save();
      return res.status(200).json({ data: task });
    } catch (err) {
      return res.status(500).json({ message: 'Huỷ gán task thất bại' });
    }
  };

// GET /api/task/:eventId/progress (HoOC/HoD)
export const getEventTaskProgressChart = async (req, res) => {
    try {
        const { eventId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoOC hoặc HoD được xem chart.' });
        // Query thống kê số lượng theo progress/status
        const stats = await Task.aggregate([
            { $match: { eventId: typeof eventId === 'string' ? new Task.collection.db.bson_serializer.ObjectID(eventId) : eventId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        return res.status(200).json({ data: stats });
    } catch (err) { return res.status(500).json({ message: 'Lỗi lấy chart tiến độ' }); }
};

// GET /api/tasks/:eventId/statistics/:milestoneId (HoOC/HoD)
export const getTaskStatisticsByMilestone = async (req, res) => {
    try {
        const { eventId, milestoneId } = req.params;
        
        console.log('=== DEBUG STATISTICS API ===');
        console.log('eventId:', eventId);
        console.log('milestoneId:', milestoneId);
        
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

        // Convert to ObjectId
        const eventObjectId = new mongoose.Types.ObjectId(eventId);
        const milestoneObjectId = milestoneId ? new mongoose.Types.ObjectId(milestoneId) : null;
        
        let milestoneInfo = null;
        if (milestoneId) {
            milestoneInfo = await Milestone.findOne({ 
                _id: milestoneObjectId, 
                eventId: eventObjectId  
            }).lean();
            
            if (!milestoneInfo) {
                console.log(`❌ Milestone ${milestoneId} not found in event ${eventId}`);
                return res.status(404).json({ message: 'Milestone không tồn tại trong event này.' });
            }
        }

        // Build filter with ObjectId
        const filter = { eventId: eventObjectId };
        if (milestoneObjectId) {
            filter.milestoneId = milestoneObjectId;
        }
        const statisticsAggregation = await Task.aggregate([
            { $match: filter },
            {
                $facet: {
                    // Thống kê tổng quan
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalTasks: { $sum: 1 },
                                // Major tasks (không có assigneeId)
                                totalMajorTasks: {
                                    $sum: { 
                                        $cond: [
                                            { 
                                                $or: [
                                                    { $eq: ['$assigneeId', null] },
                                                    { $eq: [{ $type: '$assigneeId' }, 'missing'] }
                                                ]
                                            }, 
                                            1, 
                                            0 
                                        ] 
                                    }
                                },
                                // Assigned tasks (có assigneeId)
                                totalAssignedTasks: {
                                    $sum: { 
                                        $cond: [
                                            { 
                                                $and: [
                                                    { $ne: ['$assigneeId', null] },
                                                    { $ne: [{ $type: '$assigneeId' }, 'missing'] }
                                                ]
                                            }, 
                                            1, 
                                            0 
                                        ] 
                                    }
                                },
                                completedTasks: {
                                    $sum: { $cond: [{ $eq: ['$status', TASK_STATUSES.DONE] }, 1, 0] }
                                },
                                // Major tasks đã hoàn thành
                                completedMajorTasks: {
                                    $sum: {
                                        $cond: [
                                            { 
                                                $and: [
                                                    { 
                                                        $or: [
                                                            { $eq: ['$assigneeId', null] },
                                                            { $eq: [{ $type: '$assigneeId' }, 'missing'] }
                                                        ]
                                                    }, 
                                                    { $eq: ['$status', TASK_STATUSES.DONE] }
                                                ] 
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                // Assigned tasks đã hoàn thành
                                completedAssignedTasks: {
                                    $sum: {
                                        $cond: [
                                            { 
                                                $and: [
                                                    { 
                                                        $and: [
                                                            { $ne: ['$assigneeId', null] },
                                                            { $ne: [{ $type: '$assigneeId' }, 'missing'] }
                                                        ]
                                                    }, 
                                                    { $eq: ['$status', TASK_STATUSES.DONE] }
                                                ] 
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    // Thống kê theo ban
                    byDepartment: [
                        {
                            $match: {
                                departmentId: { $ne: null }
                            }
                        },
                        {
                            $group: {
                                _id: '$departmentId',
                                // Major tasks
                                totalMajorTasks: {
                                    $sum: { 
                                        $cond: [
                                            { 
                                                $or: [
                                                    { $eq: ['$assigneeId', null] },
                                                    { $eq: [{ $type: '$assigneeId' }, 'missing'] }
                                                ]
                                            }, 
                                            1, 
                                            0 
                                        ] 
                                    }
                                },
                                completedMajorTasks: {
                                    $sum: {
                                        $cond: [
                                            { 
                                                $and: [
                                                    { 
                                                        $or: [
                                                            { $eq: ['$assigneeId', null] },
                                                            { $eq: [{ $type: '$assigneeId' }, 'missing'] }
                                                        ]
                                                    }, 
                                                    { $eq: ['$status', TASK_STATUSES.DONE] }
                                                ] 
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                // ✅ NEW: Assigned tasks
                                totalAssignedTasks: {
                                    $sum: { 
                                        $cond: [
                                            { 
                                                $and: [
                                                    { $ne: ['$assigneeId', null] },
                                                    { $ne: [{ $type: '$assigneeId' }, 'missing'] }
                                                ]
                                            }, 
                                            1, 
                                            0 
                                        ] 
                                    }
                                },
                                completedAssignedTasks: {
                                    $sum: {
                                        $cond: [
                                            { 
                                                $and: [
                                                    { 
                                                        $and: [
                                                            { $ne: ['$assigneeId', null] },
                                                            { $ne: [{ $type: '$assigneeId' }, 'missing'] }
                                                        ]
                                                    }, 
                                                    { $eq: ['$status', 'done'] }
                                                ] 
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                remainingAssignedTasks: {
                                    $sum: {
                                        $cond: [
                                            { 
                                                $and: [
                                                    { 
                                                        $and: [
                                                            { $ne: ['$assigneeId', null] },
                                                            { $ne: [{ $type: '$assigneeId' }, 'missing'] }
                                                        ]
                                                    }, 
                                                    { $ne: ['$status', TASK_STATUSES.DONE] }
                                                ] 
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                totalTasks: { $sum: 1 },
                                completedTasks: {
                                    $sum: { $cond: [{ $eq: ['$status', TASK_STATUSES.DONE] }, 1, 0] }
                                },
                                // Major task IDs (for child task lookup if needed later)
                                majorTaskIds: {
                                    $push: {
                                        $cond: [
                                            { 
                                                $or: [
                                                    { $eq: ['$assigneeId', null] },
                                                    { $eq: [{ $type: '$assigneeId' }, 'missing'] }
                                                ]
                                            },
                                            '$_id',
                                            null
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ]);
        const [aggregationResult] = statisticsAggregation;
        const overallStats = aggregationResult.overall[0] || {
            totalTasks: 0,
            totalMajorTasks: 0,
            totalAssignedTasks: 0,
            completedTasks: 0,
            completedMajorTasks: 0,
            completedAssignedTasks: 0
        };
        const departmentStats = aggregationResult.byDepartment || [];

        // Batch fetch departments
        const departmentIds = departmentStats.map(stat => stat._id).filter(Boolean);
        
        const departments = await Department.find({
            _id: { $in: departmentIds },
            eventId: eventObjectId
        }).select('_id name').lean();

        const departmentMap = new Map(
            departments.map(dept => [dept._id.toString(), dept.name])
        );

        // ✅ OPTION 2: Child tasks (hierarchy-based) - vẫn giữ cho tương lai
        const allMajorTaskIds = departmentStats.flatMap(stat => 
            stat.majorTaskIds.filter(id => id !== null)
        );

        let childTasksStats = [];
        if (allMajorTaskIds.length > 0) {
            const childFilter = {
                eventId: eventObjectId,
                parentId: { $in: allMajorTaskIds } // True parent-child relationship
            };
            if (milestoneObjectId) {
                childFilter.milestoneId = milestoneObjectId;
            }

            console.log('Child filter (parent-child):', childFilter);

            childTasksStats = await Task.aggregate([
                { $match: childFilter },
                {
                    $group: {
                        _id: '$departmentId',
                        totalChildTasks: { $sum: 1 },
                        remainingChildTasks: {
                            $sum: { $cond: [{ $ne: ['$status', TASK_STATUSES.DONE] }, 1, 0] }
                        }
                    }
                }
            ]);
        }

        console.log('Child tasks stats (parent-child):', childTasksStats);

        const childTasksMap = new Map(
            childTasksStats.map(stat => [
                stat._id?.toString() || 'null', 
                {
                    total: stat.totalChildTasks,
                    remaining: stat.remainingChildTasks
                }
            ])
        );

        // ✅ NEW: Xây dựng kết quả department details với assigned tasks
        const departmentDetails = departmentStats.map(stat => {
            const departmentName = departmentMap.get(stat._id.toString());
            if (!departmentName) {
                console.log(`⚠️ Department name not found for ID: ${stat._id}`);
                return null;
            }

            const childStats = childTasksMap.get(stat._id.toString()) || { total: 0, remaining: 0 };
            
            // Progress dựa trên major tasks
            const majorProgress = stat.totalMajorTasks > 0
                ? (stat.completedMajorTasks / stat.totalMajorTasks) * 100
                : 0;

            // Progress dựa trên assigned tasks  
            const assignedProgress = stat.totalAssignedTasks > 0
                ? (stat.completedAssignedTasks / stat.totalAssignedTasks) * 100
                : 0;

            // Overall progress cho department
            const overallProgress = stat.totalTasks > 0
                ? (stat.completedTasks / stat.totalTasks) * 100
                : 0;

            return {
                departmentId: stat._id,
                departmentName,
                
                // Major tasks
                majorTasksCompleted: stat.completedMajorTasks,
                majorTasksTotal: stat.totalMajorTasks,
                majorTasksProgress: Math.round(majorProgress * 10) / 10,
                
                // ✅ NEW: Assigned tasks (independent tasks với assigneeId)
                assignedTasksCompleted: stat.completedAssignedTasks,
                assignedTasksTotal: stat.totalAssignedTasks,
                remainingAssignedTasks: stat.remainingAssignedTasks,
                assignedTasksProgress: Math.round(assignedProgress * 10) / 10,
                
                // Child tasks (true parent-child hierarchy)
                childTasksCompleted: childStats.total - childStats.remaining,
                childTasksTotal: childStats.total,
                remainingChildTasks: childStats.remaining,
                
                // Overall department progress
                overallProgress: Math.round(overallProgress * 10) / 10
            };
        }).filter(Boolean);

        // Tính tiến độ tổng
        const overallProgress = overallStats.totalMajorTasks > 0
            ? (overallStats.completedMajorTasks / overallStats.totalMajorTasks) * 100
            : 0;

        // Tính remaining days
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

        const completedMajorTasksPercentage = overallStats.totalMajorTasks > 0
            ? Math.round((overallStats.completedMajorTasks / overallStats.totalMajorTasks) * 1000) / 10
            : 0;
        return res.status(200).json({
            data: {
                summary: {
                    totalTasks: overallStats.totalTasks,
                    totalMajorTasks: overallStats.totalMajorTasks,
                    totalAssignedTasks: overallStats.totalAssignedTasks, // ✅ NEW
                    completedTasks: overallStats.completedTasks,
                    completedMajorTasks: overallStats.completedMajorTasks,
                    completedAssignedTasks: overallStats.completedAssignedTasks, // ✅ NEW
                    completedMajorTasksPercentage,
                    completedAssignedTasksPercentage: overallStats.totalAssignedTasks > 0 // ✅ NEW
                        ? Math.round((overallStats.completedAssignedTasks / overallStats.totalAssignedTasks) * 1000) / 10
                        : 0
                },
                milestone: milestoneInfo ? {
                    id: milestoneInfo._id,
                    name: milestoneInfo.name,
                    startDate: milestoneInfo.startDate,
                    targetDate: milestoneInfo.targetDate,
                    remainingDays,
                    overallProgress: Math.round(overallProgress * 10) / 10
                } : null,
                departmentProgress: departmentDetails
            }
        });

    } catch (err) {
        console.error('Error getting task statistics:', err);
        return res.status(500).json({ 
            message: 'Lỗi lấy thống kê task', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const getBurnupChartData = async (req, res) => {
    try {
      const { eventId, milestoneId } = req.params;
  
      console.log(`🔥 Getting burnup data for Event: ${eventId}, Milestone: ${milestoneId}`);
  
      // ✅ 1. Get milestone info
      const milestone = await Milestone.findById(milestoneId);
      if (!milestone) {
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
  
      console.log('📅 Milestone data:', {
        name: milestone.name,
        startDate: milestone.startDate,
        targetDate: milestone.targetDate
      });
  
      // ✅ 2. Validate dates với fallbacks
      let startDate = milestone.startDate;
      let endDate = milestone.targetDate;
  
      if (!startDate) {
        startDate = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000); // 21 days ago
        console.log('⚠️ Using fallback start date:', startDate);
      }
  
      if (!endDate) {
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        console.log('⚠️ Using fallback end date:', endDate);
      }
  
      // Convert to Date objects if they're strings
      startDate = new Date(startDate);
      endDate = new Date(endDate);
  
      console.log('📅 Using dates:', { startDate, endDate });
  
      // ✅ 3. Get major tasks (no assigneeId) trong milestone này
      const majorTasks = await Task.find({
        eventId: eventId,
        milestoneId: milestoneId,
        assigneeId: { $exists: false }, // ✅ Major tasks = không có assigneeId
        // Alternative: assigneeId: null hoặc assigneeId: undefined
      })
      .populate('departmentId', 'name')
      .sort({ createdAt: 1 });
  
      console.log(`📊 Found ${majorTasks.length} major tasks (no assigneeId)`);
  
      // ✅ 4. If no major tasks, try alternative query
      if (majorTasks.length === 0) {
        const alternativeTasks = await Task.find({
          eventId: eventId,
          milestoneId: milestoneId,
          $or: [
            { assigneeId: { $exists: false } },
            { assigneeId: null },
            { assigneeId: undefined }
          ]
        })
        .populate('departmentId', 'name')
        .sort({ createdAt: 1 });
  
        console.log(`📋 Alternative query found ${alternativeTasks.length} tasks`);
        majorTasks.push(...alternativeTasks);
      }
  
      // ✅ 5. Debug sample task if available
      if (majorTasks.length > 0) {
        console.log('🔍 Sample major task:', {
          id: majorTasks[0]._id,
          title: majorTasks[0].title,
          status: majorTasks[0].status,
          hasAssigneeId: !!majorTasks[0].assigneeId,
          departmentId: majorTasks[0].departmentId,
          createdAt: majorTasks[0].createdAt
        });
      }
  
      // ✅ 6. Generate timeline với safe date handling
      const dateRange = generateDateRange(startDate, endDate, 2);
      console.log(`📅 Generated ${dateRange.length} date points`);
  
      // ✅ 7. Calculate burnup data
      const burnupData = [];
      const today = new Date();
  
      for (const targetDate of dateRange) {
        // Tasks created before this date (scope)
        const tasksInScopeByDate = majorTasks.filter(task => 
          new Date(task.createdAt) <= targetDate
        );
  
        // Tasks completed by this date
        const completedTasksByDate = majorTasks.filter(task => {
          const isCompleted = task.status === TASK_STATUSES.DONE;
          const wasCreatedByDate = new Date(task.createdAt) <= targetDate;
          
          // For completed tasks, check if completed by target date
          // Since we don't have completedAt, use updatedAt as proxy
          const wasCompletedByDate = isCompleted && new Date(task.updatedAt) <= targetDate;
          
          return wasCreatedByDate && wasCompletedByDate;
        });
  
        // Calculate ideal progress
        const totalDays = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
        const daysPassed = Math.ceil((targetDate - startDate) / (24 * 60 * 60 * 1000));
        const idealProgress = Math.min(Math.max(daysPassed / totalDays, 0), 1);
        const idealTasksCompleted = Math.floor(tasksInScopeByDate.length * idealProgress);
  
        burnupData.push({
          date: targetDate.toISOString().split('T')[0],
          displayDate: targetDate.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit'
          }),
          totalMajorTasks: tasksInScopeByDate.length,
          completedMajorTasks: completedTasksByDate.length,
          idealMajorTasks: idealTasksCompleted,
          completionRate: tasksInScopeByDate.length > 0 
            ? Math.round((completedTasksByDate.length / tasksInScopeByDate.length) * 100)
            : 0
        });
      }
  
      // ✅ 8. Current summary stats
      const currentStats = {
        totalMajorTasks: majorTasks.length,
        completedMajorTasks: majorTasks.filter(t => t.status === TASK_STATUSES.DONE).length,
        inProgressMajorTasks: majorTasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS).length,
        todoMajorTasks: majorTasks.filter(t => t.status === TASK_STATUSES.NOT_STARTED).length,
        blockedMajorTasks: majorTasks.filter(t => t.status === TASK_STATUSES.CANCELLED).length,
        overallProgress: majorTasks.length > 0 
          ? Math.round((majorTasks.filter(t => t.status === TASK_STATUSES.DONE).length / majorTasks.length) * 100)
          : 0
      };
  
      // ✅ 9. Department stats for major tasks
      const departmentStats = await getDepartmentMajorTaskStats(eventId, milestoneId, majorTasks);
  
      console.log(`✅ Generated burnup data: ${burnupData.length} points, ${currentStats.totalMajorTasks} major tasks`);
  
      res.json({
        success: true,
        data: {
          milestone: {
            id: milestone._id,
            name: milestone.name,
            startDate: milestone.startDate,
            targetDate: milestone.targetDate,
            remainingDays: Math.ceil((endDate - today) / (24 * 60 * 60 * 1000))
          },
          burnupData: burnupData,
          currentStats: currentStats,
          departmentStats: departmentStats,
          debug: {
            totalTasksFound: majorTasks.length,
            dateRangePoints: dateRange.length,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      });
  
    } catch (error) {
      console.error('💥 Error getting burnup data:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
  
  /**
   * Helper function: Generate date range với safe date handling
   */
  const generateDateRange = (startDate, endDate, intervalDays = 2) => {
    try {
      // ✅ Convert to Date objects nếu chưa phải
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // ✅ Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('❌ Invalid dates provided to generateDateRange:', { startDate, endDate });
        
        // Return fallback date range (21 days ago to 7 days future)
        const fallbackStart = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
        const fallbackEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        console.log('🔄 Using fallback dates:', { 
          fallbackStart: fallbackStart.toISOString(),
          fallbackEnd: fallbackEnd.toISOString()
        });
        
        return generateDateRange(fallbackStart, fallbackEnd, intervalDays);
      }
  
      // ✅ Ensure start is before end
      if (start > end) {
        console.warn('⚠️ Start date after end date, swapping them');
        return generateDateRange(end, start, intervalDays);
      }
  
      const dates = [];
      const current = new Date(start);
      
      // ✅ Generate points với limit để prevent infinite loop
      let iterations = 0;
      const maxIterations = 50; // Prevent infinite loops
      
      while (current <= end && iterations < maxIterations) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + intervalDays);
        iterations++;
      }
      
      // ✅ Always include end date if not already included
      if (dates.length > 0 && dates[dates.length - 1].getTime() !== end.getTime()) {
        dates.push(new Date(end));
      }
  
      // ✅ Ensure we have at least 2 points
      if (dates.length < 2) {
        dates.push(new Date(end));
      }
      
      console.log(`📅 Generated ${dates.length} date points from ${start.toDateString()} to ${end.toDateString()}`);
      
      return dates;
    } catch (error) {
      console.error('💥 Error in generateDateRange:', error);
      
      // Return minimal fallback
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      return [weekAgo, now];
    }
  };
  
  /**
   * Helper function: Get department stats for major tasks với đúng schema
   */
  const getDepartmentMajorTaskStats = async (eventId, milestoneId, majorTasks) => {
    try {
      // ✅ Group major tasks by departmentId
      const tasksByDept = {};
      
      majorTasks.forEach(task => {
        const deptId = task.departmentId?._id?.toString() || task.departmentId?.toString() || 'unassigned';
        const deptName = task.departmentId?.name || 'Chưa phân ban';
        
        if (!tasksByDept[deptId]) {
          tasksByDept[deptId] = {
            departmentId: deptId,
            departmentName: deptName,
            tasks: []
          };
        }
        
        tasksByDept[deptId].tasks.push(task);
      });
  
      // ✅ Calculate stats với đúng status values
      const departmentStats = Object.values(tasksByDept).map(dept => {
        const totalTasks = dept.tasks.length;
        const completedTasks = dept.tasks.filter(t => t.status === TASK_STATUSES.DONE).length;
        const inProgressTasks = dept.tasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS).length;
        const notStartedTasks = dept.tasks.filter(t => t.status === TASK_STATUSES.NOT_STARTED).length;
        const cancelledTasks = dept.tasks.filter(t => t.status === TASK_STATUSES.CANCELLED).length;
        
        return {
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          majorTasksTotal: totalTasks,
          majorTasksCompleted: completedTasks,
          majorTasksInProgress: inProgressTasks,
          majorTasksTodo: notStartedTasks,
          majorTasksBlocked: cancelledTasks,
          majorTasksProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          tasks: dept.tasks.map(task => ({
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
            estimateUnit: task.estimateUnit
          }))
        };
      });
  
      return departmentStats;
  
    } catch (error) {
      console.error('💥 Error getting department stats:', error);
      return [];
    }
  };
  
  /**
   * @desc Get detailed task list for department burnup
   * @route GET /api/tasks/department-burnup/:eventId/:milestoneId/:departmentId  
   * @access Private
   */
  export const getDepartmentBurnupTasks = async (req, res) => {
    try {
      const { eventId, milestoneId, departmentId } = req.params;
  
      console.log(`📋 Getting department burnup for:`, { eventId, milestoneId, departmentId });
  
      // ✅ Get major tasks (no assigneeId) for specific department
      const majorTasks = await Task.find({
        eventId: eventId,
        milestoneId: milestoneId,
        departmentId: departmentId, // ✅ Use departmentId instead of assignedDepartment
        assigneeId: { $exists: false }, // ✅ Major tasks = no assigneeId
      })
      .populate('departmentId', 'name')
      .sort({ createdAt: 1 });
  
      console.log(`📊 Found ${majorTasks.length} major tasks for department ${departmentId}`);
  
      // ✅ Group by status với correct enum values
      const cancelledTasks = majorTasks.filter(t => t.status === TASK_STATUSES.CANCELLED);
      const tasksByStatus = {
        done: majorTasks.filter(t => t.status === TASK_STATUSES.DONE),
        in_progress: majorTasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS),
        todo: majorTasks.filter(t => t.status === TASK_STATUSES.NOT_STARTED),
        blocked: cancelledTasks,
        cancelled: cancelledTasks
      };
  
      // ✅ Calculate progress stats
      const stats = {
        total: majorTasks.length,
        completed: tasksByStatus.done.length,
        inProgress: tasksByStatus.in_progress.length,
        todo: tasksByStatus.todo.length,
        cancelled: tasksByStatus.cancelled.length,
        completionRate: majorTasks.length > 0 
          ? Math.round((tasksByStatus.done.length / majorTasks.length) * 100)
          : 0
      };
  
      res.json({
        success: true,
        data: {
          departmentId,
          departmentName: majorTasks[0]?.departmentId?.name || 'Unknown Department',
          stats,
          tasksByStatus,
          allTasks: majorTasks.map(task => ({
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
            dueDate: task.dueDate
          }))
        }
      });
  
    } catch (error) {
      console.error('💥 Error getting department burnup tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };