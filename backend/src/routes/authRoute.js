import express from 'express'
import { validationResult } from 'express-validator'
import {
  signup,
  login,
  loginWithGoogle,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import {
  signupValidation,
  loginValidation,
  googleLoginValidation,
  refreshTokenValidation,
  logoutValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} from '../validations/authValidation.js'

const router = express.Router()

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
  }
  next()
}

router.post('/signup', signupValidation, handleValidationErrors, signup)
router.post('/login', loginValidation, handleValidationErrors, login)
router.post('/google-login', googleLoginValidation, handleValidationErrors, loginWithGoogle)
router.post('/refresh-token', refreshTokenValidation, handleValidationErrors, refreshToken)
router.post('/logout', logoutValidation, handleValidationErrors, logout)
router.post('/logout-all', authenticateToken, logoutAll)
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword)
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword)

export default router


