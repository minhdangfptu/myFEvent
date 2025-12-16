import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as milestoneController from '../../milestoneController.js';

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/milestoneService.js', () => ({
  __esModule: true,
  findMilestoneDetail: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('milestoneController.getMilestoneDetail', () => {
  it('[Abnormal] TC01 - should return 403 when ensureEventRole returns null', async () => {
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    ensureEventRole.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.getMilestoneDetail(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith('user1', 'evt1', ['HoOC', 'HoD', 'Member']);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Can not view milestone detail!' });
  });

  it('[Abnormal] TC02 - should return 404 when milestone not found', async () => {
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const { findMilestoneDetail } = await import('../../../services/milestoneService.js');

    ensureEventRole.mockResolvedValue({ _id: 'mem1' });
    findMilestoneDetail.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm404' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.getMilestoneDetail(req, res);

    expect(findMilestoneDetail).toHaveBeenCalledWith('evt1', 'm404');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Milestone not found' });
  });

  it('[Normal] TC03 - should return mapped milestone detail (200)', async () => {
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const { findMilestoneDetail } = await import('../../../services/milestoneService.js');

    ensureEventRole.mockResolvedValue({ _id: 'mem1' });

    const mockMilestone = {
      _id: 'm1',
      name: 'Milestone 1',
      targetDate: '2025-01-01',
      description: 'Desc',
    };
    const mockTasks = [
      { _id: 't1', name: 'Task A', status: 'pending' },
      { _id: 't2', name: 'Task B', status: 'done' },
    ];

    findMilestoneDetail.mockResolvedValue({
      milestone: mockMilestone,
      tasks: mockTasks,
    });

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.getMilestoneDetail(req, res);

    expect(findMilestoneDetail).toHaveBeenCalledWith('evt1', 'm1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        id: 'm1',
        name: 'Milestone 1',
        date: '2025-01-01',
        description: 'Desc',
        relatedTasks: [
          { id: 't1', name: 'Task A', status: 'pending' },
          { id: 't2', name: 'Task B', status: 'done' },
        ],
      },
    });
  });

  it('[Abnormal] TC04 - should return 500 on unexpected error', async () => {
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const { findMilestoneDetail } = await import('../../../services/milestoneService.js');

    ensureEventRole.mockResolvedValue({ _id: 'mem1' });
    findMilestoneDetail.mockRejectedValue(new Error('DB error'));

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.getMilestoneDetail(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to get milestone detail',
      }),
    );
  });
});


