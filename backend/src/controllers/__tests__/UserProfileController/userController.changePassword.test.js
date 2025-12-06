import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userController from '../../userController.js';

vi.mock('../../../services/userService.js', () => ({
  __esModule: true,
  changePasswordService: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('userController.changePassword', () => {
  it('[Normal] TC01 - should change password successfully', async () => {
    const { changePasswordService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { currentPassword: 'old', newPassword: 'new' } };
    const res = mockRes();

    changePasswordService.mockResolvedValue(undefined);

    await userController.changePassword(req, res);

    expect(changePasswordService).toHaveBeenCalledWith('u1', 'old', 'new');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Đổi mật khẩu thành công' });
  });

  it('[Abnormal] TC02 - should return 400 when missing fields', async () => {
    const req = { user: { id: 'u1' }, body: { currentPassword: '' } };
    const res = mockRes();

    await userController.changePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Current and new password are required' });
  });

  it('[Abnormal] TC03 - should return custom message when service throws with status', async () => {
    const { changePasswordService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { currentPassword: 'old', newPassword: 'new' } };
    const res = mockRes();

    const err = { status: 403, message: 'Wrong current password' };
    changePasswordService.mockRejectedValue(err);

    await userController.changePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Wrong current password' });
  });

  it('[Abnormal] TC04 - should return 500 when service throws generic error', async () => {
    const { changePasswordService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { currentPassword: 'old', newPassword: 'new' } };
    const res = mockRes();

    changePasswordService.mockRejectedValue(new Error('DB error'));

    await userController.changePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to change password' });
  });
});
