/* eslint-disable no-unused-vars */
// controllers/aiEpicController.js
import ensureEventRole from '../../utils/ensureEventRole.js';
import Task from '../../models/task.js';
import Department from '../../models/department.js';
import Event from '../../models/event.js';

export const aiBulkCreateEpics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { epics } = req.body || {};

    if (!epics || !Array.isArray(epics) || epics.length === 0) {
      return res.status(400).json({ message: 'epics must be a non-empty array' });
    }

    // 1) Chỉ HoOC
    const membership = await ensureEventRole(req.user.id, eventId, ['HoOC']);
    if (!membership) {
      return res.status(403).json({ message: 'Chỉ HoOC mới được sinh EPIC bằng AI' });
    }

    // 2) Event tồn tại
    const event = await Event.findById(eventId).select('_id name').lean();
    if (!event) {
      return res.status(404).json({ message: 'Event không tồn tại' });
    }

    // 3) Lấy danh sách Department hiện có
    const departments = await Department.find({ eventId }).select('_id name').lean();

    const deptMapById = new Map(departments.map(d => [String(d._id), d]));
    const deptMapByName = new Map(
      departments.map(d => [d.name.toLowerCase().trim(), d])
    );

    const createdEpics = [];
    const errors = [];

    for (const [index, epic] of epics.entries()) {
      const {
        title,
        description,
        department,   // string từ AI: "Ban Nội Dung" ...
        departmentId,
        phase,        // nếu sau này muốn lưu
      } = epic || {};

      if (!title || !department) {
        errors.push(`EPIC[#${index}] thiếu title hoặc department`);
        continue;
      }

      // Chuẩn hóa tên ban
      const rawDeptName = String(department).trim();
      const key = rawDeptName.toLowerCase();

      let deptDoc = null;

      // Ưu tiên departmentId nếu đúng event
      if (departmentId && deptMapById.has(String(departmentId))) {
        deptDoc = deptMapById.get(String(departmentId));
      } else {
        // thử map theo tên
        deptDoc = deptMapByName.get(key);
      }

      // ❗ Nếu vẫn không có => tự tạo Department mới
      if (!deptDoc) {
        const newDept = await Department.create({
          eventId: event._id,
          name: rawDeptName,
          description: `[AI] Ban được tạo tự động cho EPIC: ${title}`,
        });

        deptDoc = newDept.toObject();
        // Cập nhật lại map để các EPIC sau dùng được luôn
        deptMapById.set(String(newDept._id), deptDoc);
        deptMapByName.set(key, deptDoc);
      }

      // Tạo EPIC trong Task collection
      const taskDoc = await Task.create({
        title,
        description: description || '',
        eventId: event._id,
        departmentId: deptDoc._id,
        parentId: null,
        assigneeId: null,
        status: 'chua_bat_dau',  // task do AI sinh ra → trạng thái "chưa bắt đầu" (thay vì 'suggested' vì không có trong enum)
        taskType: 'epic',         // giữ taskType để phân biệt
        createdBy: req.user.id,   // Người apply plan sẽ là người tạo EPIC
      });

      // Convert sang plain object để đảm bảo _id được serialize đúng khi trả về JSON
      // Sử dụng toObject() với option để include tất cả fields
      const epicObj = taskDoc.toObject ? taskDoc.toObject({ virtuals: false }) : {
        _id: taskDoc._id,
        title: taskDoc.title,
        description: taskDoc.description,
        eventId: taskDoc.eventId,
        departmentId: taskDoc.departmentId,
        parentId: taskDoc.parentId,
        assigneeId: taskDoc.assigneeId,
        status: taskDoc.status,
        taskType: taskDoc.taskType,
        createdBy: taskDoc.createdBy,
        createdAt: taskDoc.createdAt,
        updatedAt: taskDoc.updatedAt,
      };
      createdEpics.push(epicObj);
    }

    return res.status(201).json({
      message: 'AI bulk create epics completed',
      data: createdEpics,
      errors,
    });
  } catch (err) {
    console.error('aiBulkCreateEpics error:', err);
    return res.status(500).json({ message: 'Tạo EPIC thất bại', error: err.message });
  }
};
