import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminController from '../adminController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/userService.js', () => ({
  __esModule: true,
  getPaginatedUsers: vi.fn(),
}));

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

/* -------------------- Tests: getPaginatedUsers -------------------- */

describe('adminController.getPaginatedUsers', () => {
  it('[Normal] TC01 - should return paginated users with default query params', async () => {
    const { getPaginatedUsers } = await import('../../services/userService.js');
    const req = {
      query: {},
    };
    const res = mockRes();

    const mockResult = { docs: [], totalDocs: 0 };
    getPaginatedUsers.mockResolvedValue(mockResult);

    await adminController.getPaginatedUsers(req, res);

    expect(getPaginatedUsers).toHaveBeenCalledWith(1, 10, '', 'all');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Normal] TC02 - should pass query params correctly to service', async () => {
    const { getPaginatedUsers } = await import('../../services/userService.js');
    const req = {
      query: {
        page: '2',
        limit: '5',
        search: 'john',
        status: 'banned',
      },
    };
    const res = mockRes();

    const mockResult = { docs: [{ _id: 'u1' }], totalDocs: 1 };
    getPaginatedUsers.mockResolvedValue(mockResult);

    await adminController.getPaginatedUsers(req, res);

    expect(getPaginatedUsers).toHaveBeenCalledWith(2, 5, 'john', 'banned');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });

  it('[Abnormal] TC03 - should return 500 when service throws error', async () => {
    const { getPaginatedUsers } = await import('../../services/userService.js');
    const req = {
      query: {},
    };
    const res = mockRes();

    getPaginatedUsers.mockRejectedValue(new Error('DB error'));

    await adminController.getPaginatedUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fail to fetch users',
      }),
    );
  });
});
