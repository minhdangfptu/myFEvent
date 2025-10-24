import Task from '../models/task.js';
import EventMember from '../models/eventMember.js';


// ======= Helper kiểm tra quyền =======
const ensureEventRole = async (userId, eventId, allowedRoles = ['HoOC', 'HoD', 'staff']) => {
    const m = await EventMember.findOne({ eventId, userId }).lean();
    if (!m) return null;
    if (!allowedRoles.includes(m.role)) return null;
    return m;
};


// GET /api/events/:eventId/tasks?departmentId=...: (HoOC/HoD/Mem)
export const listTasksByEventOrDepartment = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { departmentId, search, status } = req.query;
        // Check quyền
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'staff']);
        if (!member) return res.status(403).json({ message: 'Không có quyền xem task' });
        // Build filter
        let filter = { eventId };
        if (departmentId) filter.departmentId = departmentId;
        if (search) filter.title = { $regex: search, $options: 'i' };
        if (status) filter.status = status;
        const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ data: tasks });
    } catch (err) { return res.status(500).json({ message: 'Lỗi lấy danh sách task' }); }
};

// GET /api/events/:eventId/tasks/:taskId (HoOC/HoD/Mem)
export const getTaskDetail = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'staff']);
        if (!member) return res.status(403).json({ message: 'Không có quyền xem chi tiết task' });
        const task = await Task.findOne({ _id: taskId, eventId })
            .populate('assigneeId', 'fullName email avatarUrl')
            .populate('departmentId', 'name')
            .lean();
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        return res.status(200).json({ data: task });
    } catch (err) { return res.status(500).json({ message: 'Lỗi lấy chi tiết task' }); }
};


// POST /api/events/:eventId/tasks (HoD)
export const createTask = async (req, res) => {
    try {
        const { eventId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoD được tạo task.' });
        const { title, description, departmentId, assigneeId, dueDate, estimate, estimateUnit, milestoneId, parentId, dependencies } = req.body;
        if (!departmentId) return res.status(400).json({ message: 'Thiếu departmentId' });
        const t = await Task.create({
            title, description, eventId, departmentId, assigneeId,
            dueDate, estimate, estimateUnit, milestoneId, parentId, dependencies
        });
        return res.status(201).json({ data: t });
    } catch (err) { return res.status(500).json({ message: 'Tạo task thất bại' }); }
};

// PATCH /api/events/:eventId/tasks/:taskId (HoD)
export const editTask = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoD được sửa task.' });
        const update = req.body;
        const task = await Task.findOneAndUpdate({ _id: taskId, eventId }, update, { new: true });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        return res.status(200).json({ data: task });
    } catch (err) { return res.status(500).json({ message: 'Sửa task thất bại' }); }
};

// DELETE /api/events/:eventId/tasks/:taskId (HoD)
export const deleteTask = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoD được xoá task.' });
        const task = await Task.findOneAndDelete({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        return res.status(200).json({ message: 'Đã xoá task.' });
    } catch (err) { return res.status(500).json({ message: 'Xoá task thất bại' }); }
};

// PATCH /api/events/:eventId/tasks/:taskId/progress (Mem)
export const updateTaskProgress = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['staff']);
        if (!member) return res.status(403).json({ message: 'Chỉ Mem mới update progress.' });
        const { progressPct, status } = req.body;
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        // Chỉ cho assignee cập nhật
        if (task.assigneeId?.toString() !== req.user.id) { return res.status(403).json({ message: 'Chỉ người nhận task được cập nhật' }); }
        if (progressPct !== undefined) task.progressPct = progressPct;
        if (status) task.status = status;
        await task.save();
        return res.status(200).json({ data: task });
    } catch (err) { return res.status(500).json({ message: 'Cập nhật progress thất bại' }); }
};

// PATCH /api/events/:eventId/tasks/:taskId/assign (HoD)
export const assignTask = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoD được gán task.' });
        const { assigneeId } = req.body;
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        task.assigneeId = assigneeId;
        await task.save();
        return res.status(200).json({ data: task });
    } catch (err) { return res.status(500).json({ message: 'Gán task thất bại' }); }
};

// PATCH /api/events/:eventId/tasks/:taskId/unassign (HoD)
export const unassignTask = async (req, res) => {
    try {
        const { eventId, taskId } = req.params;
        const member = await ensureEventRole(req.user.id, eventId, ['HoD']);
        if (!member) return res.status(403).json({ message: 'Chỉ HoD được huỷ gán task.' });
        const task = await Task.findOne({ _id: taskId, eventId });
        if (!task) return res.status(404).json({ message: 'Task không tồn tại' });
        task.assigneeId = undefined;
        await task.save();
        return res.status(200).json({ data: task });
    } catch (err) { return res.status(500).json({ message: 'Huỷ gán task thất bại' }); }
};

// GET /api/events/:eventId/tasks/progress (HoOC/HoD)
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
