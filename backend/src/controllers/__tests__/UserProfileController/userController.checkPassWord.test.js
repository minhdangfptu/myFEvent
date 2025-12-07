import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userController from '../../userController.js';

vi.mock('../../../services/userService.js', () => ({
  __esModule: true,
  checkPasswordService: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('userController.checkPassWord', () => {
  it('[Normal] TC01 - should return Correct information when password correct', async () => {
    const { checkPasswordService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { password: 'pwd' } };
    const res = mockRes();

    checkPasswordService.mockResolvedValue(undefined);

    await userController.checkPassWord(req, res);

    expect(checkPasswordService).toHaveBeenCalledWith('u1', 'pwd');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Correct information' });
  });

  it('[Abnormal] TC02 - should return custom error when service throws with status', async () => {
    const { checkPasswordService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { password: 'pwd' } };
    const res = mockRes();

    const err = { status: 401, message: 'Invalid password' };
    checkPasswordService.mockRejectedValue(err);

    await userController.checkPassWord(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid password' });
  });

  it('[Abnormal] TC03 - should return 500 when service throws generic error', async () => {
    const { checkPasswordService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { password: 'pwd' } };
    const res = mockRes();

    checkPasswordService.mockRejectedValue(new Error('DB error'));

    await userController.checkPassWord(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to check information' });
  });
});
