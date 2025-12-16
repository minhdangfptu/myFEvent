import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../authController.js';

/* -------------------- Mocks -------------------- */

// User model
vi.mock('../../models/user.js', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

// sendMail
vi.mock('../../mailer.js', () => ({
  __esModule: true,
  sendMail: vi.fn(),
}));

// bcrypt
vi.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    genSalt: vi.fn(),
    hash: vi.fn(),
  },
}));

/* -------------------- Helper Response -------------------- */
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- TESTS -------------------- */

describe('authController.signup', () => {

  it('[Normal] TC01 - should save pending registration & send verification email', async () => {
    const User = (await import('../../models/user.js')).default;
    const bcryptMock = (await import('bcrypt')).default;
    const mailer = await import('../../mailer.js');

    User.findOne.mockResolvedValue(null);
    bcryptMock.genSalt.mockResolvedValue('salt');
    bcryptMock.hash.mockResolvedValue('hashed-pass');
    mailer.sendMail.mockResolvedValue({});

    const req = {
      body: {
        email: 'test@example.com',
        password: '123456',
        fullName: 'Tester',
      },
      get: vi.fn(),
    };
    const res = mockRes();

    await authController.signup(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(bcryptMock.genSalt).toHaveBeenCalled();
    expect(bcryptMock.hash).toHaveBeenCalledWith('123456', 'salt');
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User created successfully! Please verify your email to activate your account.',
        email: 'test@example.com',
      })
    );
  });

  it('[Abnormal] TC02 - should return 400 if email already exists', async () => {
    const User = (await import('../../models/user.js')).default;
    const res = mockRes();

    User.findOne.mockResolvedValue({ email: 'test@example.com' });

    await authController.signup(
      { body: { email: 'test@example.com', password: '123', fullName: 'T' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Email đã được đăng kí. Vui lòng sử dụng Email khác',
    });
  });

  it('[Abnormal] TC03 - should return 400 if missing required fields', async () => {
    const User = (await import('../../models/user.js')).default;
    User.findOne.mockResolvedValue(null);

    const res = mockRes();

    await authController.signup(
      { body: { email: 'a@example.com', password: '', fullName: '' } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Vui lòng điền đầy đủ các trường',
    });
  });

  it('[Abnormal] TC04 - should return 500 if sending email fails', async () => {
    const User = (await import('../../models/user.js')).default;
    const bcryptMock = (await import('bcrypt')).default;
    const mailer = await import('../../mailer.js');

    User.findOne.mockResolvedValue(null);
    bcryptMock.genSalt.mockResolvedValue('salt');
    bcryptMock.hash.mockResolvedValue('hashed-pass');
    mailer.sendMail.mockRejectedValue(new Error('email fail'));

    const req = {
      body: { email: 'a@example.com', password: '123', fullName: 'A' },
      get: vi.fn(),
    };
    const res = mockRes();

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Failed to send verification email. Please check email configuration.',
    });
  });

  it('[Abnormal] TC05 - should return 500 for unexpected errors', async () => {
    const User = (await import('../../models/user.js')).default;

    User.findOne.mockRejectedValue(new Error('random error'));

    const req = { body: { email: 'x@x.com', password: '1', fullName: 'X' } };
    const res = mockRes();

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Failed to signup!',
    });
  });

});
