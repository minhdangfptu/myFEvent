// controllers/aiTaskController.js
import Task from '../../models/task.js';
import Event from '../../models/event.js';
import ensureEventRole from '../../utils/ensureEventRole.js';

/**
 * POST /api/events/:eventId/epics/:epicId/tasks/ai-bulk-create
 *
 * Body từ Python (tools/tasks.py):
 * {
 *   "tasks": [
 *     {
 *       "title": "string",
 *       "description": "string",
 *       "priority": "low | medium | high",
 *       "can_parallel": true,
 *       "depends_on": ["title task A", ...],
 *       "offset_days_from_event": -10
 *     }
 *   ],
 *   "eventStartDate": "2025-11-28",   // optional, yyyy-mm-dd
 *   "epicTitle": "Chuẩn bị nội dung chương trình",
 *   "department": "ban nội dung"
 * }
 */
export const aiBulkCreateTasksForEpic = async (req, res) => {
  try {
    const { eventId, epicId } = req.params;
    const { tasks, eventStartDate, epicTitle, department } = req.body || {};

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'tasks must be a non-empty array' });
    }

    // 1) Quyền: chỉ HoOC được dùng AI để sinh task
    const membership = await ensureEventRole(req.user.id, eventId, ['HoOC']);
    if (!membership) {
      return res.status(403).json({ message: 'Chỉ HoOC mới được sinh task bằng AI' });
    }

    // 2) Check Event
    const event = await Event.findById(eventId)
      .select('_id name eventStartDate')
      .lean();
    if (!event) {
      return res.status(404).json({ message: 'Event không tồn tại' });
    }

    // 3) Check EPIC trong event này + phải là taskType = 'epic'
    const epic = await Task.findOne({
      _id: epicId,
      eventId,
      taskType: 'epic',
    }).lean();

    if (!epic) {
      return res.status(404).json({ message: 'Epic không tồn tại trong event này' });
    }

    if (!epic.departmentId) {
      return res.status(400).json({
        message: 'Epic không gắn với ban nào (departmentId bị thiếu)',
      });
    }

    // 4) Xác định baseDate dùng cho offset_days_from_event
    let baseDate = null;
    if (eventStartDate) {
      const d = new Date(eventStartDate);
      if (!Number.isNaN(d.getTime())) {
        baseDate = d;
      }
    }
    if (!baseDate && event.eventStartDate) {
      const d = new Date(event.eventStartDate);
      if (!Number.isNaN(d.getTime())) {
        baseDate = d;
      }
    }

    const errors = [];
    const docsToCreate = [];
    const meta = []; // giữ planIndex để map lại sau

    // Map title → danh sách index trong mảng tasks plan (để xử lý depends_on)
    const titleToPlanIndices = new Map();

    tasks.forEach((plan, index) => {
      if (!plan || !plan.title) {
        errors.push(`TASK[#${index}] thiếu title`);
        return;
      }

      const title = String(plan.title).trim();
      const desc = plan.description ? String(plan.description) : '';

      // priority → gợi ý estimate (hoàn toàn heuristic, không bắt buộc)
      const priority = (plan.priority || '').toLowerCase();
      let estimate = undefined;
      if (priority === 'high') estimate = 8;
      else if (priority === 'medium') estimate = 4;
      else if (priority === 'low') estimate = 2;

      const offset = plan.offset_days_from_event;
      let startDate;
      let dueDate;

      // Nếu có baseDate & offset_days_from_event → compute startDate
      if (
        baseDate &&
        typeof offset === 'number' &&
        Number.isFinite(offset)
      ) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + offset);
        startDate = date;
        // đơn giản: để dueDate = startDate (vì chỉ là task gợi ý)
        dueDate = date;
      }

      docsToCreate.push({
        title,
        description: desc,
        eventId: event._id,
        departmentId: epic.departmentId,
        parentId: epic._id,

        taskType: 'normal',      // EPIC = 'epic', task con = 'normal'
        status: 'suggested',     // task do AI sinh ra → trạng thái "gợi ý"
        progressPct: 0,

        estimate,
        estimateUnit: 'h',
        suggestedTeamSize: undefined,

        startDate,
        dueDate,

        createdBy: req.user.id,
      });

      meta.push({ planIndex: index });

      const key = title.toLowerCase();
      if (!titleToPlanIndices.has(key)) {
        titleToPlanIndices.set(key, []);
      }
      titleToPlanIndices.get(key).push(index);
    });

    if (docsToCreate.length === 0) {
      return res.status(400).json({
        message: 'Không có task hợp lệ nào để tạo',
        errors,
      });
    }

    // 5) Insert tất cả task con (chưa set dependencies)
    const createdTasks = await Task.insertMany(docsToCreate);

    // Map: planIndex -> createdTask
    const planIndexToTask = new Map();
    createdTasks.forEach((doc, i) => {
      const { planIndex } = meta[i];
      planIndexToTask.set(planIndex, doc);
    });

    // 6) Xử lý depends_on (theo title) → dependencies (ObjectId)
    //    - depends_on: ["title task A", ...]
    //    - ta map title → những planIndex tương ứng, rồi lấy Task _id của chúng

    const bulkOps = [];

    tasks.forEach((plan, planIndex) => {
      const createdDoc = planIndexToTask.get(planIndex);
      if (!createdDoc) return;

      const dependsOnTitles = Array.isArray(plan.depends_on)
        ? plan.depends_on
        : [];

      if (!dependsOnTitles.length) return;

      const depIds = [];

      for (const rawTitle of dependsOnTitles) {
        const depTitle = String(rawTitle || '').trim();
        if (!depTitle) continue;

        const key = depTitle.toLowerCase();
        const planIndices = titleToPlanIndices.get(key);
        if (!planIndices || !planIndices.length) continue;

        // hiện tại: lấy task tương ứng với planIndex đầu tiên
        // (nếu trùng tên, chúng sẽ trỏ tới cùng 1 task)
        const depPlanIndex = planIndices[0];
        const depTask = planIndexToTask.get(depPlanIndex);
        if (depTask) {
          depIds.push(depTask._id);
        }
      }

      if (depIds.length) {
        bulkOps.push({
          updateOne: {
            filter: { _id: createdDoc._id },
            update: { $set: { dependencies: depIds } },
          },
        });
      }
    });

    if (bulkOps.length) {
      await Task.bulkWrite(bulkOps);
    }

    // Lấy lại danh sách task đã tạo (kèm dependencies)
    const finalTaskIds = createdTasks.map((t) => t._id);
    const finalTasks = await Task.find({ _id: { $in: finalTaskIds } }).lean();

    return res.status(201).json({
      message: 'AI bulk create tasks for epic completed',
      data: finalTasks,
      errors,
      meta: {
        epicId,
        epicTitle: epicTitle || epic.title,
        departmentFromEpic: epic.departmentId,
        departmentFromPayload: department || null,
      },
    });
  } catch (err) {
    console.error('aiBulkCreateTasksForEpic error:', err);
    return res.status(500).json({
      message: 'Tạo task cho EPIC thất bại',
      error: err.message,
    });
  }
};
