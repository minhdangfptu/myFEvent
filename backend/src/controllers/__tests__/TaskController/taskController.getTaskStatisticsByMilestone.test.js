// tests/TaskController/taskController.getTaskStatisticsByMilestone.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createMockReqRes, resetAllMocks } from './testUtils.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../../services/taskService.js', () => ({
  getTaskStatisticsByMilestoneService: vi.fn(),
}));

import ensureEventRole from '../../../utils/ensureEventRole.js';
import { getTaskStatisticsByMilestoneService } from '../../../services/taskService.js';
import { getTaskStatisticsByMilestone } from '../../taskController.js';

describe('taskController.getTaskStatisticsByMilestone', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('trả về 403 nếu không có quyền', async () => {
    ensureEventRole.mockResolvedValueOnce(null);

    const { req, res } = createMockReqRes({
      params: { eventId: 'event123', milestoneId: 'm1' },
    });

    await getTaskStatisticsByMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Chỉ HoOC hoặc HoD được xem thống kê.',
    });
    expect(getTaskStatisticsByMilestoneService).not.toHaveBeenCalled();
  });

  it('trả về 400 nếu eventId không hợp lệ', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const { req, res } = createMockReqRes({
      params: { eventId: 'invalid_id', milestoneId: '65f123456789012345678901' },
    });

    await getTaskStatisticsByMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'eventId không hợp lệ',
    });
    expect(getTaskStatisticsByMilestoneService).not.toHaveBeenCalled();
  });

  it('trả về 400 nếu milestoneId không hợp lệ', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    // eventId hợp lệ (24 hex), milestoneId không hợp lệ
    const validEventId = '65f123456789012345678901';

    const { req, res } = createMockReqRes({
      params: { eventId: validEventId, milestoneId: 'invalid_milestone' },
    });

    await getTaskStatisticsByMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'milestoneId không hợp lệ',
    });
    expect(getTaskStatisticsByMilestoneService).not.toHaveBeenCalled();
  });

  it('trả về 404 nếu milestone không tồn tại trong event', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const validEventId = new mongoose.Types.ObjectId().toString();
    const validMilestoneId = new mongoose.Types.ObjectId().toString();

    getTaskStatisticsByMilestoneService.mockResolvedValueOnce({
      notFound: true,
    });

    const { req, res } = createMockReqRes({
      params: { eventId: validEventId, milestoneId: validMilestoneId },
    });

    await getTaskStatisticsByMilestone(req, res);

    expect(getTaskStatisticsByMilestoneService).toHaveBeenCalledWith({
      eventId: validEventId,
      milestoneId: validMilestoneId,
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Milestone không tồn tại trong event này.',
    });
  });

  it('trả về 200 với summary, milestone và departmentProgress', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const validEventId = new mongoose.Types.ObjectId().toString();
    const validMilestoneId = new mongoose.Types.ObjectId().toString();

    const mockResult = {
      summary: { totalTasks: 10 },
      milestone: { id: 'm1', name: 'Phase 1' },
      departmentProgress: [{ departmentId: 'd1' }],
    };

    getTaskStatisticsByMilestoneService.mockResolvedValueOnce(mockResult);

    const { req, res } = createMockReqRes({
      params: { eventId: validEventId, milestoneId: validMilestoneId },
    });

    await getTaskStatisticsByMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        summary: mockResult.summary,
        milestone: mockResult.milestone,
        departmentProgress: mockResult.departmentProgress,
      },
    });
  });

  it('handle lỗi 500 từ service', async () => {
    ensureEventRole.mockResolvedValueOnce({ role: 'HoOC' });

    const validEventId = new mongoose.Types.ObjectId().toString();

    const err = new Error('Something went wrong');
    getTaskStatisticsByMilestoneService.mockRejectedValueOnce(err);

    const { req, res } = createMockReqRes({
      params: { eventId: validEventId, milestoneId: undefined },
    });

    await getTaskStatisticsByMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi lấy thống kê task',
    });
  });
});
