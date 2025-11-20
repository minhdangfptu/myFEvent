import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../authController.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config/environment.js';

/* -------------------- Mocks -------------------- */

// ✅ User model
vi.mock('../../models/user.js', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

// ✅ AuthToken constructor mock (sử dụng importActual để tránh lỗi hoisting)
vi.mock('../../models/authToken.js', async (importOriginal) => {
  const actual = await importOriginal();
  const mockSave = vi.fn();
  const MockAuthToken = vi.fn().mockImplementation(() => ({
    save: mockSave,
  }));
  return {
    ...actual,
    __esModule: true,
    default: MockAuthToken,
    _mockSave: mockSave,
    _mockAuthToken: MockAuthToken,
  };
});

vi.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    compare: vi.fn(),
    genSalt: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: vi.fn(),
  },
}));

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- Tests -------------------- */

describe('authController.login', () => {
  it('[Normal] TC01 - should login successfully and return tokens', async () => {
    const { default: MockAuthToken, _mockSave } = await import('../../models/authToken.js');
    const User = (await import('../../models/user.js')).default;
    const bcryptMock = (await import('bcrypt')).default;
    const jwtMock = (await import('jsonwebtoken')).default;

    const req = {
      body: { email: 'test@example.com', password: '123456' },
      get: vi.fn().mockReturnValue('Mozilla'),
      ip: '127.0.0.1',
    };
    const res = mockRes();

    const mockUser = {
      _id: 'u123',
      email: 'test@example.com',
      passwordHash: 'hash',
      role: 'user',
      status: 'active',
      fullName: 'Tester',
    };

    User.findOne.mockResolvedValue(mockUser);
    bcryptMock.compare.mockResolvedValue(true);
    jwtMock.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

    await authController.login(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(bcryptMock.compare).toHaveBeenCalledWith('123456', 'hash');
    expect(jwtMock.sign).toHaveBeenCalledTimes(2);
    expect(MockAuthToken).toHaveBeenCalledTimes(1);
    expect(_mockSave).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Login successful!',
        user: expect.objectContaining({ email: 'test@example.com' }),
        tokens: expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      }),
    );
  });

  it('[Abnormal] TC02 - should return 404 if user not found', async () => {
    const User = (await import('../../models/user.js')).default;
    const res = mockRes();

    User.findOne.mockResolvedValue(null);

    await authController.login({ body: { email: 'nope@example.com', password: '123' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email or password is incorrect' }),
    );
  });

  it('[Abnormal] TC03 - should return 400 if password is incorrect', async () => {
    const User = (await import('../../models/user.js')).default;
    const bcryptMock = (await import('bcrypt')).default;
    const res = mockRes();

    User.findOne.mockResolvedValue({ email: 'x', passwordHash: 'hash' });
    bcryptMock.compare.mockResolvedValue(false);

    await authController.login({ body: { email: 'x', password: 'wrong' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email or password is incorrect' }),
    );
  });

  it('[Abnormal] TC04 - should return 403 if account is pending', async () => {
    const User = (await import('../../models/user.js')).default;
    const bcryptMock = (await import('bcrypt')).default;
    const res = mockRes();

    User.findOne.mockResolvedValue({ email: 'p', passwordHash: 'h', status: 'pending' });
    bcryptMock.compare.mockResolvedValue(true);

    await authController.login({ body: { email: 'p', password: '1' } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Account is not active',
        code: 'ACCOUNT_PENDING',
      }),
    );
  });

  it('[Abnormal] TC05 - should return 403 if account is banned', async () => {
    const User = (await import('../../models/user.js')).default;
    const bcryptMock = (await import('bcrypt')).default;
    const res = mockRes();

    User.findOne.mockResolvedValue({ email: 'b', passwordHash: 'h', status: 'banned' });
    bcryptMock.compare.mockResolvedValue(true);

    await authController.login({ body: { email: 'b', password: '1' } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với admin để được hỗ trợ.',
        code: 'ACCOUNT_BANNED',
      }),
    );
  });

  it('[Abnormal] TC06 - should return 500 on unexpected error', async () => {
    const User = (await import('../../models/user.js')).default;
    const res = mockRes();

    User.findOne.mockRejectedValue(new Error('DB error'));

    await authController.login({ body: { email: 'err@example.com', password: '123' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to login!' }),
    );
  });
});
