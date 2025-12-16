import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import AuthToken from '../models/authToken.js';
import { config } from '../config/environment.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access token is required!' });

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token!' });
    if (user.status !== 'active') return res.status(401).json({ message: 'Account is not active!' });

    req.user = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };

    // Debug logging for admin routes
    if (req.path && req.path.includes('/admin/')) {
      console.log('authenticateToken: User authenticated for admin route', {
        userId: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        path: req.path
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token has expired!' });
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Invalid token!' });
    return res.status(500).json({ message: 'Authentication failed!' });
  }
};

export const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token is required!' });

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    const authToken = await AuthToken.findOne({
      token: refreshToken,
      userId: decoded.userId,
      revoked: false
    });
    if (!authToken) return res.status(401).json({ message: 'Invalid refresh token!' });
    if (authToken.expiresAt < new Date()) return res.status(401).json({ message: 'Refresh token has expired!' });

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Invalid user!' });

    req.user = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };
    req.authToken = authToken;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Refresh token has expired!' });
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Invalid refresh token!' });
    return res.status(500).json({ message: 'Authentication failed!' });
  }
};
export const isAdmin = (req, res, next) => {  
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.log('Admin access denied:', {
      user: req.user,
      expectedRole: 'admin',
      actualRole: req.user?.role
    });
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
};
