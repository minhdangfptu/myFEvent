import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { sendMail } from '../mailer.js';
import { config } from '../config/environment.js';
import User from '../models/user.js';
import AuthToken from '../models/authToken.js';

// In-memory store for email verification codes (1-minute TTL)
// Keyed by email to avoid having to look up by user first
const emailVerificationStore = new Map();

const setEmailVerificationCode = (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const ttlMs = 60 * 1000; // 1 minute
  const expiresAt = new Date(Date.now() + ttlMs);

  const existing = emailVerificationStore.get(email);
  if (existing?.timeout) clearTimeout(existing.timeout);

  const timeout = setTimeout(() => {
    emailVerificationStore.delete(email);
  }, ttlMs);

  emailVerificationStore.set(email, { code, expiresAt, timeout });
  return { code, expiresAt };
};

const oauth2Client = new google.auth.OAuth2(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  config.GOOGLE_REDIRECT_URI
);

const createTokens = (userId, email) => {
  const accessToken = jwt.sign(
    { userId, email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );

  const refreshToken = jwt.sign(
    { userId },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRE }
  );

  return { accessToken, refreshToken };
};

const saveRefreshToken = async (userId, token, req) => {
  const authToken = new AuthToken({
    userId,
    token,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip || req.connection?.remoteAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await authToken.save();
};

// Helper: generate and send 6-digit verification code (ephemeral, 1 minute)
const sendVerificationEmail = async (user, req) => {
  const { code } = setEmailVerificationCode(user.email);

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111827">
      <h2>Mã xác nhận tài khoản</h2>
      <p>Chào ${user.fullName || user.email},</p>
      <p>Mã xác nhận của bạn là:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</div>
      <p>Mã có hiệu lực trong 1 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    </div>
  `;

  await sendMail({
    to: user.email,
    subject: 'Mã xác nhận - myFEvent',
    html,
  });
};

export const signup = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists!' });
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ message: 'Phone number already exists!' });
      }
    }

    const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = new User({
      email,
      passwordHash,
      fullName,
      phone,
      verified: false,
      status: 'pending',
    });

    await newUser.save();

    await sendVerificationEmail(newUser, req);

    return res.status(201).json({
      message: 'User created successfully! Please verify your email to activate your account.',
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Failed to signup!' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials!' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials!' });

    if (!user.verified || user.status !== 'active') {
      return res.status(403).json({ message: 'Tài khoản chưa được xác minh. Vui lòng kiểm tra email để xác minh tài khoản.' });
    }

    const { accessToken, refreshToken } = createTokens(user._id, user.email);
    await saveRefreshToken(user._id, refreshToken, req);
    return res.json({
      message: 'Login successful!',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Failed to login!' });
  }
};

// Uses authenticateRefreshToken middleware (req.user, req.authToken)
export const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'Invalid user!' });

    const { accessToken, refreshToken: newRefresh } = createTokens(user._id, user.email);

    if (req.authToken) {
      await AuthToken.deleteOne({ _id: req.authToken._id });
    }
    await saveRefreshToken(user._id, newRefresh, req);

    return res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const loginWithGoogle = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Google token is required!' });
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        fullName: name,
        avatarUrl: picture,
        passwordHash: crypto.randomBytes(32).toString('hex'),
        phone: `google_${sub}`,
        status: 'active',
        isFirstLogin: true,
      });
      await user.save();
    }

    const { accessToken, refreshToken } = createTokens(user._id, user.email);
    await saveRefreshToken(user._id, refreshToken, req);

    return res.status(200).json({
      message: 'Google login successful!',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Fail to login with Google!' });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required!' });
    }

    const authToken = await AuthToken.findOne({ token: refreshToken });
    if (authToken) {
      authToken.revoked = true;
      await authToken.save();
    }

    return res.status(200).json({ message: 'Logout successful!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Fail to logout!' });
  }
};

export const logoutAll = async (req, res) => {
  try {
    const userId = req.user.id;
    await AuthToken.updateMany(
      { userId, revoked: false },
      { revoked: true }
    );
    return res.status(200).json({ message: 'Logout from all devices successful!' });
  } catch (error) {
    console.error('Logout all error:', error);
    return res.status(500).json({ message: 'Failed to logout from all devices!' });
  }
};

// VERIFY EMAIL - via token link
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email' });

    const entry = emailVerificationStore.get(email);
    if (!entry) return res.status(400).json({ message: 'Code not found. Please resend.' });
    if (entry.expiresAt < new Date()) {
      emailVerificationStore.delete(email);
      return res.status(400).json({ message: 'Code expired. Please resend.' });
    }

    if (entry.code !== code) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    // Consume code
    if (entry.timeout) clearTimeout(entry.timeout);
    emailVerificationStore.delete(email);

    user.verified = true;
    user.status = 'active';
    await user.save();

    return res.status(200).json({ message: 'Verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ message: 'Failed to verify email' });
  }
};

// RESEND VERIFICATION - send again if not verified
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If the email exists, a verification link has been sent.' });

    if (user.verified) {
      return res.status(200).json({ message: 'Account already verified.' });
    }

    await sendVerificationEmail(user, req);
    return res.status(200).json({ message: 'Verification email sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ message: 'Failed to send verification email' });
  }
};

// FORGOT PASSWORD - send email with reset link
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const dbUser = await User.findOne({ email });
    if (!dbUser) {
      return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetJwt = jwt.sign({ userId: dbUser._id, token: resetToken }, config.JWT_SECRET, { expiresIn: '15m' });

    const resetLink = `${config.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${resetJwt}`;

    await sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu myFEvent',
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#111827">
          <h2>Đặt lại mật khẩu</h2>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản myFEvent.</p>
          <p>Nhấn vào nút bên dưới để đặt lại mật khẩu (liên kết có hiệu lực trong 15 phút):</p>
          <p><a href="${resetLink}" style="display:inline-block;background:#ef4444;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Đặt lại mật khẩu</a></p>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'Reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to send reset email' });
  }
};

// RESET PASSWORD - verify token and set new password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(400).json({ message: 'Invalid token' });

    const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Failed to reset password' });
  }
};
