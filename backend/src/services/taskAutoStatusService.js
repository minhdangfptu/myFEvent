import Task from '../models/task.js';
import recalcParentsUpward from '../utils/recalcParentTask.js';

const TASK_STATUSES = {
  NOT_STARTED: 'chua_bat_dau',
  IN_PROGRESS: 'da_bat_dau',
  DONE: 'hoan_thanh'
};

/**
 * Tự động cập nhật trạng thái task sang "đã bắt đầu" khi đến thời gian bắt đầu
 * Chỉ cập nhật các task có:
 * - startDate đã đến (startDate <= now)
 * - status hiện tại là "chưa bắt đầu"
 * - có assigneeId (không phải parent task)
 */
export const autoUpdateTaskStatusByStartDate = async () => {
  try {
    const now = new Date();
    
    // Tìm các task cần cập nhật
    // - startDate đã được set và đã đến (startDate <= now)
    // - status hiện tại là "chưa bắt đầu"
    // - có assigneeId (không phải parent task)
    const tasksToUpdate = await Task.find({
      startDate: { $exists: true, $ne: null, $lte: now },
      status: TASK_STATUSES.NOT_STARTED,
      assigneeId: { $exists: true, $ne: null }, // Chỉ task có người assign
    }).lean();

    if (tasksToUpdate.length === 0) {
      return { updated: 0, tasks: [] };
    }

    const updatedTasks = [];
    
    // Cập nhật từng task
    for (const task of tasksToUpdate) {
      // Kiểm tra dependencies - chỉ update nếu không có dependencies hoặc tất cả đã done
      let canUpdate = true;
      
      if (task.dependencies && task.dependencies.length > 0) {
        const depsStatus = await Task.find({
          _id: { $in: task.dependencies },
          eventId: task.eventId,
        }).select('status').lean();
        
        const allDepsDone = depsStatus.every(dep => dep.status === TASK_STATUSES.DONE);
        if (!allDepsDone) {
          canUpdate = false;
        }
      }

      if (canUpdate) {
        const updated = await Task.findByIdAndUpdate(
          task._id,
          { 
            status: TASK_STATUSES.IN_PROGRESS,
            updatedAt: new Date()
          },
          { new: true }
        );

        if (updated) {
          updatedTasks.push(updated);
          
          // Recalculate parent nếu có
          if (updated.parentId) {
            await recalcParentsUpward(updated.parentId, updated.eventId);
          }
        }
      }
    }

    if (updatedTasks.length > 0) {
      console.log(`[Auto Status] Đã cập nhật ${updatedTasks.length} task sang trạng thái "đã bắt đầu"`);
    }

    return { 
      updated: updatedTasks.length, 
      tasks: updatedTasks.map(t => ({ id: t._id, title: t.title }))
    };
  } catch (error) {
    console.error('[Auto Status] Lỗi khi tự động cập nhật trạng thái task:', error);
    return { updated: 0, tasks: [], error: error.message };
  }
};

/**
 * Khởi động scheduled task để chạy định kỳ
 * Chạy mỗi phút để kiểm tra các task cần cập nhật
 */
export const startTaskAutoStatusScheduler = () => {
  // console.log('[Auto Status] Đã khởi động scheduler tự động cập nhật trạng thái task');
  
  // Chạy ngay lập tức lần đầu
  autoUpdateTaskStatusByStartDate();
  
  // Sau đó chạy mỗi phút
  const interval = setInterval(() => {
    autoUpdateTaskStatusByStartDate();
  }, 60 * 1000); // 60 giây = 1 phút
  
  return interval;
};
