import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { sendMail } from '../mailer.js';
import { config } from '../config/environment.js';
import User from '../models/user.js';
import AuthToken from '../models/authToken.js';
import UsedResetToken from '../models/usedResetToken.js';

const emailVerificationStore = new Map();
// Pending registrations kept in-memory until verified
const pendingRegistrations = new Map();
const deleteEventOtpStore = new Map();
const setEmailVerificationCode = (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const ttlMs = 3 * 60 * 1000; // 3 minutes
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
export const sendVerificationEmail = async (email, fullName, req) => {
  const { code } = setEmailVerificationCode(email);

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111827">
      <h2>Mã xác nhận tài khoản</h2>
      <p>Chào ${fullName || email},</p>
      <p>Mã xác nhận của bạn là:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</div>
      <p>Mã có hiệu lực trong 1 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    </div>
  `;

  await sendMail({
    to: email,
    subject: 'Mã xác nhận - myFEvent',
    html,
  });
};

export const signup = async (req, res) => {
  try {
    const { email, password, fullName} = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email đã được đăng kí. Vui lòng sử dụng Email khác' });
    }


    if (!email || !password || !fullName ) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ các trường' });
    }

    const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // Store pending registration data instead of creating user
    const pendingUser = {
      email,
      passwordHash,
      fullName,
      verified: false,
      status: 'pending',
    };
    
    pendingRegistrations.set(email, pendingUser);
    await sendVerificationEmail(email, fullName, req);

    return res.status(200).json({
      message: 'User created successfully! Please verify your email to activate your account.',
      email
    });
  } catch (error) {
    if (error.message && error.message.includes('email')) {
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please check email configuration.'
      });
    }
    return res.status(500).json({ message: 'Failed to signup!' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại' });

    // Check if user registered with Google OAuth (no password)
    if (!user.passwordHash) {
      if (user.authProvider === 'google') {
        return res.status(400).json({
          message: 'Tài khoản này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.',
          code: 'USE_GOOGLE_LOGIN'
        });
      }
      return res.status(400).json({ message: 'Lỗi xác thực. Vui lòng liên hệ admin.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    if (user.status === 'pending') {
      return res.status(403).json({
        message: 'Account is not active',
        code: 'ACCOUNT_PENDING'
      });
    }
    if (user.status === 'banned') {
      return res.status(403).json({
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với admin để được hỗ trợ.',
        code: 'ACCOUNT_BANNED'
      });
    }

    const { accessToken, refreshToken } = createTokens(user._id, user.email);
    await saveRefreshToken(user._id, refreshToken, req);
    return res.json({
      message: 'Login successful!',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Failed to login!' });
  }
};

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
      const { credential, g_csrf_token } = req.body;           
      if (!credential) return res.status(400).json({ message: 'Missing Google credential!' });
  
      const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);
  
      const csrfCookie = req.cookies?.g_csrf_token;
      if (csrfCookie && g_csrf_token && csrfCookie !== g_csrf_token) {
        return res.status(400).json({ message: 'CSRF check failed' });
      }
  
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: config.GOOGLE_CLIENT_ID,
      });
  
      const payload = ticket.getPayload(); // { sub, email, email_verified, name, picture, iss, ... }
      if (!payload) return res.status(401).json({ message: 'Invalid Google token' });
  
      const { email, name, picture, sub, iss, email_verified } = payload;
      if (!['accounts.google.com', 'https://accounts.google.com'].includes(iss) || !email_verified) {
        return res.status(401).json({ message: 'Unverified Google account' });
      }
  
      let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
  
      if (!user) {
        // Create new user with Google - mark as verified since Google already verified the email
        user = await User.create({
          email,
          fullName: name,
          avatarUrl: picture,
          googleId: sub,
          authProvider: 'google',
          status: 'active',
          isFirstLogin: true,
          verified: true, // Google accounts are pre-verified
        });
      } else {
        // Update existing user
        if (!user.googleId) {
          user.googleId = sub;
        }

        if (!user.fullName && name) user.fullName = name;
        if (!user.avatarUrl && picture) user.avatarUrl = picture;

        // Mark as verified if logging in with Google (Google already verified the email)
        if (!user.verified) {
          user.verified = true;
        }

        await user.save();
      }

      if (user.status === 'pending') {
        return res.status(403).json({
          message: 'Account is not active',
          code: 'ACCOUNT_PENDING'
        });
      }

      if (user.status === 'banned') {
        return res.status(403).json({
          message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với admin để được hỗ trợ.',
          code: 'ACCOUNT_BANNED'
        });
      }

       const accessToken = jwt.sign(
         { userId: user._id, email: user.email, role: user.role },
         config.JWT_SECRET,
         { expiresIn: config.JWT_EXPIRE }
       );
  
      const refreshToken = jwt.sign(
        { userId: user._id, typ: 'refresh' },
        config.JWT_REFRESH_SECRET,
        { expiresIn: config.JWT_REFRESH_EXPIRE }
      );
  
      const authToken = new AuthToken({
        userId: user._id,
        token: refreshToken,
        userAgent: req.get('User-Agent'),
        ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),

        expiresAt: (() => {
          const { exp } = jwt.decode(refreshToken) || {};
          return exp ? new Date(exp * 1000) : new Date(Date.now() + 7*24*60*60*1000);
        })(),
      });
      await authToken.save();
  
      return res.status(200).json({
        message: 'Google login successful!',
        accessToken,
        refreshToken,
         user: {
           id: user._id,
           email: user.email,
           fullName: user.fullName,
           avatarUrl: user.avatarUrl,
           role: user.role,
           authProvider: user.authProvider,
         }
      });
    } catch (error) {
      const isBadToken = /invalid|wrong number of segments|jwt/i.test(error?.message || '');
      return res.status(isBadToken ? 401 : 500).json({
        message: isBadToken ? 'Invalid Google token' : 'Fail to login with Google!'
      });
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
    
    // Get pending registration data
    const pendingUser = pendingRegistrations.get(email);
    if (!pendingUser) return res.status(400).json({ message: 'Không tìm thấy mã xác nhận. Vui lòng gửi lại' });

    const entry = emailVerificationStore.get(email);
    if (!entry) return res.status(400).json({ message: 'Không tìm thấy mã xác nhận. Vui lòng gửi lại' });
    if (entry.expiresAt < new Date()) {
      emailVerificationStore.delete(email);
      return res.status(400).json({ message: 'Mã đã hết hạn. Vui lòng gửi lại mã xác nhận' });
    }

    if (entry.code !== code) {
      return res.status(400).json({ message: 'Mã xác thực không hợp lệ. Vui lòng kiểm tra lại' });
    }

    // Consume code
    if (entry.timeout) clearTimeout(entry.timeout);
    emailVerificationStore.delete(email);
    
    // Create and save the verified user
    const newUser = new User({
      ...pendingUser,
      verified: true,
      status: 'active'
    });
    
    await newUser.save();
    pendingRegistrations.delete(email);

    return res.status(201).json({ 
      message: 'Verified successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName
      }
    });
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

    // Check if there's a pending registration
    const pendingUser = pendingRegistrations.get(email);
    if (!pendingUser) {
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(400).json({ message: 'No pending registration found for this email' });
      }
      if (existingUser.verified) {
        return res.status(400).json({ message: 'Account already verified.' });
      }
      return res.status(400).json({ message: 'Please register again.' });
    }

    await sendVerificationEmail(email, pendingUser.fullName, req);
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

    // Validate email format
    if (!email || !email.trim()) {
      return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const dbUser = await User.findOne({ email: email.trim() });

    // Always return the same message for security (don't reveal if email exists)
    // But only send email if user actually exists
    if (!dbUser) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.status(400).json({ message: 'Email không tồn tại, vui lòng kiểm tra lại' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetJwt = jwt.sign({ userId: dbUser._id, token: resetToken }, config.JWT_SECRET, { expiresIn: '15m' });

    const resetLink = `${config.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${resetJwt}`;

    // Send response immediately, then send email in background (non-blocking)
    res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });

    // Only send email if user exists (this code only runs if dbUser is truthy)
    sendMail({
      to: dbUser.email, // Use dbUser.email instead of request email for security
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
    }).catch((error) => {
      // Log error but don't block the response
      console.error('Failed to send password reset email:', error);
    });
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

    // Create a hash of the token to check if it's been used
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token has already been used
    const alreadyUsed = await UsedResetToken.findOne({ tokenHash });
    if (alreadyUsed) {
      return res.status(400).json({ message: 'Liên kết đặc lại mật khẩu đã được sử dụng. Vui lòng tạo yêu cầu đặt mật khẩu mới' });
    }

    const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Mark token as used to prevent reuse
    await UsedResetToken.create({
      tokenHash,
      userId: user._id,
    });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Link đã hết hạn. Vui lòng kiểm tra lại' });
    }
    return res.status(500).json({ message: 'Failed to reset password' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user registered with Google (no password to change)
    if (!user.passwordHash) {
      return res.status(400).json({
        message: 'Tài khoản Google không có mật khẩu. Không thể đổi mật khẩu.',
        code: 'GOOGLE_ACCOUNT_NO_PASSWORD'
      });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng, vui lòng kiểm tra lại' });

    const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Failed to change password' });
  }
};

export const checkPassWord = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user registered with Google (no password)
    if (!user.passwordHash) {
      return res.status(400).json({
        message: 'Tài khoản Google không có mật khẩu.',
        code: 'GOOGLE_ACCOUNT_NO_PASSWORD'
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Incorrect information' });
    return res.status(200).json({ message: 'Correct information' });
  } catch (error) {
    console.error('Check password error:', error);
    return res.status(500).json({ message: 'Failed to check information' });
  }
};
// Thêm vào đầu file:


const setDeleteEventOtp = (email) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const ttlMs = 2 * 60 * 1000; // 2 phút
  const expiresAt = Date.now() + ttlMs;

  // Clear timeout nếu có
  const existing = deleteEventOtpStore.get(email);
  if (existing?.timeout) clearTimeout(existing.timeout);

  const timeout = setTimeout(() => deleteEventOtpStore.delete(email), ttlMs);
  deleteEventOtpStore.set(email, { code, expiresAt, timeout });

  return code;
};

export const sendDeleteOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!req.user || req.user.email !== email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const code = setDeleteEventOtp(email);
    await sendMail({
      to: email,
      subject: 'Mã xác nhận xoá sự kiện - myFEvent',
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#111827">
          <h2>Mã xác nhận xoá sự kiện</h2>
          <p>Xin chào ${email},</p>
          <p>Mã xác nhận của bạn là:</p>
          <div style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</div>
          <p>Mã chỉ có hiệu lực trong 2 phút.</p>
          <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'Đã gửi mã xác nhận qua email.' });
  } catch (error) {
    console.error('Send delete OTP error:', error);
    return res.status(500).json({ message: 'Không gửi được mã xác nhận.' });
  }
};

export const verifyDeleteOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Thiếu email hoặc mã otp.' });
    if (!req.user || req.user.email !== email) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const entry = deleteEventOtpStore.get(email);
    if (!entry || entry.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Mã hết hạn. Vui lòng gửi lại!' });
    }
    if (entry.code !== otp) {
      return res.status(400).json({ message: 'Mã xác nhận không đúng!' });
    }
    if (entry.timeout) clearTimeout(entry.timeout);
    deleteEventOtpStore.delete(email);
    return res.status(200).json({ message: 'Xác thực thành công.' });
  } catch (error) {
    console.error('Verify delete OTP error:', error);
    return res.status(500).json({ message: 'Không xác thực được OTP.' });
  }
};