import mongoose from 'mongoose';
import Task from '../models/task.js';

/**
 * Lấy danh sách công việc lớn (epic) theo event, kèm số lượng task con.
 * Dùng cho export Excel và các thống kê khác.
 */
export const getEpicTasksForExport = async (eventId) => {
  try {
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return [];
    }
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // Đếm tổng task để debug
    const totalTasks = await Task.countDocuments({ eventId: eventObjectId });

    // 1. Lấy đúng epic task
    let [epicTasks, subTaskCounts] = await Promise.all([
      Task.find({ eventId: eventObjectId, taskType: 'epic' })
        .populate('departmentId', 'name')
        .populate('milestoneId', 'name')
        .sort({ startDate: 1, title: 1 })
        .lean(),
      Task.aggregate([
        {
          $match: {
            eventId: eventObjectId,
            parentId: { $ne: null },
            taskType: { $ne: 'epic' },
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

    console.log('📊 Task export debug:', {
      eventId,
      totalTasks,
      epicCount: epicTasks.length,
    });

    // 2. Fallback: nếu không có epic nhưng có task, dùng các task parent (parentId = null)
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

      console.log('📊 Fallback majorTasks (parentId = null):', {
        majorCount: majorTasks.length,
      });

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
      status: task.status || 'chua_bat_dau',
      milestoneName: task.milestoneId?.name || '',
      startDate: task.startDate || null,
      endDate: task.dueDate || null,
      subTaskCount: subTaskCountMap[task._id?.toString()] || 0,
      taskType: task.taskType || 'epic',
    }));
  } catch (error) {
    console.error('❌ Error fetching epic tasks for export:', error);
    return [];
  }
};


