// tests/TaskController/taskController.listTasksByEventOrDepartment.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  __esModule: true,
  listTasksByEventOrDepartmentService: vi.fn(),
  // mock rỗng các hàm khác cho đủ export
  getTaskDetailService: vi.fn(),
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
import { listTasksByEventOrDepartmentService } from '../../../services/taskService.js';
import { listTasksByEventOrDepartment } from '../../taskController.js';

describe('TaskController.listTasksByEventOrDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trả 403 nếu user không có quyền', async () => {
    ensureEventRole.mockResolvedValue(null);

    const req = createMockReq({
      params: { eventId: 'event-1' },
    });
    const res = createMockRes();

    await listTasksByEventOrDepartment(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith(
      'user-id-1',
      'event-1',
      ['HoOC', 'HoD', 'Member']
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Không có quyền xem task',
    });
    expect(listTasksByEventOrDepartmentService).not.toHaveBeenCalled();
  });

  it('trả 200 với data khi thành công', async () => {
    ensureEventRole.mockResolvedValue({ role: 'HoOC' });
    const tasks = [{ _id: 't1' }];
    listTasksByEventOrDepartmentService.mockResolvedValue(tasks);

    const req = createMockReq({
      params: { eventId: 'event-1' },
      query: { departmentId: 'dep-1' },
    });
    const res = createMockRes();

    await listTasksByEventOrDepartment(req, res);

    expect(listTasksByEventOrDepartmentService).toHaveBeenCalledWith({
      eventId: 'event-1',
      query: { departmentId: 'dep-1' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: tasks });
  });
});
