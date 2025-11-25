import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../authController.js';

/* -------------------- MOCK SETUP -------------------- */

// ✅ Mock AuthToken model
vi.mock('../../models/authToken.js', async (importOriginal) => {
  const actual = await importOriginal();
  const mockFindOne = vi.fn();
  const mockSave = vi.fn();

  // Mock token instance
  const mockAuthTokenInstance = { revoked: false, save: mockSave };

  return {
    ...actual,
    __esModule: true,
    default: {
      findOne: mockFindOne,
    },
    _mockFindOne: mockFindOne,
    _mockSave: mockSave,
    _mockAuthTokenInstance: mockAuthTokenInstance,
  };
});

/* -------------------- HELPERS -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- TESTS -------------------- */
describe('authController.logout', () => {
  // [Normal] TC01
  it('[Normal] TC01 - should revoke refresh token successfully', async () => {
    const { _mockFindOne, _mockSave, _mockAuthTokenInstance } = await import('../../models/authToken.js');
    const res = mockRes();

    _mockFindOne.mockResolvedValue(_mockAuthTokenInstance);

    const req = { body: { refreshToken: 'refresh-token' } };

    await authController.logout(req, res);

    expect(_mockFindOne).toHaveBeenCalledWith({ token: 'refresh-token' });
    expect(_mockAuthTokenInstance.revoked).toBe(true);
    expect(_mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Logout successful!' })
    );
  });

  // [Abnormal] TC02
  it('[Abnormal] TC02 - should return 400 if refreshToken missing', async () => {
    const res = mockRes();
    const req = { body: {} };

    await authController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Refresh token is required!' })
    );
  });

  // [Abnormal] TC03
  it('[Abnormal] TC03 - should return 500 if error occurs', async () => {
    const { _mockFindOne } = await import('../../models/authToken.js');
    const res = mockRes();

    _mockFindOne.mockRejectedValue(new Error('DB error'));

    const req = { body: { refreshToken: 'abc' } };

    await authController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Fail to logout!' })
    );
  });
});
