import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../authController.js';

/* -------------------- MOCK SETUP -------------------- */

vi.mock('../../models/userModel.js', async (importOriginal) => {
  const actual = await importOriginal();
  const mockFindOne = vi.fn();
  const mockSave = vi.fn();
  return {
    ...actual,
    __esModule: true,
    default: {
      findOne: mockFindOne,
      save: mockSave,
    },
    _mockFindOne: mockFindOne,
    _mockSave: mockSave,
  };
});

vi.mock('../../utils/emailService.js', async (importOriginal) => {
  const actual = await importOriginal();
  const mockSendEmail = vi.fn();
  return {
    ...actual,
    __esModule: true,
    sendEmail: mockSendEmail,
    _mockSendEmail: mockSendEmail,
  };
});

vi.mock('../../utils/tokenGenerator.js', async (importOriginal) => {
  const actual = await importOriginal();
  const mockGenerateResetToken = vi.fn();
  return {
    ...actual,
    __esModule: true,
    generateResetToken: mockGenerateResetToken,
    _mockGenerateResetToken: mockGenerateResetToken,
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

describe('authController.forgotPassword', () => {
  // [Normal]
  it('[Normal] TC01 - should send reset password email successfully', async () => {
    const { _mockFindOne } = await import('../../models/userModel.js');
    const { _mockSendEmail } = await import('../../utils/emailService.js');
    const { _mockGenerateResetToken } = await import('../../utils/tokenGenerator.js');

    const res = mockRes();
    const req = { body: { email: 'test@example.com' } };

    const mockUser = { _id: '123', email: 'test@example.com', save: vi.fn() };
    _mockFindOne.mockResolvedValue(mockUser);
    _mockGenerateResetToken.mockReturnValue('reset-token-123');
    _mockSendEmail.mockResolvedValue(true);

    await authController.forgotPassword(req, res);

    expect(_mockFindOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(_mockGenerateResetToken).toHaveBeenCalled();
    expect(_mockSendEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('reset-token-123')
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Password reset email sent successfully' })
    );
  });

  // [Abnormal] - thiếu email
  it('[Abnormal] TC02 - should return 400 if email not provided', async () => {
    const res = mockRes();
    const req = { body: {} };

    await authController.forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email is required' })
    );
  });

  // [Abnormal] - user không tồn tại
  it('[Abnormal] TC03 - should return 404 if user not found', async () => {
    const { _mockFindOne } = await import('../../models/userModel.js');
    const res = mockRes();
    const req = { body: { email: 'notfound@example.com' } };

    _mockFindOne.mockResolvedValue(null);

    await authController.forgotPassword(req, res);

    expect(_mockFindOne).toHaveBeenCalledWith({ email: 'notfound@example.com' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found' })
    );
  });

  // [Abnormal] - lỗi khi gửi email
  it('[Abnormal] TC04 - should return 500 if email sending fails', async () => {
    const { _mockFindOne } = await import('../../models/userModel.js');
    const { _mockSendEmail } = await import('../../utils/emailService.js');
    const { _mockGenerateResetToken } = await import('../../utils/tokenGenerator.js');

    const res = mockRes();
    const req = { body: { email: 'test@example.com' } };

    const mockUser = { _id: '123', email: 'test@example.com', save: vi.fn() };
    _mockFindOne.mockResolvedValue(mockUser);
    _mockGenerateResetToken.mockReturnValue('reset-token-123');
    _mockSendEmail.mockRejectedValue(new Error('SMTP Error'));

    await authController.forgotPassword(req, res);

    expect(_mockSendEmail).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to send reset email' })
    );
  });

  // [Abnormal] - lỗi server bất ngờ
  it('[Abnormal] TC05 - should return 500 for unexpected error', async () => {
    const { _mockFindOne } = await import('../../models/userModel.js');
    const res = mockRes();
    const req = { body: { email: 'test@example.com' } };

    _mockFindOne.mockRejectedValue(new Error('DB Error'));

    await authController.forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' })
    );
  });
});
