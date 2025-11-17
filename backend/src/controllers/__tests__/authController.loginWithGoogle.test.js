import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../authController.js';

/* -------------------- Mocks -------------------- */

// ✅ Mock User model
vi.mock('../../models/user.js', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

// ✅ Mock AuthToken model
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
    _MockAuthToken: MockAuthToken,
  };
});

// ✅ Mock JWT
vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: vi.fn(),
    decode: vi.fn(),
  },
}));

// ✅ Mock Google Auth client
const mockVerifyIdToken = vi.fn();
const mockGetPayload = vi.fn();
vi.mock('google-auth-library', () => ({
  __esModule: true,
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// ✅ Mock Config
vi.mock('../../config/environment.js', () => ({
  __esModule: true,
  config: {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_REDIRECT_URI: 'redirect-uri',
    JWT_SECRET: 'jwt-secret',
    JWT_REFRESH_SECRET: 'jwt-refresh-secret',
    JWT_EXPIRE: '1h',
    JWT_REFRESH_EXPIRE: '7d',
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
describe('authController.loginWithGoogle', () => {
  // [Normal] TC01
  it('[Normal] TC01 - should login successfully and return tokens', async () => {
    const UserMock = (await import('../../models/user.js')).default;
    const { default: MockAuthToken, _mockSave } = await import('../../models/authToken.js');
    const jwtMock = (await import('jsonwebtoken')).default;

    const req = {
      body: { credential: 'fake-credential', g_csrf_token: 'csrf-token' },
      cookies: { g_csrf_token: 'csrf-token' },
      get: vi.fn().mockReturnValue('Mozilla'),
      headers: {},
      ip: '127.0.0.1',
    };
    const res = mockRes();

    const fakePayload = {
      sub: 'google-id',
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
      picture: 'pic.png',
      iss: 'accounts.google.com',
    };

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => fakePayload,
    });

    const user = {
      _id: 'user123',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'user',
      authProvider: 'google',
      save: vi.fn(),
    };

    UserMock.findOne.mockResolvedValue(user);
    jwtMock.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    jwtMock.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

    await authController.loginWithGoogle(req, res);

    expect(mockVerifyIdToken).toHaveBeenCalled();
    expect(UserMock.findOne).toHaveBeenCalled();
    expect(MockAuthToken).toHaveBeenCalledTimes(1);
    expect(_mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Google login successful!',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({
          email: 'test@example.com',
          authProvider: 'google',
        }),
      })
    );
  });

  // [Abnormal] TC02
  it('[Abnormal] TC02 - should return 400 if missing Google credential', async () => {
    const res = mockRes();
    const req = { body: {}, cookies: {} };

    await authController.loginWithGoogle(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Missing Google credential!' })
    );
  });

  // [Abnormal] TC03
  it('[Abnormal] TC03 - should return 400 if CSRF check fails', async () => {
    const res = mockRes();
    const req = {
      body: { credential: 'cred', g_csrf_token: 'bad' },
      cookies: { g_csrf_token: 'different' },
    };

    await authController.loginWithGoogle(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'CSRF check failed' })
    );
  });

  // [Abnormal] TC04
  it('[Abnormal] TC04 - should return 401 if Google token invalid or missing payload', async () => {
    const res = mockRes();
    const req = {
      body: { credential: 'cred' },
      cookies: {},
    };
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => null });

    await authController.loginWithGoogle(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid Google token' })
    );
  });

  // [Abnormal] TC05
  it('[Abnormal] TC05 - should return 401 if unverified Google account', async () => {
    const res = mockRes();
    const req = {
      body: { credential: 'cred' },
      cookies: {},
    };
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email_verified: false,
        iss: 'accounts.google.com',
        email: 'test@example.com',
      }),
    });

    await authController.loginWithGoogle(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Unverified Google account' })
    );
  });

  // [Abnormal] TC06
  it('[Abnormal] TC06 - should return 401 if invalid JWT token error', async () => {
    const res = mockRes();
    const req = {
      body: { credential: 'cred' },
      cookies: {},
    };
    mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));

    await authController.loginWithGoogle(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid Google token' })
    );
  });

  // [Abnormal] TC07
  it('[Abnormal] TC07 - should return 500 on other unexpected error', async () => {
    const res = mockRes();
    const req = {
      body: { credential: 'cred' },
      cookies: {},
    };
    mockVerifyIdToken.mockRejectedValue(new Error('random error'));

    await authController.loginWithGoogle(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Fail to login with Google!' })
    );
  });
});
