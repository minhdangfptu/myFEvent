// tests/TaskController/taskController.unassignTask.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  __esModule: true,
  unassignTaskService: vi.fn(),
  // mock rỗng các hàm khác
  listTasksByEventOrDepartmentService: vi.fn(),
  getTaskDetailService: vi.fn(),
  getTaskByDepartmentService: vi.fn(),
  createTaskService: vi.fn(),
  editTaskService: vi.fn(),
  deleteTaskService: vi.fn(),
  updateTaskProgressService: vi.fn(),
  assignTaskService: vi.fn(),
  getEventTaskProgressChartService: vi.fn(),
  getEpicTasksForExportService: vi.fn(),
  getTaskStatisticsByMilestoneService: vi.fn(),
  getBurnupChartDataService: vi.fn(),
  getDepartmentBurnupTasksService: vi.fn(),
}));

import ensureEventRole from '../../../utils/ensureEventRole.js';
import { unassignTaskService } from '../../../services/taskService.js';
import { unassignTask } from '../../taskController.js';

describe('TaskController.unassignTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trả 403 nếu không có quyền', async () => {
    ensureEventRole.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
    });
    const res = createMockRes();

    await unassignTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được huỷ gán task.',
    });
    expect(unassignTaskService).not.toHaveBeenCalled();
  });

  it('trả 200 với data khi huỷ gán thành công', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoOC' });

    const mockTask = { _id: 'task-1', assigneeId: null };
    unassignTaskService.mockResolvedValue({ task: mockTask });

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
    });
    const res = createMockRes();

    await unassignTask(req, res);

    expect(unassignTaskService).toHaveBeenCalledWith({
      eventId: 'event-1',
      taskId: 'task-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockTask });
  });
});
