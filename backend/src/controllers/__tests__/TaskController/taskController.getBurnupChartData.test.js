// tests/TaskController/taskController.getBurnupChartData.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes, resetAllMocks } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  getBurnupChartDataService: vi.fn(),
}));

import ensureEventRole from '../../../utils/ensureEventRole.js';
import { getBurnupChartDataService } from '../../../services/taskService.js';
import { getBurnupChartData } from '../../taskController.js';

describe('taskController.getBurnupChartData', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('[Normal] TC01 - should return 200 with burnup chart data when successful', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const mockResult = {
      milestone: { id: 'm1', name: 'Phase 1' },
      burnupData: [{ date: '2025-01-01', totalMajorTasks: 5 }],
      currentStats: { totalMajorTasks: 5 },
      departmentStats: [{ departmentId: 'd1' }],
      debug: { totalTasksFound: 5 },
    };

    getBurnupChartDataService.mockResolvedValueOnce(mockResult);

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123', milestoneId: 'm1' },
    });

    await getBurnupChartData(req, res);

    expect(res.status).not.toHaveBeenCalled(); // default 200 của Express mock
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        milestone: mockResult.milestone,
        burnupData: mockResult.burnupData,
        currentStats: mockResult.currentStats,
        departmentStats: mockResult.departmentStats,
        debug: mockResult.debug,
      },
    });
  });

  it('[Abnormal] TC02 - should return 403 when user does not have permission', async () => {
    ensureEventRole.mockResolvedValueOnce(null);

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123', milestoneId: 'm1' },
    });

    await getBurnupChartData(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được xem chart.',
    });
    expect(getBurnupChartDataService).not.toHaveBeenCalled();
  });

  it('[Abnormal] TC03 - should return 404 when milestone is not found', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    getBurnupChartDataService.mockResolvedValueOnce({
      notFound: true,
    });

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123', milestoneId: 'm1' },
    });

    await getBurnupChartData(req, res);

    expect(getBurnupChartDataService).toHaveBeenCalledWith({
      eventId: 'event123',
      milestoneId: 'm1',
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Milestone not found',
    });
  });

  it('[Abnormal] TC04 - should return 500 when service throws error', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const err = new Error('Server explosion');
    getBurnupChartDataService.mockRejectedValueOnce(err);

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123', milestoneId: 'm1' },
    });

    await getBurnupChartData(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Server error',
    });
  });
});
