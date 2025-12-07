// tests/TaskController/taskController.getDepartmentBurnupTasks.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes, resetAllMocks } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  getDepartmentBurnupTasksService: vi.fn(),
}));

import ensureEventRole from '../../../utils/ensureEventRole.js';
import { getDepartmentBurnupTasksService } from '../../../services/taskService.js';
import { getDepartmentBurnupTasks } from '../../taskController.js';

describe('taskController.getDepartmentBurnupTasks', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('[Normal] TC01 - should return 200 with department burnup tasks when successful', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const mockData = {
      departmentId: 'd1',
      departmentName: 'Media',
      stats: { total: 5, completionRate: 40 },
    };

    getDepartmentBurnupTasksService.mockResolvedValueOnce(mockData);

    const { req, res } = createMockReqRes({
      params: {
        eventId: 'event123',
        milestoneId: 'm1',
        departmentId: 'd1',
      },
    });

    await getDepartmentBurnupTasks(req, res);

    expect(getDepartmentBurnupTasksService).toHaveBeenCalledWith({
      eventId: 'event123',
      milestoneId: 'm1',
      departmentId: 'd1',
    });

    expect(res.status).not.toHaveBeenCalled(); // default 200
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockData,
    });
  });

  it('[Abnormal] TC02 - should return 403 when user does not have permission', async () => {
    ensureEventRole.mockResolvedValueOnce(null);

    const { req, res } = createMockReqRes({
      params: {
        eventId: 'event123',
        milestoneId: 'm1',
        departmentId: 'd1',
      },
    });

    await getDepartmentBurnupTasks(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được xem chart.',
    });
    expect(getDepartmentBurnupTasksService).not.toHaveBeenCalled();
  });

  it('[Abnormal] TC03 - should return 500 when service throws error', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const err = new Error('Server error');
    getDepartmentBurnupTasksService.mockRejectedValueOnce(err);

    const { req, res } = createMockReqRes({
      params: {
        eventId: 'event123',
        milestoneId: 'm1',
        departmentId: 'd1',
      },
    });

    await getDepartmentBurnupTasks(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Server error',
    });
  });
});
