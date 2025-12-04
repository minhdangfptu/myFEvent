// tests/TaskController/taskController.updateTaskProgress.test.js
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
  updateTaskProgressService: vi.fn(),
  // mock rỗng các hàm khác
  listTasksByEventOrDepartmentService: vi.fn(),
  getTaskDetailService: vi.fn(),
  getTaskByDepartmentService: vi.fn(),
  createTaskService: vi.fn(),
  editTaskService: vi.fn(),
  deleteTaskService: vi.fn(),
  assignTaskService: vi.fn(),
  unassignTaskService: vi.fn(),
  getEventTaskProgressChartService: vi.fn(),
  getEpicTasksForExportService: vi.fn(),
  getTaskStatisticsByMilestoneService: vi.fn(),
  getBurnupChartDataService: vi.fn(),
  getDepartmentBurnupTasksService: vi.fn(),
}));

import ensureEventRole from '../../../utils/ensureEventRole.js';
import {
  notifyTaskCompleted,
  notifyMajorTaskStatus,
} from '../../src/services/notificationService.js';
import { updateTaskProgressService } from '../../../services/taskService.js';
import { updateTaskProgress } from '../../taskController.js';

describe('TaskController.updateTaskProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trả 403 nếu không có quyền', async () => {
    ensureEventRole.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
      body: { status: 'hoan_thanh' },
    });
    const res = createMockRes();

    await updateTaskProgress(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Không có quyền cập nhật tiến độ.',
    });
    expect(updateTaskProgressService).not.toHaveBeenCalled();
  });

  it('gửi notifyTaskCompleted & notifyMajorTaskStatus nếu justDone & major', async () => {
    ensureEventRole.mockResolvedValue({ role: 'Member' });

    const mockTask = { _id: 'task-1', status: 'hoan_thanh' };
    updateTaskProgressService.mockResolvedValue({
      task: mockTask,
      justDone: true,
      isMajorTaskWithoutParent: true,
    });

    const req = createMockReq({
      params: { eventId: 'event-1', taskId: 'task-1' },
      body: { status: 'hoan_thanh' },
    });
    const res = createMockRes();

    await updateTaskProgress(req, res);

    expect(updateTaskProgressService).toHaveBeenCalledWith({
      eventId: 'event-1',
      taskId: 'task-1',
      userId: 'user-id-1',
      body: { status: 'hoan_thanh' },
    });
    expect(notifyTaskCompleted).toHaveBeenCalledWith('event-1', 'task-1');
    expect(notifyMajorTaskStatus).toHaveBeenCalledWith(
      'event-1',
      'task-1',
      true
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Update Task progress successfully',
      data: mockTask,
    });
  });
});
