// tests/TaskController/taskController.getTaskDetail.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  __esModule: true,
  getTaskDetailService: vi.fn(),
  // mock rỗng các hàm khác
  listTasksByEventOrDepartmentService: vi.fn(),
  getTaskByDepartmentService: vi.fn(),
  createTaskService: vi.fn(),
  editTaskService: vi.fn(),
  deleteTaskService: vi.fn(),
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
import { getTaskDetailService } from '../../../services/taskService.js';
import { getTaskDetail } from '../../taskController.js';

describe('TaskController.getTaskDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should return 200 with task data when successful', async () => {
    ensureEventRole.mockResolvedValue({ role: 'Member' });
    const mockTask = { _id: 'task-1' };
    getTaskDetailService.mockResolvedValue(mockTask);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
    });
    const res = createMockRes();

    await getTaskDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockTask });
  });

  it('[Abnormal] TC02 - should return 403 when user does not have permission', async () => {
    ensureEventRole.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
    });
    const res = createMockRes();

    await getTaskDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Không có quyền xem chi tiết task',
    });
    expect(getTaskDetailService).not.toHaveBeenCalled();
  });

  it('[Abnormal] TC03 - should return 404 when task does not exist', async () => {
    ensureEventRole.mockResolvedValue({ role: 'Member' });
    getTaskDetailService.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
    });
    const res = createMockRes();

    await getTaskDetail(req, res);

    expect(getTaskDetailService).toHaveBeenCalledWith({
      eventId: 'event-1',
      taskId: 'task-1',
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Task không tồn tại',
    });
  });
});
