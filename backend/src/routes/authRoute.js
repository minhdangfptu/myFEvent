import express from 'express';
import { validationResult } from 'express-validator';
import {
  signup,
  login,
  loginWithGoogle,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword
} from '../controllers/authController.js';
import { authenticateToken, authenticateRefreshToken } from '../middlewares/authMiddleware.js';
import User from '../models/user.js';
import {
  signupValidation,
  loginValidation,
  googleLoginValidation,
  refreshTokenValidation,
  logoutValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  resendVerificationValidation,
  verifyCodeValidation,
  changePasswordValidation
} from '../validations/authValidation.js';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
};

router.post('/signup', signupValidation, handleValidationErrors, signup);
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/google', googleLoginValidation, handleValidationErrors, loginWithGoogle);
router.post('/refresh-token', refreshTokenValidation, handleValidationErrors, authenticateRefreshToken, refreshToken);
router.post('/logout', logoutValidation, handleValidationErrors, logout);
router.post('/logout-all', authenticateToken, logoutAll);
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword);
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword);
router.post('/verify-email', verifyCodeValidation, handleValidationErrors, verifyEmail);
router.post('/resend-verification', resendVerificationValidation, handleValidationErrors, resendVerification);
router.post('/change-password', authenticateToken, changePasswordValidation, handleValidationErrors, changePassword);

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const dbUser = await User.findById(req.user.id).lean();
    if (!dbUser) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({
      data: {
        id: dbUser._id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        avatarUrl: dbUser.avatarUrl || '',
        username: '',
        phone: dbUser.phone || '',
        bio: dbUser.bio || '',
        highlight: dbUser.highlight || '',
        tags: dbUser.tags || [],
        totalEvents: dbUser.totalEvents || 0,
        verified: !!dbUser.verified
      }
    });
  } catch {
    return res.status(500).json({ message: 'Failed to get profile' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, bio, highlight, tags, avatarUrl } = req.body;
    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (phone !== undefined) update.phone = phone;
    if (bio !== undefined) update.bio = bio;
    if (highlight !== undefined) update.highlight = highlight;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    return res.status(200).json({ message: 'Updated', data: user });
  } catch {
    return res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.delete('/profile/tag', authenticateToken, async (req, res) => {
  try {
    const { value } = req.body;
    await User.findByIdAndUpdate(req.user.id, { $pull: { tags: value } });
    return res.status(200).json({ message: 'Tag removed' });
  } catch {
    return res.status(500).json({ message: 'Failed to remove tag' });
  }
});

export default router;
