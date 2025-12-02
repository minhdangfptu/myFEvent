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
  changePassword,
  sendDeleteOtp,
  verifyDeleteOtp
} from '../controllers/authController.js';
import { authenticateToken, authenticateRefreshToken } from '../middlewares/authMiddleware.js';
import User from '../models/user.js';
import EventMember from '../models/eventMember.js';
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
  changePasswordValidation,
  sendDeleteOtpValidation,
  verifyDeleteOtpValidation
} from '../validations/authValidation.js';
import { uploadImageIfNeeded } from '../services/cloudinaryService.js';

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
    
    // Tính tổng số sự kiện user đã tham gia
    const totalEvents = await EventMember.countDocuments({ userId: req.user.id, status: { $ne: 'deactive' } });
    
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
        totalEvents: totalEvents || 0,
        verified: !!dbUser.verified
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Failed to get profile', error: error.message });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, bio, highlight, tags, avatarUrl } = req.body;
    const update = {};
    
    // Xử lý từng field, cho phép empty string và null
    if (fullName !== undefined) {
      const trimmedFullName = fullName?.trim() || '';
      if (!trimmedFullName) {
        return res.status(400).json({ message: 'Họ và tên không được để trống' });
      }
      update.fullName = trimmedFullName;
    }
    if (phone !== undefined) {
      // Cho phép empty string hoặc null để xóa phone
      const phoneValue = phone?.trim() || null;
      // Kiểm tra phone đã tồn tại chưa (trừ chính user hiện tại)
      if (phoneValue) {
        const existingUser = await User.findOne({ 
          phone: phoneValue, 
          _id: { $ne: req.user.id } 
        });
        if (existingUser) {
          return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng bởi tài khoản khác' });
        }
      }
      update.phone = phoneValue;
    }
    if (bio !== undefined) {
      update.bio = bio?.trim() || '';
    }
    if (highlight !== undefined) {
      update.highlight = highlight?.trim() || '';
    }
    if (tags !== undefined) {
      // Đảm bảo tags là array và loại bỏ duplicates
      update.tags = Array.isArray(tags) ? [...new Set(tags.filter(t => t && t.trim()))] : [];
    }
    if (avatarUrl !== undefined) {
      update.avatarUrl = avatarUrl
        ? await uploadImageIfNeeded(avatarUrl, 'avatars')
        : null;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: update }, 
      { new: true, runValidators: true }
    ).lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Tính tổng số sự kiện user đã tham gia
    const totalEvents = await EventMember.countDocuments({ userId: req.user.id, status: { $ne: 'deactive' } });

    return res.status(200).json({
      message: 'Updated',
      data: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl || '',
        phone: user.phone || '',
        bio: user.bio || '',
        highlight: user.highlight || '',
        tags: user.tags || [],
        totalEvents: totalEvents || 0,
        verified: !!user.verified,
        role: user.role || 'user',
        authProvider: user.authProvider || 'local'
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
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
router.post(
  '/send-delete-otp',
  sendDeleteOtpValidation,
  handleValidationErrors,
  authenticateToken,
  sendDeleteOtp
);
router.post(
  '/verify-delete-otp',
  verifyDeleteOtpValidation,
  handleValidationErrors,
  authenticateToken,
  verifyDeleteOtp
);
export default router;
