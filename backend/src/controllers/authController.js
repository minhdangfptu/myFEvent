import User from '../models/user.js';
import AuthToken from '../models/authToken.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import pkg from 'googleapis';
const { OAuth2Client } = pkg;
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
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ message: 'Google token is required!' });
        }
        
        const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);
        
        const ticket = await client.verifyIdToken({
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
                isFirstLogin: true
            });
            await user.save();
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
            message: 'Google login successful!',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                roles: user.roles
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Fail to login with Google!' });
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