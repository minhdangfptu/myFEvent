import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as milestoneController from '../../milestoneController.js';

vi.mock('../../../services/milestoneService.js', () => ({
  __esModule: true,
  getEventMembership: vi.fn(),
  updateMilestoneDoc: vi.fn(),
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

describe('milestoneController.updateMilestone', () => {
  it('[Abnormal] TC01 - should return 403 when user is not HoOC', async () => {
    const { getEventMembership } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'Member' });

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
      body: { name: 'New name' },
    };
    const res = mockRes();

    await milestoneController.updateMilestone(req, res);

    expect(getEventMembership).toHaveBeenCalledWith('evt1', 'user1');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only HoOC can update milestone' });
  });

  it('[Normal] TC02 - should update allowed fields and return milestone (200)', async () => {
    const { getEventMembership, updateMilestoneDoc } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'HoOC' });

    const updatedMilestone = { _id: 'm1', name: 'New name' };
    updateMilestoneDoc.mockResolvedValue(updatedMilestone);

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
      body: {
        name: 'New name',
        description: 'New desc',
        dueDate: '2025-02-01',
        extraField: 'should be ignored',
      },
    };
    const res = mockRes();

    await milestoneController.updateMilestone(req, res);

    expect(updateMilestoneDoc).toHaveBeenCalledWith('evt1', 'm1', {
      name: 'New name',
      description: 'New desc',
      dueDate: '2025-02-01',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: updatedMilestone });
  });

  it('[Abnormal] TC03 - should return 404 when milestone not found', async () => {
    const { getEventMembership, updateMilestoneDoc } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'HoOC' });
    updateMilestoneDoc.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm404' },
      user: { id: 'user1' },
      body: { name: 'X' },
    };
    const res = mockRes();

    await milestoneController.updateMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Milestone not found' });
  });

  it('[Abnormal] TC04 - should return 500 when service throws error', async () => {
    const { getEventMembership, updateMilestoneDoc } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'HoOC' });
    updateMilestoneDoc.mockRejectedValue(new Error('DB error'));

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
      body: { name: 'X' },
    };
    const res = mockRes();

    await milestoneController.updateMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to update milestone',
      }),
    );
  });
});


