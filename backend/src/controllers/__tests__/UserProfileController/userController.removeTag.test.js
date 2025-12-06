import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userController from '../../userController.js';

vi.mock('../../../services/userService.js', () => ({
  __esModule: true,
  removeTagService: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('userController.removeTag', () => {
  it('[Normal] TC01 - should remove tag successfully', async () => {
    const { removeTagService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { value: 'tag1' } };
    const res = mockRes();

    removeTagService.mockResolvedValue(undefined);

    await userController.removeTag(req, res);

    expect(removeTagService).toHaveBeenCalledWith('u1', 'tag1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Tag removed' });
  });

  it('[Abnormal] TC02 - should return 500 when service throws', async () => {
    const { removeTagService } = await import('../../../services/userService.js');

    const req = { user: { id: 'u1' }, body: { value: 'tag1' } };
    const res = mockRes();

    removeTagService.mockRejectedValue(new Error('DB fail'));

    await userController.removeTag(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to remove tag' });
  });
});
