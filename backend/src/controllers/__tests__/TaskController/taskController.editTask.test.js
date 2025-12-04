// tests/TaskController/taskController.editTask.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  __esModule: true,
  editTaskService: vi.fn(),
  // mock rỗng các hàm khác
  listTasksByEventOrDepartmentService: vi.fn(),
  getTaskDetailService: vi.fn(),
  getTaskByDepartmentService: vi.fn(),
  createTaskService: vi.fn(),
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
import { editTaskService } from '../../../services/taskService.js';
import { editTask } from '../../taskController.js';

describe('TaskController.editTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trả 403 nếu không có quyền', async () => {
    ensureEventRole.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
      body: { title: 'Updated' },
    });
    const res = createMockRes();

    await editTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được sửa task.',
    });
    expect(editTaskService).not.toHaveBeenCalled();
  });

  it('trả 200 với data nếu sửa thành công', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    const mockTask = { _id: 'task-1', title: 'Updated' };
    editTaskService.mockResolvedValue({ task: mockTask });

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
      body: { title: 'Updated' },
    });
    const res = createMockRes();

    await editTask(req, res);

    expect(editTaskService).toHaveBeenCalledWith({
      eventId: 'event-1',
      taskId: 'task-1',
      userId: 'user-id-1',
      member: { role: 'HoOC' },
      body: { title: 'Updated' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockTask });
  });
});
