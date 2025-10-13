import User from '../models/user.js';
import AuthToken from '../models/authToken.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { google } from 'googleapis';
import { config } from '../config/environment.js';

// Initialize Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
);

// Helper function to create tokens
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

// Helper function to save refresh token
const saveRefreshToken = async (userId, token, req) => {
    const authToken = new AuthToken({
        userId,
        token,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    await authToken.save();
};

// SIGNUP
export const signup = async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already exists!' });
        }

        // Check if phone already exists
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ message: 'Phone number already exists!' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            email,
            passwordHash,
            fullName,
            phone,
            status: 'active'
        });

        await newUser.save();

        return res.status(201).json({ 
            message: 'User created successfully!',
            user: {
                id: newUser._id,
                email: newUser.email,
                fullName: newUser.fullName
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ message: 'Failed to signup!' });
    }
};

// LOGIN
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password!' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password!' });
        }
        
        // Check user status
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account is not active!' });
        }
        
        // Create tokens
        const { accessToken, refreshToken } = createTokens(user._id, user.email);
        
        // Save refresh token to database
        await saveRefreshToken(user._id, refreshToken, req);
        
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
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Failed to login!' });
    }
};

// GOOGLE LOGIN
export const loginWithGoogle = async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ message: 'Google token is required!' });
        }
        
        // Verify Google token
        const ticket = await oauth2Client.verifyIdToken({
            idToken: token,
            audience: config.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { email, name, picture, sub } = payload;
        
        // Find or create user
        let user = await User.findOne({ email });
        
        if (!user) {
            // Create new user with Google data
            user = new User({
                email,
                fullName: name,
                avatarUrl: picture,
                passwordHash: crypto.randomBytes(32).toString('hex'), // Random password
                phone: `google_${sub}`, // Unique phone from Google ID
                status: 'active',
                isFirstLogin: true
            });
            await user.save();
        }
        
        // Create tokens
        const { accessToken, refreshToken } = createTokens(user._id, user.email);
        
        // Save refresh token
        await saveRefreshToken(user._id, refreshToken, req);
        
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
        console.error('Google login error:', error);
        return res.status(500).json({ message: 'Failed to login with Google!' });
    }
};

// REFRESH TOKEN
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required!' });
        }
        
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
        
        // Check if token exists in database and is not revoked
        const authToken = await AuthToken.findOne({ 
            token: refreshToken, 
            userId: decoded.userId,
            revoked: false 
        });
        
        if (!authToken) {
            return res.status(401).json({ message: 'Invalid refresh token!' });
        }
        
        // Check if token is expired
        if (authToken.expiresAt < new Date()) {
            return res.status(401).json({ message: 'Refresh token has expired!' });
        }
        
        // Find user
        const user = await User.findById(decoded.userId);
        if (!user || user.status !== 'active') {
            return res.status(401).json({ message: 'Invalid user!' });
        }
        
        // Create new access token
        const newAccessToken = jwt.sign(
            { userId: user._id, email: user.email },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRE }
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
        console.error('Refresh token error:', error);
        return res.status(500).json({ message: 'Failed to refresh token!' });
    }
};

// LOGOUT
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required!' });
        }
        
        // Find and revoke the token
        const authToken = await AuthToken.findOne({ token: refreshToken });
        
        if (authToken) {
            authToken.revoked = true;
            await authToken.save();
        }
        
        return res.status(200).json({ message: 'Logout successful!' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ message: 'Failed to logout!' });
    }
};

// LOGOUT ALL DEVICES
export const logoutAll = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Revoke all refresh tokens for this user
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