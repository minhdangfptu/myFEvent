// tests/TaskController/taskController.deleteTask.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  __esModule: true,
  deleteTaskService: vi.fn(),
  // mock rỗng các hàm khác
  listTasksByEventOrDepartmentService: vi.fn(),
  getTaskDetailService: vi.fn(),
  getTaskByDepartmentService: vi.fn(),
  createTaskService: vi.fn(),
  editTaskService: vi.fn(),
  updateTaskProgressService: vi.fn(),
  assignTaskService: vi.fn(),
  unassignTaskService: vi.fn(),
  getEventTaskProgressChartService: vi.fn(),
  getEpicTasksForExportService: vi.fn(),
  getTaskStatisticsByMilestoneService: vi.fn(),
  getBurnupChartDataService: vi.fn(),
  getDepartmentBurnupTasksService: vi.fn(),
}));

import ensureEventRole from '../../../utils/ensureEventRole.js';
import { deleteTaskService } from '../../../services/taskService.js';
import { deleteTask } from '../../taskController.js';

describe('TaskController.deleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should delete task successfully and return 200', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoD' });
    deleteTaskService.mockResolvedValue(undefined);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
    });
    const res = createMockRes();

    await deleteTask(req, res);

    expect(deleteTaskService).toHaveBeenCalledWith({
      eventId: 'event-1',
      taskId: 'task-1',
      userId: 'user-id-1',
      member: { role: 'HoD' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Đã xoá task thành công.',
    });
  });

  it('[Abnormal] TC02 - should return 403 when user does not have permission', async () => {
    ensureEventRole.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
    });
    const res = createMockRes();

    await deleteTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được xoá task.',
    });
    expect(deleteTaskService).not.toHaveBeenCalled();
  });

  it('[Abnormal] TC03 - should return 409 when task has dependencies', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoD' });

    const err = new Error('Không xóa được vì đang có task phụ thuộc');
    err.statusCode = 409;
    err.meta = { dependents: 2, children: 1 };
    deleteTaskService.mockRejectedValue(err);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
    });
    const res = createMockRes();

    await deleteTask(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Không xóa được vì đang có task phụ thuộc',
      meta: { dependents: 2, children: 1 },
    });
  });
});
