import Task from '../models/task.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';
import Department from '../models/department.js'
import Milestone from '../models/milestone.js'
import eventMember from '../models/eventMember.js';
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
            dueDate, estimate, estimateUnit, milestoneId, parentId, dependencies
        } = req.body;

        if (!departmentId) return res.status(400).json({ message: 'Thiếu departmentId' });

        // Gom lỗi
        const errors = [];

        // Không cho parent nằm trong dependencies
        if (parentId && dependencies.includes(String(parentId))) {
            errors.push('parentId không được xuất hiện trong dependencies');
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
            dueDate,
            estimate,
            estimateUnit,
            milestoneId: milestoneId || undefined,
            parentId: parentId || undefined,
            dependencies: dependencies
        });

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

        const update = req.body;
        if (!update) return res.status(404).json({ message: "Chưa có thông tin cập nhật" })

        const errors = [];

        const deps = Array.isArray(update.dependencies) ? update.dependencies.map(String) : [];

        if (update.parentId && deps.includes(String(update.parentId))) {
            errors.push('parentId không được xuất hiện trong dependencies');
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
        const task = await Task.findOneAndDelete({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        const dependents = await Task.countDocuments({ eventId, dependencies: task._id });
        const children = await Task.countDocuments({ eventId, parentId: task._id });
        if (dependents || children) {
            return res.status(409).json({
                message: 'Không xóa được vì đang có task phụ thuộc',
                meta: { dependents, children }
            });
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

        const { status, progressPct, force = false } = req.body || {};
        const ALLOWED = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'];

        // 1) Lấy task
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });

        // 2) Parent task (assigneeId = null) không cho chỉnh trực tiếp
        if (!task.assigneeId) {
            return res.status(403).json({ message: 'Task giao cho ban (parent) không được chỉnh trực tiếp. Trạng thái/tiến độ tự tính theo task con.' });
        }

        // 3) Quyền
        const isManager = ['HoOC', 'HoD'].includes(member.role);
        const isAssignee = String(task.assigneeId) === String(member._id); // assigneeId là EventMember._id
        //Tức là assignee có quyền thấp nhất, chỉ được cập nhật trạng thái task của mình
        // Hod Và Hooc sẽ xem được parent task progress tổng, còn member thì không
        if (!isManager && !isAssignee) {
            return res.status(403).json({ message: 'Chỉ người nhận task mới được cập nhật.' });
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

        if (!isManager) {
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
        } else {
            // Manager có thể override deps khi force=true
            if ((isStarting || isFinishing) && depsNotDone > 0 && !force) {
                return res.status(409).json({ message: 'Còn task phụ thuộc chưa done. Nếu muốn bỏ qua, gửi force=true.' });
            }
        }

        // 6) Áp trạng thái
        if (status) {
            task.status = status;
            if (status === 'done' && typeof progressPct === 'undefined') task.progressPct = 100;
        }

        await task.save();

        // 7) Recalculate parent theo rule parent
        await recalcParentsUpward(task.parentId, eventId);

        return res.status(200).json({ message: "Update Task progress successfully", data: task });
    } catch (err) {
        return res.status(500).json({ message: 'Cập nhật progress thất bại' });
    }
};

/**
 * Recalculate parent (assigneeId=null) dựa trên các con:
 * - done nếu tất cả con done
 * - in_progress nếu có ít nhất 1 con đã start
 * - todo nếu chưa con nào start
 * - progressPct = trung bình progressPct của con
 * Đệ quy lên ancestor.
 */
async function recalcParentsUpward(parentId, eventId) {
    if (!parentId) return;

    const parent = await Task.findOne({ _id: parentId, eventId });
    if (!parent) return;

    // Chỉ auto-calc cho parent giao cho ban
    if (parent.assigneeId) return;

    const children = await Task.find({ eventId, parentId: parent._id }).select('status progressPct');
    const total = children.length;

    if (total === 0) {
        parent.status = 'todo';
        parent.progressPct = 0;
    } else {
        const doneCount = children.filter(c => c.status === 'done').length;
        const startedCount = children.filter(c => c.status !== 'todo').length;
        const avgProgress = Math.round(children.reduce((s, c) => s + (Number(c.progressPct) || 0), 0) / total);

        if (doneCount === total) parent.status = 'done';
        else if (startedCount > 0) parent.status = 'in_progress';
        else parent.status = 'todo';

        parent.progressPct = avgProgress;
    }

    await parent.save();
    return recalcParentsUpward(parent.parentId, eventId);
}


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
