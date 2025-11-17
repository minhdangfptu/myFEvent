import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../authController.js';
import User from '../../models/user.js';
import { sendMail } from '../../mailer.js';
import bcrypt from 'bcrypt';
import { config } from '../../config/environment.js';

// 🧩 Mock dependencies (đúng chuẩn ESM)
vi.mock('../../models/user.js', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock('../../models/authToken.js', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    save: vi.fn(),
    deleteOne: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../../mailer.js', () => ({
  __esModule: true,
  sendMail: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    genSalt: vi.fn(),
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
    decode: vi.fn(),
  },
}));

vi.mock('google-auth-library', () => ({
  __esModule: true,
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn(),
  })),
}));

vi.mock('googleapis', () => ({
  __esModule: true,
  google: { auth: { OAuth2: vi.fn() } },
}));

// 🧰 Helper mock res
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authController.signup', () => {
  // [Normal] TC01
  it('[Normal] TC01 - should create pending user and send verification email', async () => {
    const req = {
      body: { email: 'test@example.com', password: '123456', fullName: 'Tester' },
    };
    const res = mockRes();

    User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashedpw');
    sendMail.mockResolvedValue(true);

    await authController.signup(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(sendMail).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('verify your email'),
        email: 'test@example.com',
      })
    );
  });

  // [Abnormal] TC02
  it('[Abnormal] TC02 - should return 400 if missing required fields', async () => {
    const req = { body: { email: '', password: '', fullName: '' } };
    const res = mockRes();

    User.findOne.mockResolvedValue(null);

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Missing required fields!' })
    );
  });

  // [Abnormal] TC03
  it('[Abnormal] TC03 - should return 400 if email already exists', async () => {
    const req = {
      body: { email: 'dup@example.com', password: '123', fullName: 'DupUser' },
    };
    const res = mockRes();

    User.findOne.mockResolvedValue({ _id: 'u1' });

    await authController.signup(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'dup@example.com' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email already exists!' })
    );
  });

  // [Abnormal] TC04
  it('[Abnormal] TC04 - should return 500 on unexpected error', async () => {
    const req = {
      body: { email: 'error@example.com', password: '123', fullName: 'Error' },
    };
    const res = mockRes();

    User.findOne.mockRejectedValue(new Error('DB crash'));

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to signup!' })
    );
  });
});
