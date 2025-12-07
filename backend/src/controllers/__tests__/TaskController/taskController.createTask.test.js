// tests/TaskController/taskController.createTask.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyTaskAssigned: vi.fn(),
  notifyTaskCompleted: vi.fn(),
  notifyMajorTaskStatus: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  __esModule: true,
  createTaskService: vi.fn(),
  // mock rỗng các hàm khác
  listTasksByEventOrDepartmentService: vi.fn(),
  getTaskDetailService: vi.fn(),
  getTaskByDepartmentService: vi.fn(),
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
import { notifyTaskAssigned } from '../../../services/notificationService.js';
import { createTaskService } from '../../../services/taskService.js';
import { createTask } from '../../taskController.js';

describe('TaskController.createTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should create task successfully and send notification when assignee is provided', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoOC' });

    const mockTask = { _id: 'task-1' };
    createTaskService.mockResolvedValue({
      task: mockTask,
      notifyAssignee: true,
      assigneeId: 'member-1',
    });

    const req = createMockReq({
      params: { eventId: 'event-1' },
      body: { title: 'Task 1' },
    });
    const res = createMockRes();

    await createTask(req, res);

    expect(createTaskService).toHaveBeenCalledWith({
      eventId: 'event-1',
      userId: 'user-id-1',
      member: { role: 'HoOC' },
      body: { title: 'Task 1' },
    });
    expect(notifyTaskAssigned).toHaveBeenCalledWith(
      'event-1',
      'task-1',
      'member-1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: mockTask });
  });

  it('[Abnormal] TC02 - should return 403 when user does not have permission', async () => {
    ensureEventRole.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1' },
      body: { title: 'Task 1' },
    });
    const res = createMockRes();

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được tạo task.',
    });
    expect(createTaskService).not.toHaveBeenCalled();
  });
});
