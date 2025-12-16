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
  sendDeleteOtp,
  verifyDeleteOtp
} from '../controllers/authController.js';
import { authenticateToken, authenticateRefreshToken } from '../middlewares/authMiddleware.js';
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
  sendDeleteOtpValidation,
  verifyDeleteOtpValidation
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
