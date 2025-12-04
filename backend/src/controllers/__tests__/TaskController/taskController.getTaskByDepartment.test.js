// tests/TaskController/taskController.getTaskByDepartment.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  __esModule: true,
  getTaskByDepartmentService: vi.fn(),
  // mock rỗng các hàm khác
  listTasksByEventOrDepartmentService: vi.fn(),
  getTaskDetailService: vi.fn(),
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
import { getTaskByDepartmentService } from '../../../services/taskService.js';
import { getTaskByDepartment } from '../../taskController.js';

describe('TaskController.getTaskByDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trả 404 nếu department không tồn tại trong sự kiện', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    getTaskByDepartmentService.mockResolvedValue({
      departmentExists: false,
      task: null,
    });

    const req = createMockReq({
      params: {
        eventId: 'event-1',
        taskId: 'task-1',
        departmentId: 'dep-1',
      },
    });
    const res = createMockRes();

    await getTaskByDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Ban không tồn tại trong sự kiện này',
    });
  });

  it('trả 404 nếu task không tồn tại', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    getTaskByDepartmentService.mockResolvedValue({
      departmentExists: true,
      task: null,
    });

    const req = createMockReq({
      params: {
        eventId: 'event-1',
        taskId: 'task-1',
        departmentId: 'dep-1',
      },
    });
    const res = createMockRes();

    await getTaskByDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Task không tồn tại',
    });
  });

  it('trả 200 với data nếu thành công', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    const mockTask = { _id: 'task-1' };
    getTaskByDepartmentService.mockResolvedValue({
      departmentExists: true,
      task: mockTask,
    });

    const req = createMockReq({
      params: {
        eventId: 'event-1',
        taskId: 'task-1',
        departmentId: 'dep-1',
      },
    });
    const res = createMockRes();

    await getTaskByDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockTask });
  });
});
