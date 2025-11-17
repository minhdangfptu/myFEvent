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
// GET /api/tasks/:eventId?departmentId=...: (HoOC/HoD/Mem)
//http://localhost:8080/api/tasks/68fd264703c943724fa8cbff?departmentId=6500000000000000000000a1
export const listTasksByEventOrDepartment = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { departmentId, search, status } = req.query;
        // Check quyền
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) return res.status(403).json({ message: 'Không có quyền xem task' });
        // Build filter
        let filter = { eventId };
        if (departmentId) filter.departmentId = departmentId;
        if (search) filter.title = { $regex: search, $options: 'i' };
        if (status) filter.status = status;
        // Add populate for assigneeId and departmentId (with name fields)
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
                { path: 'departmentId', select: 'name' }
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
                        { path: 'userId', model: 'User', select: 'fullName email avatarUrl' },
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
                        { path: 'userId', model: 'User', select: 'fullName email avatarUrl' },
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
            startDate, dueDate, estimate, estimateUnit, milestoneId, parentId, dependencies,
            suggestedTeamSize
        } = req.body;

        if (!departmentId) return res.status(400).json({ message: 'Thiếu departmentId' });

        // Gom lỗi
        const errors = [];

        // Không cho parent nằm trong dependencies
        if (parentId && dependencies.includes(String(parentId))) {
            errors.push('parentId không được xuất hiện trong dependencies');
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
        const checks = await Promise.all([
            // Department thuộc event
            Department.exists({ _id: departmentId, eventId }),
            // Assignee (EventMember) thuộc event
            assigneeId ? EventMember.exists({ _id: assigneeId, eventId }) : Promise.resolve(true),
            // Milestone thuộc event
            milestoneId ? Milestone.exists({ _id: milestoneId, eventId }) : Promise.resolve(true),
            // Parent task thuộc event
            parentId ? Task.exists({ _id: parentId, eventId }) : Promise.resolve(true),
            // Dependencies: tất cả tasks phải thuộc event
            dependencies.length
                ? Task.find({ _id: { $in: dependencies }, eventId }).select('_id').lean()
                : Promise.resolve([])
        ]);

        const [deptOk, assigneeOk, milestoneOk, parentOk, depFound] = checks;

        if (!deptOk) errors.push('departmentId không tồn tại trong event này');
        if (!assigneeOk) errors.push('assigneeId không tồn tại trong event này');
        if (!milestoneOk) errors.push('milestoneId không tồn tại trong event này');
        if (!parentOk) errors.push('parentId không tồn tại trong event này');

        if (Array.isArray(depFound)) {
            const foundIds = new Set(depFound.map(d => String(d._id)));
            const missing = dependencies.filter(id => !foundIds.has(String(id)));
            if (missing.length) errors.push(`dependencies không hợp lệ hoặc không thuộc event: ${missing.join(', ')}`);
        }

        if (errors.length) return res.status(400).json({ message: 'Tham chiếu không hợp lệ', errors });

        // Tạo task
        const t = await Task.create({
            title,
            description,
            eventId,
            departmentId,
            assigneeId: assigneeId || undefined,
            startDate: startDate || undefined,
            dueDate,
            estimate,
            estimateUnit,
            milestoneId: milestoneId || undefined,
            parentId: parentId || undefined,
            dependencies: dependencies,
            suggestedTeamSize: suggestedTeamSize || undefined
        });

        // Thông báo khi giao việc cho Member
        if (assigneeId) {
            try {
                await notifyTaskAssigned(eventId, t._id, assigneeId);
            } catch (notifyErr) {
                console.error('Error sending notification:', notifyErr);
                // Không fail request nếu notification lỗi
            }
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

        // Nếu task status không phải "todo", không cho phép edit
        if (currentTask.status !== 'todo') {
            return res.status(403).json({ 
                message: 'Không thể chỉnh sửa task khi trạng thái không phải "todo". Chỉ có thể cập nhật trạng thái thông qua API updateTaskProgress.' 
            });
        }

        const update = req.body;
        if (!update) return res.status(404).json({ message: "Chưa có thông tin cập nhật" })

        const errors = [];

        const deps = Array.isArray(update.dependencies) ? update.dependencies.map(String) : [];

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
        const taskForValidation = update.startDate || update.dueDate ? await Task.findOne({ _id: taskId, eventId }).lean() : null;
        const finalStartDate = update.startDate ? new Date(update.startDate) : (taskForValidation?.startDate ? new Date(taskForValidation.startDate) : null);
        const finalDueDate = update.dueDate ? new Date(update.dueDate) : (taskForValidation?.dueDate ? new Date(taskForValidation.dueDate) : null);
        
        if (finalStartDate && finalDueDate && finalStartDate >= finalDueDate) {
            errors.push('Thời gian bắt đầu phải trước deadline');
        }
        // Validate tồn tại/cùng event
        const [
            deptOk,
            assigneeOk,
            milestoneOk,
            parentOk,
            depFound
        ] = await Promise.all([
            update.departmentId ? Department.exists({ _id: update.departmentId, eventId }) : Promise.resolve(true),
            update.assigneeId ? EventMember.exists({ _id: update.assigneeId, eventId }) : Promise.resolve(true),
            update.milestoneId ? Milestone.exists({ _id: update.milestoneId, eventId }) : Promise.resolve(true),
            update.parentId ? Task.exists({ _id: update.parentId, eventId }) : Promise.resolve(true),
            deps.length ? Task.find({ _id: { $in: deps }, eventId }).select('_id').lean() : Promise.resolve([])
        ]);

        if (!deptOk) errors.push('departmentId không tồn tại trong event này');
        if (!assigneeOk) errors.push('assigneeId không tồn tại trong event này');
        if (!milestoneOk) errors.push('milestoneId không tồn tại trong event này');
        if (!parentOk) errors.push('parentId không tồn tại trong event này');

        if (Array.isArray(depFound)) {
            const foundIds = new Set(depFound.map(d => String(d._id)));
            const missing = deps.filter(id => !foundIds.has(String(id)));
            if (missing.length) {
                errors.push(`dependencies không hợp lệ hoặc không thuộc event: ${missing.join(', ')}`);
            }
            // Chặn tự phụ thuộc
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
        
        // Không cho phép xóa task khi status là "in_progress"
        if (task.status === 'in_progress') {
            return res.status(403).json({ 
                message: 'Không thể xóa task khi đang ở trạng thái "in_progress".' 
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
        const ALLOWED = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'];

        // 1) Lấy task
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });

        // 2) Parent task (assigneeId = null) không cho chỉnh trực tiếp
        if (!task.assigneeId) {
            return res.status(403).json({ message: 'Task giao cho ban không được chỉnh trực tiếp. Trạng thái/tiến độ tự tính theo task con.' });
        }

        // 3) Quyền - CHỈ assignee mới được cập nhật trạng thái task
        const isAssignee = String(task.assigneeId) === String(member._id); // assigneeId là EventMember._id
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
        if (status && (status === 'in_progress' || status === 'done')) {
            const deps = task.dependencies || [];
            if (deps.length) {
                depsNotDone = await Task.countDocuments({
                    _id: { $in: deps },     // chỉ các task có _id nằm trong danh sách dependencies
                    eventId,                // thuộc cùng event (tránh đếm nhầm event khác)
                    status: { $ne: 'done' } // có trạng thái KHÁC 'done'  → nghĩa là chưa xong
                });
            }
        }

        const isStarting = status === 'in_progress' && (task.status === 'todo' || task.status === 'blocked');
        const isFinishing = status === 'done';

        // Assignee phải tuân thủ deps
        if ((isStarting || isFinishing) && depsNotDone > 0) {
            return res.status(409).json({ message: 'Chưa thể thực hiện: còn task phụ thuộc chưa done.' });
        }
        
        // Assignee không được cancel
        if (status === 'cancelled') {
            return res.status(403).json({ message: 'Assignee không được đặt trạng thái cancelled.' });
        }
        
        // Kiểm soát chuyển trạng thái cho assignee
        const NEXT = {
            todo: ['in_progress'],
            in_progress: ['blocked', 'done'],
            blocked: ['in_progress'],
            done: [],
            cancelled: []
        };
        if (status && !NEXT[task.status]?.includes(status)) {
            return res.status(409).json({ message: `Không thể chuyển từ ${task.status} → ${status} với vai trò hiện tại.` });
        }

        // 6) Áp trạng thái
        if (status) {
            task.status = status;
            if (status === 'done' && typeof progressPct === 'undefined') task.progressPct = 100;
        }

        await task.save();

        // 7) Recalculate parent theo rule parent
        const recalcParentsUpward = (await import('../utils/recalcParentTask.js')).default;
        await recalcParentsUpward(task.parentId, eventId);

        // 8) Thông báo khi task hoàn thành
        if (status === 'done') {
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
        return res.status(500).json({ message: 'Cập nhật progress thất bại' });
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
        const assigneeExists = await EventMember.exists({ _id: assigneeId, eventId });
        if (!assigneeExists) {
            return res.status(404).json({ message: 'Người được gán không tồn tại trong sự kiện này' });
        }
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
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
