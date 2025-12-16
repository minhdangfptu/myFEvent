import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as milestoneController from '../../milestoneController.js';

vi.mock('../../../services/milestoneService.js', () => ({
  __esModule: true,
  getEventMembership: vi.fn(),
  softDeleteMilestoneIfNoTasks: vi.fn(),
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

describe('milestoneController.deleteMilestone', () => {
  it('[Abnormal] TC01 - should return 403 when user is not HoOC', async () => {
    const { getEventMembership } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'Member' });

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.deleteMilestone(req, res);

    expect(getEventMembership).toHaveBeenCalledWith('evt1', 'user1');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Chỉ HoOC mới có quyền xóa cột mốc' });
  });

  it('[Abnormal] TC02 - should return 404 when milestone not found', async () => {
    const { getEventMembership, softDeleteMilestoneIfNoTasks } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'HoOC' });
    softDeleteMilestoneIfNoTasks.mockResolvedValue({ code: 'NOT_FOUND' });

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm404' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.deleteMilestone(req, res);

    expect(softDeleteMilestoneIfNoTasks).toHaveBeenCalledWith('evt1', 'm404');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy cột mốc' });
  });

  it('[Abnormal] TC03 - should return 400 when milestone has tasks', async () => {
    const { getEventMembership, softDeleteMilestoneIfNoTasks } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'HoOC' });
    softDeleteMilestoneIfNoTasks.mockResolvedValue({ code: 'HAS_TASKS' });

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.deleteMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không thể xóa cột mốc vì còn công việc liên quan' });
  });

  it('[Normal] TC04 - should delete milestone successfully and return 200', async () => {
    const { getEventMembership, softDeleteMilestoneIfNoTasks } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'HoOC' });
    softDeleteMilestoneIfNoTasks.mockResolvedValue({ code: 'OK' });

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.deleteMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Xóa cột mốc thành công' });
  });

  it('[Abnormal] TC05 - should return 500 when service throws error', async () => {
    const { getEventMembership, softDeleteMilestoneIfNoTasks } = await import('../../../services/milestoneService.js');

    getEventMembership.mockResolvedValue({ role: 'HoOC' });
    softDeleteMilestoneIfNoTasks.mockRejectedValue(new Error('DB error'));

    const req = {
      params: { eventId: 'evt1', milestoneId: 'm1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await milestoneController.deleteMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Lỗi khi xóa cột mốc',
      }),
    );
  });
});


