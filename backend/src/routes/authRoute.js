import express from 'express';
import { 
    signup, 
    login, 
    loginWithGoogle, 
    refreshToken, 
    logout, 
    logoutAll 
} from '../controllers/authController.js';
import { authenticateToken, authenticateRefreshToken } from '../middlewares/authMiddleware.js';
import {
    signupValidation,
    loginValidation,
    googleLoginValidation,
    refreshTokenValidation,
    logoutValidation
} from '../validations/authValidation.js';

const router = express.Router();

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/google-login', googleLoginValidation, loginWithGoogle);
router.post('/refresh-token', refreshTokenValidation, authenticateRefreshToken, refreshToken);
router.post('/logout', logoutValidation, logout);
router.post('/logout-all', authenticateToken, logoutAll);

export default router;