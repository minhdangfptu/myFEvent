import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as milestoneController from '../../milestoneController.js';

vi.mock('../../../services/milestoneService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  listMilestonesByEvent: vi.fn(),
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

describe('milestoneController.listMilestones', () => {
  it('[Abnormal] TC01 - should return 404 if event not found', async () => {
    const { ensureEventExists } = await import('../../../services/milestoneService.js');

    ensureEventExists.mockResolvedValue(false);

    const req = {
      params: { eventId: 'evt404' },
      query: {},
    };
    const res = mockRes();

    await milestoneController.listMilestones(req, res);

    expect(ensureEventExists).toHaveBeenCalledWith('evt404');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
  });

  it('[Normal] TC02 - should list milestones with pagination and filters', async () => {
    const { ensureEventExists, listMilestonesByEvent } = await import('../../../services/milestoneService.js');

    ensureEventExists.mockResolvedValue(true);

    const req = {
      params: { eventId: 'evt1' },
      query: {
        page: '2',
        limit: '10',
        status: 'completed',
        sortBy: 'targetDate',
        sortDir: 'desc',
      },
    };
    const res = mockRes();

    const mockItems = [{ _id: 'm1' }, { _id: 'm2' }];
    listMilestonesByEvent.mockResolvedValue({ items: mockItems, total: 25 });

    await milestoneController.listMilestones(req, res);

    expect(listMilestonesByEvent).toHaveBeenCalledWith('evt1', {
      status: 'completed',
      skip: 10,
      limit: 10,
      sortBy: 'targetDate',
      sortDir: -1,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: mockItems,
      pagination: {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: Math.ceil(25 / 10),
      },
    });
  });

  it('[Abnormal] TC03 - should return 500 when service throws error', async () => {
    const { ensureEventExists, listMilestonesByEvent } = await import('../../../services/milestoneService.js');

    ensureEventExists.mockResolvedValue(true);
    listMilestonesByEvent.mockRejectedValue(new Error('DB error'));

    const req = {
      params: { eventId: 'evt1' },
      query: {},
    };
    const res = mockRes();

    await milestoneController.listMilestones(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to load milestones',
      }),
    );
  });
});


