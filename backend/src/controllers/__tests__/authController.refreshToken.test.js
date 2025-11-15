import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../authController.js';
import jwt from 'jsonwebtoken';

/* -------------------- MOCK SETUP -------------------- */

// ✅ Mock User model
vi.mock('../../models/user.js', () => ({
  __esModule: true,
  default: {
    findById: vi.fn(),
  },
}));

// ✅ Mock AuthToken (constructor + static deleteOne)
vi.mock('../../models/authToken.js', async (importOriginal) => {
  const actual = await importOriginal();
  const mockDeleteOne = vi.fn();
  const mockSave = vi.fn();

  // Mock constructor
  const MockAuthToken = vi.fn().mockImplementation(() => ({
    save: mockSave,
  }));

  // Gắn static method deleteOne
  Object.assign(MockAuthToken, { deleteOne: mockDeleteOne });

  return {
    ...actual,
    __esModule: true,
    default: MockAuthToken,
    _mockDeleteOne: mockDeleteOne,
    _mockSave: mockSave,
    _MockAuthToken: MockAuthToken,
  };
});

// ✅ Mock JWT
vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: vi.fn(),
  },
}));

/* -------------------- HELPERS -------------------- */
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- TEST CASES -------------------- */
describe('authController.refreshToken', () => {
  // [Normal] TC01
  it('[Normal] TC01 - should refresh tokens successfully', async () => {
    const UserMock = (await import('../../models/user.js')).default;
    const { default: MockAuthToken, _mockSave, _mockDeleteOne } = await import('../../models/authToken.js');
    const jwtMock = (await import('jsonwebtoken')).default;

    const req = {
      user: { id: 'user123' },
      authToken: { _id: 'token123' },
      get: vi.fn().mockReturnValue('Mozilla'),
      ip: '127.0.0.1',
    };
    const res = mockRes();

    const user = { _id: 'user123', email: 'test@example.com' };
    UserMock.findById.mockResolvedValue(user);

    jwtMock.sign
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('new-refresh-token');

    _mockDeleteOne.mockResolvedValue(true);

    await authController.refreshToken(req, res);

    expect(UserMock.findById).toHaveBeenCalledWith('user123');
    expect(jwtMock.sign).toHaveBeenCalledTimes(2);
    expect(_mockDeleteOne).toHaveBeenCalledWith({ _id: 'token123' });
    expect(MockAuthToken).toHaveBeenCalledTimes(1);
    expect(_mockSave).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });

  // [Abnormal] TC02
  it('[Abnormal] TC02 - should return 401 if user not found', async () => {
    const UserMock = (await import('../../models/user.js')).default;
    const res = mockRes();

    const req = { user: { id: 'invalid' } };

    UserMock.findById.mockResolvedValue(null);

    await authController.refreshToken(req, res);

    expect(UserMock.findById).toHaveBeenCalledWith('invalid');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid user!' })
    );
  });

  // [Abnormal] TC03
  it('[Abnormal] TC03 - should return 401 on unexpected error', async () => {
    const UserMock = (await import('../../models/user.js')).default;
    const res = mockRes();

    const req = { user: { id: 'user123' } };
    UserMock.findById.mockRejectedValue(new Error('DB error'));

    await authController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid or expired refresh token' })
    );
  });
});
