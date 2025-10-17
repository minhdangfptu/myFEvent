import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/environment.js';
import User from '../models/user.js';
import AuthToken from '../models/authToken.js';

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
        googleId: null,
        authProvider: 'local',
    });

    await newUser.save();

    const { accessToken, refreshToken } = createTokens(newUser._id, newUser.email);
    await saveRefreshToken(newUser._id, refreshToken, req);

    return res.status(201).json({
      message: 'User created successfully!',
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Failed to signup!' });
  }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password!' });
        }
        
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password!' });
        }
        
        const accessToken = jwt.sign(
            { userId: user._id, email: user.email },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRE }
        );
        
        const refreshToken = jwt.sign(
            { userId: user._id },
            config.JWT_REFRESH_SECRET,
            { expiresIn: config.JWT_REFRESH_EXPIRE }
        );
        
        const authToken = new AuthToken({
            userId: user._id,
            token: refreshToken,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        
        await authToken.save();
        
        return res.status(200).json({
            message: 'Login successful!',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Fail to login!' });
    }
};


const loginWithGoogle = async (req, res) => {
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

        user = await User.create({
          email,
          fullName: name,
          avatarUrl: picture,
          googleId: sub,
          authProvider: 'google',
          status: 'active',
          isFirstLogin: true,
        });
      } else {

        if (!user.googleId) {
          user.googleId = sub;
        }

        if (!user.fullName && name) user.fullName = name;
        if (!user.avatarUrl && picture) user.avatarUrl = picture;
        await user.save();
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
           role: user.role
         }
      });
    } catch (error) {
      console.log(error);
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

// FORGOT PASSWORD - send email with reset link
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetJwt = jwt.sign({ userId: user._id, token: resetToken }, config.JWT_SECRET, { expiresIn: '15m' });

    const resetLink = `${config.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${resetJwt}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      }
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `myFEvent <${process.env.EMAIL_USER}>`,
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
      `
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
