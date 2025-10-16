import User from '../models/user.js';
import AuthToken from '../models/authToken.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/environment.js';

const signup = async (req,res) => {
    try {
        const {email, password, fullName, phone} = req.body;

    const existing_email = await User.findOne({email});
    if(existing_email) {
        return res.status(400).json({message: 'Email already exists!'});
    }
    const existing_phone = await User.findOne({phone});
    if(existing_phone) {
        return res.status(400).json({message: 'Phone number already exists!'});
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
    return res.status(201).json({message: 'User created successfully!'});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Fail to signup!'});
    }
}

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
  

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required!' });
        }
        
        const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
        const authToken = await AuthToken.findOne({ 
            token: refreshToken, 
            userId: decoded.userId,
            revoked: false 
        });
        
        if (!authToken) {
            return res.status(401).json({ message: 'Invalid refresh token!' });
        }
        
        if (authToken.expiresAt < new Date()) {
            return res.status(401).json({ message: 'Refresh token has expired!' });
        }
        
        const user = await User.findById(decoded.userId);
        if (!user || user.status !== 'active') {
            return res.status(401).json({ message: 'Invalid user!' });
        }
        
        const newAccessToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        
        return res.status(200).json({
            message: 'Token refreshed successfully!',
            accessToken: newAccessToken
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Refresh token has expired!' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid refresh token!' });
        }
        console.log(error);
        return res.status(500).json({ message: 'Fail to refresh token!' });
    }
};

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        console.log('Revoking refresh token:', refreshToken);
        
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required!' });
        }
        
        const authToken = await AuthToken.findOne({ token: refreshToken });
        
        if (authToken) {
            authToken.revoked = true;
            console.log('Revoked refresh token:', refreshToken);
            await authToken.save();
        }
        
        return res.status(200).json({ message: 'Logout successful!' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Fail to logout!' });
    }
};

const logoutAll = async (req, res) => {
    try {
        const userId = req.user.id;
        
        await AuthToken.updateMany(
            { userId, revoked: false },
            { revoked: true }
        );
        
        return res.status(200).json({ message: 'Logout from all devices successful!' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Fail to logout from all devices!' });
    }
};

export { signup, login, loginWithGoogle, refreshToken, logout, logoutAll };