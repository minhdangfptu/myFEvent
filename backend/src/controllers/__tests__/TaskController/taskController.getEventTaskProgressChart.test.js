// tests/TaskController/taskController.getEventTaskProgressChart.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReqRes, resetAllMocks } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  getEventTaskProgressChartService: vi.fn(),
}));

import ensureEventRole from '../../../utils/ensureEventRole.js';
import { getEventTaskProgressChartService } from '../../../services/taskService.js';
import { getEventTaskProgressChart } from '../../taskController.js';

describe('taskController.getEventTaskProgressChart', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('[Normal] TC01 - should return 200 with chart data when successful', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const mockStats = [{ _id: 'hoan_thanh', count: 3 }];
    getEventTaskProgressChartService.mockResolvedValueOnce(mockStats);

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123' },
    });

    await getEventTaskProgressChart(req, res);

    expect(getEventTaskProgressChartService).toHaveBeenCalledWith({ eventId: 'event123' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockStats });
  });

  it('[Abnormal] TC02 - should return 403 when user does not have permission', async () => {
    ensureEventRole.mockResolvedValueOnce(null);

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123' },
    });

    await getEventTaskProgressChart(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith('user1', 'event123', ['HoOC', 'HoD']);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được xem chart.',
    });
    expect(getEventTaskProgressChartService).not.toHaveBeenCalled();
  });

  it('[Abnormal] TC03 - should return 400 when service throws error with custom statusCode', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const err = new Error('Bad request');
    err.statusCode = 400;
    getEventTaskProgressChartService.mockRejectedValueOnce(err);

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123' },
    });

    await getEventTaskProgressChart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Bad request',
    });
  });

  it('[Abnormal] TC04 - should return 500 when service throws generic error', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const err = new Error('DB error');
    getEventTaskProgressChartService.mockRejectedValueOnce(err);

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123' },
    });

    await getEventTaskProgressChart(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi lấy chart tiến độ',
    });
  });
});
