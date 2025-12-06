import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userController from '../../userController.js';

vi.mock('../../../services/userService.js', () => ({
  __esModule: true,
  getUserRoleByEventService: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('userController.getUserRoleByEvent', () => {
  it('[Normal] TC01 - should return role successfully', async () => {
    const { getUserRoleByEventService } = await import('../../../services/userService.js');

    const req = { user: { id: 'user123' }, params: { eventId: 'event123' } };
    const res = mockRes();

    const serviceResult = { role: 'HoOC', isMember: true };
    getUserRoleByEventService.mockResolvedValue(serviceResult);

    await userController.getUserRoleByEvent(req, res);

    expect(getUserRoleByEventService).toHaveBeenCalledWith('user123', 'event123');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('[Abnormal] TC02 - should return error status & message from service error with status', async () => {
    const { getUserRoleByEventService } = await import('../../../services/userService.js');

    const req = { user: { id: 'user123' }, params: { eventId: 'event123' } };
    const res = mockRes();

    const err = { status: 404, message: 'Event not found' };
    getUserRoleByEventService.mockRejectedValue(err);

    await userController.getUserRoleByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Event not found',
      error: undefined,
    });
  });

  it('[Abnormal] TC03 - should return 500 + generic message when error has no status', async () => {
    const { getUserRoleByEventService } = await import('../../../services/userService.js');

    const req = { user: { id: 'user123' }, params: { eventId: 'event123' } };
    const res = mockRes();

    const err = new Error('Unexpected error');
    getUserRoleByEventService.mockRejectedValue(err);

    await userController.getUserRoleByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Server Error',
      error: 'Unexpected error',
    });
  });
});
