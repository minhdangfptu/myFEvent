// tests/TaskController/taskController.assignTask.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../src/services/notificationService.js', () => ({
  __esModule: true,
  notifyTaskAssigned: vi.fn(),
  notifyTaskCompleted: vi.fn(),
  notifyMajorTaskStatus: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  __esModule: true,
  assignTaskService: vi.fn(),
  listTasksByEventOrDepartmentService: vi.fn(),
  getTaskDetailService: vi.fn(),
  getTaskByDepartmentService: vi.fn(),
  createTaskService: vi.fn(),
  editTaskService: vi.fn(),
  deleteTaskService: vi.fn(),
  updateTaskProgressService: vi.fn(),
  unassignTaskService: vi.fn(),
  getEventTaskProgressChartService: vi.fn(),
  getEpicTasksForExportService: vi.fn(),
  getTaskStatisticsByMilestoneService: vi.fn(),
  getBurnupChartDataService: vi.fn(),
  getDepartmentBurnupTasksService: vi.fn(),
}));

import ensureEventRole from '../../../utils/ensureEventRole.js';
import { notifyTaskAssigned } from '../../src/services/notificationService.js';
import { assignTaskService } from '../../../services/taskService.js';
import { assignTask } from '../../taskController.js';

describe('TaskController.assignTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trả 403 nếu không có quyền', async () => {
    ensureEventRole.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
      body: { assigneeId: 'member-1' },
    });
    const res = createMockRes();

    await assignTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được gán task.',
    });
    expect(assignTaskService).not.toHaveBeenCalled();
  });

  it('gửi notifyTaskAssigned nếu notifyAssignee = true', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoD' });

    const mockTask = { _id: 'task-1', assigneeId: 'member-1' };
    assignTaskService.mockResolvedValue({
      task: mockTask,
      notifyAssignee: true,
    });

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
      body: { assigneeId: 'member-1' },
    });
    const res = createMockRes();

    await assignTask(req, res);

    expect(assignTaskService).toHaveBeenCalledWith({
      eventId: 'event-1',
      taskId: 'task-1',
      assigneeId: 'member-1',
    });
    expect(notifyTaskAssigned).toHaveBeenCalledWith(
      'event-1',
      'task-1',
      'member-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockTask });
  });
});
